// Whole-wardrobe backup: bundles the persisted metadata (garments, outfits,
// figure) together with every image blob they reference into a single JSON
// file, and restores it. Images are inlined as data URLs under their original
// IndexedDB keys, so references in the metadata stay valid across a restore.
//
// Built-in body-part images use static `/limbs/*` path keys and live in the
// app bundle, so they are deliberately NOT bundled.

import type { GarmentItem, Outfit } from '../types';
import { useWardrobe, type FigureGuide } from '../store/wardrobeStore';
import { getImageBlob, putImageWithKey } from './imageStore';

const APP_TAG = 'fitdraft';
const BACKUP_VERSION = 1;

interface BackupFile {
  app: typeof APP_TAG;
  version: number;
  exportedAt: string;
  state: {
    garments: GarmentItem[];
    outfits: Outfit[];
    figure: FigureGuide;
  };
  images: Record<string, string>; // IndexedDB key -> data URL
}

export interface ImportSummary {
  addedGarments: number;
  addedOutfits: number;
  skippedGarments: number;
  skippedOutfits: number;
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataURLToBlob(dataURL: string): Promise<Blob> {
  return (await fetch(dataURL)).blob();
}

/** Every image key referenced by the given records, excluding static assets. */
function referencedKeys(garments: GarmentItem[], outfits: Outfit[]): Set<string> {
  const keys = new Set<string>();
  const add = (k?: string) => {
    if (k && !k.startsWith('/')) keys.add(k);
  };
  for (const g of garments) {
    add(g.images.front);
    add(g.images.side);
    add(g.images.back);
  }
  for (const o of outfits) {
    add(o.thumbnailKey);
    for (const it of o.items) add(it.editedImageKey);
  }
  return keys;
}

/** Serialise the wardrobe to a JSON blob and trigger a download. */
export async function exportBackup(): Promise<void> {
  const { garments, outfits, figure } = useWardrobe.getState();

  const images: Record<string, string> = {};
  for (const key of referencedKeys(garments, outfits)) {
    const blob = await getImageBlob(key);
    if (blob) images[key] = await blobToDataURL(blob);
  }

  const file: BackupFile = {
    app: APP_TAG,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state: { garments, outfits, figure },
    images,
  };

  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fitdraft-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Restore from a backup file. Additive + idempotent: garments/outfits whose id
 * already exists are skipped, so re-importing the same file is a no-op and
 * importing on a fresh browser repopulates everything.
 */
export async function importBackup(file: File): Promise<ImportSummary> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (parsed?.app !== APP_TAG || !parsed.state) {
    throw new Error('That does not look like a FitDraft backup.');
  }

  // Write image blobs back under their original keys first, so the metadata
  // references resolve immediately after the state update.
  await Promise.all(
    Object.entries(parsed.images ?? {}).map(async ([key, dataURL]) => {
      try {
        await putImageWithKey(key, await dataURLToBlob(dataURL));
      } catch {
        /* skip a single corrupt image rather than failing the whole import */
      }
    }),
  );

  const cur = useWardrobe.getState();
  const haveGarment = new Set(cur.garments.map((g) => g.id));
  const haveOutfit = new Set(cur.outfits.map((o) => o.id));

  const newGarments = (parsed.state.garments ?? []).filter((g) => !haveGarment.has(g.id));
  const newOutfits = (parsed.state.outfits ?? []).filter((o) => !haveOutfit.has(o.id));

  useWardrobe.setState((s) => ({
    garments: [...s.garments, ...newGarments],
    outfits: [...newOutfits, ...s.outfits],
    // Only adopt the backup's figure when the user hasn't chosen one.
    figure: s.figure === 'off' ? parsed.state.figure ?? s.figure : s.figure,
  }));

  return {
    addedGarments: newGarments.length,
    addedOutfits: newOutfits.length,
    skippedGarments: (parsed.state.garments?.length ?? 0) - newGarments.length,
    skippedOutfits: (parsed.state.outfits?.length ?? 0) - newOutfits.length,
  };
}

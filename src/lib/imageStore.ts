// IndexedDB-backed blob store for garment images and outfit thumbnails.
// Keeps heavy base64/PNG bytes out of localStorage (which caps at ~5MB).
import { get, set, del, keys, createStore } from 'idb-keyval';

const store = createStore('fitdraft-images', 'images');

// In-memory cache of object URLs so we don't recreate them on every render.
const urlCache = new Map<string, string>();

function newKey(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Persist a blob and return its storage key. */
export async function putImage(blob: Blob, prefix = 'img'): Promise<string> {
  const key = newKey(prefix);
  await set(key, blob, store);
  return key;
}

/** Persist a blob under a caller-supplied key (used when restoring a backup). */
export async function putImageWithKey(key: string, blob: Blob): Promise<void> {
  await set(key, blob, store);
}

/** Read the raw blob for a key, or null. Built-in `/path` keys have no blob. */
export async function getImageBlob(key: string): Promise<Blob | null> {
  if (key.startsWith('/')) return null;
  return (await get<Blob>(key, store)) ?? null;
}

/** Resolve a storage key to an object URL (cached for the session). */
export async function getImageUrl(key: string): Promise<string | null> {
  // Built-in body parts use static public URLs as their "key".
  if (key.startsWith('/')) return key;
  if (urlCache.has(key)) return urlCache.get(key)!;
  const blob = await get<Blob>(key, store);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}

/** Delete an image and revoke any cached object URL. */
export async function deleteImage(key: string): Promise<void> {
  const url = urlCache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(key);
  }
  await del(key, store);
}

/**
 * Ask the browser to mark this origin's storage as persistent so the wardrobe
 * (localStorage + IndexedDB) isn't silently evicted under storage pressure.
 * Best-effort: resolves to whether persistence is granted.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** Remove orphaned images no longer referenced by any record. */
export async function pruneImages(referenced: Set<string>): Promise<void> {
  const allKeys = (await keys(store)) as string[];
  await Promise.all(
    allKeys.filter((k) => !referenced.has(k)).map((k) => deleteImage(k)),
  );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CanvasItem, GarmentAngle, GarmentItem, Outfit } from '../types';
import { initialZIndex } from '../lib/garmentZOrder';
import { deleteImage, putImage, getImageUrl } from '../lib/imageStore';
import { BODY_PARTS, findBodyPart } from '../lib/bodyParts';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type FigureGuide = 'off' | 'female' | 'male';

interface WardrobeState {
  garments: GarmentItem[];
  canvasItems: CanvasItem[];
  selectedItemIds: string[];
  outfits: Outfit[];
  editingGarmentId: string | null; // wardrobe item being edited (UI-only)
  setEditingGarment: (id: string | null) => void;
  figure: FigureGuide;
  setFigure: (f: FigureGuide) => void;

  // Wardrobe
  addGarment: (garment: Omit<GarmentItem, 'id' | 'addedAt'>) => GarmentItem;
  removeGarment: (id: string) => void;
  updateGarment: (id: string, patch: Partial<GarmentItem>) => void;

  // Canvas
  addToCanvas: (
    garmentId: string,
    angle: GarmentAngle,
    placement: { x: number; y: number; width: number; height: number },
  ) => void;
  updateCanvasItem: (id: string, patch: Partial<CanvasItem>) => void;
  duplicateCanvasItem: (id: string) => void;
  removeFromCanvas: (id: string) => void;
  clearCanvas: () => void;
  setSelectedItem: (id: string | null) => void;
  setSelectedItems: (ids: string[]) => void;
  setCanvasItems: (items: CanvasItem[]) => void;

  // Outfits
  saveOutfit: (name: string, thumbnailKey: string) => Outfit | null;
  loadOutfit: (outfitId: string) => string[]; // returns ids of missing garments
  renameOutfit: (id: string, name: string) => void;
  updateOutfitThumbnail: (id: string, thumbnailKey: string) => void;
  duplicateOutfit: (id: string) => Promise<void>;
  deleteOutfit: (id: string) => void;
}

export const useWardrobe = create<WardrobeState>()(
  persist(
    (set, get) => ({
      garments: [],
      canvasItems: [],
      selectedItemIds: [],
      outfits: [],
      editingGarmentId: null,
      figure: 'off',

      setEditingGarment: (id) => set({ editingGarmentId: id }),
      setFigure: (f) => set({ figure: f }),

      addGarment: (garment) => {
        const created: GarmentItem = {
          ...garment,
          id: uid('garm'),
          addedAt: new Date().toISOString(),
        };
        set((s) => ({ garments: [...s.garments, created] }));
        return created;
      },

      removeGarment: (id) => {
        const g = get().garments.find((x) => x.id === id);
        if (g) {
          for (const key of Object.values(g.images)) {
            if (key) void deleteImage(key);
          }
        }
        set((s) => ({
          garments: s.garments.filter((x) => x.id !== id),
          // Garment deleted while on canvas → auto-remove its canvas items.
          canvasItems: s.canvasItems.filter((c) => c.garmentId !== id),
        }));
      },

      updateGarment: (id, patch) =>
        set((s) => ({
          garments: s.garments.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      addToCanvas: (garmentId, angle, placement) => {
        const garment =
          get().garments.find((g) => g.id === garmentId) ?? findBodyPart(garmentId);
        if (!garment) return;
        const z = initialZIndex(
          garment.category,
          get().canvasItems.map((c) => c.zIndex),
        );
        const item: CanvasItem = {
          id: uid('ci'),
          garmentId,
          angle,
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
          rotation: 0,
          visible: true,
          locked: false,
          zIndex: z,
        };
        set((s) => ({ canvasItems: [...s.canvasItems, item], selectedItemIds: [item.id] }));
      },

      updateCanvasItem: (id, patch) =>
        set((s) => ({
          canvasItems: s.canvasItems.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      duplicateCanvasItem: (id) => {
        const src = get().canvasItems.find((c) => c.id === id);
        if (!src) return;
        const maxZ = Math.max(0, ...get().canvasItems.map((c) => c.zIndex));
        const copy: CanvasItem = {
          ...src,
          id: uid('ci'),
          // Offset sideways so it lands beside the original (e.g. the other foot).
          x: src.x + src.width * 0.8,
          y: src.y,
          locked: false,
          zIndex: maxZ + 1,
        };
        set((s) => ({ canvasItems: [...s.canvasItems, copy], selectedItemIds: [copy.id] }));
      },

      removeFromCanvas: (id) =>
        set((s) => ({
          canvasItems: s.canvasItems.filter((c) => c.id !== id),
          selectedItemIds: s.selectedItemIds.filter((x) => x !== id),
        })),

      clearCanvas: () => set({ canvasItems: [], selectedItemIds: [] }),

      setSelectedItem: (id) => set({ selectedItemIds: id ? [id] : [] }),
      setSelectedItems: (ids) => set({ selectedItemIds: ids }),

      setCanvasItems: (items) => set({ canvasItems: items }),

      saveOutfit: (name, thumbnailKey) => {
        const now = new Date().toISOString();
        const outfit: Outfit = {
          id: uid('fit'),
          name,
          items: get().canvasItems.map((c) => ({ ...c })),
          thumbnailKey,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ outfits: [outfit, ...s.outfits] }));
        return outfit;
      },

      loadOutfit: (outfitId) => {
        const outfit = get().outfits.find((o) => o.id === outfitId);
        if (!outfit) return [];
        const garmentIds = new Set([
          ...get().garments.map((g) => g.id),
          ...BODY_PARTS.map((p) => p.id),
        ]);
        const present = outfit.items.filter((i) => garmentIds.has(i.garmentId));
        const missing = outfit.items
          .filter((i) => !garmentIds.has(i.garmentId))
          .map((i) => i.garmentId);

        // Tolerate outfits saved under older coordinate models.
        const items: CanvasItem[] = present.map((it, i) => {
          const legacy = it as Partial<CanvasItem> & Record<string, unknown>;
          if (typeof legacy.width === 'number' && legacy.angle) {
            return { ...(it as CanvasItem) };
          }
          return {
            id: it.id ?? uid('ci'),
            garmentId: it.garmentId,
            angle: 'front',
            x: (i % 3) * 60 - 60,
            y: Math.floor(i / 3) * 60 - 60,
            width: 220,
            height: 220,
            rotation: (legacy.rotation as number) ?? 0,
            visible: (legacy.visible as boolean) ?? true,
            locked: false,
            zIndex: (legacy.zIndex as number) ?? 10 + i,
          };
        });

        set({ canvasItems: items, selectedItemIds: [] });
        return missing;
      },

      renameOutfit: (id, name) =>
        set((s) => ({
          outfits: s.outfits.map((o) =>
            o.id === id ? { ...o, name, updatedAt: new Date().toISOString() } : o,
          ),
        })),

      updateOutfitThumbnail: (id, thumbnailKey) => {
        const o = get().outfits.find((x) => x.id === id);
        if (o && o.thumbnailKey && o.thumbnailKey !== thumbnailKey) void deleteImage(o.thumbnailKey);
        set((s) => ({
          outfits: s.outfits.map((x) => (x.id === id ? { ...x, thumbnailKey } : x)),
        }));
      },

      duplicateOutfit: async (id) => {
        const outfit = get().outfits.find((o) => o.id === id);
        if (!outfit) return;
        const url = await getImageUrl(outfit.thumbnailKey);
        let thumbKey = outfit.thumbnailKey;
        if (url) {
          const blob = await (await fetch(url)).blob();
          thumbKey = await putImage(blob, 'thumb');
        }
        const now = new Date().toISOString();
        const copy: Outfit = {
          ...outfit,
          id: uid('fit'),
          name: `${outfit.name} copy`,
          items: outfit.items.map((c) => ({ ...c })),
          thumbnailKey: thumbKey,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ outfits: [copy, ...s.outfits] }));
      },

      deleteOutfit: (id) => {
        const o = get().outfits.find((x) => x.id === id);
        if (o) void deleteImage(o.thumbnailKey);
        set((s) => ({ outfits: s.outfits.filter((x) => x.id !== id) }));
      },
    }),
    {
      name: 'fitdraft-store',
      version: 2,
      migrate: (persisted: any, version: number) => {
        // v0 → v1: single imageKey became an images set.
        if (version < 1 && persisted?.garments) {
          persisted.garments = persisted.garments.map((g: any) => {
            if (g.images) return g;
            const { imageKey, ...rest } = g;
            return { ...rest, images: { front: imageKey } };
          });
        }
        // v2 drops mannequin profiles; nothing to carry forward.
        if (persisted) {
          delete persisted.profiles;
          delete persisted.activeProfileId;
        }
        return persisted;
      },
      partialize: (s) => ({ garments: s.garments, outfits: s.outfits, figure: s.figure }),
    },
  ),
);

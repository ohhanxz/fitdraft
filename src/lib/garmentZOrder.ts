import type { GarmentCategory } from '../types';

// Base z-layer per category (brief §5.2). Items in the same layer are
// ordered by insertion via a small per-item increment.
export const Z_LAYER: Record<GarmentCategory, number> = {
  body: -100, // mannequin parts sit behind all clothing
  underwear: 0,
  socks: 5,
  tops: 10,
  bottoms: 10,
  outerwear: 20,
  shoes: 30,
  accessories: 40,
};

/** Initial zIndex for a newly placed garment, stacked above existing items in its layer. */
export function initialZIndex(
  category: GarmentCategory,
  existing: number[],
): number {
  const base = Z_LAYER[category];
  const inLayer = existing.filter((z) => z >= base && z < base + 10);
  const top = inLayer.length ? Math.max(...inLayer) : base - 1;
  return Math.min(top + 1, base + 9);
}

import type { GarmentCategory } from '../types';

// First-pass auto-categorisation from image aspect ratio (no ML).
// Wide-flat → tops; tall-narrow → bottoms; very wide & short → shoes.
// Always overridable in the Add Item modal.
export function detectCategory(width: number, height: number): GarmentCategory {
  if (!width || !height) return 'tops';
  const ratio = width / height;
  if (ratio >= 1.9) return 'shoes';
  if (ratio >= 1.25) return 'tops';
  if (ratio <= 0.72) return 'bottoms';
  return 'tops';
}

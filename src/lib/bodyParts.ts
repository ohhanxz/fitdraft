import type { GarmentItem } from '../types';

// Built-in mannequin parts. Their image "keys" are static public URLs
// (see imageStore.getImageUrl, which returns path-like keys as-is). They are
// not stored, not editable, and excluded from the cart.
const PARTS: [slug: string, label: string][] = [
  ['arm-left-1', 'Left Arm 1'],
  ['arm-right-1', 'Right Arm 1'],
  ['arm-left-2', 'Left Arm 2'],
  ['arm-right-2', 'Right Arm 2'],
  ['arm-left-3', 'Left Arm 3'],
  ['arm-right-3', 'Right Arm 3'],
  ['leg-left', 'Left Leg'],
  ['leg-right', 'Right Leg'],
  ['leg-shorts-left', 'Left Leg (Shorts)'],
  ['leg-shorts-right', 'Right Leg (Shorts)'],
  ['lower-leg-left', 'Left Lower Leg'],
  ['lower-leg-right', 'Right Lower Leg'],
  ['foot-left', 'Left Foot'],
  ['foot-right', 'Right Foot'],
  ['sock-foot-left', 'Left Sock Foot'],
  ['sock-foot-right', 'Right Sock Foot'],
  ['head', 'Head'],
];

export const BODY_PARTS: GarmentItem[] = PARTS.map(([slug, label]) => ({
  id: `body-${slug}`,
  name: label,
  category: 'body',
  images: { front: `/limbs/${slug}.png` },
  tags: [],
  addedAt: '',
}));

const BY_ID = new Map(BODY_PARTS.map((p) => [p.id, p]));

export function isBodyPart(id: string): boolean {
  return BY_ID.has(id);
}

export function findBodyPart(id: string): GarmentItem | undefined {
  return BY_ID.get(id);
}

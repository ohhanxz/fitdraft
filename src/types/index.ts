// FitDraft domain types.
// Heavy image bytes live in IndexedDB and are referenced here by key
// (see lib/imageStore.ts). Only metadata lives in the persisted store.

export type GarmentCategory =
  | 'tops'
  | 'bottoms'
  | 'outerwear'
  | 'shoes'
  | 'socks'
  | 'accessories'
  | 'underwear'
  | 'body'; // built-in mannequin parts (not a user-facing garment category)

// User-selectable categories (excludes 'body', which is the default-parts library).
export const CATEGORIES: GarmentCategory[] = [
  'tops',
  'bottoms',
  'outerwear',
  'shoes',
  'socks',
  'accessories',
  'underwear',
];

// Tag marking a garment that was imported straight onto the canvas (a figure,
// face, prop, etc.). These are canvas-only: hidden from the wardrobe library
// and the cart, but still real garments so outfits save/load correctly.
export const IMPORT_TAG = '__import';

// A garment can carry multiple angle images; `front` is required.
export type GarmentAngle = 'front' | 'side' | 'back';

export interface GarmentImages {
  front: string; // IndexedDB key for the background-removed PNG blob
  side?: string;
  back?: string;
}

export const GARMENT_ANGLES: GarmentAngle[] = ['front', 'side', 'back'];

export interface GarmentItem {
  id: string;
  // A built-in GarmentCategory or a user-defined custom category (free string).
  category: string;
  name: string;
  images: GarmentImages;
  sourceUrl?: string;
  price?: number; // regular price, in priceCurrency
  salePrice?: number; // optional discounted price; when set, price shows struck through
  priceCurrency?: string; // ISO code; defaults to AUD
  tags: string[];
  addedAt: string;
}

// A garment instance placed on the (mannequin-free) canvas.
// x/y are the CENTRE in world units (1 unit = 1px at zoom 1), so placement is
// independent of zoom/pan. `angle` is the specific view that was dragged in.
export interface CanvasItem {
  id: string;
  garmentId: string;
  angle: GarmentAngle;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number; // 0–1 layer transparency; undefined = fully opaque
  editedImageKey?: string; // per-instance erased image (IndexedDB); overrides the garment image
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

// Global canvas view: flip the whole look between front and back faces.
export type CanvasView = 'front' | 'back';

export interface Outfit {
  id: string;
  name: string;
  items: CanvasItem[];
  thumbnailKey: string; // IndexedDB key for the flattened PNG snapshot
  createdAt: string;
  updatedAt: string;
}

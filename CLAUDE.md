# FitDraft — project guide

FitDraft is a **2D virtual outfit builder**. Users build a wardrobe of garment images
(background removed in-browser), drag them onto a clean canvas to compose looks, and save
outfits. There is **no mannequin** anymore (removed deliberately) — just an optional faint
**body-figure guide** behind a clean white canvas.

## Run
```
npm run dev      # Vite dev server on http://localhost:5173
npx tsc --noEmit # typecheck (run after changes)
```
Dev server for the preview tools is configured in `.claude/launch.json` (name: `fitdraft`).

## Stack
React 18 + Vite + TypeScript · Tailwind (+ CSS variables) · **Konva/react-konva** (canvas) ·
**Zustand** (+ persist) · **@imgly/background-removal** (model `isnet_fp16`) · `idb-keyval`
(IndexedDB) · lucide-react icons.

## Data & persistence (important)
- **Metadata** (garments, outfits, figure choice) is persisted to **localStorage** via
  `zustand/middleware` persist (`src/store/wardrobeStore.ts`, version 2 with migrations).
- **Image bytes** (garment angles, outfit thumbnails, erased copies) live in **IndexedDB**
  via `src/lib/imageStore.ts`, referenced by key. `getImageUrl(key)` returns path-like keys
  (e.g. `/limbs/x.png`) as-is, so built-in static assets and stored blobs share one code path.
- **Canvas working state** (`canvasItems`, `selectedItemIds`) is in-memory only (not persisted);
  outfits are the durable snapshots.

## Key types (`src/types/index.ts`)
- `GarmentItem`: `{ id, name, category, images: {front, side?, back?}, sourceUrl?, price?,
  salePrice?, priceCurrency?, tags, addedAt }`. Images are IndexedDB keys.
- `GarmentCategory`: includes `'body'` (built-in parts) which is NOT in the user-facing
  `CATEGORIES` list.
- `CanvasItem`: world-coordinate placement `{ id, garmentId, angle, x, y (centre), width,
  height, rotation, flipX?, flipY?, editedImageKey?, visible, locked, zIndex }`.
- `Outfit`: `{ id, name, items: CanvasItem[], thumbnailKey, createdAt, updatedAt }`.

## Architecture / where things live
- `src/App.tsx` — shell, global keyboard shortcuts, modals, the Dresser, thumbnail rebuild.
- `src/components/Topbar.tsx` — Z-blue bar with the logo (`/logo-white.png`), Add Item, Save.
- `src/components/sidebar/` — `Sidebar` (animated collapse), `WardrobeLibrary` (category chips
  + a **Body** chip for built-in parts), `ItemCard` (card with view-picker chips, price/sale,
  product link), `BodyPartCard`, `SavedOutfits`/`OutfitCard` (legacy; the Dresser is primary now).
- `src/components/canvas/`:
  - `OutfitCanvas` — Konva stage: zoom/pan, drop-to-place (sizes by image aspect), **marquee
    multi-select + group drag**, **eraser** (destructive brush with per-stroke undo, exposed via
    `tryEraseUndo/Redo`), **flip H/V**, transformer, background figure guide, transparent PNG
    export. `DEFAULT_SCALE = 1/1.2`. Canvas re-centres on resize (sidebar/cart toggles).
  - `GarmentNode` — one Konva image (flip, override-image for erase, drag/transform).
  - `CanvasToolbar` (bottom: Move/Erase/Flip + figure Off/F/M), `CanvasControls` (top-right:
    undo/redo/zoom/clear-canvas), `LayerPanel` (animated dropdown; reorder/lock/dupe/hide).
- `src/components/CartSidebar.tsx` — animated collapse; lists **unique** garments on the canvas
  (duplicates counted once), per-currency totals using sale prices, product links.
- `src/components/DresserCarousel.tsx` — full-screen fanned carousel of outfit thumbnails
  (opens automatically on the Outfits tab; chrome cross-fades away, topbar stays). Auto-shuffle
  + manual nav, pause-on-interaction (resume after 6s; sticky on rename/export). Rename/Export
  PNG/Rebuild thumbnails actions.
- `src/components/modals/` — `AddItemModal` (wraps `ItemEditor`), `ItemEditor` (add **and** edit;
  front/side/back image slots, paste/URL/file import, auto bg-removal, price/sale), `SaveOutfitModal`.
- `src/lib/` — `bodyParts.ts` (built-in mannequin parts → `public/limbs/*`), `currency.ts`
  (currency list + `formatMoney`; **no API/conversion** — prices shown in their entered currency),
  `garmentZOrder.ts`, `imageStore.ts`, `imageUtils.ts`, `categoryDetection.ts`.

## Design system
- Tokens in `src/styles/tokens.css`. Single accent = **Z-blue `#0000c5`**. Surfaces are
  neutral light grey for chrome; **pure white (`--canvas-stage`) for the work canvas + cards**
  so garments read true. Topbar is Z-blue.
- All text is **Space Mono** (typewriter) — set in `index.css` (`body`) and `tailwind.config.js`
  (`sans`/`mono`). `.font-display` and `.watermark` are also Space Mono.
- Smooth open/close on the sidebar, cart, dresser, and Layers panel via CSS transitions
  (sidebar/cart animate `width`; Layers uses the grid-rows `0fr↔1fr` auto-height trick).

## Gotchas
- Outfit thumbnails are exported **transparent** (the white backing rect is hidden during
  `exportPNG`) so outfits overlap cleanly in the Dresser. Older white-bg outfits can be fixed
  with the Dresser's **Rebuild thumbnails** button.
- `public/` holds runtime assets: `logo.png`, `logo-white.png`, `limbs/*` (17 parts),
  `figures/{female,male}.png`. Source images were processed (sliced + chroma-keyed) and deleted.
- Background-removal model is `isnet_fp16` (the brief's `'small'` is an older API).
- When editing files while the dev server runs, Vite HMR may log stale "Failed to reload"
  warnings mid-edit — a full reload clears them; trust `tsc` + a clean reload.

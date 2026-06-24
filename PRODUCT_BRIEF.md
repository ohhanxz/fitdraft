# FitDraft — Product Brief
**Version:** 0.1 · **Status:** Pre-development  
**Target stack:** React (Vite) · TypeScript · Tailwind CSS · HTML5 Canvas / Konva.js

---

## 1. What Is FitDraft

FitDraft is a 2D virtual outfit builder. Users create a personalised mannequin from their body measurements, then drag real clothing items — sourced as images from any online store — onto the mannequin to compose outfits before committing to a purchase. Completed looks are saved with links back to the original product pages.

**The core insight:** online shopping is visual but blind. You guess at fit, mix and match in your head, and still end up returning things. FitDraft gives you a canvas to compose an actual outfit — on a silhouette that reflects your body — before spending anything.

---

## 2. Design Direction

### Aesthetic
Clean, editorial, fashion-adjacent. Not clinical. The feel should be closer to a well-designed lookbook tool than a measurement app or e-commerce widget.

- **Dark mode default** — primary canvas is near-black, not white
- **Restrained typography** — geometric sans for UI (Inter), slightly characterful display face for headings (Playfair Display or similar)
- **Single sharp accent** — one interactive colour only; no second brand colour
- **No gradient decoration** — atmosphere comes from the garment imagery itself, not CSS effects
- **Elevation by surface contrast** — light/dark surface alternation rather than shadow stacking

### Design Tokens

```css
/* Surfaces */
--canvas-void: #0d0d0f;          /* main app background */
--surface-panel: #161618;        /* sidebar panels */
--surface-card: #1e1e21;         /* item cards, outfit thumbnails */
--surface-card-hover: #252528;   /* card hover state */
--surface-mannequin: #111113;    /* canvas work area */
--surface-input: #1a1a1d;        /* input fields */

/* Accent */
--accent: #e8ff47;               /* sharp yellow-green — the single interactive signal */
--accent-dim: rgba(232,255,71,0.12);  /* accent wash for selected states */
--accent-on-dark: #e8ff47;

/* Text */
--ink: #ffffff;
--ink-secondary: #a0a0a8;
--ink-muted: #5a5a62;
--ink-on-accent: #0d0d0f;

/* Borders */
--border-subtle: rgba(255,255,255,0.06);
--border-active: rgba(232,255,71,0.5);

/* Elevation — used only under floating UI panels */
--shadow-panel: 0 8px 32px rgba(0,0,0,0.48);
```

> **Note on accent colour:** `#e8ff47` (sharp yellow-green) is a placeholder. The brief uses it to illustrate the "one accent only" principle. The accent can be changed to any high-contrast single colour before build, but the rule — one interactive colour, everywhere — must hold.

### Typography

| Role | Family | Size | Weight | Tracking |
|---|---|---|---|---|
| App heading | Playfair Display | 22px | 700 | 0 |
| Section label | Inter | 11px | 600 | +0.08em (caps) |
| UI body | Inter | 14px | 400 | -0.01em |
| Item name | Inter | 13px | 500 | 0 |
| Caption / meta | Inter | 12px | 400 | 0 |
| Button | Inter | 13px | 500 | 0 |

Load via Google Fonts: `Inter` (variable, wght 300–700) + `Playfair Display` (700).

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `--r-xs` | 4px | Tight UI chips |
| `--r-sm` | 8px | Cards, panels |
| `--r-md` | 12px | Input fields, modals |
| `--r-pill` | 9999px | Primary action buttons |

---

## 3. Application Architecture

### Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 18 + Vite | Fast DX, good ecosystem for canvas libs |
| Language | TypeScript | Required for canvas type safety |
| Styling | Tailwind CSS + CSS variables | Utility classes + design token theming |
| Canvas | Konva.js + react-konva | 2D canvas with drag/drop, layering, transform handles |
| Background removal | `@imgly/background-removal` (WASM, runs in-browser) | No server needed, works on any PNG/JPEG |
| State | Zustand | Lightweight, no boilerplate |
| Persistence | localStorage (JSON) | No backend needed for MVP |
| Icons | Lucide React | Clean, consistent |

### Directory Structure

```
src/
  components/
    canvas/
      MannequinCanvas.tsx      # main Konva stage
      MannequinSilhouette.tsx  # SVG path mannequin render
      GarmentItem.tsx          # draggable garment node
      CanvasControls.tsx       # zoom, pan, undo/redo toolbar
    sidebar/
      Sidebar.tsx              # collapsible container
      WardrobeLibrary.tsx      # items by category
      ItemCard.tsx             # thumbnail + hover popup
      SavedOutfits.tsx         # outfit thumbnails
      OutfitCard.tsx
    mannequin/
      MannequinSetup.tsx       # onboarding measurements form
      MannequinProfile.tsx     # profile switcher
    modals/
      AddItemModal.tsx         # URL/file import + preview
      SaveOutfitModal.tsx
      ItemEditModal.tsx
    ui/
      Button.tsx
      Input.tsx
      Tag.tsx
      HoverCard.tsx
  hooks/
    useCanvas.ts               # stage state, zoom, pan
    useUndoRedo.ts
    useBackgroundRemoval.ts
    useMannequin.ts
  store/
    wardrobeStore.ts           # items, outfits, mannequin profiles
  lib/
    mannequin.ts               # measurement → SVG path generation
    garmentZOrder.ts           # z-order rules by category
    categoryDetection.ts       # auto-categorise garments
  types/
    index.ts
```

---

## 4. Data Models

```typescript
// Body measurements → mannequin profile
interface MannequinProfile {
  id: string;
  name: string;
  measurements: {
    height: number;        // cm
    chest: number;         // cm
    waist: number;
    hips: number;
    inseam: number;
    shoulder: number;
    sleeve: number;
    neck: number;
    thigh: number;
  };
  createdAt: string;
}

// A garment in the wardrobe library
interface GarmentItem {
  id: string;
  name: string;
  category: GarmentCategory;
  imageDataUrl: string;      // background-removed PNG, stored as base64
  sourceUrl?: string;        // link back to original product page
  tags: string[];
  addedAt: string;
}

type GarmentCategory =
  | 'tops'
  | 'bottoms'
  | 'outerwear'
  | 'shoes'
  | 'accessories'
  | 'underwear';

// A garment placed on the canvas
interface CanvasItem {
  id: string;
  garmentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  zIndex: number;
}

// A saved outfit
interface Outfit {
  id: string;
  name: string;
  mannequinProfileId: string;
  items: CanvasItem[];
  thumbnailDataUrl: string;  // flattened PNG snapshot
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Feature Specifications

### 5.1 Mannequin Setup (Onboarding)

**Trigger:** First launch, or "New Profile" in profile switcher.

**UI:**
- Full-screen dark modal overlay
- Two-column layout: measurement form (left) + live silhouette preview (right)
- Measurements: height, chest/bust, natural waist, hips, inseam, shoulder width, sleeve length, neck, thigh
- Each field: number input + unit toggle (cm / in)
- Silhouette updates live on each field change (debounced 150ms)
- Profile name field at top
- CTA: "Build my mannequin" (accent pill button)

**Mannequin silhouette rendering (`lib/mannequin.ts`):**
- Generate an SVG path from measurements using a parametric body model
- Proportional scaling: height drives overall scale, each measurement drives the relevant region width
- Output: a closed SVG path that looks like a clean front-facing body outline (no face, no hands — just the garment-relevant silhouette)
- Colour: `--surface-card` fill with `--border-subtle` stroke; no detail lines

**Multiple profiles:** stored in Zustand + localStorage; switchable from a dropdown in the top bar.

---

### 5.2 Adding Clothing Items

**Entry points:**
1. "Add Item" button in the sidebar
2. Drag-and-drop an image file directly onto the canvas
3. Paste an image URL into the Add Item modal

**Add Item modal flow:**
1. User pastes a URL or drops a file
2. Image loads into preview
3. Background removal runs automatically (`@imgly/background-removal`), showing a spinner while processing
4. Preview updates to show the isolated garment on a transparent checkered background
5. User sees auto-detected category (editable dropdown)
6. User can rename the item
7. User pastes the original product URL (optional; pre-fills if a URL was used to import)
8. "Add to wardrobe" saves the item

**Auto-categorisation (`lib/categoryDetection.ts`):**
Use a simple image-ratio + colour-zone heuristic as a first pass (tall-narrow = bottoms/shoes, wide-flat = tops). Expose a manual override dropdown. No ML required for MVP.

**Z-order rules (`lib/garmentZOrder.ts`):**

| Category | Z layer |
|---|---|
| underwear | 0 (bottom) |
| tops | 10 |
| bottoms | 10 |
| outerwear | 20 |
| shoes | 30 |
| accessories | 40 (top) |

Items in the same layer are ordered by when they were added to the canvas.

---

### 5.3 Canvas — Dressing the Mannequin

**Canvas engine:** Konva.js via `react-konva`.

**Stage layout:**
- Full remaining viewport area after sidebar (sidebar is fixed-width 280px, collapsible)
- Background: `--surface-mannequin`
- Mannequin centred on initial load
- Canvas supports: pinch-to-zoom, scroll-to-zoom, click-and-drag to pan

**Adding items to canvas:**
- Drag item card from sidebar onto canvas → item appears at drop position, centred on cursor
- Item auto-snaps to the body region corresponding to its category (torso for tops, leg area for bottoms, etc.) but can be freely repositioned

**Item interaction (Konva transformer):**
- Click to select → shows bounding box with resize handles + rotation handle
- Drag to reposition
- Corner handles to resize (maintains aspect ratio by default; shift to free resize)
- Rotation handle above the item
- Delete key removes selected item
- Escape deselects

**Visibility toggle:** eye icon on item card in sidebar toggles `CanvasItem.visible`.

**Undo / Redo (`useUndoRedo.ts`):**
- Command pattern: every canvas mutation pushes to a history stack
- Max 50 steps
- Keyboard: Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z

---

### 5.4 Saving Outfits

- "Save Outfit" button in top bar
- Modal: name field, pre-filled with "Outfit 1" / "Outfit 2" etc.
- On save: Konva stage is exported as a flat PNG (`stage.toDataURL()`) and stored as the outfit thumbnail
- Outfit saved to Zustand store + localStorage

---

### 5.5 Sidebar — Wardrobe Library

**Layout:**
- Fixed width 280px, collapsible to 0 (icon rail stays visible)
- Two tabs: "Wardrobe" / "Outfits"
- Category tabs within Wardrobe: Tops · Bottoms · Outerwear · Shoes · Accessories · Underwear

**Item card:**
- 2-column grid of square thumbnail cards
- Card: `--surface-card`, `--r-sm` radius, garment image centred with padding
- Hover: reveals item name at bottom + three-dot menu (rename, re-tag, delete)
- Hover popup (HoverCard): item name, category, clickable product URL link (opens new tab)
- Drag handle: item card is draggable onto canvas

**Item context menu:**
- Rename
- Change category
- Delete (with confirmation)

---

### 5.6 Sidebar — Saved Outfits

- Grid of outfit thumbnail cards (1 column, wide cards to show the outfit thumbnail legibly)
- Click to load: clears current canvas, loads all CanvasItems from the outfit
- Card actions: rename, duplicate, delete, export as PNG

**Export:** `stage.toDataURL('image/png')` → trigger browser download.

---

### 5.7 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Delete` / `Backspace` | Remove selected canvas item |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + S` | Save outfit |
| `[` / `]` | Send selected item backward / forward in z-order |
| `Space + drag` | Pan canvas |
| `Escape` | Deselect all |
| `Tab` | Cycle between canvas items |
| `Cmd/Ctrl + B` | Toggle sidebar |

---

## 6. Screen Layouts

### 6.1 Main Application Shell

```
┌─────────────────────────────────────────────────────────────┐
│  TOPBAR (48px)  [FitDraft]   [profile: "My Measurements" ▾] │
│                                          [+ Add Item] [Save] │
├──────────────────┬──────────────────────────────────────────┤
│  SIDEBAR (280px) │                                          │
│  [Wardrobe][Fits]│           CANVAS                        │
│  ─────────────── │                                          │
│  [Tops][Bottoms] │       [mannequin silhouette]             │
│  [Outer][Shoes]  │       [garment items draped on it]       │
│  [Access][Under] │                                          │
│                  │                                          │
│  ┌──┐ ┌──┐       │                                          │
│  │  │ │  │       │                                          │
│  └──┘ └──┘       │                                          │
│  ┌──┐ ┌──┐       │                          [Zoom controls] │
│  │  │ │  │       │                          [Undo / Redo]   │
│  └──┘ └──┘       │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### 6.2 Mannequin Setup Modal

```
┌──────────────────────────────────────────────────────────────┐
│                     Set up your mannequin                    │
│  ─────────────────────────────────────────────────────────  │
│   Profile name: [________________________]                   │
│                                                              │
│   ┌─────────────────────────┐  ┌──────────────────────────┐ │
│   │  Height    [175]  cm    │  │                          │ │
│   │  Chest     [92 ]  cm    │  │   [live SVG silhouette]  │ │
│   │  Waist     [76 ]  cm    │  │                          │ │
│   │  Hips      [98 ]  cm    │  │                          │ │
│   │  Inseam    [80 ]  cm    │  │                          │ │
│   │  Shoulder  [42 ]  cm    │  │                          │ │
│   │  Sleeve    [62 ]  cm    │  │                          │ │
│   │  Neck      [37 ]  cm    │  │                          │ │
│   │  Thigh     [58 ]  cm    │  │                          │ │
│   └─────────────────────────┘  └──────────────────────────┘ │
│                                                              │
│                          [Build my mannequin]                │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Mannequin Silhouette Generation

The mannequin is a parametric SVG generated from measurements. This is the most technically nuanced part of the app.

**Approach:**
1. Define a base normalised SVG path for a human silhouette at a reference measurement set (e.g. height=170, chest=90, waist=75, hips=96)
2. Map each measurement to a set of SVG control point offsets
3. Apply offsets to produce the personalised path
4. Scale the overall path to fit the canvas area (e.g. 40% of canvas height)

**Key path regions and their driving measurements:**

| Silhouette region | Measurement |
|---|---|
| Overall height | `height` |
| Shoulder width | `shoulder` |
| Upper torso width (chest) | `chest` |
| Mid-torso width (waist) | `waist` |
| Hip width | `hips` |
| Inseam / leg length ratio | `inseam` |
| Thigh width | `thigh` |
| Neck width | `neck` |

**Implementation tip:** Use a cubic bezier spline for the silhouette edges. Define anchor points at shoulder, underarm, waist, hip, and ankle. Interpolate between anchors based on measurement deltas from the reference. The goal is a recognisable, clean body outline — not anatomical precision.

---

## 8. Background Removal

Use `@imgly/background-removal` (MIT, runs fully in-browser via WASM):

```typescript
import { removeBackground } from '@imgly/background-removal';

async function isolateGarment(imageBlob: Blob): Promise<string> {
  const resultBlob = await removeBackground(imageBlob, {
    model: 'small',  // faster; 'medium' for higher quality
    output: { format: 'image/png', quality: 0.9 }
  });
  return URL.createObjectURL(resultBlob);
}
```

Show a loading state on the preview while processing (typically 2–5s depending on image size). No API key, no server.

---

## 9. State Management (Zustand)

```typescript
interface WardrobeStore {
  // Mannequin profiles
  profiles: MannequinProfile[];
  activeProfileId: string | null;
  
  // Wardrobe
  garments: GarmentItem[];
  
  // Canvas state
  canvasItems: CanvasItem[];
  selectedItemId: string | null;
  
  // Saved outfits
  outfits: Outfit[];
  
  // Actions
  addProfile: (profile: MannequinProfile) => void;
  setActiveProfile: (id: string) => void;
  addGarment: (garment: GarmentItem) => void;
  removeGarment: (id: string) => void;
  updateGarment: (id: string, patch: Partial<GarmentItem>) => void;
  addToCanvas: (garmentId: string, position: { x: number; y: number }) => void;
  updateCanvasItem: (id: string, patch: Partial<CanvasItem>) => void;
  removeFromCanvas: (id: string) => void;
  clearCanvas: () => void;
  saveOutfit: (name: string, thumbnail: string) => void;
  loadOutfit: (outfitId: string) => void;
  deleteOutfit: (id: string) => void;
}
```

Persist the entire store to `localStorage` using `zustand/middleware`'s `persist`.

---

## 10. Implementation Phases

### Phase 1 — Shell & Mannequin (Week 1)
- [ ] Vite + React + TypeScript scaffold
- [ ] Design tokens as CSS variables; Tailwind config
- [ ] App shell: topbar, sidebar, canvas area layout
- [ ] Mannequin setup modal with measurement form
- [ ] Parametric SVG silhouette generation (static path, proportional scaling)
- [ ] Profile creation and switching
- [ ] Zustand store + localStorage persistence

### Phase 2 — Garment Import & Library (Week 2)
- [ ] Add Item modal: URL paste + file drop
- [ ] Background removal integration
- [ ] Wardrobe library UI: categories, item cards, hover popup
- [ ] Item management: rename, re-tag, delete
- [ ] Auto-categorisation heuristic

### Phase 3 — Canvas & Dressing (Week 3)
- [ ] Konva stage setup: zoom, pan
- [ ] Drag garment from sidebar onto canvas
- [ ] Garment item: select, resize, rotate, reposition
- [ ] Z-order layering by category
- [ ] Visibility toggle
- [ ] Undo / redo
- [ ] Keyboard shortcuts

### Phase 4 — Outfits & Polish (Week 4)
- [ ] Save outfit modal + thumbnail generation
- [ ] Saved outfits sidebar tab: load, rename, duplicate, delete
- [ ] Export outfit as PNG
- [ ] Responsive layout / sidebar collapse
- [ ] Empty states for all panels
- [ ] Onboarding flow (first-launch detection)

---

## 11. Edge Cases & Decisions

| Scenario | Decision |
|---|---|
| Image URL blocked by CORS | Fall back to file download prompt; explain why |
| Background removal fails | Show original image; allow user to proceed anyway |
| Very large image | Downscale to max 1200px before processing |
| No measurements entered | Show a default mannequin (reference measurements) |
| Garment deleted while on canvas | Remove from canvas automatically |
| Outfit loaded with missing garments | Skip missing items; warn user |
| localStorage full | Warn user; offer to clear old outfits |

---

## 12. Out of Scope (MVP)

- User accounts / cloud sync (localStorage only)
- Sharing outfits via URL (no backend)
- 3D rendering or true fit simulation
- Shopping cart integration / affiliate links
- Mobile app (responsive web only)
- Colour filtering or garment search
- AI-powered outfit suggestions

---

## 13. Open Questions for Next Conversation

1. **Accent colour** — confirm the sharp yellow-green (`#e8ff47`) or choose an alternative
2. **Mannequin gender/body type** — single neutral silhouette, or separate male/female/non-binary options?
3. **Mannequin face/hands** — completely abstract (no head, no hands) or a minimal head shape?
4. **Garment snap behaviour** — hard snap to body zones, or free positioning only?
5. **Multi-device** — is localStorage acceptable, or does cloud sync need to be in scope from day one?
6. **CORS workaround** — should the app include a proxy server for fetching external images, or keep it fully client-side?

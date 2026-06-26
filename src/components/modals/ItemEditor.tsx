import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, Link2, Loader2, AlertTriangle, ClipboardPaste, X, Plus } from 'lucide-react';
import {
  CATEGORIES,
  GARMENT_ANGLES,
  type GarmentAngle,
  type GarmentImages,
  type GarmentItem,
} from '../../types';
import { useWardrobe } from '../../store/wardrobeStore';
import { useBackgroundRemoval } from '../../hooks/useBackgroundRemoval';
import { downscaleBlob, imageDimensions, urlToBlob } from '../../lib/imageUtils';
import { detectCategory } from '../../lib/categoryDetection';
import { putImage, deleteImage, getImageUrl } from '../../lib/imageStore';
import { CURRENCIES, HOME_CURRENCY } from '../../lib/currency';
import { Button } from '../ui/Button';

interface Props {
  mode: 'add' | 'edit';
  garment?: GarmentItem; // required for edit
  active: boolean; // mounted/visible — gates the paste listener
  onClose: () => void;
}

// blob set = newly uploaded; existingKey set = reuse the stored image.
type Slot = { url: string; bgRemoved: boolean; blob?: Blob; existingKey?: string } | null;
type Slots = Record<GarmentAngle, Slot>;

const ANGLE_LABEL: Record<GarmentAngle, string> = { front: 'Front', side: 'Side', back: 'Back' };

export function ItemEditor({ mode, garment, active, onClose }: Props) {
  const { addGarment, updateGarment, customCategories, addCategory } = useWardrobe();
  const { remove } = useBackgroundRemoval();

  const [stage, setStage] = useState<'import' | 'details'>(mode === 'edit' ? 'details' : 'import');
  const [urlInput, setUrlInput] = useState('');
  const [slots, setSlots] = useState<Slots>({ front: null, side: null, back: null });
  const [busy, setBusy] = useState<GarmentAngle | null>(null);
  const [target, setTarget] = useState<GarmentAngle>('front');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('tops');

  // Native <select> can't host inline UI, so "+ Add new category…" prompts.
  function onCategoryChange(value: string) {
    if (value !== '__add__') {
      setCategory(value);
      return;
    }
    const input = window.prompt('New category name (e.g. tennis rackets)');
    if (!input) return;
    const created = addCategory(input);
    if (created) {
      setCategory(created);
    } else {
      // Duplicate of a built-in / existing — just select the existing one.
      const lower = input.trim().toLowerCase();
      const match = [...CATEGORIES, ...customCategories].find((c) => c.toLowerCase() === lower);
      if (match) setCategory(match);
    }
  }
  const [price, setPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState(HOME_CURRENCY);
  const [onSale, setOnSale] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pre-fill from the existing garment when editing.
  useEffect(() => {
    if (mode !== 'edit' || !garment) return;
    setName(garment.name);
    setCategory(garment.category);
    setSourceUrl(garment.sourceUrl ?? '');
    setPrice(garment.price != null ? String(garment.price) : '');
    setPriceCurrency(garment.priceCurrency ?? HOME_CURRENCY);
    setOnSale(garment.salePrice != null);
    setSalePrice(garment.salePrice != null ? String(garment.salePrice) : '');
    let alive = true;
    (async () => {
      const next: Slots = { front: null, side: null, back: null };
      for (const angle of GARMENT_ANGLES) {
        const key = garment.images[angle];
        if (!key) continue;
        const url = await getImageUrl(key);
        if (url) next[angle] = { url, bgRemoved: true, existingKey: key };
      }
      if (alive) setSlots(next);
    })();
    return () => {
      alive = false;
    };
  }, [mode, garment]);

  const ingestToSlot = useCallback(
    async (blob: Blob, slot: GarmentAngle, importedFrom?: string) => {
      setError(null);
      setBusy(slot);
      try {
        const scaled = await downscaleBlob(blob, 1200);
        if (slot === 'front') {
          const dims = await imageDimensions(scaled);
          setCategory((c) => (mode === 'add' ? detectCategory(dims.w, dims.h) : c));
          if (importedFrom) setSourceUrl((u) => u || importedFrom);
        }
        setSlots((s) => ({
          ...s,
          [slot]: { ...(s[slot] ?? {}), blob: scaled, url: URL.createObjectURL(scaled), bgRemoved: false },
        }));
        setStage('details');
        try {
          const cut = await remove(scaled);
          setSlots((s) => ({
            ...s,
            [slot]: { ...(s[slot] ?? {}), blob: cut, url: URL.createObjectURL(cut), bgRemoved: true },
          }));
        } catch {
          setError(`Background removal failed for the ${slot} image — using the original.`);
        }
      } catch (e) {
        setError('Could not read that image.');
        console.error(e);
      } finally {
        setBusy(null);
      }
    },
    [remove, mode],
  );

  async function importFromUrl(value?: string) {
    const url = (value ?? urlInput).trim();
    if (!url) return;
    setError(null);
    try {
      const blob = await urlToBlob(url);
      await ingestToSlot(blob, target, url);
    } catch {
      setError(
        "Couldn't load that URL (often blocked by the store's CORS policy). Copy the image itself and paste it, or save it and drop the file in.",
      );
    }
  }

  async function pasteFromClipboard() {
    setError(null);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          void ingestToSlot(await item.getType(imageType), target);
          return;
        }
        if (item.types.includes('text/plain')) {
          const text = (await (await item.getType('text/plain')).text()).trim();
          if (/^https?:\/\//i.test(text)) {
            setUrlInput(text);
            void importFromUrl(text);
            return;
          }
        }
      }
      setError('No image on the clipboard yet — copy an image first, then paste.');
    } catch {
      setError("Couldn't read the clipboard. Try copying the image again, then press Ctrl/⌘+V.");
    }
  }

  function pickFile(slot: GarmentAngle) {
    setTarget(slot);
    fileRef.current?.click();
  }

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    void ingestToSlot(file, target);
  }

  function clearSlot(slot: GarmentAngle) {
    setSlots((s) => ({ ...s, [slot]: null }));
  }

  async function save() {
    if (!slots.front) return;
    // Build the images set: upload new blobs, keep unchanged existing keys.
    const images = {} as GarmentImages;
    for (const angle of GARMENT_ANGLES) {
      const slot = slots[angle];
      if (!slot) continue;
      const key = slot.blob ? await putImage(slot.blob, 'garment') : slot.existingKey;
      if (key) images[angle] = key;
    }
    // Clean up any images the edit removed or replaced.
    if (mode === 'edit' && garment) {
      const kept = new Set(Object.values(images));
      for (const old of Object.values(garment.images)) {
        if (old && !kept.has(old)) void deleteImage(old);
      }
    }

    const parsedPrice = parseFloat(price);
    const parsedSale = parseFloat(salePrice);
    const fields = {
      name: name.trim() || 'Untitled item',
      category,
      images,
      sourceUrl: sourceUrl.trim() || undefined,
      price: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
      salePrice: onSale && Number.isFinite(parsedSale) ? parsedSale : undefined,
      priceCurrency,
    };

    if (mode === 'edit' && garment) {
      updateGarment(garment.id, fields);
    } else {
      addGarment({ ...fields, tags: [] });
    }
    onClose();
  }

  // Ctrl/⌘+V pastes into the active slot while the editor is open.
  useEffect(() => {
    if (!active) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const it of items) {
          if (it.type.startsWith('image/')) {
            const file = it.getAsFile();
            if (file) {
              e.preventDefault();
              void ingestToSlot(file, target);
              return;
            }
          }
        }
      }
      const intoInput = (e.target as HTMLElement)?.tagName === 'INPUT';
      if (!intoInput) {
        const text = e.clipboardData?.getData('text')?.trim();
        if (text && /^https?:\/\//i.test(text)) {
          e.preventDefault();
          setUrlInput(text);
          void importFromUrl(text);
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target, ingestToSlot]);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {stage === 'import' && mode === 'add' && (
        <div className="space-y-5">
          <div
            className="checker flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-[var(--border-subtle)] py-12 text-center"
            onClick={() => pickFile('front')}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setTarget('front');
              onFiles(e.dataTransfer.files);
            }}
          >
            <UploadCloud className="text-ink-muted" size={28} />
            <p className="text-[14px] font-medium text-ink">Drop an image, click to browse, or paste</p>
            <p className="text-[12px] text-ink-muted">
              Start with the front view · you can add side &amp; back next
            </p>
          </div>

          <button
            onClick={pasteFromClipboard}
            className="press flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-pearl py-2.5 text-[13px] font-medium text-ink hover:bg-canvas"
          >
            <ClipboardPaste size={15} className="text-ink-secondary" />
            Paste copied image
          </button>

          <div className="flex items-center gap-3 text-[12px] text-ink-muted">
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
            or paste an image URL
            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-pill border border-[var(--border-subtle)] bg-input px-4">
              <Link2 size={15} className="text-ink-muted" />
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && importFromUrl()}
                placeholder="https://store.com/product-image.jpg"
                className="w-full bg-transparent py-2.5 text-[14px] outline-none"
              />
            </div>
            <Button onClick={() => importFromUrl()}>Load</Button>
          </div>

          {error && (
            <p className="flex items-start gap-2 text-[13px] text-amber-600">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}

      {stage === 'details' && (
        <div className="mx-auto max-w-2xl space-y-5">
          <div>
            <span className="label-caps mb-2 block">Views</span>
            <div className="grid grid-cols-3 gap-3">
              {GARMENT_ANGLES.map((angle) => {
                const slot = slots[angle];
                const isBusy = busy === angle;
                return (
                  <div key={angle} className="space-y-1">
                    {slot ? (
                      <div className="checker relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-[var(--border-subtle)]">
                        <img
                          src={slot.url}
                          alt={angle}
                          className="max-h-full max-w-full object-contain"
                          style={{ filter: 'drop-shadow(2px 3px 10px rgba(0,0,0,0.2))' }}
                        />
                        <button
                          onClick={() => clearSlot(angle)}
                          className="press absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                          aria-label={`Remove ${angle} image`}
                        >
                          <X size={12} />
                        </button>
                        {isBusy && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                            <Loader2 className="animate-spin text-accent" size={22} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => pickFile(angle)}
                        className="press flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-[var(--border-subtle)] text-ink-muted hover:bg-pearl"
                      >
                        {isBusy ? (
                          <Loader2 className="animate-spin text-accent" size={20} />
                        ) : (
                          <Plus size={18} />
                        )}
                        <span className="text-[11px]">Add {ANGLE_LABEL[angle].toLowerCase()}</span>
                      </button>
                    )}
                    <p className="text-center text-[11px] font-medium text-ink-secondary">
                      {ANGLE_LABEL[angle]}
                      {angle === 'front' && <span className="text-ink-muted"> *</span>}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">
              Front is required. Click a slot, then paste (Ctrl/⌘+V) or pick a file to add or replace it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="label-caps">Item name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Linen overshirt"
                className="rounded-md border border-[var(--border-subtle)] bg-input px-3 py-2 text-[14px] outline-none focus:border-[var(--accent-focus)]"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="label-caps">Category</span>
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="rounded-md border border-[var(--border-subtle)] bg-input px-3 py-2 text-[14px] capitalize outline-none focus:border-[var(--accent-focus)]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
                {customCategories.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
                <option value="__add__">+ Add new category…</option>
              </select>
            </label>
          </div>

          {/* Price + optional sale */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label-caps">{onSale ? 'Original price' : 'Price'} (optional)</span>
              <button
                onClick={() => setOnSale((v) => !v)}
                className={`press rounded-pill px-2.5 py-1 text-[11px] font-medium ${
                  onSale
                    ? 'bg-accent text-[var(--ink-on-accent)]'
                    : 'border border-[var(--border-subtle)] text-ink-secondary hover:bg-pearl'
                }`}
              >
                {onSale ? 'On sale ✓' : '+ Mark on sale'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center rounded-md border border-[var(--border-subtle)] bg-input focus-within:border-[var(--accent-focus)]">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={onSale ? 'Was…' : '0.00'}
                  className="w-full bg-transparent px-3 py-2 text-[14px] outline-none"
                />
                <select
                  value={priceCurrency}
                  onChange={(e) => setPriceCurrency(e.target.value)}
                  className="border-l border-[var(--border-subtle)] bg-transparent px-2 py-2 text-[13px] outline-none"
                  title="Currency"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
              {onSale && (
                <div className="flex items-center rounded-md border border-[var(--accent)] bg-input focus-within:border-[var(--accent-focus)]">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Sale price"
                    className="w-full bg-transparent px-3 py-2 text-[14px] outline-none"
                  />
                  <span className="px-2 text-[12px] text-ink-muted">{priceCurrency}</span>
                </div>
              )}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="label-caps">Product URL (optional)</span>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://store.com/product"
              className="rounded-md border border-[var(--border-subtle)] bg-input px-3 py-2 text-[14px] outline-none focus:border-[var(--accent-focus)]"
            />
          </label>

          {error && (
            <p className="flex items-start gap-2 text-[13px] text-amber-600">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="subtle"
              onClick={() => (mode === 'add' ? setStage('import') : onClose())}
            >
              {mode === 'add' ? 'Back' : 'Cancel'}
            </Button>
            <Button onClick={save} disabled={!slots.front || busy !== null}>
              {mode === 'edit' ? 'Save changes' : 'Add to wardrobe'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

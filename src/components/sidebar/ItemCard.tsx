import { useEffect, useRef, useState } from 'react';
import { MoreVertical, ExternalLink } from 'lucide-react';
import type { GarmentItem } from '../../types';
import { CATEGORIES, GARMENT_ANGLES, type GarmentAngle, type GarmentCategory } from '../../types';
import { useImageUrl } from '../../hooks/useImageUrl';
import { useWardrobe } from '../../store/wardrobeStore';
import { formatMoney, HOME_CURRENCY } from '../../lib/currency';

interface Props {
  garment: GarmentItem;
}

const ANGLE_LABEL: Record<GarmentAngle, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
};

function setDrag(e: React.DragEvent, garmentId: string, angle: GarmentAngle) {
  e.dataTransfer.setData('application/x-garment-id', garmentId);
  e.dataTransfer.setData('application/x-garment-angle', angle);
  e.dataTransfer.effectAllowed = 'copy';
}

/** A draggable thumbnail for one specific view of the garment. */
function ViewChip({
  garmentId,
  angle,
  imageKey,
}: {
  garmentId: string;
  angle: GarmentAngle;
  imageKey: string;
}) {
  const url = useImageUrl(imageKey);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        setDrag(e, garmentId, angle);
      }}
      onClick={(e) => e.stopPropagation()}
      title={`Drag ${ANGLE_LABEL[angle].toLowerCase()} view`}
      className="press flex h-12 w-12 cursor-grab flex-col items-center justify-center rounded-sm border border-[var(--border-subtle)] bg-canvas p-1 active:cursor-grabbing"
    >
      {url && (
        <img src={url} alt={angle} className="max-h-7 max-w-full object-contain" draggable={false} />
      )}
      <span className="text-[8px] uppercase tracking-wide text-ink-muted">{ANGLE_LABEL[angle]}</span>
    </div>
  );
}

export function ItemCard({ garment }: Props) {
  const frontUrl = useImageUrl(garment.images.front);
  const { updateGarment, removeGarment, setEditingGarment } = useWardrobe();

  // Price shown in the currency the item was entered in (no conversion).
  const cur = garment.priceCurrency || HOME_CURRENCY;
  const regularLabel = garment.price != null ? formatMoney(garment.price, cur) : null;
  const onSale =
    garment.salePrice != null &&
    garment.price != null &&
    garment.salePrice < garment.price;
  const saleLabel = garment.salePrice != null ? formatMoney(garment.salePrice, cur) : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const views = GARMENT_ANGLES.filter((a) => garment.images[a]);
  const hasMultiple = views.length > 1;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setCatOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function del() {
    if (window.confirm(`Delete “${garment.name}”? This also removes it from any canvas.`)) {
      removeGarment(garment.id);
    }
    setMenuOpen(false);
  }

  return (
    <div ref={ref} className="group relative min-w-0">
      {/* Card button — drags the front view by default */}
      <div
        draggable
        onDragStart={(e) => setDrag(e, garment.id, 'front')}
        title={`Drag ${garment.name} onto the canvas`}
        className="press relative flex aspect-square cursor-grab items-center justify-center rounded-lg bg-canvas p-3 shadow-[0_4px_14px_rgba(0,0,0,0.10)] ring-1 ring-[var(--border-subtle)] transition-[transform,box-shadow] duration-150 hover:scale-[1.04] hover:shadow-[0_10px_26px_rgba(0,0,0,0.18)] active:cursor-grabbing"
      >
        {frontUrl && (
          <img
            src={frontUrl}
            alt={garment.name}
            className="max-h-full max-w-full object-contain"
            draggable={false}
            style={{ filter: 'drop-shadow(2px 3px 8px rgba(0,0,0,0.16))' }}
          />
        )}

        {/* Hover view-picker: drag any specific view */}
        {hasMultiple && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-1.5 rounded-b-lg bg-gradient-to-t from-black/10 to-transparent p-1.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
            {views.map((a) => (
              <ViewChip
                key={a}
                garmentId={garment.id}
                angle={a}
                imageKey={garment.images[a]!}
              />
            ))}
          </div>
        )}
      </div>

      {/* Name + menu */}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="truncate text-[12px] text-ink-secondary" title={garment.name}>
          {garment.name}
        </span>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="press shrink-0 text-ink-muted opacity-0 hover:text-ink group-hover:opacity-100"
          aria-label="Item menu"
        >
          <MoreVertical size={15} />
        </button>
      </div>

      {regularLabel &&
        (onSale ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px]">
            <span className="shrink-0 rounded-xs bg-[var(--accent-dim)] px-1 text-[10px] font-semibold uppercase text-accent">
              Sale
            </span>
            <span className="whitespace-nowrap font-semibold text-ink">{saleLabel}</span>
            <span className="whitespace-nowrap text-ink-muted line-through">{regularLabel}</span>
          </div>
        ) : (
          <div className="mt-1 text-[12px] font-semibold text-ink">{saleLabel ?? regularLabel}</div>
        ))}

      {garment.sourceUrl && (
        <a
          href={garment.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
        >
          <ExternalLink size={11} /> Product
        </a>
      )}

      {menuOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-md bg-canvas py-1 text-[13px] shadow-panel">
          <button
            className="block w-full px-3 py-2 text-left hover:bg-pearl"
            onClick={() => {
              setEditingGarment(garment.id);
              setMenuOpen(false);
            }}
          >
            Edit item
          </button>
          <button
            className="block w-full px-3 py-2 text-left hover:bg-pearl"
            onClick={() => setCatOpen((v) => !v)}
          >
            Change category
          </button>
          {catOpen && (
            <div className="border-y border-[var(--border-subtle)] bg-parchment">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`block w-full px-5 py-1.5 text-left capitalize hover:bg-pearl ${
                    c === garment.category ? 'text-accent' : ''
                  }`}
                  onClick={() => {
                    updateGarment(garment.id, { category: c as GarmentCategory });
                    setCatOpen(false);
                    setMenuOpen(false);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <button
            className="block w-full px-3 py-2 text-left text-red-500 hover:bg-pearl"
            onClick={del}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

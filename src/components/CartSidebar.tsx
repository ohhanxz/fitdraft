import { useMemo, useState } from 'react';
import { ShoppingBag, ChevronRight, ExternalLink } from 'lucide-react';
import type { GarmentItem } from '../types';
import { useWardrobe } from '../store/wardrobeStore';
import { useImageUrl } from '../hooks/useImageUrl';
import { formatMoney, HOME_CURRENCY } from '../lib/currency';
import { findBodyPart } from '../lib/bodyParts';

/** Effective price = sale price when genuinely discounted, else regular price. */
function effectivePrice(g: GarmentItem): number | null {
  if (g.salePrice != null && (g.price == null || g.salePrice < g.price)) return g.salePrice;
  return g.price ?? g.salePrice ?? null;
}

function CartRow({ garment, qty }: { garment: GarmentItem; qty: number }) {
  const url = useImageUrl(garment.images.front);
  const cur = garment.priceCurrency || HOME_CURRENCY;
  const onSale =
    garment.salePrice != null && garment.price != null && garment.salePrice < garment.price;
  const eff = effectivePrice(garment);

  const body = (
    <>
      <div className="checker flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[var(--border-subtle)]">
        {url && (
          <img src={url} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] text-ink group-hover:underline" title={garment.name}>
            {garment.name}
          </span>
          {qty > 1 && (
            <span className="shrink-0 rounded-xs bg-pearl px-1 text-[10px] font-semibold text-ink-muted">
              ×{qty}
            </span>
          )}
        </div>
        {eff != null ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-ink">{formatMoney(eff, cur)}</span>
            {onSale && (
              <span className="text-[11px] text-ink-muted line-through">
                {formatMoney(garment.price!, cur)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[12px] text-ink-muted">No price set</span>
        )}
      </div>
    </>
  );

  if (garment.sourceUrl) {
    return (
      <a
        href={garment.sourceUrl}
        target="_blank"
        rel="noreferrer"
        title={`Open ${garment.name} product page`}
        className="group flex items-center gap-2.5 rounded-sm py-2 hover:bg-[var(--surface-card-hover)]"
      >
        {body}
        <ExternalLink size={14} className="mr-0.5 shrink-0 text-ink-muted group-hover:text-accent" />
      </a>
    );
  }

  return <div className="flex items-center gap-2.5 py-2">{body}</div>;
}

export function CartSidebar() {
  const { canvasItems, garments } = useWardrobe();
  const [open, setOpen] = useState(true);

  // Unique garments on the canvas + how many times each appears (dupes count once for price).
  const { rows, totals, saved, count } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ci of canvasItems) {
      // Mannequin body parts aren't purchasable — leave them out of the cart.
      if (findBodyPart(ci.garmentId)) continue;
      counts.set(ci.garmentId, (counts.get(ci.garmentId) ?? 0) + 1);
    }

    const rows = [...counts.entries()]
      .map(([id, qty]) => ({ garment: garments.find((g) => g.id === id), qty }))
      .filter((r): r is { garment: GarmentItem; qty: number } => !!r.garment);

    const totals: Record<string, number> = {};
    const saved: Record<string, number> = {};
    for (const { garment } of rows) {
      const eff = effectivePrice(garment);
      if (eff == null) continue;
      const cur = garment.priceCurrency || HOME_CURRENCY;
      totals[cur] = (totals[cur] ?? 0) + eff;
      if (garment.salePrice != null && garment.price != null && garment.salePrice < garment.price) {
        saved[cur] = (saved[cur] ?? 0) + (garment.price - garment.salePrice);
      }
    }
    return { rows, totals, saved, count: counts.size };
  }, [canvasItems, garments]);

  const currencies = Object.keys(totals);

  return (
    <aside
      className={`relative shrink-0 overflow-hidden border-l border-[var(--border-subtle)] bg-panel transition-[width] duration-300 ease-out ${
        open ? 'w-72' : 'w-10'
      }`}
    >
      {/* Panel — right-anchored, fixed width so it reveals smoothly */}
      <div
        className={`absolute inset-y-0 right-0 flex w-72 flex-col transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingBag size={16} className="text-ink-secondary" />
          <span className="label-caps">Cart</span>
          {count > 0 && <span className="text-[12px] text-ink-muted">{count} items</span>}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="press text-ink-muted hover:text-ink"
          aria-label="Hide cart"
          title="Hide cart"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4">
        {rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <ShoppingBag className="text-ink-muted" size={26} />
            <p className="text-[13px] text-ink-secondary">Nothing on the canvas yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {rows.map(({ garment, qty }) => (
              <CartRow key={garment.id} garment={garment} qty={qty} />
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          {currencies.length === 0 ? (
            <p className="text-[12px] text-ink-muted">No prices set on these items.</p>
          ) : (
            currencies.map((cur) => (
              <div key={cur} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink-secondary">Total</span>
                  <span className="font-display text-[18px] text-ink">
                    {formatMoney(totals[cur], cur)}
                  </span>
                </div>
                {saved[cur] > 0 && (
                  <div className="text-right text-[11px] text-accent">
                    You save {formatMoney(saved[cur], cur)}
                  </div>
                )}
              </div>
            ))
          )}
          <p className="mt-2 text-[10px] text-ink-muted">
            Duplicated pieces are counted once.
          </p>
        </div>
      )}
      </div>

      {/* Collapsed rail */}
      <button
        onClick={() => setOpen(true)}
        className={`absolute inset-y-0 right-0 flex w-10 flex-col items-center gap-2 py-3 text-ink-secondary transition-opacity duration-200 hover:text-ink ${
          open ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        title="Open cart"
        aria-label="Open cart"
      >
        <ShoppingBag size={18} />
        {count > 0 && (
          <span className="rounded-full bg-accent px-1.5 text-[10px] font-semibold text-[var(--ink-on-accent)]">
            {count}
          </span>
        )}
      </button>
    </aside>
  );
}

import { useMemo, useState } from 'react';
import { Shirt, PersonStanding, Search, X, Plus } from 'lucide-react';
import { CATEGORIES, IMPORT_TAG } from '../../types';
import { useWardrobe } from '../../store/wardrobeStore';
import { BODY_PARTS } from '../../lib/bodyParts';
import { ItemCard } from './ItemCard';
import { BodyPartCard } from './BodyPartCard';

interface Props {
  onAddItem: () => void;
}

export function WardrobeLibrary({ onAddItem }: Props) {
  const garments = useWardrobe((s) => s.garments);
  const customCategories = useWardrobe((s) => s.customCategories);
  const addCategory = useWardrobe((s) => s.addCategory);
  const removeCategory = useWardrobe((s) => s.removeCategory);
  const [active, setActive] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState('');

  function commitAdd() {
    const created = addCategory(newCat);
    if (created) setActive(created);
    setNewCat('');
    setAdding(false);
  }
  function deleteCat(cat: string) {
    if (!window.confirm(`Delete the “${cat}” category? Items in it move to Accessories.`)) return;
    removeCategory(cat);
    if (active === cat) setActive('all');
  }

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    // Imported canvas-only images (figures/faces/props) aren't wardrobe items.
    const wardrobe = garments.filter((g) => !g.tags.includes(IMPORT_TAG));
    const byCategory =
      active === 'all' || active === 'body'
        ? wardrobe
        : wardrobe.filter((g) => g.category === active);
    if (!q) return byCategory;
    // Match the name or any tag (case-insensitive, substring).
    return byCategory.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [garments, active, q]);

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or tag…"
            aria-label="Search wardrobe"
            className="w-full rounded-pill border border-[var(--border-subtle)] bg-canvas py-1.5 pl-8 pr-7 text-[12px] outline-none placeholder:text-ink-muted focus:border-[var(--accent-focus)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="press absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-muted hover:bg-pearl hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {['all', ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setActive(c)}
            className={`press rounded-pill px-2.5 py-1 text-[11px] capitalize ${
              active === c
                ? 'bg-accent text-[var(--ink-on-accent)]'
                : 'bg-canvas text-ink-secondary hover:bg-pearl'
            }`}
          >
            {c}
          </button>
        ))}

        {/* Custom categories — each removable */}
        {customCategories.map((c) => (
          <div
            key={c}
            className={`press flex items-center gap-1 rounded-pill py-1 pl-2.5 pr-1.5 text-[11px] ${
              active === c
                ? 'bg-accent text-[var(--ink-on-accent)]'
                : 'bg-canvas text-ink-secondary hover:bg-pearl'
            }`}
          >
            <button onClick={() => setActive(c)} className="capitalize">
              {c}
            </button>
            <button
              onClick={() => deleteCat(c)}
              title={`Delete “${c}” category`}
              aria-label={`Delete ${c} category`}
              className="rounded-full p-0.5 opacity-60 hover:opacity-100"
            >
              <X size={11} />
            </button>
          </div>
        ))}

        {/* Add a custom category */}
        {adding ? (
          <input
            autoFocus
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') {
                setNewCat('');
                setAdding(false);
              }
            }}
            onBlur={() => (newCat.trim() ? commitAdd() : setAdding(false))}
            placeholder="New category…"
            className="w-28 rounded-pill border border-[var(--accent-focus)] bg-canvas px-2.5 py-1 text-[11px] outline-none"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            title="Add a custom category"
            aria-label="Add a custom category"
            className="press flex items-center gap-1 rounded-pill border border-dashed border-[var(--border-subtle)] px-2 py-1 text-[11px] text-ink-muted hover:bg-pearl hover:text-ink"
          >
            <Plus size={12} />
          </button>
        )}

        {/* Built-in mannequin parts library */}
        <button
          onClick={() => setActive('body')}
          className={`press flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] ${
            active === 'body'
              ? 'bg-accent text-[var(--ink-on-accent)]'
              : 'bg-canvas text-ink-secondary hover:bg-pearl'
          }`}
        >
          <PersonStanding size={12} /> Body
        </button>
      </div>

      <div className="flex-1 overflow-auto px-3 pb-3">
        {active === 'body' ? (
          <>
            <p className="mb-2 text-[11px] text-ink-muted">
              Default mannequin parts — drag them in to build a figure. They sit behind your
              clothes and aren’t counted in the cart.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {BODY_PARTS.filter((p) => !q || p.name.toLowerCase().includes(q)).map((p) => (
                <BodyPartCard key={p.id} part={p} />
              ))}
            </div>
          </>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <Shirt className="text-ink-muted" size={28} />
            <p className="text-[13px] text-ink-secondary">
              {q
                ? `No items match “${query.trim()}”.`
                : garments.length === 0
                  ? 'Your wardrobe is empty.'
                  : `No ${active} yet.`}
            </p>
            {q ? (
              <button onClick={() => setQuery('')} className="text-[13px] text-accent hover:underline">
                Clear search
              </button>
            ) : (
              <button onClick={onAddItem} className="text-[13px] text-accent hover:underline">
                + Add your first item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((g) => (
              <ItemCard key={g.id} garment={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

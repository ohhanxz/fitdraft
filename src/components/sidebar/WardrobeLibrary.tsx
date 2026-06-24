import { useState } from 'react';
import { Shirt, PersonStanding } from 'lucide-react';
import { CATEGORIES, type GarmentCategory } from '../../types';
import { useWardrobe } from '../../store/wardrobeStore';
import { BODY_PARTS } from '../../lib/bodyParts';
import { ItemCard } from './ItemCard';
import { BodyPartCard } from './BodyPartCard';

interface Props {
  onAddItem: () => void;
}

type Filter = GarmentCategory | 'all' | 'body';

export function WardrobeLibrary({ onAddItem }: Props) {
  const garments = useWardrobe((s) => s.garments);
  const [active, setActive] = useState<Filter>('all');

  const filtered =
    active === 'all' ? garments : garments.filter((g) => g.category === active);

  return (
    <div className="flex h-full flex-col">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {(['all', ...CATEGORIES] as Filter[]).map((c) => (
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
              {BODY_PARTS.map((p) => (
                <BodyPartCard key={p.id} part={p} />
              ))}
            </div>
          </>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <Shirt className="text-ink-muted" size={28} />
            <p className="text-[13px] text-ink-secondary">
              {garments.length === 0 ? 'Your wardrobe is empty.' : `No ${active} yet.`}
            </p>
            <button onClick={onAddItem} className="text-[13px] text-accent hover:underline">
              + Add your first item
            </button>
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

import { Layers } from 'lucide-react';
import { useWardrobe } from '../../store/wardrobeStore';
import { OutfitCard } from './OutfitCard';

interface Props {
  onLoad: (id: string) => void;
}

export function SavedOutfits({ onLoad }: Props) {
  const outfits = useWardrobe((s) => s.outfits);

  if (outfits.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <Layers className="text-ink-muted" size={28} />
        <p className="text-[13px] text-ink-secondary">
          No saved outfits yet. Compose a look and hit Save.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-auto px-3 pb-3">
      {outfits.map((o) => (
        <OutfitCard key={o.id} outfit={o} onLoad={onLoad} />
      ))}
    </div>
  );
}

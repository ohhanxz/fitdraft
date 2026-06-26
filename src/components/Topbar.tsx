import { Plus, Bookmark } from 'lucide-react';
import { Button } from './ui/Button';
import { DemoPrefill } from './DemoPrefill'; // TEMPORARY presentation demo button

interface Props {
  onAddItem: () => void;
  onSaveOutfit: () => void;
  canSave: boolean;
}

export function Topbar({ onAddItem, onSaveOutfit, canSave }: Props) {
  return (
    <header className="flex h-12 items-center justify-between bg-[var(--accent)] pl-4 pr-3 text-[var(--ink-on-dark)]">
      <img src="/logo-white.png?v=2" alt="FitDraft" className="h-8 w-auto object-contain" />

      <div className="flex items-center gap-2">
        {/* TEMPORARY presentation demo loader — remove with the component + json. */}
        <DemoPrefill />
        <Button variant="utility" onClick={onAddItem}>
          <Plus size={15} /> Add Item
        </Button>
        <Button
          variant="primary"
          onClick={onSaveOutfit}
          disabled={!canSave}
          className="!bg-white !text-[var(--accent)]"
        >
          <Bookmark size={14} /> Save
        </Button>
      </div>
    </header>
  );
}

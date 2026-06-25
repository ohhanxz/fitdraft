import { PanelLeft, ChevronLeft } from 'lucide-react';
import { WardrobeLibrary } from './WardrobeLibrary';
import { SavedOutfits } from './SavedOutfits';
import { BackupControls } from './BackupControls';

export type SidebarTab = 'wardrobe' | 'outfits';

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  tab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onAddItem: () => void;
  onLoadOutfit: (id: string) => void;
}

export function Sidebar({ collapsed, onToggle, tab, onTabChange, onAddItem, onLoadOutfit }: Props) {
  return (
    <aside
      className={`relative shrink-0 overflow-hidden border-r border-[var(--border-subtle)] bg-panel transition-[width] duration-300 ease-out ${
        collapsed ? 'w-10' : 'w-[280px]'
      }`}
    >
      {/* Full panel — fixed width so it doesn't reflow while the width animates */}
      <div
        className={`absolute inset-y-0 left-0 flex w-[280px] flex-col transition-opacity duration-200 ${
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-1 p-3">
          <div className="flex flex-1 gap-1">
            {(['wardrobe', 'outfits'] as SidebarTab[]).map((t) => (
              <button
                key={t}
                onClick={() => onTabChange(t)}
                className={`press flex-1 rounded-sm py-1.5 text-[12px] font-semibold capitalize ${
                  tab === t ? 'bg-canvas text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={onToggle}
            className="press shrink-0 rounded-sm p-1.5 text-ink-muted hover:bg-[var(--surface-card-hover)] hover:text-ink"
            title="Hide sidebar (Ctrl+B)"
            aria-label="Hide sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          {tab === 'wardrobe' ? (
            <WardrobeLibrary onAddItem={onAddItem} />
          ) : (
            <SavedOutfits onLoad={onLoadOutfit} />
          )}
        </div>

        <BackupControls />
      </div>

      {/* Collapsed rail */}
      <button
        onClick={onToggle}
        className={`absolute inset-y-0 left-0 flex w-10 flex-col items-center py-3 text-ink-secondary transition-opacity duration-200 hover:text-ink ${
          collapsed ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        title="Open sidebar (Ctrl+B)"
        aria-label="Open sidebar"
      >
        <PanelLeft size={18} />
      </button>
    </aside>
  );
}

import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { Outfit } from '../../types';
import { useImageUrl } from '../../hooks/useImageUrl';
import { getImageUrl } from '../../lib/imageStore';
import { useWardrobe } from '../../store/wardrobeStore';

interface Props {
  outfit: Outfit;
  onLoad: (id: string) => void;
}

export function OutfitCard({ outfit, onLoad }: Props) {
  const thumb = useImageUrl(outfit.thumbnailKey);
  const { renameOutfit, duplicateOutfit, deleteOutfit } = useWardrobe();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function rename() {
    const next = window.prompt('Rename outfit', outfit.name);
    if (next != null) renameOutfit(outfit.id, next.trim() || outfit.name);
    setMenuOpen(false);
  }

  async function exportPng() {
    const url = await getImageUrl(outfit.thumbnailKey);
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outfit.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
    setMenuOpen(false);
  }

  return (
    <div ref={ref} className="group relative">
      <button
        onClick={() => onLoad(outfit.id)}
        className="block w-full overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--canvas-stage)]"
        title={`Load “${outfit.name}”`}
      >
        {thumb ? (
          <img src={thumb} alt={outfit.name} className="h-36 w-full object-contain" />
        ) : (
          <div className="h-36 w-full" />
        )}
      </button>
      <div className="mt-1 flex items-center justify-between">
        <span className="truncate text-[13px] font-medium">{outfit.name}</span>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="press text-ink-muted opacity-0 hover:text-ink group-hover:opacity-100"
          aria-label="Outfit menu"
        >
          <MoreVertical size={15} />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-md bg-canvas py-1 text-[13px] shadow-panel">
          <button className="block w-full px-3 py-2 text-left hover:bg-pearl" onClick={rename}>
            Rename
          </button>
          <button
            className="block w-full px-3 py-2 text-left hover:bg-pearl"
            onClick={() => {
              void duplicateOutfit(outfit.id);
              setMenuOpen(false);
            }}
          >
            Duplicate
          </button>
          <button
            className="block w-full px-3 py-2 text-left hover:bg-pearl"
            onClick={exportPng}
          >
            Export PNG
          </button>
          <button
            className="block w-full px-3 py-2 text-left text-red-500 hover:bg-pearl"
            onClick={() => {
              if (window.confirm(`Delete “${outfit.name}”?`)) deleteOutfit(outfit.id);
              setMenuOpen(false);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Layers, RefreshCw, Pencil, Download, Check, Trash2 } from 'lucide-react';
import type { Outfit } from '../types';
import { useWardrobe } from '../store/wardrobeStore';
import { useImageUrl } from '../hooks/useImageUrl';
import { getImageUrl } from '../lib/imageStore';
import { downloadImageAs } from '../lib/imageUtils';

interface Props {
  open: boolean;
  rebuilding: boolean;
  onRebuild: () => void;
  onClose: () => void;
  onPick: (id: string) => void;
}

const SHUFFLE_MS = 3000;
const RESUME_MS = 6000;

function OutfitFace({ outfit }: { outfit: Outfit }) {
  const thumb = useImageUrl(outfit.thumbnailKey);
  if (!thumb) return null;
  // Bare outfit PNG — transparent background, so looks overlap cleanly.
  return (
    <img src={thumb} alt={outfit.name} className="h-full w-full object-contain" draggable={false} />
  );
}

export function DresserCarousel({ open, rebuilding, onRebuild, onClose, onPick }: Props) {
  const outfits = useWardrobe((s) => s.outfits);
  const renameOutfit = useWardrobe((s) => s.renameOutfit);
  const deleteOutfit = useWardrobe((s) => s.deleteOutfit);
  const [active, setActive] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const hoverRef = useRef(false);
  const dragRef = useRef<{ x: number; moved: boolean } | null>(null);
  // Mirror exportOpen for the window keydown handler (avoids re-binding it).
  const exportOpenRef = useRef(false);
  exportOpenRef.current = exportOpen;

  // Auto-shuffle pause control.
  const pausedRef = useRef(false);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearResume = () => {
    if (resumeRef.current) {
      clearTimeout(resumeRef.current);
      resumeRef.current = null;
    }
  };
  // Manual browse → pause, then resume after 6s of no interaction.
  const pauseFor6s = () => {
    pausedRef.current = true;
    clearResume();
    resumeRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, RESUME_MS);
  };
  // Rename / export → pause and stay paused (no auto-resume).
  const pauseSticky = () => {
    pausedRef.current = true;
    clearResume();
  };

  const n = outfits.length;
  const clampActive = (i: number) => (n ? ((i % n) + n) % n : 0);
  const activeOutfit = n ? outfits[clampActive(active)] : null;

  useEffect(() => () => clearResume(), []);

  // Fresh start whenever the dresser opens.
  useEffect(() => {
    if (open) {
      pausedRef.current = false;
      clearResume();
    }
  }, [open]);

  useEffect(() => {
    if (active >= n) setActive(0);
  }, [n, active]);

  // Cancel an in-progress rename if the centred outfit changes.
  useEffect(() => {
    setEditingName(false);
  }, [active]);

  // Auto-shuffle (skips while paused or hovered).
  useEffect(() => {
    if (!open || n < 2) return;
    const id = setInterval(() => {
      if (!pausedRef.current && !hoverRef.current) setActive((a) => clampActive(a + 1));
    }, SHUFFLE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, n]);

  // Manual navigation — pauses auto-shuffle for 6s.
  const go = (delta: number) => {
    setActive((a) => clampActive(a + delta));
    setEditingName(false);
    pauseFor6s();
  };
  const goTo = (i: number) => {
    setActive(i);
    setEditingName(false);
    pauseFor6s();
  };

  // Arrow-key navigation.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // While the export dialog is open it owns the keyboard: Escape closes it
      // (not the whole dresser) and arrows don't browse.
      if (exportOpenRef.current) {
        if (e.key === 'Escape') setExportOpen(false);
        return;
      }
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, n]);

  function startRename() {
    if (!activeOutfit) return;
    setNameDraft(activeOutfit.name);
    setEditingName(true);
    pauseSticky();
  }
  function commitRename() {
    if (activeOutfit) renameOutfit(activeOutfit.id, nameDraft.trim() || activeOutfit.name);
    setEditingName(false);
  }

  function deleteActive() {
    if (!activeOutfit) return;
    pauseSticky();
    if (!window.confirm(`Delete “${activeOutfit.name}”? This can’t be undone.`)) return;
    deleteOutfit(activeOutfit.id);
    // Land on a still-valid neighbour (array shrinks by one).
    setActive((a) => Math.max(0, Math.min(a, n - 2)));
  }

  async function exportActive(format: 'jpeg' | 'png') {
    pauseSticky();
    if (!activeOutfit) return;
    const url = await getImageUrl(activeOutfit.thumbnailKey);
    if (!url) return;
    const name = activeOutfit.name.replace(/\s+/g, '-').toLowerCase() || 'outfit';
    await downloadImageAs(url, name, format);
  }

  return (
    <div
      className={`absolute inset-x-0 bottom-0 top-12 z-30 flex flex-col overflow-hidden bg-[var(--canvas-stage)] transition-[opacity,transform] duration-[420ms] ease-out [will-change:opacity,transform] ${
        open ? 'opacity-100' : 'pointer-events-none scale-[1.02] opacity-0'
      }`}
    >
      {/* Atmosphere: Z-blue glow + ghosted wordmark */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[38%] h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(0,0,197,0.10), transparent)' }}
        />
        <span
          className="watermark absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[16vw]"
          style={{ color: 'rgba(0,0,197,0.05)' }}
        >
          DRESSER
        </span>
      </div>

      <div className="relative flex items-center justify-between px-6 py-4">
        <div>
          <h2 className="font-display text-[30px]">The Dresser</h2>
          <p className="text-[12px] text-ink-muted">
            {n > 0 ? 'Click the centre look to open it · drag or use arrows to browse' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {n > 0 && (
            <button
              onClick={onRebuild}
              disabled={rebuilding}
              title="Re-render thumbnails on a transparent background"
              className="press flex items-center gap-1.5 rounded-pill border border-[var(--border-subtle)] bg-canvas px-3 py-1.5 text-[13px] hover:bg-pearl disabled:opacity-50"
            >
              <RefreshCw size={14} className={rebuilding ? 'animate-spin' : ''} />
              {rebuilding ? 'Rebuilding…' : 'Rebuild thumbnails'}
            </button>
          )}
          <button
            onClick={onClose}
            className="press flex items-center gap-1.5 rounded-pill border border-[var(--border-subtle)] bg-canvas px-3 py-1.5 text-[13px] hover:bg-pearl"
          >
            <X size={15} /> Close
          </button>
        </div>
      </div>

      {n === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Layers className="text-ink-muted" size={32} />
          <p className="text-[14px] text-ink-secondary">No saved outfits yet.</p>
          <p className="text-[12px] text-ink-muted">
            Compose a look on the canvas and hit Save to add it to the dresser.
          </p>
        </div>
      ) : (
        <div
          className="relative flex flex-1 select-none items-center justify-center overflow-hidden"
          onMouseEnter={() => (hoverRef.current = true)}
          onMouseLeave={() => {
            hoverRef.current = false;
            dragRef.current = null;
          }}
          onMouseDown={(e) => (dragRef.current = { x: e.clientX, moved: false })}
          onMouseMove={(e) => {
            const d = dragRef.current;
            if (!d) return;
            const dx = e.clientX - d.x;
            if (Math.abs(dx) > 70) {
              go(dx < 0 ? 1 : -1);
              dragRef.current = { x: e.clientX, moved: true };
            }
          }}
          onMouseUp={() => (dragRef.current = null)}
        >
          {outfits.map((o, i) => {
            const off = i - active;
            const abs = Math.abs(off);
            const hidden = abs > 3;
            return (
              <button
                key={o.id}
                onClick={() => {
                  if (dragRef.current?.moved) return;
                  if (i === active) onPick(o.id);
                  else goTo(i);
                }}
                className="absolute h-[62%] max-h-[560px] w-[44%] max-w-[460px] transition-all duration-500 ease-out"
                style={{
                  transform: `translateX(${off * 150}px) translateY(${abs * 26}px) rotate(${off * 7}deg) scale(${Math.max(0.55, 1 - abs * 0.13)})`,
                  zIndex: 100 - abs,
                  opacity: hidden ? 0 : 1,
                  // Must go inert when the dresser is closed, otherwise these
                  // invisible cards float over the canvas and steal clicks.
                  pointerEvents: hidden || !open ? 'none' : 'auto',
                }}
                title={i === active ? `Open “${o.name}”` : o.name}
              >
                <OutfitFace outfit={o} />
              </button>
            );
          })}

          {n > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                className="press absolute left-6 z-[200] flex h-11 w-11 items-center justify-center rounded-full bg-canvas shadow-panel ring-1 ring-[var(--border-subtle)] hover:bg-pearl"
                aria-label="Previous"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => go(1)}
                className="press absolute right-6 z-[200] flex h-11 w-11 items-center justify-center rounded-full bg-canvas shadow-panel ring-1 ring-[var(--border-subtle)] hover:bg-pearl"
                aria-label="Next"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      )}

      {n > 0 && (
        <div className="flex flex-col items-center gap-2 pt-2">
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingName(false);
              }}
              onBlur={commitRename}
              className="rounded-md border border-[var(--border-subtle)] bg-input px-3 py-1 text-center text-[14px] font-medium outline-none focus:border-[var(--accent-focus)]"
            />
          ) : (
            <span className="text-[14px] font-medium text-ink">{activeOutfit?.name}</span>
          )}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={editingName ? commitRename : startRename}
              title={editingName ? 'Save name' : 'Rename outfit'}
              className="press flex items-center gap-1 rounded-pill border border-[var(--border-subtle)] bg-canvas px-2.5 py-1 text-[12px] text-ink-secondary hover:bg-pearl"
            >
              {editingName ? <Check size={12} /> : <Pencil size={12} />}
              {editingName ? 'Save' : 'Rename'}
            </button>
            <button
              onClick={() => {
                pauseSticky();
                setExportOpen(true);
              }}
              title="Export this outfit"
              className="press flex items-center gap-1 rounded-pill border border-[var(--border-subtle)] bg-canvas px-2.5 py-1 text-[12px] text-ink-secondary hover:bg-pearl"
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={deleteActive}
              title="Delete this outfit"
              className="press flex items-center gap-1 rounded-pill border border-[var(--border-subtle)] bg-canvas px-2.5 py-1 text-[12px] text-ink-secondary hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {n > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-4">
          {outfits.map((o, i) => (
            <button
              key={o.id}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-5 bg-accent' : 'w-1.5 bg-[var(--border-subtle)]'
              }`}
              aria-label={`Go to ${o.name}`}
            />
          ))}
        </div>
      )}

      {/* Export format chooser — blurs the dresser behind it. Must sit above the
          fanned cards (inline z up to 100) and the nav arrows (z-200). */}
      {exportOpen && (
        <div
          className="absolute inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-md"
          onClick={() => setExportOpen(false)}
        >
          <div
            className="w-[300px] rounded-xl border border-[var(--border-subtle)] bg-canvas p-5 shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-[18px] leading-tight">Export look</h3>
            <p className="mt-0.5 truncate text-[12px] text-ink-muted" title={activeOutfit?.name}>
              {activeOutfit?.name}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  void exportActive('jpeg');
                  setExportOpen(false);
                }}
                className="press flex flex-col items-center gap-1 rounded-lg border border-accent bg-[var(--accent-dim)] px-3 py-3 text-accent hover:brightness-95"
              >
                <Download size={18} />
                <span className="text-[13px] font-semibold">JPG</span>
                <span className="text-[10px] leading-tight text-accent">White background</span>
              </button>
              <button
                onClick={() => {
                  void exportActive('png');
                  setExportOpen(false);
                }}
                className="press flex flex-col items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-canvas px-3 py-3 text-ink-secondary hover:bg-pearl"
              >
                <Download size={18} />
                <span className="text-[13px] font-semibold">PNG</span>
                <span className="text-[10px] leading-tight text-ink-muted">Transparent</span>
              </button>
            </div>
            <button
              onClick={() => setExportOpen(false)}
              className="press mt-3 w-full rounded-pill py-1.5 text-[12px] text-ink-muted hover:bg-pearl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import {
  Eye,
  EyeOff,
  GripVertical,
  Trash2,
  Layers,
  ChevronDown,
  Lock,
  LockOpen,
  Copy,
} from 'lucide-react';
import type { CanvasItem, GarmentItem } from '../../types';
import { useWardrobe } from '../../store/wardrobeStore';
import { useImageUrl } from '../../hooks/useImageUrl';
import { BODY_PARTS } from '../../lib/bodyParts';

function LayerRow({
  item,
  garment,
  selected,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  item: CanvasItem;
  garment: GarmentItem;
  selected: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}) {
  const url = useImageUrl(garment.images.front);
  const { setSelectedItem, updateCanvasItem, removeFromCanvas, duplicateCanvasItem } =
    useWardrobe();

  return (
    <div
      draggable={!item.locked}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => !item.locked && setSelectedItem(item.id)}
      className={`group flex items-center gap-2 rounded-sm px-1.5 py-1.5 ${
        item.locked ? 'cursor-default' : 'cursor-pointer'
      } ${
        selected ? 'bg-[var(--accent-dim)] ring-1 ring-[var(--border-active)]' : 'hover:bg-pearl'
      }`}
    >
      <GripVertical
        size={14}
        className={`shrink-0 ${item.locked ? 'text-ink-muted/40' : 'cursor-grab text-ink-muted'}`}
      />
      <div className="checker flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-[var(--border-subtle)]">
        {url && (
          <img src={url} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
        )}
      </div>
      <span
        className={`flex-1 truncate text-[12px] ${item.visible ? 'text-ink' : 'text-ink-muted line-through'}`}
      >
        {garment.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          duplicateCanvasItem(item.id);
        }}
        className="press shrink-0 text-ink-muted opacity-0 hover:text-ink group-hover:opacity-100"
        aria-label="Duplicate layer"
        title="Duplicate (places a copy beside it)"
      >
        <Copy size={14} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          updateCanvasItem(item.id, { locked: !item.locked });
          if (!item.locked && selected) setSelectedItem(null);
        }}
        className={`press shrink-0 ${item.locked ? 'text-accent' : 'text-ink-muted opacity-0 hover:text-ink group-hover:opacity-100'}`}
        aria-label={item.locked ? 'Unlock' : 'Lock'}
        title={item.locked ? 'Unlock layer' : 'Lock layer'}
      >
        {item.locked ? <Lock size={14} /> : <LockOpen size={14} />}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          updateCanvasItem(item.id, { visible: !item.visible });
        }}
        className="press shrink-0 text-ink-muted hover:text-ink"
        aria-label={item.visible ? 'Hide' : 'Show'}
      >
        {item.visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeFromCanvas(item.id);
        }}
        disabled={item.locked}
        className="press shrink-0 text-ink-muted opacity-0 hover:text-red-500 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
        aria-label="Remove from canvas"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export function LayerPanel() {
  const { canvasItems, garments, selectedItemIds, updateCanvasItem } = useWardrobe();
  const [collapsed, setCollapsed] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Frontmost (highest zIndex) first — matches what the user sees on top.
  const ordered = [...canvasItems].sort((a, b) => b.zIndex - a.zIndex);
  const garmentById = Object.fromEntries(
    [...garments, ...BODY_PARTS].map((g) => [g.id, g]),
  );

  if (canvasItems.length === 0) return null;

  function reorder(from: number, to: number) {
    if (from === to) return;
    const list = [...ordered];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    // Reassign zIndex so the top row is frontmost.
    const n = list.length;
    list.forEach((item, i) => updateCanvasItem(item.id, { zIndex: n - i }));
  }

  return (
    <div className="absolute left-4 top-4 w-60 overflow-hidden rounded-md border border-[var(--border-subtle)] bg-canvas/90 shadow-panel backdrop-blur-md">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-ink"
      >
        <Layers size={15} className="text-ink-secondary" />
        <span className="label-caps flex-1 text-left">Layers</span>
        <ChevronDown
          size={15}
          className={`text-ink-muted transition-transform ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>
      {/* Smooth auto-height open/close (grid-rows 0fr↔1fr trick) */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="max-h-[50vh] space-y-0.5 overflow-auto border-t border-[var(--border-subtle)] p-1.5">
            {ordered.map((item, i) => {
              const garment = garmentById[item.garmentId];
              if (!garment) return null;
              return (
                <LayerRow
                  key={item.id}
                  item={item}
                  garment={garment}
                  selected={selectedItemIds.includes(item.id)}
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) reorder(dragIndex, i);
                    setDragIndex(null);
                  }}
                />
              );
            })}
            <p className="px-1.5 py-1 text-[10px] text-ink-muted">Drag to reorder · top = front</p>
          </div>
        </div>
      </div>
    </div>
  );
}

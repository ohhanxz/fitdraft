import type { GarmentItem } from '../../types';
import { useImageUrl } from '../../hooks/useImageUrl';

interface Props {
  part: GarmentItem;
}

/** A read-only draggable card for a built-in mannequin part. */
export function BodyPartCard({ part }: Props) {
  const url = useImageUrl(part.images.front);
  return (
    <div className="group min-w-0">
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-garment-id', part.id);
          e.dataTransfer.setData('application/x-garment-angle', 'front');
          e.dataTransfer.effectAllowed = 'copy';
        }}
        title={`Drag ${part.name} onto the canvas`}
        className="press flex aspect-square cursor-grab items-center justify-center rounded-lg bg-canvas p-3 shadow-[0_4px_14px_rgba(0,0,0,0.10)] ring-1 ring-[var(--border-subtle)] transition-[transform,box-shadow] duration-150 hover:scale-[1.04] hover:shadow-[0_10px_26px_rgba(0,0,0,0.18)] active:cursor-grabbing"
      >
        {url && (
          <img
            src={url}
            alt={part.name}
            className="max-h-full max-w-full object-contain"
            draggable={false}
            style={{ filter: 'drop-shadow(2px 3px 8px rgba(0,0,0,0.16))' }}
          />
        )}
      </div>
      <span className="mt-1.5 block truncate text-[12px] text-ink-secondary" title={part.name}>
        {part.name}
      </span>
    </div>
  );
}

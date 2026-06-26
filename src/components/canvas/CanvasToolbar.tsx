import {
  MousePointer2,
  Eraser,
  FlipHorizontal2,
  FlipVertical2,
  PersonStanding,
  Droplet,
  ImagePlus,
} from 'lucide-react';
import type { FigureGuide } from '../../store/wardrobeStore';

export type Tool = 'move' | 'erase';

interface Props {
  tool: Tool;
  setTool: (t: Tool) => void;
  brush: number;
  setBrush: (n: number) => void;
  opacity: number; // 0–1 opacity of the current selection
  setOpacity: (n: number) => void;
  onImport: () => void;
  onFlipH: () => void;
  onFlipV: () => void;
  hasSelection: boolean; // ≥1 unlocked selected (flip / opacity)
  canErase: boolean; // exactly one unlocked selected
  figure: FigureGuide;
  setFigure: (f: FigureGuide) => void;
}

function ToolBtn({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`press flex h-9 w-9 items-center justify-center rounded-sm disabled:opacity-30 ${
        active ? 'bg-accent text-[var(--ink-on-accent)]' : 'text-ink-secondary hover:bg-black/5 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export function CanvasToolbar({
  tool,
  setTool,
  brush,
  setBrush,
  opacity,
  setOpacity,
  onImport,
  onFlipH,
  onFlipV,
  hasSelection,
  canErase,
  figure,
  setFigure,
}: Props) {
  return (
    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-pill border border-[var(--border-subtle)] bg-white/85 px-1.5 py-1 shadow-panel backdrop-blur-md">
      <ToolBtn title="Import an image onto the canvas (figure, face, prop…)" onClick={onImport}>
        <ImagePlus size={16} />
      </ToolBtn>
      <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />
      <ToolBtn active={tool === 'move'} title="Move / select" onClick={() => setTool('move')}>
        <MousePointer2 size={16} />
      </ToolBtn>
      <ToolBtn
        active={tool === 'erase'}
        disabled={!canErase}
        title={canErase ? 'Erase (drag on the selected layer)' : 'Select one layer to erase'}
        onClick={() => setTool('erase')}
      >
        <Eraser size={16} />
      </ToolBtn>
      <ToolBtn disabled={!hasSelection} title="Flip horizontally" onClick={onFlipH}>
        <FlipHorizontal2 size={16} />
      </ToolBtn>
      <ToolBtn disabled={!hasSelection} title="Flip vertically" onClick={onFlipV}>
        <FlipVertical2 size={16} />
      </ToolBtn>

      {tool === 'erase' && (
        <div className="flex items-center gap-1.5 pl-1.5">
          <span className="text-[11px] text-ink-muted">Brush</span>
          <input
            type="range"
            min={8}
            max={120}
            value={brush}
            onChange={(e) => setBrush(Number(e.target.value))}
            className="h-1 w-20 accent-[var(--accent)]"
          />
        </div>
      )}

      {/* Opacity of the selected layer(s) — move mode only. */}
      {tool === 'move' && hasSelection && (
        <div className="flex items-center gap-1.5 pl-1.5" title="Layer transparency">
          <Droplet size={14} className="text-ink-muted" />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="h-1 w-20 accent-[var(--accent)]"
          />
          <span className="w-7 text-right text-[11px] tabular-nums text-ink-muted">
            {Math.round(opacity * 100)}%
          </span>
        </div>
      )}

      <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />

      {/* Background figure guide */}
      <PersonStanding size={15} className="text-ink-muted" />
      <div className="flex items-center rounded-pill bg-pearl p-0.5">
        {(
          [
            ['off', 'Off'],
            ['female', 'F'],
            ['male', 'M'],
          ] as [FigureGuide, string][]
        ).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFigure(val)}
            title={`Figure guide: ${val}`}
            className={`press rounded-pill px-2.5 py-1 text-[12px] font-medium ${
              figure === val ? 'bg-accent text-[var(--ink-on-accent)]' : 'text-ink-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

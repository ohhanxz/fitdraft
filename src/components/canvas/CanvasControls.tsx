import { ZoomIn, ZoomOut, Maximize, Undo2, Redo2, Trash2, Download } from 'lucide-react';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDownload: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  canDownload: boolean;
}

function Ctl({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="press flex h-9 w-9 items-center justify-center rounded-sm text-ink-secondary hover:bg-black/5 hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function CanvasControls(props: Props) {
  return (
    <div className="absolute right-4 top-4 flex items-center gap-1 rounded-pill border border-[var(--border-subtle)] bg-white/80 px-2 py-1 shadow-panel backdrop-blur-md">
      <Ctl onClick={props.onUndo} disabled={!props.canUndo} title="Undo (Ctrl+Z)">
        <Undo2 size={16} />
      </Ctl>
      <Ctl onClick={props.onRedo} disabled={!props.canRedo} title="Redo (Ctrl+Shift+Z)">
        <Redo2 size={16} />
      </Ctl>
      <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />
      <Ctl onClick={props.onZoomOut} title="Zoom out">
        <ZoomOut size={16} />
      </Ctl>
      <Ctl onClick={props.onReset} title="Reset view">
        <Maximize size={16} />
      </Ctl>
      <Ctl onClick={props.onZoomIn} title="Zoom in">
        <ZoomIn size={16} />
      </Ctl>
      <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />
      <Ctl onClick={props.onClear} disabled={!props.canClear} title="Clear canvas">
        <Trash2 size={16} />
      </Ctl>
    </div>
  );
}

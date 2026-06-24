import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  /** When true, clicking the backdrop / pressing Esc does nothing (e.g. first-run setup). */
  mandatory?: boolean;
  size?: 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, mandatory, size = 'md' }: Props) {
  useEffect(() => {
    if (!open || mandatory) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, mandatory, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={() => !mandatory && onClose?.()}
    >
      <div
        className={`relative w-full ${size === 'lg' ? 'max-w-3xl' : 'max-w-md'} max-h-[90vh] overflow-auto rounded-lg bg-canvas shadow-panel`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || !mandatory) && (
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
            <h2 className="font-display text-[20px]">{title}</h2>
            {!mandatory && (
              <button
                className="press text-ink-muted hover:text-ink"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

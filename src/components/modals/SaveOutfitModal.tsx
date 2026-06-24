import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props {
  open: boolean;
  defaultName: string;
  previewUrl: string | null;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export function SaveOutfitModal({ open, defaultName, previewUrl, onClose, onConfirm }: Props) {
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  return (
    <Modal open={open} onClose={onClose} title="Save outfit">
      <div className="space-y-4">
        {previewUrl && (
          <div className="flex justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--canvas-stage)] p-3">
            <img src={previewUrl} alt="outfit preview" className="max-h-52 object-contain" />
          </div>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="label-caps">Outfit name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onConfirm(name.trim() || defaultName)}
            className="rounded-md border border-[var(--border-subtle)] bg-input px-3 py-2 text-[14px] outline-none focus:border-[var(--accent-focus)]"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(name.trim() || defaultName)}>Save outfit</Button>
        </div>
      </div>
    </Modal>
  );
}

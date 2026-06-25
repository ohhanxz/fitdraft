import { useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { exportBackup, importBackup } from '../../lib/backup';

/**
 * Wardrobe backup / restore. Exports everything (garments, outfits, images) to
 * a JSON file the user can re-import on another browser or after clearing data.
 */
export function BackupControls() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | 'export' | 'import'>(null);

  async function doExport() {
    if (busy) return;
    setBusy('export');
    try {
      await exportBackup();
    } catch (err) {
      window.alert(`Backup failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setBusy(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file || busy) return;
    setBusy('import');
    try {
      const s = await importBackup(file);
      if (s.addedGarments === 0 && s.addedOutfits === 0) {
        window.alert('Nothing new to restore — everything in that backup is already here.');
      } else {
        window.alert(
          `Restored ${s.addedGarments} item(s) and ${s.addedOutfits} outfit(s).` +
            (s.skippedGarments + s.skippedOutfits > 0
              ? `\n${s.skippedGarments + s.skippedOutfits} already present were skipped.`
              : ''),
        );
      }
    } catch (err) {
      window.alert(`Restore failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5 border-t border-[var(--border-subtle)] px-3 py-2.5">
      <button
        onClick={doExport}
        disabled={!!busy}
        title="Download a backup of your whole wardrobe"
        className="press flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-[var(--border-subtle)] bg-canvas py-1.5 text-[11px] text-ink-secondary hover:bg-pearl disabled:opacity-50"
      >
        {busy === 'export' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        Backup
      </button>
      <button
        onClick={() => !busy && fileRef.current?.click()}
        disabled={!!busy}
        title="Restore from a backup file"
        className="press flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-[var(--border-subtle)] bg-canvas py-1.5 text-[11px] text-ink-secondary hover:bg-pearl disabled:opacity-50"
      >
        {busy === 'import' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
        Restore
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={onFile}
        className="hidden"
      />
    </div>
  );
}

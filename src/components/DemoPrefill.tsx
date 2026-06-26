import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { importBackup } from '../lib/backup';

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY — presentation-only one-click loader for the demo wardrobe.
// Loads public/demo-wardrobe.json so visitors don't have to import it manually.
// To remove later, delete: this file, its <DemoPrefill /> mount in App.tsx,
// and public/demo-wardrobe.json.
// ─────────────────────────────────────────────────────────────────────────────
export function DemoPrefill() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle');

  async function load() {
    if (phase !== 'idle') return;
    setPhase('loading');
    try {
      const res = await fetch('/demo-wardrobe.json');
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], 'demo-wardrobe.json', { type: 'application/json' });
      await importBackup(file);
      setPhase('done');
    } catch (err) {
      window.alert(
        `Could not load the demo wardrobe: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
      setPhase('idle');
    }
  }

  if (phase === 'done') return null; // wardrobe is now populated — hide the button

  return (
    <button
      onClick={load}
      disabled={phase === 'loading'}
      className="press fixed left-1/2 top-[60px] z-40 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-accent px-4 py-2 text-[13px] font-semibold text-[var(--ink-on-accent)] shadow-panel hover:brightness-110 disabled:opacity-70"
      title="Load the demo wardrobe and outfits (presentation only)"
    >
      {phase === 'loading' ? (
        <>
          <Loader2 size={15} className="animate-spin" /> Loading demo…
        </>
      ) : (
        <>
          <Sparkles size={15} /> Load demo wardrobe
        </>
      )}
    </button>
  );
}

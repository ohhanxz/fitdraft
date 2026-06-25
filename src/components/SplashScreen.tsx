import { useEffect, useRef, useState } from 'react';

// Startup splash: the FitDraft mark over a Z-blue field with a progress bar
// that fills to 100%, then lifts away to reveal the app. Shown once per load.

const FILL_MS = 1500; // time for the bar to reach 100%
const EXIT_MS = 480; // fade/scale-out duration

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type Phase = 'loading' | 'exiting' | 'done';

export function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>(() =>
    // Respect users who prefer reduced motion — skip the animation entirely.
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'done' : 'loading',
  );
  const rafRef = useRef<number>();

  // Drive the fill with requestAnimationFrame for a smooth, eased progress.
  useEffect(() => {
    if (phase !== 'loading') return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / FILL_MS);
      setProgress(easeOutCubic(t) * 100);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setPhase('exiting');
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  // After the fade-out finishes, unmount.
  useEffect(() => {
    if (phase !== 'exiting') return;
    const id = window.setTimeout(() => setPhase('done'), EXIT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === 'done') return null;
  const exiting = phase === 'exiting';

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 34,
        background: '#0000c5',
        transition: `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms ease`,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.06)' : 'scale(1)',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
      <img
        src="/logo-mark.png"
        alt="FitDraft"
        draggable={false}
        style={{
          width: 128,
          height: 'auto',
          // Recolour the black mark to white over the blue field.
          filter: 'brightness(0) invert(1)',
          animation: 'splash-pop 600ms cubic-bezier(0.16,1,0.3,1) both',
        }}
      />
      <div
        style={{
          width: 220,
          height: 4,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.22)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: '#fff',
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

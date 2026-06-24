import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'utility' | 'subtle';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const base =
  'press inline-flex items-center justify-center gap-2 font-medium select-none disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-focus)]';

const variants: Record<Variant, string> = {
  // Signature Action-Blue pill
  primary: 'bg-accent text-[var(--ink-on-accent)] rounded-pill px-5 py-2 text-[13px]',
  // Ghost pill (transparent w/ accent border)
  ghost:
    'bg-transparent text-accent border border-accent rounded-pill px-5 py-2 text-[13px]',
  // Compact dark utility rect (used on the black topbar)
  utility:
    'bg-[var(--ink)] text-[var(--ink-on-dark)] rounded-sm px-[15px] py-2 text-[13px]',
  // Quiet text-ish button on light surfaces
  subtle:
    'bg-transparent text-ink-secondary hover:text-ink rounded-sm px-3 py-1.5 text-[13px]',
};

export function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

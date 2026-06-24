import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...rest }: Props) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="label-caps">{label}</span>}
      <input
        className={`bg-input text-ink rounded-md border border-[var(--border-subtle)] px-3 py-2 text-[14px] outline-none transition-colors focus:border-[var(--accent-focus)] placeholder:text-ink-muted ${className}`}
        {...rest}
      />
    </label>
  );
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accent — single interactive color (Action Blue), Sky variant on dark
        accent: 'var(--accent)',
        'accent-on-dark': 'var(--accent-on-dark)',
        'accent-dim': 'var(--accent-dim)',
        // Surfaces
        'surface-black': 'var(--surface-black)',
        canvas: 'var(--canvas)',
        parchment: 'var(--canvas-parchment)',
        pearl: 'var(--surface-pearl)',
        panel: 'var(--surface-panel)',
        card: 'var(--surface-card)',
        'card-hover': 'var(--surface-card-hover)',
        'canvas-void': 'var(--canvas-void)',
        input: 'var(--surface-input)',
        // Ink
        ink: 'var(--ink)',
        'ink-secondary': 'var(--ink-secondary)',
        'ink-muted': 'var(--ink-muted)',
        'ink-on-accent': 'var(--ink-on-accent)',
        'ink-on-dark': 'var(--ink-on-dark)',
        // Borders
        hairline: 'var(--border-subtle)',
        'border-active': 'var(--border-active)',
      },
      fontFamily: {
        sans: ['Space Mono', 'Courier New', 'monospace'],
        mono: ['Space Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        xs: '5px',
        sm: '8px',
        md: '11px',
        lg: '18px',
        pill: '9999px',
      },
      boxShadow: {
        // The single product-shadow, reserved for garment/mannequin renders
        product: '3px 5px 30px 0 rgba(0,0,0,0.22)',
        panel: '0 8px 32px rgba(0,0,0,0.48)',
      },
      transitionTimingFunction: {
        press: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

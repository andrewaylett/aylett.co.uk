/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontSize: {
        smaller: 'smaller',
        x250: '250%',
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          'var(--font-plex-sans)',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      gridTemplateColumns: {
        centre: '1fr min(65ch, 90%, 100% - 2rem) 1fr',
      },
      gridColumn: {
        2: '2',
      },
    },
  },
  plugins: [],
};

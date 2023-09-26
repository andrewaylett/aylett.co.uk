/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      gridTemplateColumns: {
        centre: '1fr min(65ch, 100%) 1fr',
      },
      gridColumn: {
        2: '2',
      },
      padding: {
        vmin: 'clamp(0.5rem, 1vmin, 2rem)',
      },
    },
  },
  plugins: [],
};

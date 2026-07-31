/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1C2321',
          light: '#28312E',
          lighter: '#37423D',
        },
        paper: {
          DEFAULT: '#EDE6D6',
          dark: '#E2D9C4',
          card: '#F7F3E9',
        },
        brass: {
          DEFAULT: '#A87C43',
          dark: '#8C6534',
          light: '#C79A5F',
        },
        moss: {
          DEFAULT: '#4A5D53',
          dark: '#3A4A42',
        },
        oxblood: {
          DEFAULT: '#8C3B2E',
          light: '#A8503F',
        },
        inktext: '#2A2622',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(42,38,34,0.08), 0 4px 12px rgba(42,38,34,0.06)',
        cardHover: '0 4px 8px rgba(42,38,34,0.12), 0 10px 24px rgba(42,38,34,0.10)',
      },
    },
  },
  plugins: [],
};

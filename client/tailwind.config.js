/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1d4ed8', dark: '#1e3a8a' },
      },
    },
  },
  plugins: [],
};

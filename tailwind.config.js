/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./dough-hydration-calculator/**/*.{html,js}",
    "./**/*.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        }
      }
    },
  },
  plugins: [],
};

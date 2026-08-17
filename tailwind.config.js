/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        main: '#000000',
        sidebar: '#050505',
        card: '#0a0a0a',
        glass: 'rgba(212, 175, 55, 0.04)',
        accent: '#d4af37',
        'accent-hover': '#e8c547',
        muted: 'rgba(255, 255, 255, 0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        elegant: ['Cambria', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        f1: {
          red: '#E10600',
          black: '#15151E',
          dark: '#1F1F27',
          gray: '#38383F',
          light: '#F1F1F1'
        },
        tire: {
          soft: '#FF3333',
          medium: '#FFD700',
          hard: '#FFFFFF',
          intermediate: '#43B02A',
          wet: '#0067AD'
        }
      },
      fontFamily: {
        f1: ['Formula1', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-green': 'flash-green 0.5s ease-out',
        'flash-red': 'flash-red 0.5s ease-out'
      },
      keyframes: {
        'flash-green': {
          '0%': { backgroundColor: 'rgba(34, 197, 94, 0.5)' },
          '100%': { backgroundColor: 'transparent' }
        },
        'flash-red': {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.5)' },
          '100%': { backgroundColor: 'transparent' }
        }
      }
    },
  },
  plugins: [],
}

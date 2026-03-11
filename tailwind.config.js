/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        hebrew: ['Heebo', 'sans-serif'],
      },
      colors: {
        idf: {
          blue: '#1a3a5c',
          blueDark: '#0f2540',
          blueLight: '#2756a0',
          green: '#2e7d32',
          greenLight: '#4caf50',
          red: '#c62828',
          redLight: '#ef5350',
          gold: '#c8971a',
          bg: '#f5f7fa',
          card: '#ffffff',
          border: '#d1d9e0',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(16px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
}

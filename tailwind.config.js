/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { hebrew: ['Heebo', 'sans-serif'] },
      colors: {
        'idf-blue':       '#1a3a5c',
        'idf-blueDark':   '#0f2540',
        'idf-blueLight':  '#2756a0',
        'idf-green':      '#2e7d32',
        'idf-greenLight': '#4caf50',
        'idf-red':        '#c62828',
        'idf-redLight':   '#ef5350',
        'idf-gold':       '#c8971a',
        'idf-bg':         '#f0f4f9',
        'idf-card':       '#ffffff',
        'idf-border':     '#d1d9e6',
        // dark surfaces
        'dark-bg':       '#080e1a',
        'dark-surface':  '#0f1724',
        'dark-surface2': '#141f2e',
        'dark-border':   '#1e3048',
        'dark-text':     '#e8eef5',
        'dark-muted':    '#7a90a8',
        'dark-blue':     '#4da3ff',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.28s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'scale-in':   'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { transform: 'translateY(10px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
        scaleIn:   { from: { transform: 'scale(0.97)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
      },
      boxShadow: {
        'card':    '0 1px 4px rgba(0,0,0,0.07)',
        'card-md': '0 4px 16px rgba(0,0,0,0.09)',
        'card-lg': '0 8px 32px rgba(0,0,0,0.11)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg:      '#07090D',
        surface: '#0F1420',
        border:  '#1A2035',
        gold:    '#C9A84C',
        danger:  '#FF4060',
        success: '#4ADE80',
        warning: '#F0D080',
        text:    '#E8EDF5',
        subtext: '#ffffff50',
        muted:   '#ffffff20',
      },
      fontWeight: {
        700: '700',
        800: '800',
      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-root':    '#060611',
        'bg-card':    '#0c0c24',
        'bg-hero':    '#0d1b3e',
        'bg-sidebar': '#07071a',
        'bg-input':   '#07071a',
        'bg-primary': '#060611',
        accent:          '#3a7bd5',
        'accent-bright': '#5a9aee',
        'accent-yellow': '#f0c040',
        'text-primary':  '#c8e0ff',
        'text-muted':    '#3a5080',
        gain: '#2a9a5a',
        loss: '#a04a4a',
      },
      borderRadius: {
        card:  '16px',
        input: '10px',
      },
      maxWidth: {
        content: '900px',
      },
    },
  },
  plugins: [],
}

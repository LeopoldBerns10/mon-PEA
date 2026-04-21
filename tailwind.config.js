/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#08080f',
        'bg-card': '#0f0f1e',
        'bg-input': '#0f0f1e',
        border: '#1a1a35',
        accent: '#3a7bd5',
        'accent-light': '#8bb8f0',
        'text-primary': '#e8f0ff',
        'text-muted': '#3a4a70',
        gain: '#4a9a6a',
        loss: '#a04a4a',
      },
      borderRadius: {
        card: '12px',
        input: '8px',
      },
    },
  },
  plugins: [],
}

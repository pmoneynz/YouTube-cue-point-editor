/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'waveform-bg': '#1a1a1a',
        'waveform-wave': '#4f46e5',
        'waveform-progress': '#06b6d4',
        'cue-marker': '#f59e0b',
        'cue-active': '#ef4444'
      }
    },
  },
  plugins: [],
} 
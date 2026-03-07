/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#4ea1ff',
        'primary-dark': '#3a8ae6',
        'primary-light': '#7bb8ff',
        danger: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
        dark: {
          bg: '#121212',
          panel: '#1e1e1e',
          panel2: '#2d2d2d',
          text: '#e0e0e0',
          muted: '#a0a0a0',
          line: '#333333'
        },
        light: {
          bg: '#f7f9fb',
          panel: '#ffffff',
          panel2: '#f1f3f5',
          text: '#1e1e1e',
          muted: '#555555',
          line: '#d0d0d0'
        }
      },
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'sans-serif']
      }
    },
  },
  plugins: [],
}

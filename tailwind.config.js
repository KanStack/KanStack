/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0a',
        'bg-secondary': '#111111',
        'bg-tertiary': '#1a1a1a',
        'border-subtle': '#333333',
        'border-visible': '#555555',
        'text-muted': '#888888',
        'text-secondary': '#aaaaaa',
        'text-primary': '#ffffff',
        'accent': '#ffffff',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '20px',
        'xl': '24px',
      },
      borderRadius: {
        'none': '0',
      },
    },
  },
  plugins: [],
}

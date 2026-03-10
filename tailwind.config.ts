import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#0e0c0a',
        surface:  '#161310',
        card:     '#1f1a15',
        border:   '#3a3020',
        gold:     '#c9a84c',
        'gold-light': '#e8c97a',
        parchment:'#f0e6d0',
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body:    ['"Crimson Text"', 'Georgia', 'serif'],
        ui:      ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

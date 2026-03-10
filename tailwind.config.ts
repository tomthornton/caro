import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0a0908',
        surface: '#111009',
        card:    '#1a1814',
        border:  '#2e2a22',
        gold:    '#c9a84c',
        'gold-light': '#e8c97a',
        cream:   '#f5f0e8',
      },
    },
  },
  plugins: [],
}

export default config

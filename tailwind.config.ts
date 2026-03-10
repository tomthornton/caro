import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      'var(--color-bg)',
        surface: 'var(--color-surface)',
        card:    'var(--color-card)',
        border:  'var(--color-border)',
        gold:    'var(--color-gold)',
        'gold-light': 'var(--color-gold-light)',
        parchment: 'var(--color-text)',
        muted:   'var(--color-muted)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body:    ['var(--font-body)', 'serif'],
        ui:      ['var(--font-ui)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config

import type { NextConfig } from 'next'

const config: NextConfig = {
  // Note: src/main.ts and index.html are for Phaser Editor 2D only — not used by Next.js
  webpack(config) {
    return config
  },
}

export default config

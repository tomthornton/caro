import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Caro',
  description: 'A living town. An AI world.',
  manifest: '/manifest.json',
  themeColor: '#0e0c0a',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

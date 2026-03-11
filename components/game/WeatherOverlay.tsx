'use client'
import { useEffect, useRef } from 'react'
import type { GameEvent } from '@/lib/random-events'

type Props = { event: GameEvent | null }

export default function WeatherOverlay({ event }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const drops     = useRef<{ x: number; y: number; speed: number; len: number; opacity: number }[]>([])
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number }[]>([])

  const weather = event?.weatherType ?? 'clear'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Init rain drops
    if (weather === 'rain') {
      drops.current = Array.from({ length: 120 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        speed: 6 + Math.random() * 6,
        len:   14 + Math.random() * 10,
        opacity: 0.15 + Math.random() * 0.25,
      }))
    }

    // Init fog particles
    if (weather === 'fog') {
      particles.current = Array.from({ length: 18 }, () => ({
        x: Math.random() * window.innerWidth,
        y: 60 + Math.random() * (window.innerHeight - 120),
        vx: 0.15 + Math.random() * 0.2,
        vy: (Math.random() - 0.5) * 0.05,
        r: 60 + Math.random() * 100,
        alpha: 0.04 + Math.random() * 0.06,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (weather === 'rain') {
        ctx.strokeStyle = '#a0c8ff'
        ctx.lineWidth   = 1
        drops.current.forEach(d => {
          ctx.globalAlpha = d.opacity
          ctx.beginPath()
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x - 1, d.y + d.len)
          ctx.stroke()
          d.y += d.speed
          if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width }
        })
        ctx.globalAlpha = 1
      }

      if (weather === 'fog') {
        particles.current.forEach(p => {
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
          grad.addColorStop(0, `rgba(200,210,220,${p.alpha})`)
          grad.addColorStop(1, 'rgba(200,210,220,0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fill()
          p.x += p.vx
          p.y += p.vy
          if (p.x - p.r > canvas.width) p.x = -p.r
          if (p.x + p.r < 0) p.x = canvas.width + p.r
        })
      }

      animRef.current = requestAnimationFrame(draw)
    }

    if (weather === 'rain' || weather === 'fog') {
      animRef.current = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [weather])

  if (!event || weather === 'clear' || weather === 'sunny') {
    // Sunny: slight warm tint at the top only
    if (weather === 'sunny') {
      return (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '30%',
          background: 'linear-gradient(180deg, rgba(255,200,80,0.06) 0%, transparent 100%)',
          pointerEvents: 'none', zIndex: 5,
        }} />
      )
    }
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 5,
      }}
    />
  )
}

'use client'
import { useEffect, useState } from 'react'
import type { GameEvent } from '@/lib/random-events'

type Props = { gameId: string; gameDay: number; gameHour: number; event: GameEvent; onClose: () => void }

type Notice = { icon: string; title: string; body: string }

function parseNotices(raw: string): Notice[] {
  const lines = raw.split('\n').filter(l => l.trim())
  const notices: Notice[] = []
  const icons = ['📋','🌤️','👥','📌','💬','📰']
  lines.forEach((line, i) => {
    const clean = line.replace(/^[-•*#\d.]+\s*/, '').trim()
    if (clean.length > 10) notices.push({ icon: icons[i % icons.length], title: '', body: clean })
  })
  return notices.slice(0, 5)
}

export default function NoticeBoardPanel({ gameId, gameDay, gameHour, event, onClose }: Props) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)

  const cacheKey = `caro_board_${gameId}_day${gameDay}`

  useEffect(() => {
    const cached = localStorage.getItem(cacheKey)
    if (cached) { setNotices(JSON.parse(cached)); setLoading(false); return }

    fetch('/api/notice-board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, gameDay, gameHour, event }),
    })
      .then(r => r.json())
      .then(({ notices: raw }) => {
        const parsed = parseNotices(raw)
        setNotices(parsed)
        localStorage.setItem(cacheKey, JSON.stringify(parsed))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [gameDay])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9980, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
    }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#1a1408', border: '2px solid #c9a84c',
        borderRadius: 12, padding: '24px 20px', maxWidth: 360, width: '90%',
        maxHeight: '80vh', overflowY: 'auto', position: 'relative',
        boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>🪧</div>
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 15, color: '#c9a84c', letterSpacing: '0.08em' }}>
            Town Notice Board
          </div>
          <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', marginTop: 3 }}>Day {gameDay}</div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(201,168,76,0.2)', marginBottom: 18 }} />

        {/* Event banner */}
        <div style={{
          background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)',
          borderRadius: 8, padding: '10px 12px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c9a84c', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            Today's Weather
          </div>
          <div style={{ fontSize: 13, color: '#f5f0e8', lineHeight: 1.5 }}>{event.title} — {event.description.slice(0, 100)}…</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(245,240,232,0.3)', padding: 24, fontSize: 13 }}>
            Reading the board…
          </div>
        ) : notices.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(245,240,232,0.3)', fontSize: 13, fontStyle: 'italic', padding: 16 }}>
            The board is empty today.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notices.map((n, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, paddingBottom: 12,
                borderBottom: i < notices.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(245,240,232,0.7)', lineHeight: 1.6 }}>{n.body}</p>
              </div>
            ))}
          </div>
        )}

        <button
          onPointerDown={onClose}
          style={{
            marginTop: 20, width: '100%', padding: '10px', borderRadius: 8,
            background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
            color: '#c9a84c', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Walk away
        </button>
      </div>
    </div>
  )
}

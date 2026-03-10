'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const WORLD_VIBES = [
  { id: 'quiet',    label: 'Quiet Valley',    desc: 'Peaceful. The kind of place people move to on purpose.',  emoji: '🌄' },
  { id: 'strange',  label: 'Strange Hollow',  desc: "Something's a little off here. Everyone feels it.",       emoji: '🌫️' },
  { id: 'thriving', label: 'Busy Crossroads', desc: 'Trade, gossip, ambition. Caro is going places.',           emoji: '🏘️' },
]

export default function NewGame() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [vibe, setVibe] = useState('quiet')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const create = async () => {
    if (!name.trim()) { setError('Give your world a name.'); return }
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data: game, error: err } = await supabase.from('games')
      .insert({ user_id: session.user.id, name: name.trim(), world_seed: Math.floor(Math.random() * 1000000), day: 1 })
      .select().single()
    if (err || !game) { setError('Something went wrong.'); setLoading(false); return }
    router.push(`/game/${game.id}/character`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0908' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 24px 60px' }}>

        {/* Back */}
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.3)', fontSize: 13, fontWeight: 500, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f5f0e8', letterSpacing: '-0.02em', marginBottom: 6 }}>Create Your World</h1>
        <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: 14, marginBottom: 32 }}>Every Caro is different. This one is yours.</p>

        {/* Name input */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            World Name
          </label>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && create()}
            placeholder="Name your Caro..."
            style={{
              width: '100%', background: '#1a1814', border: '1px solid #2e2a22',
              borderRadius: 12, padding: '14px 16px', fontSize: 15, color: '#f5f0e8',
              outline: 'none', boxSizing: 'border-box',
            }} />
        </div>

        {/* Vibe */}
        <div style={{ marginBottom: 36 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Town Vibe
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {WORLD_VIBES.map(w => (
              <button key={w.id} onClick={() => setVibe(w.id)}
                style={{
                  textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                  background: vibe === w.id ? 'rgba(201,168,76,0.08)' : '#1a1814',
                  border: `1px solid ${vibe === w.id ? 'rgba(201,168,76,0.4)' : '#2e2a22'}`,
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: 22 }}>{w.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: vibe === w.id ? '#c9a84c' : '#f5f0e8', marginBottom: 2 }}>{w.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)' }}>{w.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</p>}

        <button onClick={create} disabled={loading}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: loading ? 'default' : 'pointer',
            background: loading ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #c9a84c, #dfc06a)',
            color: '#1a1408', fontWeight: 700, fontSize: 15,
            boxShadow: '0 4px 24px rgba(201,168,76,0.2)',
          }}>
          {loading ? 'Creating...' : 'Continue → Create Character'}
        </button>
      </div>
    </div>
  )
}

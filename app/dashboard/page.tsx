'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatSeed } from '@/lib/world-gen'
import { supabase, Game } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      const [{ data: profile }, { data: gamesData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('games').select('*').eq('user_id', session.user.id).order('last_played_at', { ascending: false }),
      ])
      if (profile) setUsername(profile.username)
      if (gamesData) setGames(gamesData)
      setLoading(false)
    }
    load()
  }, [router])

  const logout = async () => { await supabase.auth.signOut(); router.push('/') }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid rgba(201,168,76,0.2)', borderTop: '2px solid #c9a84c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0908', padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 480, margin: '0 auto' }}>
        <span className="font-display" style={{ fontSize: 22, fontWeight: 900, color: '#c9a84c', letterSpacing: '0.1em' }}>CARO</span>
        <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.3)', fontSize: 13, fontWeight: 500 }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 24px 0' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f5f0e8', letterSpacing: '-0.02em' }}>
            Welcome back, {username}
          </h1>
          <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: 14, marginTop: 4 }}>
            {games.length === 0 ? 'No worlds yet — create your first.' : `${games.length} world${games.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Games */}
        {games.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {games.map(game => (
              <button key={game.id} onClick={() => router.push(`/game/${game.id}`)}
                style={{
                  width: '100%', textAlign: 'left', marginBottom: 10,
                  background: '#1a1814', border: '1px solid #2e2a22',
                  borderRadius: 16, padding: '18px 20px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'border-color 0.2s',
                }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 17, fontWeight: 600, color: '#f5f0e8' }}>{game.name}</span>
                    {(game as any).town_name && (
                      <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', fontStyle: 'italic' }}>
                        {(game as any).town_name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.35)', fontWeight: 500 }}>
                    Day {game.day} · Seed {formatSeed(game.world_seed ?? 0)} · {formatDate(game.last_played_at)}
                  </div>
                </div>
                <div style={{ color: 'rgba(201,168,76,0.6)', fontSize: 18 }}>›</div>
              </button>
            ))}
          </div>
        )}

        {/* New world button */}
        <button onClick={() => router.push('/game/new')}
          style={{
            width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #c9a84c, #dfc06a)',
            color: '#1a1408', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em',
            boxShadow: '0 4px 24px rgba(201,168,76,0.25)',
          }}>
          + New World
        </button>
      </div>
    </div>
  )
}

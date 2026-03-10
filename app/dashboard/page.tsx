export const dynamic = 'force-dynamic'

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-bg px-6 py-10 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl font-black text-gold glow-gold tracking-wide">CARO</h1>
          <p className="font-ui text-sm text-parchment/40 mt-1">Welcome back, <span className="text-parchment/70">{username}</span></p>
        </div>
        <button onClick={logout} className="text-xs font-ui text-parchment/25 hover:text-parchment/50 transition-colors">
          Sign out
        </button>
      </div>

      {/* Games list */}
      {games.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🏘️</p>
          <p className="font-body text-xl text-parchment/60 italic mb-1">No towns yet.</p>
          <p className="font-ui text-sm text-parchment/30">Create your first world below.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          <p className="text-xs font-ui text-gold/40 uppercase tracking-widest mb-4">Your Worlds</p>
          {games.map(game => (
            <button key={game.id}
              onClick={() => router.push(`/game/${game.id}`)}
              className="w-full text-left p-5 rounded-2xl border border-border bg-card transition-all active:scale-[0.99] hover:border-gold/30"
              style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.3)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-xl text-gold tracking-wide">{game.name}</p>
                  <p className="font-ui text-xs text-parchment/30 mt-1">
                    Day {game.day} · Last played {formatDate(game.last_played_at)}
                  </p>
                </div>
                <span className="text-parchment/20 text-xl">→</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New game */}
      <button onClick={() => router.push('/game/new')}
        className="w-full py-4 rounded-xl font-ui font-semibold text-bg text-sm tracking-wide transition-all active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', boxShadow: '0 0 25px rgba(201,168,76,0.25)' }}>
        + New World
      </button>
    </div>
  )
}

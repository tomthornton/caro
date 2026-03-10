'use client'
export const dynamic = 'force-dynamic'


import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
const WORLD_VIBES = [
  { id: 'quiet',    label: 'Quiet Valley',   desc: 'Peaceful. The kind of place people move to on purpose.',   emoji: '🌄' },
  { id: 'strange',  label: 'Strange Hollow', desc: 'Something is a little off here. Everyone feels it.',        emoji: '🌫️' },
  { id: 'thriving', label: 'Busy Crossroads', desc: 'Trade, gossip, ambition. Caro is going places.',            emoji: '🏘️' },
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
    const { data: game, error: err } = await supabase
      .from('games')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        world_seed: Math.floor(Math.random() * 1000000),
        day: 1,
      })
      .select()
      .single()
    if (err || !game) { setError('Something went wrong.'); setLoading(false); return }
    router.push(`/game/${game.id}/character`)
  }
  return (
    <div className="min-h-screen bg-bg px-6 py-10 max-w-lg mx-auto flex flex-col">
      <button onClick={() => router.push('/dashboard')} className="text-xs font-ui text-parchment/30 mb-8 text-left">
        ← Back
      </button>
      <div className="mb-10">
        <h1 className="font-display text-3xl font-black text-gold tracking-wide mb-2">Create Your World</h1>
        <p className="font-body text-parchment/50 italic">Every Caro is different. This one is yours.</p>
      </div>
      {/* World name */}
      <div className="mb-8">
        <label className="block text-xs font-ui text-gold/60 uppercase tracking-widest mb-2">World Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Name your Caro..."
          onKeyDown={e => e.key === 'Enter' && create()}
          className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm font-ui text-parchment placeholder:text-parchment/20 focus:outline-none focus:border-gold/50" />
      </div>
      {/* World vibe */}
      <div className="mb-10">
        <label className="block text-xs font-ui text-gold/60 uppercase tracking-widest mb-3">Town Vibe</label>
        <div className="space-y-2">
          {WORLD_VIBES.map(w => (
            <button key={w.id} onClick={() => setVibe(w.id)}
              className="w-full text-left p-4 rounded-xl border transition-all"
              style={vibe === w.id
                ? { borderColor: 'rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.08)', boxShadow: '0 0 15px rgba(201,168,76,0.1)' }
                : { borderColor: 'rgba(58,48,32,0.8)', background: 'rgba(31,26,21,0.8)' }
              }>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{w.emoji}</span>
                <div>
                  <p className="font-ui text-sm font-semibold" style={{ color: vibe === w.id ? '#c9a84c' : 'rgba(240,230,208,0.8)' }}>{w.label}</p>
                  <p className="font-body text-xs italic text-parchment/40 mt-0.5">{w.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-400 text-xs font-ui text-center mb-4">{error}</p>}
      <button onClick={create} disabled={loading}
        className="w-full py-4 rounded-xl font-ui font-semibold text-bg text-sm tracking-wide disabled:opacity-50 transition-all active:scale-[0.98] mt-auto"
        style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', boxShadow: '0 0 25px rgba(201,168,76,0.25)' }}>
        {loading ? 'Creating...' : 'Continue → Create Character'}
      </button>
    </div>
  )
}

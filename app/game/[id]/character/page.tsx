'use client'
export const dynamic = 'force-dynamic'


import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ARCHETYPES, STAT_META, Archetype } from '@/lib/stats'
type StatKey = 'strength' | 'intellect' | 'charisma' | 'cooking' | 'crafting' | 'wisdom'
export default function CreateCharacter() {
  const router = useRouter()
  const { id: gameId } = useParams<{ id: string }>()
  const [step, setStep] = useState<'archetype' | 'details'>('archetype')
  const [selected, setSelected] = useState<Archetype>(ARCHETYPES[0])
  const [charName, setCharName] = useState('')
  const [bonusStats, setBonusStats] = useState<Record<StatKey, number>>({
    strength: 0, intellect: 0, charisma: 0, cooking: 0, crafting: 0, wisdom: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const pointsLeft = selected.bonusPoints - Object.values(bonusStats).reduce((a, b) => a + b, 0)
  const adjustStat = (stat: StatKey, delta: number) => {
    const current = bonusStats[stat]
    const newVal = current + delta
    if (newVal < 0) return
    if (delta > 0 && pointsLeft <= 0) return
    setBonusStats(prev => ({ ...prev, [stat]: newVal }))
  }
  const finalStats = (Object.keys(STAT_META) as StatKey[]).reduce((acc, key) => ({
    ...acc,
    [key]: selected.baseStats[key] + bonusStats[key],
  }), {} as Record<StatKey, number>)
  const create = async () => {
    if (!charName.trim()) { setError('Name your character.'); return }
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { error: err } = await supabase.from('characters').insert({
      game_id: gameId,
      user_id: session.user.id,
      name: charName.trim(),
      archetype: selected.id,
      stats: { ...finalStats, reputation: 5 },
      position: { x: 400, y: 300 },
      energy: 100,
      gold: 50,
    })
    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/game/${gameId}`)
  }
  return (
    <div className="min-h-screen bg-bg px-6 py-10 max-w-lg mx-auto flex flex-col">
      <button onClick={() => step === 'details' ? setStep('archetype') : router.push('/dashboard')}
        className="text-xs font-ui text-parchment/30 mb-8 text-left">
        ← Back
      </button>
      {step === 'archetype' && (
        <>
          <div className="mb-8">
            <h1 className="font-display text-3xl font-black text-gold tracking-wide mb-2">Who Are You?</h1>
            <p className="font-body text-parchment/50 italic">Choose your archetype. You can still customize your stats.</p>
          </div>
          <div className="space-y-3 mb-8">
            {ARCHETYPES.map(arch => (
              <button key={arch.id} onClick={() => {
                setSelected(arch)
                setBonusStats({ strength: 0, intellect: 0, charisma: 0, cooking: 0, crafting: 0, wisdom: 0 })
              }}
                className="w-full text-left p-4 rounded-xl border transition-all"
                style={selected.id === arch.id
                  ? { borderColor: 'rgba(201,168,76,0.6)', background: 'rgba(201,168,76,0.08)' }
                  : { borderColor: '#3a3020', background: '#1f1a15' }
                }>
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{arch.emoji}</span>
                  <div className="flex-1">
                    <p className="font-ui text-sm font-bold" style={{ color: selected.id === arch.id ? '#c9a84c' : '#f0e6d0' }}>
                      {arch.name}
                    </p>
                    <p className="font-body text-xs italic text-parchment/40 mt-0.5">{arch.description}</p>
                    {selected.id === arch.id && (
                      <p className="text-[10px] font-ui text-parchment/25 mt-2 italic">"{arch.flavor}"</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep('details')}
            className="w-full py-4 rounded-xl font-ui font-semibold text-bg text-sm tracking-wide mt-auto"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', boxShadow: '0 0 25px rgba(201,168,76,0.2)' }}>
            Continue →
          </button>
        </>
      )}
      {step === 'details' && (
        <>
          <div className="mb-6">
            <h1 className="font-display text-3xl font-black text-gold tracking-wide mb-1">Shape Your Story</h1>
            <p className="font-body text-parchment/50 italic">{selected.emoji} {selected.name}</p>
          </div>
          {/* Name */}
          <div className="mb-6">
            <label className="block text-xs font-ui text-gold/60 uppercase tracking-widest mb-2">Character Name</label>
            <input value={charName} onChange={e => setCharName(e.target.value)}
              placeholder="What's your name?"
              className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm font-ui text-parchment placeholder:text-parchment/20 focus:outline-none focus:border-gold/50" />
          </div>
          {/* Stats */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-ui text-gold/60 uppercase tracking-widest">Distribute Points</label>
              <span className="text-xs font-ui font-bold px-2.5 py-1 rounded-lg"
                style={{ background: pointsLeft > 0 ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)', color: pointsLeft > 0 ? '#c9a84c' : 'rgba(255,255,255,0.3)' }}>
                {pointsLeft} left
              </span>
            </div>
            <div className="space-y-2">
              {(Object.keys(STAT_META) as StatKey[]).map(key => {
                const meta = STAT_META[key]
                const base = selected.baseStats[key]
                const bonus = bonusStats[key]
                const total = base + bonus
                return (
                  <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                    <span className="text-lg w-7 text-center">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-ui text-xs font-semibold text-parchment/80">{meta.label}</p>
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} className="h-1.5 flex-1 rounded-full"
                            style={{ background: i < total ? '#c9a84c' : 'rgba(255,255,255,0.08)' }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustStat(key, -1)} disabled={bonus <= 0}
                        className="w-7 h-7 rounded-lg text-sm font-bold text-parchment/40 bg-white/5 disabled:opacity-20">−</button>
                      <span className="w-5 text-center text-sm font-bold font-ui text-gold">{total}</span>
                      <button onClick={() => adjustStat(key, 1)} disabled={pointsLeft <= 0}
                        className="w-7 h-7 rounded-lg text-sm font-bold text-parchment/40 bg-white/5 disabled:opacity-20">+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {error && <p className="text-red-400 text-xs font-ui text-center mb-4">{error}</p>}
          <button onClick={create} disabled={loading || pointsLeft !== 0}
            className="w-full py-4 rounded-xl font-ui font-semibold text-bg text-sm tracking-wide disabled:opacity-40 mt-auto"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c97a)', boxShadow: '0 0 25px rgba(201,168,76,0.2)' }}>
            {loading ? 'Entering Caro...' : pointsLeft === 0 ? 'Enter Caro →' : `Spend ${pointsLeft} more point${pointsLeft !== 1 ? 's' : ''}`}
          </button>
        </>
      )}
    </div>
  )
}

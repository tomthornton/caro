'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ARCHETYPES, STAT_META, Archetype } from '@/lib/stats'

type StatKey = 'strength' | 'intellect' | 'charisma' | 'cooking' | 'crafting' | 'wisdom'
const STAT_KEYS = Object.keys(STAT_META) as StatKey[]

export default function CreateCharacter() {
  const router = useRouter()
  const { id: gameId } = useParams<{ id: string }>()
  const [step, setStep] = useState<'archetype' | 'details'>('archetype')
  const [selected, setSelected] = useState<Archetype>(ARCHETYPES[0])
  const [charName, setCharName] = useState('')
  const [bonus, setBonus] = useState<Record<StatKey, number>>({ strength: 0, intellect: 0, charisma: 0, cooking: 0, crafting: 0, wisdom: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const pointsLeft = selected.bonusPoints - Object.values(bonus).reduce((a, b) => a + b, 0)

  const adjust = (stat: StatKey, d: number) => {
    if (d < 0 && bonus[stat] <= 0) return
    if (d > 0 && pointsLeft <= 0) return
    setBonus(p => ({ ...p, [stat]: p[stat] + d }))
  }

  const finals = STAT_KEYS.reduce((acc, k) => ({ ...acc, [k]: selected.baseStats[k] + bonus[k] }), {} as Record<StatKey, number>)

  const create = async () => {
    if (!charName.trim()) { setError('Name your character.'); return }
    if (pointsLeft !== 0) { setError(`Spend all ${selected.bonusPoints} points first.`); return }
    setLoading(true); setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { error: err } = await supabase.from('characters').insert({
      game_id: gameId, user_id: session.user.id,
      name: charName.trim(), archetype: selected.id,
      stats: { ...finals, reputation: 5 },
      position: { x: 400, y: 300 }, energy: 100, max_energy: 100, gold: 50,
    })
    if (err) { setError(err.message); setLoading(false); return }
    router.push(`/game/${gameId}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0908' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 24px 80px' }}>

        <button onClick={() => step === 'details' ? setStep('archetype') : router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.3)', fontSize: 13, fontWeight: 500, marginBottom: 32 }}>
          ← {step === 'details' ? 'Back' : 'Dashboard'}
        </button>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {['archetype', 'details'].map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: step === s || (s === 'archetype' && step === 'details') ? '#c9a84c' : '#2e2a22' }} />
          ))}
        </div>

        {step === 'archetype' && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f5f0e8', letterSpacing: '-0.02em', marginBottom: 6 }}>Who are you?</h1>
            <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: 14, marginBottom: 24 }}>Choose your archetype.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
              {ARCHETYPES.map(arch => (
                <button key={arch.id}
                  onClick={() => { setSelected(arch); setBonus({ strength: 0, intellect: 0, charisma: 0, cooking: 0, crafting: 0, wisdom: 0 }) }}
                  style={{
                    textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                    background: selected.id === arch.id ? 'rgba(201,168,76,0.08)' : '#1a1814',
                    border: `1px solid ${selected.id === arch.id ? 'rgba(201,168,76,0.4)' : '#2e2a22'}`,
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                  }}>
                  <span style={{ fontSize: 24, marginTop: 1 }}>{arch.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: selected.id === arch.id ? '#c9a84c' : '#f5f0e8', marginBottom: 3 }}>
                      {arch.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.4)', lineHeight: 1.5 }}>{arch.description}</div>
                    {selected.id === arch.id && (
                      <div style={{ fontSize: 11, color: 'rgba(201,168,76,0.5)', marginTop: 6, fontStyle: 'italic' }}>
                        "{arch.flavor}"
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => setStep('details')}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #c9a84c, #dfc06a)',
                color: '#1a1408', fontWeight: 700, fontSize: 15,
                boxShadow: '0 4px 24px rgba(201,168,76,0.2)',
              }}>
              Continue →
            </button>
          </>
        )}

        {step === 'details' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{selected.emoji}</span>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f5f0e8', letterSpacing: '-0.02em' }}>{selected.name}</h1>
            </div>
            <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: 14, marginBottom: 28 }}>Name your character and distribute your points.</p>

            {/* Name */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                Character Name
              </label>
              <input value={charName} onChange={e => setCharName(e.target.value)}
                placeholder="What's your name?"
                style={{ width: '100%', background: '#1a1814', border: '1px solid #2e2a22', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: '#f5f0e8', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Stats */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Stats
                </label>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                  background: pointsLeft > 0 ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.05)',
                  color: pointsLeft > 0 ? '#c9a84c' : 'rgba(255,255,255,0.25)',
                }}>
                  {pointsLeft} point{pointsLeft !== 1 ? 's' : ''} left
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {STAT_KEYS.map(key => {
                  const meta = STAT_META[key]
                  const total = finals[key]
                  return (
                    <div key={key} style={{ background: '#1a1814', border: '1px solid #2e2a22', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18, width: 26, textAlign: 'center' }}>{meta.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f5f0e8', marginBottom: 6 }}>{meta.label}</div>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < total ? '#c9a84c' : 'rgba(255,255,255,0.08)', transition: 'background 0.15s' }} />
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => adjust(key, -1)} disabled={bonus[key] <= 0}
                          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #2e2a22', background: bonus[key] > 0 ? '#2e2a22' : 'transparent', color: bonus[key] > 0 ? '#f5f0e8' : 'rgba(255,255,255,0.15)', cursor: bonus[key] > 0 ? 'pointer' : 'default', fontSize: 16, fontWeight: 700 }}>
                          −
                        </button>
                        <span style={{ width: 22, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#c9a84c' }}>{total}</span>
                        <button onClick={() => adjust(key, 1)} disabled={pointsLeft <= 0}
                          style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #2e2a22', background: pointsLeft > 0 ? '#2e2a22' : 'transparent', color: pointsLeft > 0 ? '#f5f0e8' : 'rgba(255,255,255,0.15)', cursor: pointsLeft > 0 ? 'pointer' : 'default', fontSize: 16, fontWeight: 700 }}>
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {error && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{error}</p>}

            <button onClick={create} disabled={loading || pointsLeft !== 0}
              style={{
                width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
                cursor: loading || pointsLeft !== 0 ? 'default' : 'pointer',
                background: pointsLeft !== 0 ? 'rgba(201,168,76,0.25)' : 'linear-gradient(135deg, #c9a84c, #dfc06a)',
                color: pointsLeft !== 0 ? 'rgba(26,20,8,0.5)' : '#1a1408',
                fontWeight: 700, fontSize: 15,
                boxShadow: pointsLeft === 0 ? '0 4px 24px rgba(201,168,76,0.2)' : 'none',
              }}>
              {loading ? 'Entering Caro...' : pointsLeft === 0 ? 'Enter Caro →' : `Spend ${pointsLeft} more point${pointsLeft !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

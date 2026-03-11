'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { NPC_LIST } from '@/lib/npcs'

type NpcState = {
  npc_id: string; trust: number; fondness: number
  times_spoken: number; memory_summary?: string; mood?: string
}

type Props = { gameId: string; userId: string; onClose: () => void }

const TRUST_LABEL = (t: number) =>
  t < 10 ? 'Stranger' : t < 30 ? 'Acquaintance' : t < 55 ? 'Warming up' : t < 75 ? 'Trusted' : t < 90 ? 'Friend' : 'Confidant'

const MOOD_EMOJI: Record<string, string> = {
  joyful:'😄', content:'🙂', neutral:'😐', melancholy:'😔', anxious:'😟', angry:'😠', grieving:'😢',
}

const NPC_COLORS: Record<string, string> = {
  eleanor:'#d45555', silas:'#4a6080', maeve:'#6a4080', caleb:'#3a7050', ruth:'#404878',
}

export default function RelationshipPanel({ gameId, userId, onClose }: Props) {
  const [states, setStates] = useState<NpcState[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('npc_state')
      .select('npc_id, trust, fondness, times_spoken, memory_summary, mood')
      .eq('game_id', gameId).eq('user_id', userId)
      .then(({ data }) => { setStates(data ?? []); setLoading(false) })
  }, [gameId, userId])

  const getState = (npcId: string) => states.find(s => s.npc_id === npcId)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9980, display: 'flex', flexDirection: 'column',
      justifyContent: 'flex-end', background: 'rgba(0,0,0,0.55)',
    }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'linear-gradient(180deg, #0e0c08 0%, #0a0908 100%)',
        border: '1px solid rgba(201,168,76,0.2)', borderBottom: 'none',
        borderRadius: '16px 16px 0 0', padding: '20px 16px 32px',
        maxHeight: '75vh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(201,168,76,0.3)', margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 16, color: '#c9a84c', letterSpacing: '0.06em' }}>
            Relationships
          </span>
          <button onPointerDown={onClose} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.4)', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(245,240,232,0.3)', padding: 32, fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {NPC_LIST.map(npc => {
              const s = getState(npc.id)
              const trust   = s?.trust ?? 0
              const mood    = s?.mood ?? 'neutral'
              const times   = s?.times_spoken ?? 0
              const memory  = s?.memory_summary
              const color   = NPC_COLORS[npc.id] ?? '#c9a84c'

              return (
                <div key={npc.id} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    {/* Color avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'Cinzel, serif',
                    }}>
                      {npc.name[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#f5f0e8' }}>{npc.name}</span>
                        <span style={{ fontSize: 14 }} title={mood}>{MOOD_EMOJI[mood] ?? '😐'}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', marginTop: 1 }}>{npc.role}</div>
                    </div>
                  </div>

                  {/* Trust bar */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'rgba(201,168,76,0.7)', fontWeight: 600 }}>{TRUST_LABEL(trust)}</span>
                      <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>
                        {times === 0 ? 'Never spoken' : `${times} conversation${times !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}99, ${color})`, width: `${Math.min(trust, 100)}%`, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>

                  {/* Memory */}
                  {memory ? (
                    <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)', fontStyle: 'italic', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                      "{memory.split(' | ').pop()}"
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.2)', fontStyle: 'italic' }}>
                      {times === 0 ? `You haven't spoken with ${npc.name} yet.` : 'No memories yet.'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

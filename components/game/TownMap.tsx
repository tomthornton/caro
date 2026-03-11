'use client'
import { useMemo } from 'react'
import { NPC_LIST } from '@/lib/npcs'
import { getCurrentEntry } from '@/lib/npc-schedule'

type Props = { gameHour: number; gameDay: number; onClose: () => void }

// Building footprints in map tiles (tx,ty,tw,th) — matches GameCanvas layout
const BUILDINGS = [
  { id: 'bakery',   name: "Eleanor's Bakery",  tx: 2,  ty: 2, tw: 5, th: 4, color: '#d45555' },
  { id: 'townhall', name: 'Town Hall',          tx: 9,  ty: 2, tw: 6, th: 4, color: '#3a7050' },
  { id: 'shop',     name: "Silas's Forge",      tx: 16, ty: 2, tw: 6, th: 4, color: '#4a6080' },
  { id: 'cottage',  name: "Maeve's Cottage",    tx: 0,  ty: 13, tw: 5, th: 4, color: '#6a4080' },
  { id: 'tavern',   name: 'Tavern',             tx: 9,  ty: 13, tw: 6, th: 4, color: '#806030' },
  { id: 'library',  name: 'Library',            tx: 16, ty: 13, tw: 6, th: 4, color: '#404878' },
]

const NPC_COLORS: Record<string, string> = {
  eleanor: '#d45555', caleb: '#3a7050', silas: '#4a6080', maeve: '#6a4080', ruth: '#404878',
}

const MAP_W = 24, MAP_H = 18
const SCALE  = 11   // px per tile

export default function TownMap({ gameHour, gameDay, onClose }: Props) {
  const npcPositions = useMemo(() => {
    return NPC_LIST.map(npc => {
      const entry = getCurrentEntry(npc.id, gameHour)
      if (!entry) return null
      const building = BUILDINGS.find(b => b.id === entry.inside)
      if (building) {
        return { npc, x: building.tx + building.tw / 2, y: building.ty + building.th / 2, inside: true }
      }
      return { npc, x: entry.tx, y: entry.ty, inside: false }
    }).filter(Boolean)
  }, [gameHour])

  const canvasW = MAP_W * SCALE
  const canvasH = MAP_H * SCALE

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9980,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0e0c08', border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: 14, padding: '20px 18px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
        maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 15, color: '#c9a84c', letterSpacing: '0.06em' }}>Town of Caro</span>
            <span style={{ marginLeft: 10, fontSize: 11, color: 'rgba(245,240,232,0.35)' }}>Day {gameDay} · {String(gameHour).padStart(2,'0')}:00</span>
          </div>
          <button onPointerDown={onClose} style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.4)', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        {/* Map canvas */}
        <div style={{
          position: 'relative',
          width: canvasW, height: canvasH,
          background: '#4a7a3a',
          borderRadius: 8, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Grass base — already the background */}

          {/* Roads */}
          {/* Vertical center road */}
          <div style={{ position: 'absolute', left: 9*SCALE, top: 0, width: 6*SCALE, height: canvasH, background: 'rgba(180,150,100,0.35)' }} />
          {/* Horizontal center road */}
          <div style={{ position: 'absolute', left: 0, top: 8*SCALE, width: canvasW, height: 3*SCALE, background: 'rgba(180,150,100,0.35)' }} />

          {/* Buildings */}
          {BUILDINGS.map(b => (
            <div key={b.id} style={{
              position: 'absolute',
              left: b.tx * SCALE, top: b.ty * SCALE,
              width: b.tw * SCALE, height: b.th * SCALE,
              background: b.color + '99',
              border: `1px solid ${b.color}`,
              borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.2, padding: '0 2px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {b.name.split("'")[0].replace('The ', '')}
              </span>
            </div>
          ))}

          {/* Well marker */}
          <div style={{
            position: 'absolute',
            left: 11*SCALE - 5, top: 9*SCALE - 5,
            width: 10, height: 10,
            background: '#888', borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.3)',
          }} title="Well" />

          {/* NPC dots */}
          {npcPositions.map(p => p && (
            <div key={p.npc.id} style={{
              position: 'absolute',
              left: p.x * SCALE - 6,
              top:  p.y * SCALE - 6,
              width: 12, height: 12,
              borderRadius: '50%',
              background: NPC_COLORS[p.npc.id] ?? '#c9a84c',
              border: `2px solid ${p.inside ? 'rgba(255,255,255,0.5)' : '#fff'}`,
              boxShadow: `0 0 6px ${NPC_COLORS[p.npc.id] ?? '#c9a84c'}`,
              zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 6, fontWeight: 900, color: '#fff',
            }} title={p.npc.name}>
              {p.npc.name[0]}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          {NPC_LIST.map(npc => {
            const entry = getCurrentEntry(npc.id, gameHour)
            return (
              <div key={npc.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: NPC_COLORS[npc.id], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.6)' }}>
                  {npc.name} <span style={{ color: 'rgba(245,240,232,0.3)', fontStyle: 'italic' }}>— {entry?.activity ?? 'somewhere'}</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

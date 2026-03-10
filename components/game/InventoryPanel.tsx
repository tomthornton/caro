'use client'

export type Item = {
  id: string
  name: string
  emoji: string
  type: 'food' | 'material' | 'tool' | 'gift' | 'key' | 'misc'
  quantity: number
  description: string
  value: number  // gold value
}

export const STARTER_ITEMS: Item[] = [
  { id: 'bread',      name: 'Bread',       emoji: '🍞', type: 'food',     quantity: 2, description: 'Fresh from the bakery. Restores energy.',     value: 3  },
  { id: 'herb',       name: 'Herb Bundle',  emoji: '🌿', type: 'material', quantity: 3, description: 'Common herbs. Useful for crafting remedies.',   value: 2  },
  { id: 'coin',       name: 'Gold Coin',    emoji: '🪙', type: 'misc',     quantity: 5, description: 'Standard currency in Caro.',                    value: 1  },
  { id: 'journal',    name: 'Journal',      emoji: '📓', type: 'tool',     quantity: 1, description: 'Write down your thoughts and discoveries.',      value: 10 },
]

type Props = {
  items: Item[]
  gold: number
  onClose: () => void
}

export default function InventoryPanel({ items, gold, onClose }: Props) {
  const typeColor: Record<Item['type'], string> = {
    food:     'rgba(134,239,172,0.15)',
    material: 'rgba(147,197,253,0.15)',
    tool:     'rgba(253,224,71,0.15)',
    gift:     'rgba(249,168,212,0.15)',
    key:      'rgba(201,168,76,0.2)',
    misc:     'rgba(255,255,255,0.06)',
  }
  const typeBorder: Record<Item['type'], string> = {
    food:     'rgba(134,239,172,0.3)',
    material: 'rgba(147,197,253,0.3)',
    tool:     'rgba(253,224,71,0.3)',
    gift:     'rgba(249,168,212,0.3)',
    key:      'rgba(201,168,76,0.4)',
    misc:     'rgba(255,255,255,0.1)',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 480,
        background: '#111009', border: '1px solid #2e2a22',
        borderRadius: '20px 20px 0 0',
        maxHeight: '75vh', display: 'flex', flexDirection: 'column',
        padding: '0 0 20px',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 14px', borderBottom: '1px solid #2e2a22', flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 900, color: '#c9a84c', letterSpacing: '0.06em' }}>
              Inventory
            </div>
            <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', marginTop: 2 }}>
              {items.reduce((s, i) => s + i.quantity, 0)} items · {items.length} types
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', fontSize: 13, fontWeight: 700, color: '#c9a84c' }}>
              🪙 {gold}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.3)', fontSize: 22, lineHeight: 1, padding: '4px 8px' }}>✕</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px 6px', flexShrink: 0, flexWrap: 'wrap' }}>
          {(['food','material','tool','gift','key'] as Item['type'][]).map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: typeColor[t], border: `1px solid ${typeBorder[t]}`, fontSize: 10, color: 'rgba(245,240,232,0.5)', textTransform: 'capitalize' }}>
              {t}
            </div>
          ))}
        </div>

        {/* Item grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(245,240,232,0.25)', fontSize: 13 }}>
              Your pack is empty.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px', borderRadius: 12,
                  background: typeColor[item.type],
                  border: `1px solid ${typeBorder[item.type]}`,
                }}>
                  <div style={{ fontSize: 26, flexShrink: 0, width: 36, textAlign: 'center' }}>{item.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f5f0e8' }}>{item.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#c9a84c', marginLeft: 8 }}>×{item.quantity}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.45)', lineHeight: 1.4 }}>{item.description}</div>
                    <div style={{ fontSize: 10, color: 'rgba(201,168,76,0.5)', marginTop: 2 }}>{item.value}g each</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

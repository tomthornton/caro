'use client'

/**
 * PhoneMenu — in-game phone overlay.
 * Opens when the player taps the phone icon in the HUD.
 * Each app icon routes to a game feature.
 */

type App = {
  id:    string
  emoji: string
  label: string
  badge?: string | number
  color: string
}

type Props = {
  onClose:        () => void
  onOpenQuests:   () => void
  onOpenRelations: () => void
  onOpenMap:      () => void
  onOpenInventory: () => void
  onOpenBoard:    () => void
  onRest:         () => void
  onExitGame:     () => void
  characterName:  string
  gameDay:        number
  townName:       string
  seed:           number
  hour:           number
  minute:         number
  activeQuestTitle?: string
}

function padTime(n: number) { return String(n).padStart(2, '0') }

export default function PhoneMenu({
  onClose, onOpenQuests, onOpenRelations, onOpenMap,
  onOpenInventory, onOpenBoard, onRest, onExitGame,
  characterName, gameDay, townName, seed,
  hour, minute, activeQuestTitle,
}: Props) {

  const apps: App[] = [
    { id: 'quests',    emoji: '📋', label: 'Quests',        color: '#c9a84c', badge: activeQuestTitle ? '!' : undefined },
    { id: 'relations', emoji: '❤️', label: 'Relationships',  color: '#d45555' },
    { id: 'map',       emoji: '🗺️', label: 'Town Map',       color: '#4a7a5a' },
    { id: 'inventory', emoji: '🎒', label: 'Inventory',      color: '#4a6080' },
    { id: 'board',     emoji: '📰', label: 'Notice Board',   color: '#806030' },
    { id: 'rest',      emoji: '💤', label: 'Rest',            color: '#404878' },
  ]

  const handle = (id: string) => {
    onClose()
    switch (id) {
      case 'quests':    onOpenQuests();    break
      case 'relations': onOpenRelations(); break
      case 'map':       onOpenMap();       break
      case 'inventory': onOpenInventory(); break
      case 'board':     onOpenBoard();     break
      case 'rest':      onRest();          break
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Phone body */}
      <div style={{
        width: 280, background: '#0e0c08',
        borderRadius: 32, overflow: 'hidden',
        boxShadow: '0 8px 64px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,168,76,0.15)',
        border: '1px solid rgba(201,168,76,0.1)',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Top notch bar */}
        <div style={{ height: 10, background: '#0a0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 60, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Status bar */}
        <div style={{
          padding: '8px 18px 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(245,240,232,0.35)', fontFamily: 'monospace' }}>
            {padTime(hour)}:{padTime(minute)}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.2)' }}>
            Day {gameDay}
          </span>
        </div>

        {/* Hero / wallpaper section */}
        <div style={{
          padding: '16px 18px 20px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(201,168,76,0.05) 0%, transparent 100%)',
        }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 17, color: '#c9a84c', letterSpacing: '0.06em', marginBottom: 2 }}>
            {townName}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)' }}>
            {characterName}
          </div>
          {activeQuestTitle && (
            <div style={{
              marginTop: 10, padding: '5px 12px', borderRadius: 99, display: 'inline-block',
              background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)',
              fontSize: 10, color: '#c9a84c', fontWeight: 600,
            }}>
              📋 {activeQuestTitle}
            </div>
          )}
        </div>

        {/* App grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16, padding: '8px 20px 20px',
        }}>
          {apps.map(app => (
            <button
              key={app.id}
              onPointerDown={() => handle(app.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, position: 'relative',
              }}
            >
              <div style={{
                width: 54, height: 54, borderRadius: 14,
                background: `${app.color}22`,
                border: `1px solid ${app.color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
                transition: 'all 0.1s',
              }}>
                {app.emoji}
              </div>
              {app.badge && (
                <div style={{
                  position: 'absolute', top: -4, right: 4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#d45555', border: '1.5px solid #0e0c08',
                  fontSize: 9, fontWeight: 900, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {app.badge}
                </div>
              )}
              <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.5)', fontWeight: 500 }}>{app.label}</span>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />

        {/* Bottom actions */}
        <div style={{ padding: '14px 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onPointerDown={onExitGame}
            style={{
              width: '100%', padding: '11px', borderRadius: 12, border: '1px solid rgba(248,113,113,0.2)',
              cursor: 'pointer', background: 'rgba(248,113,113,0.06)',
              color: '#f87171', fontWeight: 600, fontSize: 13,
            }}>
            Exit to Dashboard
          </button>
          <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(245,240,232,0.15)' }}>
            Seed {String(seed).padStart(6,'0')}
          </div>
        </div>

        {/* Home bar */}
        <div style={{ height: 14, background: '#0a0908', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 2 }}>
          <div style={{ width: 80, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
        </div>
      </div>
    </div>
  )
}

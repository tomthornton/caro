'use client'

/**
 * PhoneMenu — full-featured in-game phone.
 * All game features live inside the phone itself:
 * - App grid home screen
 * - Inline app screens with back navigation
 * - Relationships, Quests, Map, Inventory, Notice Board, Rest, Character
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { NPC_LIST } from '@/lib/npcs'
import { getCurrentEntry } from '@/lib/npc-schedule'
import type { NpcSoul } from '@/lib/npcs'
import type { QuestState } from '@/lib/quests'
import { getActiveQuest, getAvailableQuests, startQuest, saveQuestState } from '@/lib/quests'
import type { Item } from '@/components/game/InventoryPanel'
import type { GameEvent } from '@/lib/random-events'
import type { Character } from '@/lib/supabase'

type AppScreen = 'home' | 'quests' | 'relations' | 'map' | 'inventory' | 'board' | 'rest' | 'character'

type NpcState = { npc_id: string; trust: number; fondness: number; times_spoken: number; memory_summary?: string; mood?: string }

type Props = {
  onClose:       () => void
  onRest:        () => void
  onExitGame:    () => void
  characterName: string
  character:     Character
  gameDay:       number
  townName:      string
  seed:          number
  hour:          number
  minute:        number
  gameId:        string
  userId:        string
  npcs:          NpcSoul[]
  questState:    QuestState | null
  trustMap:      Record<string, number>
  inventory:     Item[]
  dayEvent:      GameEvent | null
  onStartQuest:  (id: string) => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

const TRUST_LABEL = (t: number) =>
  t < 10 ? 'Stranger' : t < 30 ? 'Acquaintance' : t < 55 ? 'Warming up' : t < 75 ? 'Trusted' : t < 90 ? 'Friend' : 'Confidant'

const MOOD_EMOJI: Record<string, string> = {
  joyful:'😄', content:'🙂', neutral:'😐', melancholy:'😔', anxious:'😟', angry:'😠', grieving:'😢',
}

const NPC_COLORS: Record<string, string> = {
  eleanor:'#d45555', silas:'#4a6080', maeve:'#6a4080', caleb:'#3a7050', ruth:'#404878',
}

// Buildings for the map
const BUILDINGS = [
  { id:'bakery',   name:"Bakery",      tx:2,  ty:2,  tw:5, th:4, color:'#d45555' },
  { id:'townhall', name:'Town Hall',   tx:9,  ty:2,  tw:6, th:4, color:'#3a7050' },
  { id:'shop',     name:'Forge',       tx:16, ty:2,  tw:6, th:4, color:'#4a6080' },
  { id:'cottage',  name:'Cottage',     tx:0,  ty:13, tw:5, th:4, color:'#6a4080' },
  { id:'tavern',   name:'Tavern',      tx:9,  ty:13, tw:6, th:4, color:'#806030' },
  { id:'library',  name:'Library',     tx:16, ty:13, tw:6, th:4, color:'#404878' },
]

const MAP_W = 24, MAP_H = 18

// ── App definitions ───────────────────────────────────────────────────────────

const APPS = [
  { id:'quests',    emoji:'📋', label:'Quests',        color:'#c9a84c' },
  { id:'relations', emoji:'❤️', label:'Relationships',  color:'#d45555' },
  { id:'map',       emoji:'🗺️', label:'Town Map',       color:'#4a7a5a' },
  { id:'inventory', emoji:'🎒', label:'Inventory',      color:'#4a6080' },
  { id:'board',     emoji:'📰', label:'Notice Board',   color:'#806030' },
  { id:'character', emoji:'⚔️', label:'Character',      color:'#6a4080' },
  { id:'rest',      emoji:'💤', label:'Rest',            color:'#404878' },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function PhoneMenu({
  onClose, onRest, onExitGame,
  characterName, character, gameDay, townName, seed, hour, minute,
  gameId, userId, npcs, questState, trustMap, inventory, dayEvent, onStartQuest,
}: Props) {
  const [screen, setScreen] = useState<AppScreen>('home')
  const [npcStates, setNpcStates] = useState<NpcState[]>([])
  const [notices, setNotices]     = useState<string[]>([])
  const [noticesLoading, setNoticesLoading] = useState(false)

  // Load NPC states when relationships opens
  useEffect(() => {
    if (screen !== 'relations' || !gameId || !userId) return
    supabase.from('npc_state')
      .select('npc_id, trust, fondness, times_spoken, memory_summary, mood')
      .eq('game_id', gameId).eq('user_id', userId)
      .then(({ data }) => setNpcStates(data ?? []))
  }, [screen])

  // Load notices when board opens
  useEffect(() => {
    if (screen !== 'board') return
    const cacheKey = `caro_board_${gameId}_day${gameDay}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) { setNotices(JSON.parse(cached)); return }
    setNoticesLoading(true)
    fetch('/api/notice-board', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, gameDay, gameHour: hour, event: dayEvent }),
    })
      .then(r => r.json())
      .then(({ notices: raw }) => {
        const lines = (raw as string).split('\n').filter((l: string) => l.trim().length > 10)
        setNotices(lines)
        localStorage.setItem(cacheKey, JSON.stringify(lines))
        setNoticesLoading(false)
      })
      .catch(() => setNoticesLoading(false))
  }, [screen])

  const activeQuest  = questState ? getActiveQuest(questState) : null
  const availQuests  = questState ? getAvailableQuests(questState, trustMap) : []
  const completedIds = questState?.completedIds ?? []

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Phone body */}
      <div style={{
        width: 'min(390px, 94vw)',
        height: 'min(780px, 88vh)',
        background: '#0e0c08',
        borderRadius: 36,
        overflow: 'hidden',
        boxShadow: '0 16px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,168,76,0.12), inset 0 0 0 1px rgba(255,255,255,0.04)',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Dynamic Island */}
        <div style={{ height: 14, background: '#070605', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{ width: 80, height: 6, borderRadius: 99, background: '#0a0908' }} />
        </div>

        {/* Status bar */}
        <div style={{ padding: '6px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f5f0e8', fontFamily: 'monospace' }}>
            {pad(hour)}:{pad(minute)}
          </span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 1.5 }}>
              {[3,4,5,5].map((h, i) => (
                <div key={i} style={{ width: 3, height: h, background: 'rgba(245,240,232,0.5)', borderRadius: 1 }} />
              ))}
            </div>
            <div style={{ width: 24, height: 11, borderRadius: 3, border: '1px solid rgba(245,240,232,0.4)', position: 'relative', overflow: 'visible' }}>
              <div style={{ width: '80%', height: '100%', background: '#4caf50', borderRadius: 2 }} />
              <div style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 3, height: 5, background: 'rgba(245,240,232,0.4)', borderRadius: '0 1px 1px 0' }} />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {screen === 'home' ? (
            <HomeScreen
              townName={townName} characterName={characterName} gameDay={gameDay}
              hour={hour} minute={minute} activeQuestTitle={activeQuest?.title}
              onOpenApp={setScreen as any} seed={seed}
            />
          ) : (
            <AppScreen
              screen={screen} onBack={() => setScreen('home')}
              npcs={npcs} npcStates={npcStates}
              questState={questState} availQuests={availQuests} activeQuest={activeQuest}
              completedIds={completedIds} trustMap={trustMap} onStartQuest={onStartQuest}
              inventory={inventory}
              notices={notices} noticesLoading={noticesLoading}
              hour={hour} gameDay={gameDay}
              character={character}
              onRest={() => { onClose(); onRest() }}
              onExitGame={() => { onClose(); onExitGame() }}
            />
          )}
        </div>

        {/* Home bar */}
        <div style={{ height: 18, background: '#070605', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div
            style={{ width: 100, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)', cursor: 'pointer' }}
            onPointerDown={screen === 'home' ? onClose : () => setScreen('home')}
          />
        </div>
      </div>
    </div>
  )
}

// ── Home screen ───────────────────────────────────────────────────────────────

function HomeScreen({ townName, characterName, gameDay, hour, minute, activeQuestTitle, onOpenApp, seed }: {
  townName: string; characterName: string; gameDay: number; hour: number; minute: number
  activeQuestTitle?: string; onOpenApp: (app: AppScreen) => void; seed: number
}) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Wallpaper hero */}
      <div style={{
        padding: '20px 24px 24px', textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(201,168,76,0.07) 0%, transparent 100%)',
        flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 22, color: '#c9a84c', letterSpacing: '0.06em', marginBottom: 3 }}>
          {townName}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)', marginBottom: 16 }}>
          {characterName} · Day {gameDay}
        </div>
        {activeQuestTitle && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 99,
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
            fontSize: 11, color: '#c9a84c', fontWeight: 600,
          }}>
            📋 {activeQuestTitle}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px', flexShrink: 0 }} />

      {/* App grid */}
      <div style={{
        flex: 1, padding: '20px 24px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px 12px', alignContent: 'start', overflowY: 'auto',
      }}>
        {APPS.map(app => (
          <button
            key={app.id}
            onPointerDown={() => onOpenApp(app.id as AppScreen)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: `linear-gradient(135deg, ${app.color}33, ${app.color}18)`,
              border: `1px solid ${app.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>
              {app.emoji}
            </div>
            <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.55)', fontWeight: 500 }}>{app.label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 0 4px', textAlign: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.12)' }}>Seed {String(seed).padStart(6,'0')}</span>
      </div>
    </div>
  )
}

// ── App screen wrapper ────────────────────────────────────────────────────────

function AppScreen({ screen, onBack, npcs, npcStates, questState, availQuests, activeQuest, completedIds, trustMap, onStartQuest, inventory, notices, noticesLoading, hour, gameDay, character, onRest, onExitGame }: any) {
  const titles: Record<string, string> = {
    quests:'Quests', relations:'Relationships', map:'Town Map',
    inventory:'Inventory', board:'Notice Board', rest:'Rest', character:'Character',
  }
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Nav bar */}
      <div style={{ padding: '10px 16px 8px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <button onPointerDown={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9a84c', fontSize: 20, lineHeight: 1, padding: '4px 6px', borderRadius: 8 }}>‹</button>
        <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 14, color: '#f5f0e8', letterSpacing: '0.05em' }}>{titles[screen]}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {screen === 'relations' && <RelationsApp npcStates={npcStates} npcs={npcs} />}
        {screen === 'quests'    && <QuestsApp questState={questState} availQuests={availQuests} activeQuest={activeQuest} completedIds={completedIds} trustMap={trustMap} onStartQuest={onStartQuest} />}
        {screen === 'map'       && <MapApp npcs={npcs} hour={hour} gameDay={gameDay} />}
        {screen === 'inventory' && <InventoryApp inventory={inventory} />}
        {screen === 'board'     && <BoardApp notices={notices} loading={noticesLoading} dayEvent={null} gameDay={gameDay} />}
        {screen === 'character' && <CharacterApp character={character} onExitGame={onExitGame} />}
        {screen === 'rest'      && <RestApp onRest={onRest} />}
      </div>
    </div>
  )
}

// ── Relationships app ─────────────────────────────────────────────────────────

function RelationsApp({ npcStates, npcs }: { npcStates: NpcState[]; npcs: NpcSoul[] }) {
  const getState = (id: string) => npcStates.find(s => s.npc_id === id)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {npcs.map(npc => {
        const s     = getState(npc.id)
        const trust = s?.trust ?? 0
        const mood  = s?.mood ?? 'neutral'
        const times = s?.times_spoken ?? 0
        const memory = s?.memory_summary
        const color = NPC_COLORS[npc.id] ?? '#c9a84c'
        return (
          <div key={npc.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'Cinzel, serif', flexShrink: 0 }}>
                {npc.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#f5f0e8' }}>{npc.name}</span>
                  <span style={{ fontSize: 16 }}>{MOOD_EMOJI[mood] ?? '😐'}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)' }}>{npc.role}</div>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'rgba(201,168,76,0.8)', fontWeight: 600 }}>{TRUST_LABEL(trust)}</span>
                <span style={{ fontSize: 10, color: 'rgba(245,240,232,0.3)' }}>{times === 0 ? 'Never spoken' : `${times} conversation${times!==1?'s':''}`}</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }}>
                <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${color}88, ${color})`, width: `${Math.min(trust,100)}%`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
            {memory ? (
              <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.45)', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, lineHeight: 1.5 }}>
                "{memory.split(' | ').pop()}"
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.2)', fontStyle: 'italic' }}>
                {times === 0 ? `You haven't met ${npc.name} yet.` : 'No memories recorded.'}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Quests app ────────────────────────────────────────────────────────────────

function QuestsApp({ questState, availQuests, activeQuest, completedIds, trustMap, onStartQuest }: any) {
  if (!questState) return <div style={{ textAlign:'center', color:'rgba(245,240,232,0.3)', fontSize:13, paddingTop:32 }}>Loading quests…</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {activeQuest && (
        <Section title="Active">
          <QuestCard quest={activeQuest} showObjectives />
        </Section>
      )}
      {availQuests.length > 0 && (
        <Section title="Available">
          {availQuests.map((q: any) => <QuestCard key={q.id} quest={q} onStart={() => onStartQuest(q.id)} />)}
        </Section>
      )}
      {!activeQuest && availQuests.length === 0 && (
        <div style={{ textAlign:'center', color:'rgba(245,240,232,0.3)', fontSize:13, fontStyle:'italic', paddingTop:32 }}>
          Talk to the villagers to find quests.
        </div>
      )}
      {completedIds.length > 0 && (
        <Section title="Completed">
          {questState.quests.filter((q: any) => completedIds.includes(q.id)).map((q: any) => <QuestCard key={q.id} quest={q} />)}
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color:'rgba(201,168,76,0.5)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:10 }}>{title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{children}</div>
    </div>
  )
}

function QuestCard({ quest, showObjectives, onStart }: any) {
  const STATUS_COLOR: any = { active:'#c9a84c', complete:'#6ab86a', available:'rgba(245,240,232,0.5)', locked:'rgba(245,240,232,0.2)' }
  const STATUS_LABEL: any = { active:'In Progress', complete:'✓ Done', available:'Available', locked:'Locked' }
  const done = quest.status === 'complete'
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px', opacity: done ? 0.6 : 1 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontWeight:700, fontSize:13, color:'#f5f0e8', flex:1, marginRight:8 }}>{quest.title}</span>
        <span style={{ fontSize:10, fontWeight:700, color:STATUS_COLOR[quest.status] }}>{STATUS_LABEL[quest.status]}</span>
      </div>
      <p style={{ margin:'0 0 8px', fontSize:11, color:'rgba(245,240,232,0.5)', lineHeight:1.5 }}>{quest.description}</p>
      {showObjectives && quest.objectives.map((o: any) => (
        <div key={o.id} style={{ display:'flex', gap:6, marginBottom:3 }}>
          <span style={{ fontSize:11, color: o.complete ? '#6ab86a' : 'rgba(245,240,232,0.3)' }}>{o.complete ? '✓' : '○'}</span>
          <span style={{ fontSize:11, color: o.complete ? 'rgba(245,240,232,0.3)' : 'rgba(245,240,232,0.6)', textDecoration: o.complete ? 'line-through' : 'none' }}>{o.description}</span>
        </div>
      ))}
      {quest.reward?.gold && <span style={{ fontSize:10, color:'#c9a84c', background:'rgba(201,168,76,0.1)', padding:'2px 8px', borderRadius:99, marginTop:6, display:'inline-block' }}>🪙 {quest.reward.gold} gold</span>}
      {onStart && (
        <button onPointerDown={onStart} style={{ marginTop:10, width:'100%', padding:'9px', borderRadius:10, background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.3)', color:'#c9a84c', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          Accept Quest
        </button>
      )}
    </div>
  )
}

// ── Town map app ──────────────────────────────────────────────────────────────

function MapApp({ npcs, hour, gameDay }: { npcs: NpcSoul[]; hour: number; gameDay: number }) {
  const SCALE = 12
  const canvasW = MAP_W * SCALE
  const canvasH = MAP_H * SCALE

  const npcPositions = npcs.map(npc => {
    const entry = getCurrentEntry(npc.id, hour)
    if (!entry) return null
    const building = BUILDINGS.find(b => b.id === entry.inside)
    if (building) return { npc, x: building.tx + building.tw / 2, y: building.ty + building.th / 2, inside: true }
    return { npc, x: entry.tx, y: entry.ty, inside: false }
  }).filter(Boolean)

  return (
    <div>
      <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.3)', marginBottom: 14, textAlign: 'center' }}>Day {gameDay} · {pad(hour)}:00</div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ position:'relative', width:canvasW, height:canvasH, background:'#4a7a3a', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden' }}>
          <div style={{ position:'absolute', left:9*SCALE, top:0, width:6*SCALE, height:canvasH, background:'rgba(180,150,100,0.3)' }} />
          <div style={{ position:'absolute', left:0, top:8*SCALE, width:canvasW, height:3*SCALE, background:'rgba(180,150,100,0.3)' }} />
          {BUILDINGS.map(b => (
            <div key={b.id} style={{ position:'absolute', left:b.tx*SCALE, top:b.ty*SCALE, width:b.tw*SCALE, height:b.th*SCALE, background:b.color+'88', border:`1px solid ${b.color}`, borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:7, fontWeight:700, color:'#fff', textAlign:'center', textShadow:'0 1px 3px rgba(0,0,0,0.8)', lineHeight:1.2 }}>{b.name}</span>
            </div>
          ))}
          <div style={{ position:'absolute', left:11*SCALE-5, top:9*SCALE-5, width:10, height:10, background:'#888', borderRadius:'50%', border:'1px solid rgba(255,255,255,0.3)' }} />
          {npcPositions.map(p => p && (
            <div key={p.npc.id} style={{ position:'absolute', left:p.x*SCALE-6, top:p.y*SCALE-6, width:12, height:12, borderRadius:'50%', background:NPC_COLORS[p.npc.id]??'#c9a84c', border:`2px solid #fff`, boxShadow:`0 0 6px ${NPC_COLORS[p.npc.id]??'#c9a84c'}`, zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:6, fontWeight:900, color:'#fff' }}>
              {p.npc.name[0]}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {npcs.map(npc => {
          const entry = getCurrentEntry(npc.id, hour)
          return (
            <div key={npc.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'rgba(255,255,255,0.03)', borderRadius:10 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:NPC_COLORS[npc.id], flexShrink:0 }} />
              <span style={{ fontSize:12, fontWeight:600, color:'#f5f0e8', minWidth:70 }}>{npc.name}</span>
              <span style={{ fontSize:11, color:'rgba(245,240,232,0.4)', fontStyle:'italic' }}>{entry?.activity ?? 'somewhere'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Inventory app ─────────────────────────────────────────────────────────────

function InventoryApp({ inventory }: { inventory: Item[] }) {
  if (!inventory.length) return <div style={{ textAlign:'center', color:'rgba(245,240,232,0.3)', fontSize:13, paddingTop:32 }}>Your bag is empty.</div>
  const TYPE_COLOR: any = { food:'#6ab86a', material:'#c9a84c', tool:'#4a6080', gift:'#d45555', key:'#c9a84c', misc:'rgba(245,240,232,0.4)' }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
      {inventory.map(item => (
        <div key={item.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px' }}>
          <div style={{ fontSize:26, marginBottom:6 }}>{item.emoji}</div>
          <div style={{ fontWeight:700, fontSize:13, color:'#f5f0e8', marginBottom:2 }}>{item.name}</div>
          <div style={{ fontSize:10, color:TYPE_COLOR[item.type]??'rgba(245,240,232,0.4)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{item.type}</div>
          <div style={{ fontSize:11, color:'rgba(245,240,232,0.4)', lineHeight:1.4, marginBottom:6 }}>{item.description}</div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:11, color:'rgba(245,240,232,0.5)' }}>×{item.quantity}</span>
            <span style={{ fontSize:11, color:'rgba(201,168,76,0.6)' }}>🪙{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Notice board app ──────────────────────────────────────────────────────────

function BoardApp({ notices, loading, gameDay }: { notices: string[]; loading: boolean; dayEvent: any; gameDay: number }) {
  return (
    <div>
      <div style={{ textAlign:'center', fontSize:22, marginBottom:8 }}>🪧</div>
      <div style={{ textAlign:'center', fontSize:11, color:'rgba(245,240,232,0.3)', marginBottom:20 }}>Day {gameDay}</div>
      {loading ? (
        <div style={{ textAlign:'center', color:'rgba(245,240,232,0.3)', fontSize:13 }}>Reading the board…</div>
      ) : notices.length === 0 ? (
        <div style={{ textAlign:'center', color:'rgba(245,240,232,0.3)', fontSize:13, fontStyle:'italic' }}>The board is empty today.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {notices.map((n, i) => (
            <div key={i} style={{ padding:'12px 14px', background:'rgba(201,168,76,0.05)', border:'1px solid rgba(201,168,76,0.1)', borderRadius:12 }}>
              <p style={{ margin:0, fontSize:13, color:'rgba(245,240,232,0.75)', lineHeight:1.6 }}>{n.replace(/^[-•*#\d.]+\s*/,'')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Character app ─────────────────────────────────────────────────────────────

function CharacterApp({ character, onExitGame }: { character: Character; onExitGame: () => void }) {
  const STAT_LABELS: any = { strength:'💪',intellect:'🧠',charisma:'✨',cooking:'🍳',crafting:'⚒️',wisdom:'🕯️',reputation:'⭐' }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Identity */}
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px' }}>
        <div style={{ fontSize:17, fontWeight:700, color:'#f5f0e8', marginBottom:3 }}>{character.name}</div>
        <div style={{ fontSize:11, color:'#c9a84c', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>{character.archetype}</div>
        <div style={{ display:'flex', gap:16, marginBottom:4 }}>
          <div><div style={{ fontSize:10, color:'rgba(245,240,232,0.3)', marginBottom:2 }}>Energy</div><div style={{ fontSize:15, fontWeight:700, color:'#f5f0e8' }}>{character.energy}/{character.max_energy}</div></div>
          <div><div style={{ fontSize:10, color:'rgba(245,240,232,0.3)', marginBottom:2 }}>Gold</div><div style={{ fontSize:15, fontWeight:700, color:'#c9a84c' }}>🪙 {character.gold}</div></div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'rgba(201,168,76,0.6)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>Stats</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {Object.entries(character.stats).map(([k, v]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:14, width:20 }}>{STAT_LABELS[k]||'•'}</span>
              <span style={{ fontSize:12, color:'rgba(245,240,232,0.6)', minWidth:80, textTransform:'capitalize' }}>{k}</span>
              <div style={{ flex:1, display:'flex', gap:2 }}>
                {Array.from({length:10}).map((_,i)=>(
                  <div key={i} style={{ flex:1, height:4, borderRadius:99, background: i<(v as number)?'#c9a84c':'rgba(255,255,255,0.08)' }} />
                ))}
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:'#c9a84c', minWidth:18, textAlign:'right' }}>{v as number}</span>
            </div>
          ))}
        </div>
      </div>

      <button onPointerDown={onExitGame} style={{ width:'100%', padding:'13px', borderRadius:12, border:'1px solid rgba(248,113,113,0.2)', cursor:'pointer', background:'rgba(248,113,113,0.06)', color:'#f87171', fontWeight:600, fontSize:13 }}>
        Exit to Dashboard
      </button>
    </div>
  )
}

// ── Rest app ──────────────────────────────────────────────────────────────────

function RestApp({ onRest }: { onRest: () => void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:20, paddingTop:40 }}>
      <div style={{ fontSize:52 }}>💤</div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:'Cinzel, serif', fontSize:16, fontWeight:700, color:'#f5f0e8', marginBottom:8 }}>Rest Until Morning</div>
        <div style={{ fontSize:13, color:'rgba(245,240,232,0.4)', lineHeight:1.6, maxWidth:220 }}>
          The day will advance and NPCs will reset their schedules.
        </div>
      </div>
      <button onPointerDown={onRest} style={{ padding:'14px 40px', borderRadius:14, border:'none', cursor:'pointer', background:'linear-gradient(135deg, #4a4878, #3a3860)', color:'#c9c0ff', fontWeight:700, fontSize:14, marginTop:10 }}>
        Rest Now
      </button>
    </div>
  )
}

// Need React imported for JSX
import React from 'react'

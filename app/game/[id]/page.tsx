'use client'
export const dynamic = 'force-dynamic'

import dynamicImport from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, Game, Character } from '@/lib/supabase'
import { NPC_LIST, NpcSoul, NPCS } from '@/lib/npcs'
import { getNpcInsideBuilding } from '@/lib/npc-schedule'
import type { BuildingEntry } from '@/components/game/GameCanvas'
import type { Item } from '@/components/game/InventoryPanel'
import { STARTER_ITEMS } from '@/components/game/InventoryPanel'
import DayNightOverlay from '@/components/game/DayNightOverlay'
import { AmbientAudio, getTimeEnvironment } from '@/lib/ambient-audio'
import { loadQuestState, saveQuestState, startQuest, completeObjective, getActiveQuest, buildQuestContext, type QuestState } from '@/lib/quests'
import { getDayEvent, type GameEvent } from '@/lib/random-events'
import type { SpecialAction } from '@/components/game/GameCanvas'

const GameCanvas          = dynamicImport(() => import('@/components/game/GameCanvas'),          { ssr: false })
const BuildingInterior    = dynamicImport(() => import('@/components/game/BuildingInterior'),    { ssr: false })
const InventoryPanel      = dynamicImport(() => import('@/components/game/InventoryPanel'),      { ssr: false })
const RelationshipPanel   = dynamicImport(() => import('@/components/game/RelationshipPanel'),   { ssr: false })
const NoticeBoardPanel    = dynamicImport(() => import('@/components/game/NoticeBoardPanel'),    { ssr: false })
const QuestLog            = dynamicImport(() => import('@/components/game/QuestLog'),            { ssr: false })

type Msg = { role: 'user' | 'assistant'; content: string }

export default function GamePage() {
  const router = useRouter()
  const { id: gameId } = useParams<{ id: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatNpc, setChatNpc] = useState<NpcSoul | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [trust, setTrust] = useState(0)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeBuilding, setActiveBuilding] = useState<BuildingEntry | null>(null)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventory, setInventory] = useState<Item[]>(STARTER_ITEMS)
  const [gameTime, setGameTime] = useState<{ hour: number; minute: number }>({ hour: 8, minute: 0 })
  const [nearDoor, setNearDoor]         = useState<BuildingEntry | null>(null)
  const [relPanelOpen, setRelPanel]     = useState(false)
  const [questLogOpen, setQuestLog]     = useState(false)
  const [noticeBoardOpen, setNoticeBoard] = useState(false)
  const [showSleepTransition, setShowSleep] = useState(false)
  const [questState, setQuestState]     = useState<QuestState | null>(null)
  const [dayEvent, setDayEvent]         = useState<GameEvent | null>(null)
  const [trustMap, setTrustMap]         = useState<Record<string, number>>({})
  const audioRef = useRef<AmbientAudio | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const chatNpcRef = useRef<NpcSoul | null>(null)
  const messagesAtOpenRef = useRef<number>(0)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }
      setUserId(session.user.id)
      const [{ data: g }, { data: c }] = await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).single(),
        supabase.from('characters').select('*').eq('game_id', gameId).eq('user_id', session.user.id).single(),
      ])
      if (!c) { router.push(`/game/${gameId}/character`); return }
      if (!g) { router.push('/dashboard'); return }
      setGame(g); setCharacter(c)

      // Load quest state + day event
      if (g) {
        setQuestState(loadQuestState(g.id))
        setDayEvent(getDayEvent(g.id, g.day ?? 1))
      }

      // Load trust map for quest unlock checks
      if (session.user.id && g) {
        const { data: npcStates } = await supabase
          .from('npc_state').select('npc_id, trust')
          .eq('game_id', g.id).eq('user_id', session.user.id)
        if (npcStates) {
          const tm: Record<string, number> = {}
          npcStates.forEach((s: any) => { tm[s.npc_id] = s.trust ?? 0 })
          setTrustMap(tm)
        }
      }
      // Load inventory from character record
      if (c.inventory && Array.isArray(c.inventory) && (c.inventory as any[]).length > 0) {
        setInventory(c.inventory as Item[])
      }
      setLoading(false)
    }
    load()
  }, [gameId, router])

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, sending])

  const openChat = async (npc: NpcSoul) => {
    setChatNpc(npc)
    chatNpcRef.current = npc
    setSending(true)

    // Load existing chat
    const { data } = await supabase.from('chat_logs').select('messages')
      .eq('game_id', gameId).eq('npc_id', npc.id).single()

    let initialMessages: Msg[] = []

    if (data?.messages?.length) {
      initialMessages = data.messages
      setMessages(initialMessages)
      setSending(false)
    } else {
      // First meeting — get opening line
      const res = await fetch(`/api/npc/${npc.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [], characterName: character?.name,
          gameId, userId, gameDay: game?.day, gameHour: gameTime.hour,
          questContext: questState ? buildQuestContext(npc.id, questState) : '',
        }),
      })
      const json = await res.json()
      setTrust(json.trust ?? 0)
      initialMessages = [{ role: 'assistant', content: json.reply }]
      setMessages(initialMessages)
      await saveChat(npc.id, initialMessages)
      setSending(false)
    }

    messagesAtOpenRef.current = initialMessages.length
    setTimeout(() => inputRef.current?.focus(), 300)
  }

  const closeChat = async () => {
    const npc = chatNpcRef.current
    const currentMessages = messages
    setChatNpc(null)
    chatNpcRef.current = null
    setMessages([])
    setInput('')

    // Save relationship state if conversation had new messages
    if (npc && currentMessages.length > messagesAtOpenRef.current && userId) {
      await fetch(`/api/npc/${npc.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages, characterName: character?.name,
          gameId, userId, gameDay: game?.day, isClosing: true,
        }),
      })
    }
  }

  const saveChat = async (npcId: string, msgs: Msg[]) => {
    await supabase.from('chat_logs').upsert({
      game_id: gameId, npc_id: npcId, user_id: userId, messages: msgs,
    }, { onConflict: 'game_id,npc_id,user_id' })
  }

  const send = async () => {
    if (!input.trim() || !chatNpc || sending) return
    const userMsg: Msg = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next); setInput(''); setSending(true)

    const res = await fetch(`/api/npc/${chatNpc.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: next, characterName: character?.name,
        gameId, userId, gameDay: game?.day, gameHour: gameTime.hour,
      }),
    })
    const json = await res.json()
    if (json.trust !== undefined) setTrust(json.trust)
    const final: Msg[] = [...next, { role: 'assistant', content: json.reply }]
    setMessages(final)
    await saveChat(chatNpc.id, final)
    setSending(false)
  }

  const handleSpecialAction = (action: SpecialAction) => {
    if (action === 'noticeboard') setNoticeBoard(true)
    if (action === 'rest') handleSleep()
  }

  const handleSleep = async () => {
    if (!game) return
    setShowSleep(true)
    // Advance day in Supabase
    const newDay = (game.day ?? 1) + 1
    await supabase.from('games').update({ day: newDay }).eq('id', gameId)
    setGame(g => g ? { ...g, day: newDay } : g)
    // New day event
    const newEvent = getDayEvent(gameId, newDay)
    setDayEvent(newEvent)
    // Reset quest state for new day if needed
    if (questState) {
      const updated = { ...questState }
      saveQuestState(gameId, updated)
    }
    setTimeout(() => {
      setShowSleep(false)
      // Reset game time to 6am — done by reloading game clock in Phaser
    }, 2500)
  }

  const STAT_LABELS: Record<string, string> = {
    strength: '💪', intellect: '🧠', charisma: '✨',
    cooking: '🍳', crafting: '⚒️', wisdom: '🕯️', reputation: '⭐',
  }

  function TrustBar({ value }: { value: number }) {
    const label = value < 10 ? 'Stranger' : value < 30 ? 'Acquaintance' : value < 55 ? 'Warming up' : value < 75 ? 'Trusted' : value < 90 ? 'Friend' : 'Confidant'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: 'rgba(201,168,76,0.6)', width: 76, flexShrink: 0 }}>{label}</span>
        <div style={{ flex: 1, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }}>
          <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #c9a84c, #dfc06a)', width: `${value}%`, transition: 'width 0.6s ease' }} />
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0908', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid rgba(201,168,76,0.2)', borderTop: '2px solid #c9a84c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#0a0908', overflow: 'hidden' }}
      onPointerDown={() => {
        // Unlock AudioContext on first interaction (browser autoplay policy)
        if (!audioRef.current) {
          audioRef.current = new AmbientAudio()
          audioRef.current.setEnvironment(getTimeEnvironment(gameTime.hour))
        } else {
          audioRef.current.resume()
        }
      }}
    >
      {/* Day/night overlay */}
      <DayNightOverlay hour={gameTime.hour} minute={gameTime.minute} />

      {/* Town world — hidden when inside a building */}
      {character && !activeBuilding && (
        <GameCanvas
          character={character}
          npcs={NPC_LIST}
          onNpcInteract={openChat}
          onClockTick={(h, m) => {
            setGameTime({ hour: h, minute: m })
            if (audioRef.current) {
              audioRef.current.setEnvironment(getTimeEnvironment(h))
            }
          }}
          onNearDoor={setNearDoor}
          onSpecialAction={handleSpecialAction}
          onEnterBuilding={(b) => {
            setActiveBuilding(b)
            audioRef.current?.setEnvironment('indoor')
          }}
        />
      )}

      {/* Building interior — NPC shown only if their schedule puts them inside right now */}
      {character && activeBuilding && (() => {
        const insideNpcId = Object.keys(NPCS).find(
          id => getNpcInsideBuilding(id, gameTime.hour) === activeBuilding.id
        )
        return (
          <BuildingInterior
            building={activeBuilding}
            characterName={character.name}
            npc={insideNpcId ? NPCS[insideNpcId] : undefined}
            onExit={() => { setActiveBuilding(null); audioRef.current?.setEnvironment(getTimeEnvironment(gameTime.hour)) }}
            onNpcInteract={openChat}
          />
        )
      })()}

      {/* Relationship panel */}
      {relPanelOpen && userId && (
        <RelationshipPanel gameId={gameId} userId={userId} onClose={() => setRelPanel(false)} />
      )}

      {/* Quest log */}
      {questLogOpen && questState && (
        <QuestLog
          state={questState}
          trustMap={trustMap}
          onClose={() => setQuestLog(false)}
          onStart={(id) => {
            const next = startQuest(questState, id)
            setQuestState(next)
            saveQuestState(gameId, next)
            setQuestLog(false)
          }}
        />
      )}

      {/* Notice board */}
      {noticeBoardOpen && dayEvent && (
        <NoticeBoardPanel
          gameId={gameId}
          gameDay={game?.day ?? 1}
          gameHour={gameTime.hour}
          event={dayEvent}
          onClose={() => setNoticeBoard(false)}
        />
      )}

      {/* Sleep transition */}
      {showSleepTransition && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0)', animation: 'fadeBlack 2.5s ease forwards',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ color: 'rgba(245,240,232,0.8)', fontFamily: 'Cinzel, serif', fontSize: 18, letterSpacing: '0.12em', opacity: 0, animation: 'fadeText 2.5s ease forwards 0.5s' }}>
            You rest until morning…
          </div>
          <style>{`
            @keyframes fadeBlack { 0%{background:rgba(0,0,0,0)} 40%{background:rgba(0,0,0,0.95)} 100%{background:rgba(0,0,0,0.95)} }
            @keyframes fadeText  { 0%{opacity:0} 30%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
          `}</style>
        </div>
      )}

      {/* Inventory panel */}
      {inventoryOpen && (
        <InventoryPanel
          items={inventory}
          gold={character?.gold ?? 0}
          onClose={() => setInventoryOpen(false)}
        />
      )}

      {/* ── HUD ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: 18, color: '#c9a84c', letterSpacing: '0.08em' }}>{game?.name}</span>
          <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.4)', marginLeft: 10, fontWeight: 500 }}>Day {game?.day}</span>
          <span style={{ fontSize: 11, color: 'rgba(201,168,76,0.6)', marginLeft: 8, fontWeight: 600, fontFamily: 'monospace' }}>
            {String(gameTime.hour).padStart(2,'0')}:{String(gameTime.minute).padStart(2,'0')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 99, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.2)', fontSize: 12, color: 'rgba(245,240,232,0.7)', fontWeight: 600 }}>
            ⚡ {character?.energy}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 99, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.2)', fontSize: 12, color: 'rgba(245,240,232,0.7)', fontWeight: 600 }}>
            🪙 {character?.gold}
          </div>
          {/* Quest indicator */}
          {questState && getActiveQuest(questState) && (
            <button onPointerDown={() => setQuestLog(true)}
              style={{ padding: '0 10px', height: 34, borderRadius: 10, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#c9a84c', whiteSpace: 'nowrap' }}>
              📋 Quest
            </button>
          )}
          <button onPointerDown={() => setRelPanel(true)}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.25)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Relationships">
            ❤️
          </button>
          <button onPointerDown={() => setInventoryOpen(true)}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.25)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Inventory [I]">
            🎒
          </button>
          <button onClick={() => setMenuOpen(true)}
            style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(201,168,76,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
            <div style={{ width: 14, height: 1.5, background: '#c9a84c', borderRadius: 99 }} />
            <div style={{ width: 14, height: 1.5, background: '#c9a84c', borderRadius: 99 }} />
            <div style={{ width: 14, height: 1.5, background: '#c9a84c', borderRadius: 99 }} />
          </button>
        </div>
      </div>

      {/* Mobile Enter button — shown when near a door and no chat open */}
      {!chatNpc && !activeBuilding && nearDoor && (
        <div style={{ position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)', zIndex: 9990, pointerEvents: 'auto' }}>
          <button
            onPointerDown={(e) => { e.stopPropagation(); setActiveBuilding(nearDoor); setNearDoor(null) }}
            style={{
              padding: '14px 32px', borderRadius: 12, fontSize: 16, fontWeight: 700,
              background: 'rgba(10,8,5,0.95)', border: '2px solid #c9a84c',
              color: '#c9a84c', cursor: 'pointer', letterSpacing: '0.04em',
              boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
            }}
          >
            🚪 Enter {nearDoor.name}
          </button>
        </div>
      )}

      {!chatNpc && (
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          <div style={{ fontSize: 11, color: 'rgba(245,240,232,0.3)', background: 'rgba(0,0,0,0.5)', padding: '6px 14px', borderRadius: 99, whiteSpace: 'nowrap', fontWeight: 500 }}>
            WASD · Walk up to villagers to talk
          </div>
        </div>
      )}

      {/* ── GAME MENU ── */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}
          onClick={() => setMenuOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 280, background: '#111009', borderLeft: '1px solid #2e2a22', height: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 900, color: '#c9a84c', letterSpacing: '0.08em' }}>MENU</span>
              <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.4)', fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ background: '#1a1814', border: '1px solid #2e2a22', borderRadius: 14, padding: '16px', marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f5f0e8', marginBottom: 2 }}>{character?.name}</div>
              <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{character?.archetype}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {character && Object.entries(character.stats).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13 }}>{STAT_LABELS[k] || '•'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < (v as number) ? '#c9a84c' : 'rgba(255,255,255,0.08)' }} />
                        ))}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#c9a84c', minWidth: 14, textAlign: 'right' }}>{v as number}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <button onPointerDown={() => { setQuestLog(true); setMenuOpen(false) }}
                style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer', background: 'rgba(201,168,76,0.06)', color: '#c9a84c', fontWeight: 600, fontSize: 13 }}>
                📋 Quest Log
              </button>
              <button onPointerDown={() => { setRelPanel(true); setMenuOpen(false) }}
                style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer', background: 'rgba(201,168,76,0.06)', color: '#c9a84c', fontWeight: 600, fontSize: 13 }}>
                ❤️ Relationships
              </button>
              <button onPointerDown={() => handleSleep()}
                style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer', background: 'rgba(201,168,76,0.06)', color: '#c9a84c', fontWeight: 600, fontSize: 13 }}>
                💤 Rest Until Morning
              </button>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => setMenuOpen(false)}
                style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', fontWeight: 600, fontSize: 14 }}>
                Resume
              </button>
              <button onClick={() => router.push('/dashboard')}
                style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: '1px solid rgba(248,113,113,0.2)', cursor: 'pointer', background: 'rgba(248,113,113,0.06)', color: '#f87171', fontWeight: 600, fontSize: 14 }}>
                Exit to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHAT MODAL ── */}
      {chatNpc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={closeChat} />
          <div style={{
            position: 'relative', zIndex: 1, background: '#111009',
            borderTop: '1px solid #2e2a22', borderRadius: '20px 20px 0 0',
            display: 'flex', flexDirection: 'column', maxHeight: '65vh', minHeight: 340,
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* NPC header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 10px', borderBottom: '1px solid #2e2a22', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {chatNpc.emoji}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#f5f0e8' }}>{chatNpc.name}</div>
                  <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 500, marginBottom: 3 }}>{chatNpc.role}</div>
                  <TrustBar value={trust} />
                </div>
              </div>
              <button onClick={closeChat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.3)', fontSize: 22, lineHeight: 1, padding: '4px 8px' }}>✕</button>
            </div>

            {/* Messages */}
            <div ref={messagesRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px',
                    borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    background: m.role === 'user' ? 'rgba(201,168,76,0.15)' : '#1a1814',
                    border: `1px solid ${m.role === 'user' ? 'rgba(201,168,76,0.3)' : '#2e2a22'}`,
                    fontSize: 14, lineHeight: 1.55,
                    color: m.role === 'user' ? '#f5f0e8' : 'rgba(245,240,232,0.9)',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div style={{ display: 'flex' }}>
                  <div style={{ padding: '10px 16px', borderRadius: '4px 16px 16px 16px', background: '#1a1814', border: '1px solid #2e2a22', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#c9a84c', opacity: 0.6, animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: '10px 14px 20px', display: 'flex', gap: 10, borderTop: '1px solid #1a1814', flexShrink: 0 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') send() }}
                placeholder={`Talk to ${chatNpc.name}...`}
                style={{ flex: 1, background: '#1a1814', border: '1px solid #2e2a22', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#f5f0e8', outline: 'none' }}
              />
              <button onClick={send} disabled={!input.trim() || sending}
                style={{
                  width: 44, height: 44, borderRadius: 12, border: 'none',
                  cursor: input.trim() && !sending ? 'pointer' : 'default',
                  background: input.trim() && !sending ? 'linear-gradient(135deg, #c9a84c, #dfc06a)' : 'rgba(201,168,76,0.2)',
                  color: input.trim() && !sending ? '#1a1408' : 'rgba(201,168,76,0.4)',
                  fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.4} 40%{transform:scale(1.2);opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

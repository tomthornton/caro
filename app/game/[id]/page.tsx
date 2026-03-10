export const dynamic = 'force-dynamic'

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase, Game, Character } from '@/lib/supabase'
import { NPC_LIST, NpcSoul } from '@/lib/npcs'
import dynamic from 'next/dynamic'

const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), { ssr: false })

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default function GamePage() {
  const router = useRouter()
  const { id: gameId } = useParams<{ id: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatNpc, setChatNpc] = useState<NpcSoul | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/'); return }

      const [{ data: gameData }, { data: charData }] = await Promise.all([
        supabase.from('games').select('*').eq('id', gameId).single(),
        supabase.from('characters').select('*').eq('game_id', gameId).eq('user_id', session.user.id).single(),
      ])

      if (!charData) { router.push(`/game/${gameId}/character`); return }
      if (!gameData) { router.push('/dashboard'); return }

      setGame(gameData)
      setCharacter(charData)
      setLoading(false)
    }
    load()
  }, [gameId, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openChat = async (npc: NpcSoul) => {
    setChatNpc(npc)
    // Load existing chat history
    const { data } = await supabase
      .from('chat_logs')
      .select('messages')
      .eq('game_id', gameId)
      .eq('npc_id', npc.id)
      .single()

    if (data?.messages?.length) {
      setMessages(data.messages)
    } else {
      // First meeting — trigger intro message
      setSending(true)
      const res = await fetch(`/api/npc/${npc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], characterName: character?.name, characterStats: character?.stats, memoryContext: null }),
      })
      const { reply } = await res.json()
      const initMessages: ChatMessage[] = [{ role: 'assistant', content: reply }]
      setMessages(initMessages)
      await saveChat(npc.id, initMessages)
      setSending(false)
    }
  }

  const closeChat = () => {
    setChatNpc(null)
    setMessages([])
    setInput('')
  }

  const saveChat = async (npcId: string, msgs: ChatMessage[]) => {
    await supabase.from('chat_logs').upsert({
      game_id: gameId,
      npc_id: npcId,
      user_id: (await supabase.auth.getSession()).data.session?.user.id,
      messages: msgs,
    }, { onConflict: 'game_id,npc_id,user_id' })
  }

  const sendMessage = async () => {
    if (!input.trim() || !chatNpc || sending) return
    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setSending(true)

    const res = await fetch(`/api/npc/${chatNpc.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newMessages,
        characterName: character?.name,
        characterStats: character?.stats,
        memoryContext: null,
      }),
    })
    const { reply } = await res.json()
    const finalMessages: ChatMessage[] = [...newMessages, { role: 'assistant', content: reply }]
    setMessages(finalMessages)
    await saveChat(chatNpc.id, finalMessages)
    setSending(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-bg overflow-hidden" style={{ fontFamily: 'var(--font-ui)' }}>

      {/* Game canvas */}
      {character && (
        <GameCanvas
          gameId={gameId}
          character={character}
          npcs={NPC_LIST}
          onNpcInteract={openChat}
        />
      )}

      {/* HUD — top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(14,12,10,0.85), transparent)' }}>
        <div className="pointer-events-auto">
          <button onClick={() => router.push('/dashboard')} className="text-xs font-ui text-parchment/30 hover:text-parchment/60">
            ← {game?.name}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-ui text-gold/60">Day {game?.day}</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(14,12,10,0.7)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <span className="text-xs">⚡</span>
            <span className="text-xs font-bold text-parchment/70">{character?.energy}/{character?.max_energy}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(14,12,10,0.7)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <span className="text-xs">🪙</span>
            <span className="text-xs font-bold text-parchment/70">{character?.gold}</span>
          </div>
        </div>
      </div>

      {/* NPC interaction hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <p className="text-xs font-ui text-parchment/25 text-center bg-bg/50 px-4 py-2 rounded-full backdrop-blur-sm">
          Walk up to a villager and press E or tap to talk
        </p>
      </div>

      {/* Chat modal */}
      {chatNpc && (
        <div className="absolute inset-0 flex flex-col justify-end" style={{ background: 'rgba(14,12,10,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-surface border-t border-border flex flex-col" style={{ maxHeight: '70vh' }}>

            {/* NPC header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{chatNpc.emoji}</span>
                <div>
                  <p className="font-display text-sm text-gold tracking-wide">{chatNpc.name}</p>
                  <p className="text-xs font-ui text-parchment/35">{chatNpc.role}</p>
                </div>
              </div>
              <button onClick={closeChat} className="text-parchment/30 hover:text-parchment/60 text-xl leading-none">✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%] px-4 py-3 rounded-2xl"
                    style={m.role === 'user'
                      ? { background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' }
                      : { background: 'rgba(31,26,21,1)', border: '1px solid rgba(58,48,32,0.8)' }
                    }>
                    <p className="text-sm font-body leading-relaxed text-parchment/85">{m.content}</p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl" style={{ background: '#1f1a15', border: '1px solid #3a3020' }}>
                    <div className="flex gap-1.5 items-center h-4">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 flex gap-3 border-t border-border">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={`Say something to ${chatNpc.name}...`}
                className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm font-ui text-parchment placeholder:text-parchment/20 focus:outline-none focus:border-gold/40" />
              <button onClick={sendMessage} disabled={!input.trim() || sending}
                className="px-5 py-3 rounded-xl text-sm font-ui font-semibold text-bg disabled:opacity-30 transition-all"
                style={{ background: 'linear-gradient(135deg, #c9a84c, #e8c97a)' }}>
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

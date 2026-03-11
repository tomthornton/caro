import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NPCS } from '@/lib/npcs'
import { buildSystemPrompt, buildTownContext, getOpeningScenario, evaluateConversationImpact, DEFAULT_STATE, NpcDynamicState } from '@/lib/npc-prompt'
import { NPC_LIST } from '@/lib/npcs'
import { getCurrentEntry } from '@/lib/npc-schedule'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest, { params }: { params: Promise<{ npcId: string }> }) {
  const { npcId } = await params
  const npc = NPCS[npcId]
  if (!npc) return NextResponse.json({ error: 'NPC not found' }, { status: 404 })

  const { messages, characterName, gameId, userId, gameDay, gameHour, isClosing, questContext, giftItemId, giftItemName } = await req.json()

  // ── Load dynamic state ────────────────────────────────────────────────────
  let state: NpcDynamicState = { ...DEFAULT_STATE }

  if (gameId && userId) {
    const { data } = await supabaseAdmin
      .from('npc_state')
      .select('*')
      .eq('game_id', gameId)
      .eq('npc_id', npcId)
      .eq('user_id', userId)
      .single()

    if (data) {
      state = {
        mood:           data.mood        ?? DEFAULT_STATE.mood,
        energy:         data.energy      ?? DEFAULT_STATE.energy,
        stress:         data.stress      ?? DEFAULT_STATE.stress,
        preoccupation:  data.preoccupation,
        trust:          data.trust       ?? 0,
        fondness:       data.fondness    ?? 0,
        timesSpoken:    data.times_spoken ?? 0,
        history:        data.history     ?? [],
        memorySummary:  data.memory_summary ?? '',
      }
    }
  }

  // ── If closing the conversation, update state and summarize ───────────────
  if (isClosing && gameId && userId && messages.length > 1) {
    const newValues = evaluateConversationImpact(state, messages.length, npc.personality)

    // Ask Claude to generate a 1-sentence memory summary
    let newSummary = state.memorySummary
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const summaryRes = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 120,
        system: `You are summarizing a conversation between ${npc.name} and ${characterName || 'the player'} for ${npc.name}'s memory. Write 1–2 sentences in first person as ${npc.name}, capturing the most meaningful or notable thing from this conversation. Be specific. Focus on what you now know or feel about this person.`,
        messages: [{ role: 'user', content: JSON.stringify(messages.slice(-8)) }],
      })
      const text = summaryRes.content[0].type === 'text' ? summaryRes.content[0].text : ''
      if (text) {
        // Keep last 3 summaries
        const prev = state.memorySummary ? [state.memorySummary] : []
        newSummary = [...prev, text].slice(-3).join(' | ')
      }
    } catch { /* best effort */ }

    await supabaseAdmin.from('npc_state').upsert({
      game_id: gameId, npc_id: npcId, user_id: userId,
      mood: state.mood, energy: state.energy, stress: state.stress,
      preoccupation: state.preoccupation,
      trust: newValues.trust, fondness: newValues.fondness,
      times_spoken: newValues.timesSpoken,
      history: state.history,
      memory_summary: newSummary,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'game_id,npc_id,user_id' })

    return NextResponse.json({ ok: true })
  }

  // ── Build prompt and call Claude ──────────────────────────────────────────
  const currentHour = typeof gameHour === 'number' ? gameHour : 8
  const townContext = buildTownContext(npcId, currentHour, NPC_LIST)

  // Build gift context
  const giftContext = giftItemId
    ? `\nThe player just gave you a ${giftItemName ?? giftItemId} as a gift. React naturally to this in your next response. It meaningfully improves how you feel toward them right now. If you feel generous and trust is decent (>30), you may optionally include exactly one line at the very end of your response in this format: [GIFT:item_name:description] — for example [GIFT:herb_bundle:A small bundle of dried sage from my garden.]. Only include this if it feels natural and in-character.`
    : ''

  const fullContext  = [townContext, questContext, giftContext].filter(Boolean).join('\n')
  const systemPrompt = buildSystemPrompt(npc, state, characterName || 'Stranger', gameDay, fullContext || undefined)

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 320,
      system: systemPrompt,
      messages: (messages.length === 0
        ? [{ role: 'user', content: getOpeningScenario(npcId) }]
        : messages.slice(-14)
      ).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    let reply = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse [GIFT:item:desc] marker
    let giftGiven: { id: string; name: string; description: string } | undefined
    const giftMatch = reply.match(/\[GIFT:([^:]+):([^\]]+)\]/)
    if (giftMatch) {
      giftGiven = { id: giftMatch[1].trim().toLowerCase().replace(/\s+/g, '_'), name: giftMatch[1].trim(), description: giftMatch[2].trim() }
      reply = reply.replace(giftMatch[0], '').trim()
    }

    // Apply trust boost if player gave a gift
    let newTrust = state.trust
    if (giftItemId && gameId && userId) {
      newTrust = Math.min(100, state.trust + 8)
      await supabaseAdmin.from('npc_state').upsert({
        game_id: gameId, npc_id: npcId, user_id: userId,
        trust: newTrust, fondness: state.fondness, mood: state.mood,
        energy: state.energy, stress: state.stress, times_spoken: state.timesSpoken,
        history: state.history, memory_summary: state.memorySummary,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'game_id,npc_id,user_id' })
    }

    return NextResponse.json({ reply, trust: newTrust, fondness: state.fondness, giftGiven })

  } catch {
    // Fallback: character-accurate first lines
    const fallbacks: Record<string, string> = {
      eleanor: `You look tired, honey. Sit down. I've got bread still warm — you want some?`,
      silas:   `${characterName || 'Stranger'}.`,
      maeve:   `I had a feeling someone would come by today. Sit down. I'll put the kettle on.`,
      caleb:   `Finally. A face I haven't known my whole life. Tell me something interesting.`,
      ruth:    `You came in on the eastern road. Most people don't. I have questions — is that alright?`,
    }
    return NextResponse.json({ reply: fallbacks[npcId] || `Hello. Welcome to Caro.` })
  }
}

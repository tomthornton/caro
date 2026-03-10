import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NPCS } from '@/lib/npcs'
import { buildSystemPrompt, evaluateConversationImpact, DEFAULT_STATE, NpcDynamicState } from '@/lib/npc-prompt'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest, { params }: { params: Promise<{ npcId: string }> }) {
  const { npcId } = await params
  const npc = NPCS[npcId]
  if (!npc) return NextResponse.json({ error: 'NPC not found' }, { status: 404 })

  const { messages, characterName, gameId, userId, gameDay, isClosing } = await req.json()

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
  const systemPrompt = buildSystemPrompt(npc, state, characterName || 'Stranger', gameDay)

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 250,
      system: systemPrompt,
      messages: (messages.length === 0
        ? [{ role: 'user', content: `[${npc.name} notices the player approaching and speaks first]` }]
        : messages.slice(-12)
      ).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply, trust: state.trust, fondness: state.fondness })

  } catch {
    // Fallback: character-accurate first lines
    const fallbacks: Record<string, string> = {
      eleanor: `Well, honey, look at you — new to Caro, I can tell. I'm Eleanor. Here, take one of these rolls before they cool. Homemade. Have you eaten today?`,
      silas:   `${characterName || 'Stranger'}. You're new. Silas. The forge is mine. If you need something, come back when you know what it is.`,
      maeve:   `I thought the air felt different this morning. Here you are. Welcome to Caro — though I suspect you already know it feels different here. Most people do, when they first arrive.`,
      caleb:   `Finally — a face I haven't known my whole life. I'm Caleb. Yes, the mayor's son, you'll hear that soon enough. What brings you to our very distinguished corner of nowhere?`,
      ruth:    `Oh, wonderful. A new arrival. I'm Ruth — the librarian, which means I make it my business to know everyone in Caro. I already have questions. Where are you from, exactly?`,
    }
    return NextResponse.json({ reply: fallbacks[npcId] || `Hello. Welcome to Caro.` })
  }
}

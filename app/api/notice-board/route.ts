import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { NPC_SCHEDULE, getCurrentEntry } from '@/lib/npc-schedule'
import { NPC_LIST } from '@/lib/npcs'

export async function POST(req: NextRequest) {
  const { gameDay, gameHour, event } = await req.json()

  // Build NPC activity snapshot for this time of day
  const npcActivity = NPC_LIST.map(npc => {
    const entry = getCurrentEntry(npc.id, gameHour ?? 9)
    return `${npc.name}: ${entry?.activity ?? 'somewhere in town'}`
  }).join('\n')

  const weatherNote = event?.title ? `Today's event: ${event.title}. ${event.description}` : ''

  const prompt = `You are writing 3–4 short notices for the town notice board in Caro, a small village. Today is Day ${gameDay ?? 1}.

${weatherNote}

Current town activity:
${npcActivity}

Write exactly 3–4 short notices as they'd appear pinned to a wooden board. Each should be 1–2 sentences. Mix practical notices, gossip, announcements, and observations. Make them feel lived-in and specific to these characters. Don't use headers or numbering — just the notice text, one per line. Keep each under 80 words. Write in plain English, present tense, as if posted today.`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 350,
      messages: [{ role: 'user', content: prompt }],
    })
    const notices = res.content[0].type === 'text' ? res.content[0].text : ''
    return NextResponse.json({ notices })
  } catch (e) {
    const fallback = [
      `Eleanor's Bakery opens at sunrise. Fresh bread daily — first come, first served.`,
      `Lost: one brown leather glove near the well. Ask Ruth at the library if found.`,
      `Town meeting next week. Caleb will provide details when he figures them out.`,
    ].join('\n')
    return NextResponse.json({ notices: fallback })
  }
}

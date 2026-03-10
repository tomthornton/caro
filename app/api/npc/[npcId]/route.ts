import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { NPCS } from '@/lib/npcs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest, { params }: { params: Promise<{ npcId: string }> }) {
  const { npcId } = await params
  const npc = NPCS[npcId]
  if (!npc) return NextResponse.json({ error: 'NPC not found' }, { status: 404 })

  const { messages, characterName, characterStats, memoryContext } = await req.json()

  const systemPrompt = `${npc.systemPrompt}

${memoryContext ? `What you remember about this person from past conversations: ${memoryContext}` : `This is your first time meeting ${characterName}.`}

The player's name is ${characterName}.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-10), // last 10 messages for context
      ],
      max_tokens: 200,
      temperature: 0.85,
    })

    const reply = response.choices[0].message.content
    return NextResponse.json({ reply })
  } catch {
    // Fallback if no API key
    const fallbacks: Record<string, string> = {
      eleanor: `Oh honey, you've just arrived! Welcome to Caro. I'm Eleanor — I run the bakery right over there. You must be tired from your travels. Can I get you something?`,
      silas: `${characterName}. You're new. Silas. The forge is mine. Need something made, come back when you're settled.`,
      maeve: `I thought I felt something change in the air this morning. You must be the reason. Welcome to Caro.`,
      caleb: `Finally, a new face! I'm Caleb — yes, the mayor's son, before you hear it from someone else. Welcome to our little corner of the world.`,
      ruth: `Oh wonderful, a new arrival! I'm Ruth, the librarian. I make it my business to know everyone in Caro. Tell me about yourself.`,
    }
    return NextResponse.json({ reply: fallbacks[npcId] || `Hello, traveler. Welcome to Caro.` })
  }
}

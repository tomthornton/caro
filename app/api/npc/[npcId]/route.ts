import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { NPCS } from '@/lib/npcs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ npcId: string }> }) {
  const { npcId } = await params
  const npc = NPCS[npcId]
  if (!npc) return NextResponse.json({ error: 'NPC not found' }, { status: 404 })

  const { messages, characterName, memoryContext } = await req.json()

  const systemPrompt = `${npc.systemPrompt}

${memoryContext ? `What you remember about this person from past conversations: ${memoryContext}` : `This is your first time meeting ${characterName}.`}

The player's name is ${characterName}.`

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: systemPrompt,
      messages: messages.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ reply })
  } catch {
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

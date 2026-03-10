import { NpcSoul } from './npcs'

export type NpcDynamicState = {
  mood: 'joyful' | 'content' | 'neutral' | 'melancholy' | 'anxious' | 'angry' | 'grieving'
  energy: 'energized' | 'tired' | 'exhausted'
  stress: 'calm' | 'uneasy' | 'overwhelmed'
  preoccupation: string | null
  trust: number       // 0–100 with player
  fondness: number    // 0–100 with player
  timesSpoken: number
  history: string[]   // notable things that happened with the player
  memorySummary: string
}

export const DEFAULT_STATE: NpcDynamicState = {
  mood: 'neutral',
  energy: 'energized',
  stress: 'calm',
  preoccupation: null,
  trust: 0,
  fondness: 0,
  timesSpoken: 0,
  history: [],
  memorySummary: '',
}

function traitLabel(value: number): string {
  if (value <= 2) return 'very low'
  if (value <= 4) return 'low'
  if (value <= 6) return 'moderate'
  if (value <= 8) return 'high'
  return 'very high'
}

function trustLabel(trust: number): string {
  if (trust < 10)  return 'a stranger'
  if (trust < 30)  return 'an acquaintance you\'ve just begun to know'
  if (trust < 55)  return 'someone you\'re warming to'
  if (trust < 75)  return 'someone you trust and are comfortable with'
  if (trust < 90)  return 'a genuine friend'
  return 'one of the people you trust most in the world'
}

export function buildSystemPrompt(
  npc: NpcSoul,
  state: NpcDynamicState,
  characterName: string,
  gameDay?: number,
): string {
  const p = npc.personality
  const met = state.timesSpoken === 0

  const personalityLines = [
    `Wit: ${traitLabel(p.wit)} (${p.wit}/10)`,
    `Warmth: ${traitLabel(p.warmth)} — ${p.warmth >= 7 ? 'you open to people fairly easily' : p.warmth >= 4 ? 'you warm up gradually' : 'you keep most people at arm\'s length'}`,
    `Temperament: ${traitLabel(p.temperament)} — ${p.temperament >= 8 ? 'almost nothing rattles you' : p.temperament >= 5 ? 'you generally stay composed' : 'you feel things strongly and show it'}`,
    `Openness: ${traitLabel(p.openness)} — ${p.openness >= 7 ? 'you share yourself relatively freely' : p.openness >= 4 ? 'you reveal things gradually' : 'you rarely share personal things'}`,
    `Stubbornness: ${traitLabel(p.stubbornness)} — ${p.stubbornness >= 8 ? 'once you\'ve decided something, almost nothing moves you' : p.stubbornness >= 5 ? 'you\'ll hear someone out but change your mind slowly' : 'you\'re open to being persuaded'}`,
    `Faith: ${traitLabel(p.faith)} — ${p.faith >= 8 ? 'deeply devout, faith permeates your worldview' : p.faith >= 5 ? 'believe in something larger than yourself, though you don\'t wear it openly' : 'skeptical of organized religion though not hostile to it'}`,
    `Honesty: ${traitLabel(p.honesty)} — ${p.honesty >= 8 ? 'direct to a fault, will not soften something important' : p.honesty >= 5 ? 'honest but not harsh' : 'diplomatic, sometimes evasive'}`,
    `Curiosity: ${traitLabel(p.curiosity)} — ${p.curiosity >= 8 ? 'genuinely fascinated by people, ask real questions' : p.curiosity >= 5 ? 'interested in people when engaged' : 'not particularly curious about others'}`,
  ].join('\n')

  const moodLine = (() => {
    const base = `You are currently feeling ${state.mood}`
    const energy = state.energy !== 'energized' ? `, ${state.energy}` : ''
    const stress = state.stress !== 'calm' ? ` and ${state.stress}` : ''
    const preocc = state.preoccupation ? `. You are preoccupied with: ${state.preoccupation}` : ''
    return base + energy + stress + preocc + '.'
  })()

  const relationshipLine = met
    ? `${characterName} is a stranger you have never met before. Greet them as you genuinely would — based on your warmth of ${p.warmth}/10.`
    : [
        `${characterName} is ${trustLabel(state.trust)} (trust: ${state.trust}/100, fondness: ${state.fondness}/100).`,
        `You have spoken ${state.timesSpoken} time${state.timesSpoken !== 1 ? 's' : ''}.`,
        state.history.length ? `Notable history: ${state.history.slice(-5).join(' | ')}` : '',
        state.memorySummary ? `What you remember: ${state.memorySummary}` : '',
      ].filter(Boolean).join(' ')

  const npcRelLines = Object.entries(npc.npcRelationships)
    .map(([id, rel]) => `- ${id.charAt(0).toUpperCase() + id.slice(1)}: ${rel.feeling}. ${rel.note}`)
    .join('\n')

  return `You are ${npc.name}, ${npc.role} in the small town of Caro. You are ${npc.age} years old.

━━ WHO YOU ARE ━━
${npc.wound}

What you believe:
${npc.beliefs.map(b => `- ${b}`).join('\n')}

What you value above all:
${npc.values.map(v => `- ${v}`).join('\n')}

Your desires:
- Right now: ${npc.desires.now}
- In life: ${npc.desires.deep}
[You would never admit this: ${npc.desires.secret}]

Your fears:
- You'll mention if pushed: ${npc.fears.surface}
[You'd never confess this: ${npc.fears.deep}]

━━ YOUR PERSONALITY ━━
${personalityLines}

Your quirks and habits:
${npc.quirks.map(q => `- ${q}`).join('\n')}

How you speak: ${npc.speechStyle}

━━ YOUR RELATIONSHIPS WITH OTHERS IN TOWN ━━
${npcRelLines}

━━ RIGHT NOW ━━
${moodLine}

━━ THE PLAYER ━━
${relationshipLine}

━━ RULES FOR THIS CONVERSATION ━━
- Stay completely in character as ${npc.name}. Never break character.
- Respond naturally — 2 to 4 sentences is usually right. Be longer only if the moment genuinely calls for it.
- Your secrets (marked []) shape how you act but you never reveal them directly unless trust is very high (75+).
- Let your current mood, preoccupation, and relationship with the player color every response.
- Reference the town, other villagers, your daily life naturally — as a person who actually lives here would.
- You can reference other villagers by name when relevant. You have opinions about them.
- Do not reference stats, numbers, or anything meta. You are a person, not a game character.
- If trust is below 30, you're friendly but guarded. Over 55, more personal. Over 75, genuinely open.`
}

// After a conversation, call this to decide how trust/fondness should shift
export function evaluateConversationImpact(
  state: NpcDynamicState,
  messageCount: number,
  npcPersonality: NpcSoul['personality'],
): Partial<NpcDynamicState> {
  // Each real conversation grows the relationship a little
  const warmthFactor = npcPersonality.warmth / 10
  const trustGain = Math.round(messageCount * 0.8 * warmthFactor)
  const fondnessGain = Math.round(messageCount * 0.6 * warmthFactor)

  return {
    trust:      Math.min(100, state.trust + trustGain),
    fondness:   Math.min(100, state.fondness + fondnessGain),
    timesSpoken: state.timesSpoken + 1,
  }
}

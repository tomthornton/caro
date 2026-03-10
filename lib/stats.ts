import { CharacterStats } from './supabase'

export type Archetype = {
  id: string
  name: string
  description: string
  emoji: string
  baseStats: Omit<CharacterStats, 'reputation'>
  bonusPoints: number
  flavor: string
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'wanderer',
    name: 'The Wanderer',
    emoji: '🧭',
    description: 'Balanced and adaptable. Good at everything, exceptional at nothing — yet.',
    flavor: 'You arrived in Caro with a worn-out pack and no explanation.',
    baseStats: { strength: 3, intellect: 3, charisma: 3, cooking: 2, crafting: 2, wisdom: 2 },
    bonusPoints: 5,
  },
  {
    id: 'scholar',
    name: 'The Scholar',
    emoji: '📖',
    description: 'Sharp mind, silver tongue. NPCs open up to you faster. Physically weaker.',
    flavor: 'You came to Caro chasing a rumor buried in an old book.',
    baseStats: { strength: 1, intellect: 6, charisma: 3, cooking: 2, crafting: 1, wisdom: 3 },
    bonusPoints: 4,
  },
  {
    id: 'craftsman',
    name: 'The Craftsman',
    emoji: '⚒️',
    description: 'Strong hands and a practical mind. Builds things others can\'t.',
    flavor: 'You left your last town when the forge burned down. Caro needed a new one.',
    baseStats: { strength: 5, intellect: 2, charisma: 1, cooking: 2, crafting: 5, wisdom: 1 },
    bonusPoints: 4,
  },
  {
    id: 'charmer',
    name: 'The Charmer',
    emoji: '🎭',
    description: 'People trust you immediately. Best trader in any room. Terrible at heavy lifting.',
    flavor: 'Half the town already likes you and you just got here.',
    baseStats: { strength: 1, intellect: 2, charisma: 6, cooking: 3, crafting: 1, wisdom: 3 },
    bonusPoints: 4,
  },
  {
    id: 'mystic',
    name: 'The Mystic',
    emoji: '🕯️',
    description: 'High wisdom unlocks unique dialogue and hidden story threads. Unconventional.',
    flavor: 'You don\'t talk much about where you\'re from. Some NPCs seem to already know you.',
    baseStats: { strength: 1, intellect: 3, charisma: 2, cooking: 1, crafting: 1, wisdom: 8 },
    bonusPoints: 4,
  },
]

export const STAT_META: Record<keyof Omit<CharacterStats, 'reputation'>, { label: string; emoji: string; description: string }> = {
  strength:  { label: 'Strength',   emoji: '💪', description: 'Farming yield, heavy tasks, physical challenges' },
  intellect: { label: 'Intellect',  emoji: '🧠', description: 'Unlocks dialogue options, crafting recipes, lore knowledge' },
  charisma:  { label: 'Charisma',   emoji: '✨', description: 'NPC trust, better trade prices, first impressions' },
  cooking:   { label: 'Cooking',    emoji: '🍳', description: 'Food buffs, gifts that raise NPC affection' },
  crafting:  { label: 'Crafting',   emoji: '⚒️', description: 'Tool upgrades, building, creating items' },
  wisdom:    { label: 'Wisdom',     emoji: '🕯️', description: 'Spiritual depth, hidden story paths, unique NPC conversations' },
}

import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type Profile = {
  id: string
  username: string
  created_at: string
}

export type Game = {
  id: string
  user_id: string
  name: string
  world_seed: number
  day: number
  created_at: string
  last_played_at: string
}

export type Character = {
  id: string
  game_id: string
  user_id: string
  name: string
  archetype: string
  stats: CharacterStats
  position: { x: number; y: number }
  inventory: InventoryItem[]
  energy: number
  max_energy: number
  gold: number
  created_at: string
}

export type CharacterStats = {
  strength: number
  intellect: number
  charisma: number
  cooking: number
  crafting: number
  reputation: number
  wisdom: number
}

export type InventoryItem = {
  id: string
  name: string
  quantity: number
  type: string
}

export type NpcMemory = {
  id: string
  game_id: string
  npc_id: string
  user_id: string
  memory_summary: string
  relationship_level: number
  updated_at: string
}

export type ChatLog = {
  id: string
  game_id: string
  npc_id: string
  user_id: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  created_at: string
}

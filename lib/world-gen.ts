/**
 * world-gen.ts — Seeded world generator for Caro.
 *
 * Given a numeric seed, deterministically produces a full town:
 * - Town name
 * - 5 NPC customizations (overlaid on base archetype souls)
 *
 * Same seed → same world, always. No Claude needed for the core structure;
 * rich backstory content comes from curated word banks.
 */

import type { NpcSoul, Personality } from './npcs'

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

function seedRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function pickN<T>(rng: () => number, arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5)
  return shuffled.slice(0, n)
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

// ── Word banks ───────────────────────────────────────────────────────────────

const TOWN_PREFIX = ['Ash','Bright','Cedar','Dark','Elder','Frost','Glen','Hollow','Iron','Larken','Marsh','Moon','Moss','Night','Oak','Pebble','Reed','Salt','Silver','Stone','Storm','Swan','Thorn','Timber','Veil','Whitmore','Willo']
const TOWN_SUFFIX = ['brook','burn','crossing','dale','fall','field','ford','gate','grove','haven','hill','hollow','keep','mill','moor','port','ridge','run','vale','way','well','wood','wick','crest','bend']

const MALE_NAMES   = ['Aldric','Barnaby','Callum','Duncan','Ezra','Felix','Gareth','Hadley','Ivan','Jasper','Kieran','Liam','Myles','Nolan','Orion','Percy','Quinn','Rowan','Silas','Tobin','Ulrich','Victor','Wren','Xavier','Zane']
const FEMALE_NAMES = ['Adelaide','Blythe','Clara','Delia','Elara','Fiona','Greta','Hana','Iris','June','Kira','Lena','Maren','Nessa','Opal','Piper','Rhea','Sable','Thea','Una','Vera','Willa','Yara','Zoe']
const LAST_NAMES   = ['Ashford','Blackwood','Croft','Dunmore','Fairchild','Greaves','Hartwell','Ironside','Jansen','Kendall','Larkin','Morrow','Nightingale','Overton','Pierce','Ravenswood','Sterling','Thorne','Underhill','Vale','Whitmore','Yarrow']

const BAKER_WOUNDS   = ['Her eldest son moved to the city and rarely writes.','She burned down the original bakery years ago — an accident, but the guilt never left.','Her mother\'s recipes were lost in a flood. She\'s spent years reconstructing them from memory.','She gave up a chance to study medicine to take over the family trade. She doesn\'t regret it. Most days.']
const SMITH_WOUNDS   = ['He lost his apprentice to an accident he blames himself for.','He left a family behind in another town. They don\'t know where he is.','He served in a war that most people have already stopped talking about.','He built something beautiful once and watched it torn down. He stopped making beautiful things after that.']
const HERB_WOUNDS    = ['She fled a place she loved because of someone she loved more.','She saved someone once using knowledge she shouldn\'t have had. The questions never stopped.','She watched her teacher die slowly from the one thing she couldn\'t cure.','She chose her work over a life with someone who deserved better. She thinks about it every spring.']
const OFFICIAL_WOUNDS = ['He turned down the life he actually wanted to do what was expected.','His father is a harder act to follow than anyone knows.','He let someone leave rather than ask them to stay. He\'s been waiting for a reason to leave ever since.','He said something once in anger that ended a friendship. He never had the courage to explain.']
const SCHOLAR_WOUNDS  = ['She spent so long recording other people\'s lives that she forgot to build her own.','Someone she trusted used her knowledge against someone else. She never reported it.','She was brilliant at a place that didn\'t make room for her. She left before they could push her out.','She had a chance at a larger life and chose the familiar. She calls it a choice.']

const DEEP_DESIRES = ['to be understood without having to explain','to leave something lasting behind','to belong somewhere fully','to be loved without conditions','to matter to one specific person','to stop carrying something alone','to do the right thing once, clearly, without doubt']
const SECRET_DESIRES = ['to be asked how they\'re really doing','to disappear for a week without anyone noticing','to say something they\'ve held back for years','to be forgiven without having to ask','to be surprised by someone']

const SURFACE_FEARS = ['that their work isn\'t as meaningful as they believe','that this town is all they\'ll ever know','that they\'re becoming someone they didn\'t intend to be','that the thing they\'re waiting for isn\'t coming','that they\'ve already missed something they can\'t recover']
const DEEP_FEARS   = ['that they are the problem in most of their relationships','that the people who love them would stop if they knew everything','that they don\'t actually want what they\'ve been working toward','that they peaked a long time ago and didn\'t notice','that they\'re not as interesting as they need to believe they are']

const BELIEFS_BANK = [
  'Most people are doing the best they can with what they have.',
  'Hard work matters more than talent.',
  'The past shapes you whether you let it or not.',
  'Small places reveal character faster than big ones.',
  'People show you who they are eventually — the trick is watching.',
  'Kindness is a choice you have to keep making.',
  'Most problems come from people not saying what they mean.',
  'Community is the thing that holds when everything else breaks.',
  'Some things don\'t need to be explained to be true.',
  'You can\'t help someone who won\'t let you.',
  'Reputation is fragile and almost always unfair.',
  'The right question is more valuable than the right answer.',
]

const SPEECH_STYLES = [
  'Plain and deliberate. Says what they mean, no more.',
  'Warm and unhurried. Takes their time. Often changes direction mid-sentence.',
  'Dry and precise. Economical with words. Occasional wit arrives without warning.',
  'Open and a little too honest. Tends to say things before they\'ve fully considered them.',
  'Measured and observational. Talks about people the way a naturalist talks about birds.',
  'Formal in a way that softens over time. Proper until they trust you, then candid.',
  'Wry and a little deflective. Uses humor as a first line of defense.',
  'Careful and layered. Often means more than they say. Comfortable with silence.',
]

// Palette banks per role archetype
const BAKER_PALETTES    = [{ body:'#c47b7b',shirt:'#f0e0d0',pants:'#5c3d2e',skin:'#c9956a',hair:'#6e3f1a' },{ body:'#b56e6e',shirt:'#ffe8d0',pants:'#3d2b1a',skin:'#d4a56a',hair:'#2e1a0e' }]
const SMITH_PALETTES    = [{ body:'#5c7a8a',shirt:'#3d4a55',pants:'#2a2a2a',skin:'#8c6a4a',hair:'#1a1a1a' },{ body:'#4a6070',shirt:'#2e3a44',pants:'#1a1a1a',skin:'#7a5a3a',hair:'#0e0e0e' }]
const HERB_PALETTES     = [{ body:'#7a5a8a',shirt:'#d4c0d4',pants:'#2e1a3a',skin:'#c9a06a',hair:'#1a0e2a' },{ body:'#6a4a7a',shirt:'#c0a0c0',pants:'#1a0a2a',skin:'#b8906a',hair:'#2a0e3a' }]
const OFFICIAL_PALETTES = [{ body:'#4a7a5a',shirt:'#c0d4c0',pants:'#1a2e1a',skin:'#c9956a',hair:'#3a2010' },{ body:'#3a6a4a',shirt:'#a0c0a0',pants:'#0a1e0a',skin:'#b8856a',hair:'#2a1a0a' }]
const SCHOLAR_PALETTES  = [{ body:'#4a4a78',shirt:'#c0c0e0',pants:'#0e0e2a',skin:'#d4a56a',hair:'#0e0e2a' },{ body:'#3a3a68',shirt:'#a0a0d0',pants:'#08081a',skin:'#c4956a',hair:'#08081a' }]

// ── NPC role definitions ──────────────────────────────────────────────────────

type RoleKey = 'baker' | 'smith' | 'herbalist' | 'official' | 'scholar'

const ROLE_DEFS: Record<RoleKey, {
  baseId: string
  role: string
  age: [number, number]
  emoji: string
  woundBank: string[]
  paletteBank: typeof BAKER_PALETTES
  genderPool: 'either' | 'male' | 'female'
}> = {
  baker:    { baseId:'eleanor', role:'Baker',            age:[45,65], emoji:'🥐', woundBank:BAKER_WOUNDS,    paletteBank:BAKER_PALETTES,    genderPool:'either' },
  smith:    { baseId:'silas',   role:'Blacksmith',       age:[45,70], emoji:'⚒️', woundBank:SMITH_WOUNDS,    paletteBank:SMITH_PALETTES,    genderPool:'male'   },
  herbalist:{ baseId:'maeve',   role:'Herbalist',        age:[35,55], emoji:'🌿', woundBank:HERB_WOUNDS,     paletteBank:HERB_PALETTES,     genderPool:'female' },
  official: { baseId:'caleb',   role:"Town Official",   age:[25,40], emoji:'🎩', woundBank:OFFICIAL_WOUNDS, paletteBank:OFFICIAL_PALETTES, genderPool:'either' },
  scholar:  { baseId:'ruth',    role:'Librarian',        age:[40,60], emoji:'📚', woundBank:SCHOLAR_WOUNDS,  paletteBank:SCHOLAR_PALETTES,  genderPool:'female' },
}

// ── Generated NPC type ────────────────────────────────────────────────────────

export type NpcOverride = {
  id:          string   // same as base (eleanor, silas, etc.)
  name:        string
  role:        string
  age:         number
  emoji:       string
  wound:       string
  desires:     { now: string; deep: string; secret: string }
  fears:       { surface: string; deep: string }
  beliefs:     string[]
  speechStyle: string
  palette:     typeof BAKER_PALETTES[0]
  personalityMods: Partial<Personality>
}

export type WorldConfig = {
  seed:      number
  townName:  string
  vibe:      string
  npcs:      NpcOverride[]
}

// ── Main generator ────────────────────────────────────────────────────────────

export function generateWorld(seed: number, vibe: string = 'quiet'): WorldConfig {
  const rng = seedRng(seed)

  // Town name
  const townName = pick(rng, TOWN_PREFIX) + pick(rng, TOWN_SUFFIX)

  // Generate each NPC
  const roles: RoleKey[] = ['baker', 'smith', 'herbalist', 'official', 'scholar']
  const usedNames = new Set<string>()

  const npcs: NpcOverride[] = roles.map(roleKey => {
    const def = ROLE_DEFS[roleKey]

    // Name — avoid duplicates
    let firstName: string
    const pool = def.genderPool === 'male' ? MALE_NAMES
               : def.genderPool === 'female' ? FEMALE_NAMES
               : [...MALE_NAMES, ...FEMALE_NAMES]
    do { firstName = pick(rng, pool) } while (usedNames.has(firstName))
    usedNames.add(firstName)

    const personality: Partial<Personality> = {
      wit:          randInt(rng, 3, 9),
      warmth:       randInt(rng, 2, 9),
      temperament:  randInt(rng, 3, 10),
      openness:     randInt(rng, 2, 9),
      stubbornness: randInt(rng, 3, 9),
      faith:        randInt(rng, 2, 9),
      ambition:     randInt(rng, 2, 8),
      honesty:      randInt(rng, 4, 10),
      curiosity:    randInt(rng, 3, 10),
      confidence:   randInt(rng, 3, 10),
    }

    // Vibe modifiers
    if (vibe === 'strange') {
      personality.openness     = Math.max(1, (personality.openness     ?? 5) - 2)
      personality.temperament  = Math.max(1, (personality.temperament  ?? 5) - 2)
    }
    if (vibe === 'thriving') {
      personality.confidence  = Math.min(10, (personality.confidence  ?? 5) + 2)
      personality.ambition    = Math.min(10, (personality.ambition    ?? 5) + 2)
    }

    return {
      id:          def.baseId,
      name:        firstName,
      role:        def.role,
      age:         randInt(rng, def.age[0], def.age[1]),
      emoji:       def.emoji,
      wound:       pick(rng, def.woundBank),
      desires: {
        now:    `Something personal and specific to today — a small hope they're holding.`,
        deep:   pick(rng, DEEP_DESIRES),
        secret: pick(rng, SECRET_DESIRES),
      },
      fears: {
        surface: pick(rng, SURFACE_FEARS),
        deep:    pick(rng, DEEP_FEARS),
      },
      beliefs:     pickN(rng, BELIEFS_BANK, 3),
      speechStyle: pick(rng, SPEECH_STYLES),
      palette:     pick(rng, def.paletteBank),
      personalityMods: personality,
    }
  })

  return { seed, townName, vibe, npcs }
}

/**
 * Merge a WorldConfig NPC override onto a base NpcSoul.
 * Returns a new NpcSoul that has the generated name/backstory but
 * keeps the base schedule, relationships structure, etc.
 */
export function mergeNpcOverride(base: NpcSoul, override: NpcOverride): NpcSoul {
  return {
    ...base,
    name:        override.name,
    role:        override.role,
    age:         override.age,
    emoji:       override.emoji,
    wound:       override.wound,
    desires:     override.desires,
    fears:       override.fears,
    beliefs:     override.beliefs,
    speechStyle: override.speechStyle,
    personality: { ...base.personality, ...override.personalityMods },
  }
}

/** Format a seed number as a shareable string (6 chars, zero-padded) */
export function formatSeed(seed: number): string {
  return seed.toString().padStart(6, '0')
}

/** Parse a seed string to number */
export function parseSeed(input: string): number | null {
  const n = parseInt(input.replace(/\D/g, ''), 10)
  return isNaN(n) ? null : Math.abs(n) % 1000000
}

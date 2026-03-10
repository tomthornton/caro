export type Personality = {
  wit:          number  // 1=earnest, 10=razor-sharp
  warmth:       number  // 1=cold/guarded, 10=openly affectionate
  temperament:  number  // 1=volatile, 10=unshakeable calm
  openness:     number  // 1=closed book, 10=overshares freely
  stubbornness: number  // 1=pushover, 10=immovable
  faith:        number  // 1=skeptic, 10=devout
  ambition:     number  // 1=content, 10=fiercely driven
  honesty:      number  // 1=tactful/evasive, 10=brutally direct
  curiosity:    number  // 1=incurious, 10=obsessively inquisitive
  confidence:   number  // 1=self-doubting, 10=unshakeable
}

export type ScheduleEntry = {
  time: string                      // "06:00" 24hr
  location: { x: number; y: number }
  activity: string
  moodModifier?: string
}

export type NpcRelationship = {
  feeling: string   // "close friends" | "uneasy" | "admires" | etc
  note: string      // private nuance the NPC holds
}

export type NpcSoul = {
  id: string
  name: string
  role: string
  age: number
  emoji: string

  personality: Personality

  desires: {
    now: string     // what they want today
    deep: string    // life goal
    secret: string  // what they'd never admit out loud
  }

  fears: {
    surface: string // what they'll mention if pushed
    deep: string    // what they'd never confess
  }

  wound: string         // the defining past hurt that quietly shapes everything
  beliefs: string[]     // 2–3 things they hold as true about the world
  values: string[]      // what they'd never compromise on
  quirks: string[]      // small behavioral tics
  speechStyle: string   // how they actually talk

  npcRelationships: Record<string, NpcRelationship>

  // Stardew-style daily schedule
  schedule: ScheduleEntry[]
  defaultPosition: { x: number; y: number }
}

// ─────────────────────────────────────────────────────────────────────────────
// NPC SOULS
// ─────────────────────────────────────────────────────────────────────────────

export const NPCS: Record<string, NpcSoul> = {

  eleanor: {
    id: 'eleanor', name: 'Eleanor', role: 'Baker', age: 58, emoji: '🥐',

    personality: {
      wit: 6, warmth: 9, temperament: 7, openness: 7,
      stubbornness: 8, faith: 9, ambition: 4, honesty: 7,
      curiosity: 7, confidence: 8,
    },

    desires: {
      now:    'For the rye loaves to come out right today — she tried a new flour.',
      deep:   'To be remembered as someone who fed and comforted people the way her mother did.',
      secret: 'She wants to hear her estranged daughter say she\'s proud of her. Just once.',
    },

    fears: {
      surface: 'That the bakery will close when her hands get too arthritic to knead dough.',
      deep:    'That she failed her daughter somehow, and that\'s why she left.',
    },

    wound: 'Her daughter Margaret left Caro eight years ago after a bitter argument about Margaret\'s choices, and never came back. Eleanor has written her over forty letters. She\'s sent three.',

    beliefs: [
      'Hard work and good bread can fix almost anything.',
      'God puts people in your path for reasons you won\'t always understand.',
      'People show you who they are in how they treat a stranger.',
    ],

    values: ['Family, even the fractured kind', 'Hospitality as a form of love', 'Keeping your word'],

    quirks: [
      'Always offers food before answering questions.',
      'Calls everyone "honey" or "sweetheart" — not condescendingly, just how she is.',
      'Touches the small cross at her neck when something worries her.',
      'Hums hymns softly when she\'s happy.',
    ],

    speechStyle: 'Southern drawl, unhurried. Weaves scripture and faith naturally into conversation without being preachy. Prone to small confessions about her day. Will gossip but feels guilty about it afterward.',

    npcRelationships: {
      silas:  { feeling: 'close friends, 30 years', note: 'He never asks for anything. She brings him bread every week unprompted. They understand each other without much talking.' },
      maeve:  { feeling: 'warm respect, slight unease', note: 'She doesn\'t fully understand Maeve, but Maeve healed her arthritis last winter when the doctor couldn\'t. She trusts her, mostly.' },
      caleb:  { feeling: 'fond, motherly concern', note: 'She sees the restlessness in him. Reminds her of Margaret. She prays for him.' },
      ruth:   { feeling: 'friendly, mild wariness', note: 'Ruth knows everything about everyone. Eleanor is careful what she says around her.' },
    },

    schedule: [
      { time: '05:00', location: { x: 240, y: 240 }, activity: 'Opening the bakery, starting the ovens', moodModifier: 'focused and content' },
      { time: '09:00', location: { x: 240, y: 240 }, activity: 'Peak baking hours, selling to early customers' },
      { time: '13:00', location: { x: 240, y: 280 }, activity: 'Slow afternoon, cleaning and prepping for tomorrow', moodModifier: 'reflective, a little tired' },
      { time: '17:00', location: { x: 512, y: 384 }, activity: 'Evening walk through town', moodModifier: 'peaceful' },
      { time: '20:00', location: { x: 240, y: 240 }, activity: 'Home, reading scripture or writing unsent letters', moodModifier: 'quietly melancholy' },
    ],
    defaultPosition: { x: 260, y: 280 },
  },

  // ───────────────────────────────────────────────────────────────────────────

  silas: {
    id: 'silas', name: 'Silas', role: 'Blacksmith', age: 64, emoji: '⚒️',

    personality: {
      wit: 7, warmth: 5, temperament: 9, openness: 2,
      stubbornness: 9, faith: 4, ambition: 3, honesty: 10,
      curiosity: 4, confidence: 9,
    },

    desires: {
      now:    'To finish the iron fence for the Hargrove house and never speak to the mayor again.',
      deep:   'To leave something behind that outlasts him. Ironwork doesn\'t rot.',
      secret: 'He\'s lonely. Has been for years. He won\'t say it.',
    },

    fears: {
      surface: 'Nothing much. Or so he says.',
      deep:    'That the things he did in the war mattered less than he told himself they did.',
    },

    wound: 'He watched a young soldier die in his arms who shouldn\'t have been there. Silas put him on that detail. He doesn\'t talk about the war. Doesn\'t drink to forget — he never forgets.',

    beliefs: [
      'Character is what you do when no one is watching.',
      'Most problems can be solved with patience and the right tool.',
      'You can\'t outrun who you are.',
    ],

    values: ['Honesty above comfort', 'Doing the job right the first time', 'Not complaining'],

    quirks: [
      'Always calls people by their name — never nicknames.',
      'Looks at a person\'s hands before their face.',
      'Long silences that don\'t feel uncomfortable to him.',
      'Dries his hands on a rag before shaking hands.',
    ],

    speechStyle: 'Minimal. Direct. No filler words. Dry wit that arrives without warning. When he gives a compliment it lands hard because it\'s rare. Uses the player\'s name every time.',

    npcRelationships: {
      eleanor: { feeling: 'the closest thing to family he has', note: 'He won\'t say that. He shows it by fixing her oven twice a year without being asked.' },
      maeve:   { feeling: 'mutual respect, distance', note: 'She reminds him of people he met overseas who saw things differently. He trusts that she means no harm.' },
      caleb:   { feeling: 'mild concern', note: 'Kid\'s got good bones but too much softness. Silas keeps an eye on him.' },
      ruth:    { feeling: 'neutral wariness', note: 'She knows too much. He keeps his visits to the library short.' },
    },

    schedule: [
      { time: '06:00', location: { x: 750, y: 210 }, activity: 'At the forge, stoking the fire', moodModifier: 'focused, minimal words' },
      { time: '12:00', location: { x: 750, y: 210 }, activity: 'Eating alone at the forge, not stopping work long' },
      { time: '17:00', location: { x: 750, y: 210 }, activity: 'Finishing up, cleaning tools deliberately' },
      { time: '19:00', location: { x: 490, y: 560 }, activity: 'One beer at the tavern. Every night. Doesn\'t vary.', moodModifier: 'slightly looser, rare humor emerges' },
      { time: '21:00', location: { x: 750, y: 210 }, activity: 'Home. Reading or writing the memoir no one will see.' },
    ],
    defaultPosition: { x: 740, y: 260 },
  },

  // ───────────────────────────────────────────────────────────────────────────

  maeve: {
    id: 'maeve', name: 'Maeve', role: 'Herbalist & Healer', age: 44, emoji: '🌿',

    personality: {
      wit: 8, warmth: 6, temperament: 10, openness: 3,
      stubbornness: 7, faith: 8, ambition: 2, honesty: 8,
      curiosity: 10, confidence: 9,
    },

    desires: {
      now:    'Quiet. And for the lavender she\'s been growing to bloom before the first frost.',
      deep:   'To understand the thing she came to Caro to understand, and to finally have peace about it.',
      secret: 'She wants a friend. Not an admirer or a patient. A real friend who asks her hard questions.',
    },

    fears: {
      surface: 'That the plants won\'t grow next spring — she has a bad feeling.',
      deep:    'That she already knows what she came to find, and she won\'t like the answer.',
    },

    wound: 'She left something — someone — behind when she came to Caro. She doesn\'t speak of it. The absence lives in her like a splinter too deep to reach.',

    beliefs: [
      'Everything in nature is connected, including people.',
      'Most people already know what\'s wrong with them. They just need permission to say it.',
      'Some things are older than understanding.',
    ],

    values: ['Doing no harm', 'Paying attention', 'Keeping promises — she rarely makes them'],

    quirks: [
      'Notices things about a person before they speak — posture, color, breath.',
      'Pauses longer than comfortable before answering a serious question.',
      'Handles plants gently, like they\'re patients.',
      'Sometimes seems to know what you\'re about to say.',
    ],

    speechStyle: 'Measured and layered. Sometimes speaks in observations rather than answers. Warm but not soft. Occasionally precise to an unsettling degree. Rarely asks questions — but the ones she asks are exactly right.',

    npcRelationships: {
      eleanor: { feeling: 'genuine affection, respects her faith', note: 'Eleanor is the most honest person in Caro. Maeve admires that. The bread helps too.' },
      silas:   { feeling: 'quiet mutual recognition', note: 'They\'ve both seen things. They don\'t need to discuss it.' },
      caleb:   { feeling: 'compassionate concern', note: 'He\'s standing at a fork and doesn\'t know it yet. She hopes he chooses wisely.' },
      ruth:    { feeling: 'deep friendship, the town doesn\'t understand it', note: 'Ruth asks her the hard questions. No one else does. Their long conversations are the realest part of Maeve\'s week.' },
    },

    schedule: [
      { time: '06:00', location: { x: 160, y: 490 }, activity: 'Tending her cottage garden in silence', moodModifier: 'at peace' },
      { time: '09:00', location: { x: 160, y: 490 }, activity: 'Seeing patients and preparing remedies' },
      { time: '14:00', location: { x: 830, y: 460 }, activity: 'Long visit to the library — talking with Ruth' },
      { time: '17:00', location: { x: 512, y: 384 }, activity: 'Walking the perimeter of town alone at dusk', moodModifier: 'contemplative, slightly distant' },
      { time: '20:00', location: { x: 160, y: 490 }, activity: 'Home, working by candlelight', moodModifier: 'interior, not lonely' },
    ],
    defaultPosition: { x: 160, y: 520 },
  },

  // ───────────────────────────────────────────────────────────────────────────

  caleb: {
    id: 'caleb', name: 'Caleb', role: "Mayor's Son", age: 28, emoji: '🎩',

    personality: {
      wit: 8, warmth: 7, temperament: 5, openness: 6,
      stubbornness: 4, faith: 3, ambition: 8, honesty: 5,
      curiosity: 8, confidence: 6,
    },

    desires: {
      now:    'An interesting conversation with someone who isn\'t already sick of hearing his ideas.',
      deep:   'To build something — a real thing, with his own hands, in his own name, not his father\'s.',
      secret: 'He wants to leave. Has for two years. He doesn\'t know what\'s keeping him.',
    },

    fears: {
      surface: 'That he\'ll become his father without noticing.',
      deep:    'That he stayed because he\'s afraid, not because he chose to — and he\'ll never know which.',
    },

    wound: 'His fiancée Clara left for a city two years ago. She asked him to come. He said he needed more time. She didn\'t wait. He tells himself he made peace with it.',

    beliefs: [
      'Most people are smarter than they\'re given credit for.',
      'Small towns reveal character faster than cities.',
      'His father built something here that matters, even if Caleb resents him for it.',
    ],

    values: ['Genuine connection over social performance', 'Not becoming a hypocrite', 'Doing right by people even when it costs him'],

    quirks: [
      'Runs a hand through his hair when he\'s thinking or nervous.',
      'Asks follow-up questions — genuinely interested, not performing interest.',
      'Tries a little too hard with new people until he relaxes.',
      'Gets more real the more he trusts someone.',
    ],

    speechStyle: 'Smooth and educated at first, then increasingly candid as comfort grows. Uses humor to deflect from the real stuff. Occasionally says something more honest than he intended and then gets quiet.',

    npcRelationships: {
      eleanor: { feeling: 'warm, she mothers him and he lets her', note: 'She prays for him. He doesn\'t believe, but it moves him anyway.' },
      silas:   { feeling: 'respect with some intimidation', note: 'Silas looks at him like he\'s measuring something. Caleb wants to pass that test.' },
      maeve:   { feeling: 'fascinated, slightly unsettled', note: 'She said something to him once that he\'s been thinking about for six months.' },
      ruth:    { feeling: 'friendly, careful', note: 'Ruth knows about Clara. Ruth knows everything. He\'s pleasant and gives her nothing.' },
    },

    schedule: [
      { time: '08:00', location: { x: 510, y: 170 }, activity: 'Reluctant morning meeting with his father at Town Hall' },
      { time: '10:00', location: { x: 512, y: 384 }, activity: 'Walking around town, talking to people, avoiding his desk', moodModifier: 'restless, looking for something interesting' },
      { time: '13:00', location: { x: 240, y: 240 }, activity: 'Buying bread from Eleanor, lingering longer than needed' },
      { time: '15:00', location: { x: 510, y: 170 }, activity: 'Back at Town Hall, half-working', moodModifier: 'mild frustration' },
      { time: '19:00', location: { x: 490, y: 560 }, activity: 'At the tavern most evenings — not drinking hard, just present', moodModifier: 'sociable, guards lower' },
    ],
    defaultPosition: { x: 500, y: 160 },
  },

  // ───────────────────────────────────────────────────────────────────────────

  ruth: {
    id: 'ruth', name: 'Ruth', role: 'Librarian', age: 51, emoji: '📚',

    personality: {
      wit: 9, warmth: 7, temperament: 8, openness: 8,
      stubbornness: 6, faith: 5, ambition: 5, honesty: 8,
      curiosity: 10, confidence: 7,
    },

    desires: {
      now:    'To find out why the new arrival came to Caro specifically.',
      deep:   'To be loved by someone who sees exactly who she is — the whole record, not just the pleasant parts.',
      secret: 'She wants someone to ask about her, for once. Not the library. Her.',
    },

    fears: {
      surface: 'That the library budget gets cut again.',
      deep:    'That she has observed and recorded everyone else\'s lives so thoroughly that she forgot to live her own.',
    },

    wound: 'She was engaged at 29 to a man named Peter who chose adventure over her. She told herself she was fine. She started the private journal that same month. She\'s been writing it for twenty-two years.',

    beliefs: [
      'Everything is recorded somewhere, if you know how to look.',
      'People tell you what they mean more often than they realize.',
      'The things people don\'t say are more important than the things they do.',
    ],

    values: ['Precision — she hates imprecision of fact or feeling', 'Privacy (ironically)', 'The library as a sanctuary'],

    quirks: [
      'Catalogs new information about people in her head the moment she gets it.',
      'Uses a word that\'s slightly too formal for casual context sometimes.',
      'Remembers exact quotes from conversations.',
      'Covers her mouth when she laughs at something really funny, as if surprised by it.',
    ],

    speechStyle: 'Clear, articulate, precise. Occasionally delights in sharing a piece of information or a rumor she\'s been holding. Warm but composed. The warmth is genuine — she genuinely likes people — but she observes them even while liking them.',

    npcRelationships: {
      eleanor: { feeling: 'fond, careful with what she shares', note: 'Eleanor is kind. Ruth is careful not to gossip about her, even though she could.' },
      silas:   { feeling: 'mutual wariness turned to respect', note: 'He\'s never asked for anything. That\'s unusual and she respects it.' },
      maeve:   { feeling: 'the closest thing Ruth has to a best friend', note: 'Maeve talks to her like an equal. Not many people do. Their afternoon visits are the thing Ruth most looks forward to each week.' },
      caleb:   { feeling: 'fond with a clear eye', note: 'She knows about the acceptance letter — she helped him research the university. She\'s never told anyone.' },
    },

    schedule: [
      { time: '08:00', location: { x: 830, y: 460 }, activity: 'Opening the library, cataloging returns', moodModifier: 'brisk, efficient, content' },
      { time: '11:00', location: { x: 830, y: 460 }, activity: 'At her desk, available to visitors — often reading between them' },
      { time: '14:00', location: { x: 830, y: 460 }, activity: 'Afternoon — Maeve usually visits around now' },
      { time: '17:00', location: { x: 830, y: 460 }, activity: 'Closing the library, writing in the private journal' },
      { time: '19:00', location: { x: 512, y: 384 }, activity: 'Evening walk, observing the town', moodModifier: 'reflective, recording' },
    ],
    defaultPosition: { x: 820, y: 490 },
  },
}

export const NPC_LIST = Object.values(NPCS)

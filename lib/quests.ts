// Quest system — definitions, state, and helpers

export type QuestStatus = 'locked' | 'available' | 'active' | 'complete'

export type QuestObjective = {
  id:         string
  description: string
  type:       'talk' | 'deliver' | 'visit' | 'give_item'
  target?:    string   // npc id or building id
  itemId?:    string   // item required for deliver/give_item
  complete:   boolean
}

export type Quest = {
  id:           string
  title:        string
  description:  string
  giver:        string   // npc id
  objectives:   QuestObjective[]
  reward: {
    gold?:      number
    trust?:     { npcId: string; amount: number }[]
    item?:      string
    xp?:        number
  }
  status:       QuestStatus
  dayStarted?:  number
  dayCompleted?: number
  unlockAfter?: { npcId: string; minTrust: number }
}

// ── Quest definitions ────────────────────────────────────────────────────────

export const QUEST_DEFINITIONS: Quest[] = [
  {
    id: 'fresh_bread',
    title: 'Fresh Bread',
    description: "Eleanor wants you to bring a loaf of fresh bread to Silas at the forge. He never eats enough, apparently.",
    giver: 'eleanor',
    objectives: [
      { id: 'get_bread',    description: 'Pick up the bread from Eleanor', type: 'talk',    target: 'eleanor', complete: false },
      { id: 'deliver_silas', description: 'Deliver the bread to Silas',    type: 'deliver', target: 'silas',   itemId: 'bakery_bread', complete: false },
    ],
    reward: { gold: 8, trust: [{ npcId: 'eleanor', amount: 20 }, { npcId: 'silas', amount: 15 }] },
    status: 'available',
  },
  {
    id: 'caleb_story',
    title: "The Mayor's Son",
    description: "Caleb seems to have something on his mind. He rarely talks about his father — or the letter he never sent.",
    giver: 'caleb',
    objectives: [
      { id: 'talk_caleb', description: 'Hear what Caleb has to say', type: 'talk', target: 'caleb', complete: false },
    ],
    reward: { gold: 5, trust: [{ npcId: 'caleb', amount: 25 }] },
    status: 'locked',
    unlockAfter: { npcId: 'caleb', minTrust: 25 },
  },
  {
    id: 'ruth_research',
    title: 'Something Borrowed',
    description: "Ruth is missing a book she lent to someone months ago. She suspects Maeve has it.",
    giver: 'ruth',
    objectives: [
      { id: 'ask_ruth',  description: 'Find out what book Ruth is looking for', type: 'talk',  target: 'ruth',  complete: false },
      { id: 'ask_maeve', description: 'Ask Maeve about the book',               type: 'talk',  target: 'maeve', complete: false },
      { id: 'return',    description: 'Return to Ruth with what you learned',   type: 'talk',  target: 'ruth',  complete: false },
    ],
    reward: { gold: 10, trust: [{ npcId: 'ruth', amount: 20 }, { npcId: 'maeve', amount: 10 }] },
    status: 'available',
  },
  {
    id: 'maeve_remedy',
    title: "Night Remedy",
    description: "Maeve needs a rare herb that only grows near the well at dawn. She wants you to gather it before the morning foot traffic disturbs it.",
    giver: 'maeve',
    objectives: [
      { id: 'gather_herb',  description: 'Visit the well before 8am', type: 'visit', target: 'well', complete: false },
      { id: 'return_maeve', description: 'Bring the herb back to Maeve', type: 'talk', target: 'maeve', complete: false },
    ],
    reward: { gold: 12, trust: [{ npcId: 'maeve', amount: 20 }], item: 'maeve_remedy' },
    status: 'available',
  },
]

// ── Quest state (stored in localStorage) ────────────────────────────────────

const STORAGE_KEY = (gameId: string) => `caro_quests_${gameId}`

export type QuestState = {
  quests:      Quest[]
  activeId:    string | null
  completedIds: string[]
}

export function loadQuestState(gameId: string): QuestState {
  if (typeof window === 'undefined') return defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY(gameId))
    if (raw) return JSON.parse(raw)
  } catch { /* */ }
  return defaultState()
}

function defaultState(): QuestState {
  return { quests: QUEST_DEFINITIONS.map(q => ({ ...q })), activeId: null, completedIds: [] }
}

export function saveQuestState(gameId: string, state: QuestState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY(gameId), JSON.stringify(state))
}

export function getActiveQuest(state: QuestState): Quest | null {
  if (!state.activeId) return null
  return state.quests.find(q => q.id === state.activeId) ?? null
}

export function getAvailableQuests(state: QuestState, trustMap: Record<string, number>): Quest[] {
  return state.quests.filter(q => {
    if (q.status === 'complete' || state.completedIds.includes(q.id)) return false
    if (q.status === 'active') return false
    if (q.unlockAfter) {
      const trust = trustMap[q.unlockAfter.npcId] ?? 0
      return trust >= q.unlockAfter.minTrust
    }
    return q.status === 'available'
  })
}

export function startQuest(state: QuestState, questId: string): QuestState {
  const next = { ...state, quests: state.quests.map(q => q.id === questId ? { ...q, status: 'active' as QuestStatus } : q), activeId: questId }
  return next
}

export function completeObjective(state: QuestState, questId: string, objectiveId: string): QuestState {
  return {
    ...state,
    quests: state.quests.map(q => {
      if (q.id !== questId) return q
      const objectives = q.objectives.map(o => o.id === objectiveId ? { ...o, complete: true } : o)
      const allDone = objectives.every(o => o.complete)
      return { ...q, objectives, status: allDone ? 'complete' : q.status }
    }),
  }
}

export function completeQuest(state: QuestState, questId: string): QuestState {
  return {
    ...state,
    quests: state.quests.map(q => q.id === questId ? { ...q, status: 'complete' } : q),
    activeId: state.activeId === questId ? null : state.activeId,
    completedIds: [...state.completedIds, questId],
  }
}

/** Build quest context string for NPC prompts */
export function buildQuestContext(npcId: string, state: QuestState): string {
  const active = getActiveQuest(state)
  if (!active) return ''
  const relevant = active.objectives.filter(o => o.target === npcId && !o.complete)
  if (!relevant.length) return ''
  return `\nActive quest context: The player has a quest "${active.title}" that involves you. Objective: ${relevant.map(o => o.description).join('; ')}. Respond naturally as if you are aware of this interaction without breaking character. You can bring it up, or wait for them to.`
}

// Random daily events — picked at day start, affect world + NPC moods

export type GameEvent = {
  id:          string
  title:       string
  description: string
  moodEffect?: Record<string, string>  // npcId → mood override
  npcStay?:    boolean                  // NPCs stay inside longer
  weatherType?: 'rain' | 'fog' | 'clear' | 'sunny'
}

export const GAME_EVENTS: GameEvent[] = [
  {
    id: 'clear_day',
    title: 'Clear Morning',
    description: "Skies are clear and the air is crisp. It's the kind of morning that makes staying inside feel like a waste.",
    weatherType: 'sunny',
    moodEffect: { caleb: 'content', eleanor: 'joyful', ruth: 'content' },
  },
  {
    id: 'rainy_day',
    title: 'Steady Rain',
    description: "It's been raining since before sunrise. The roads are muddy and the well is filling nicely.",
    weatherType: 'rain',
    npcStay: true,
    moodEffect: { maeve: 'content', silas: 'neutral', eleanor: 'melancholy', caleb: 'melancholy', ruth: 'content' },
  },
  {
    id: 'foggy_morning',
    title: 'Morning Fog',
    description: "A heavy fog rolled in overnight. The town feels quieter than usual — even the birds are late.",
    weatherType: 'fog',
    moodEffect: { maeve: 'joyful', silas: 'neutral', ruth: 'content' },
  },
  {
    id: 'merchant_visit',
    title: 'Traveling Merchant',
    description: "A merchant's cart passed through early this morning. Word is they traded something with Silas and moved on.",
    moodEffect: { silas: 'content', caleb: 'content' },
  },
  {
    id: 'caleb_speech',
    title: "Mayor's Announcement",
    description: "Caleb gave a brief speech outside the town hall this morning — something about 'community spirit' and a harvest gathering. Nobody was quite sure what to make of it.",
    moodEffect: { caleb: 'anxious', eleanor: 'content', ruth: 'content' },
  },
  {
    id: 'quiet_day',
    title: 'Quiet Day',
    description: "Nothing unusual. The town is exactly as it always is — which is either comforting or concerning, depending on who you ask.",
  },
  {
    id: 'eleanor_baking',
    title: 'Baking Day',
    description: "Eleanor started baking before dawn — you can smell it from across the square. Something special, apparently.",
    moodEffect: { eleanor: 'joyful' },
  },
  {
    id: 'library_event',
    title: 'Reading Circle',
    description: "Ruth organized a small reading circle at the library. Only Maeve showed up, but Ruth seemed pleased anyway.",
    moodEffect: { ruth: 'joyful', maeve: 'content' },
  },
]

const EVENT_KEY = (gameId: string) => `caro_event_${gameId}`

export function getDayEvent(gameId: string, day: number): GameEvent {
  // Check cache
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(EVENT_KEY(gameId))
    if (cached) {
      try {
        const { d, event } = JSON.parse(cached)
        if (d === day) return event
      } catch { /* */ }
    }
  }
  // Pick pseudo-randomly based on day
  const idx = (day * 1103515245 + 12345) % GAME_EVENTS.length
  const event = GAME_EVENTS[Math.abs(idx)]
  if (typeof window !== 'undefined') {
    localStorage.setItem(EVENT_KEY(gameId), JSON.stringify({ d: day, event }))
  }
  return event
}

/** CSS color overlay string for weather */
export function getWeatherOverlay(weatherType?: string): string | null {
  if (!weatherType || weatherType === 'clear' || weatherType === 'sunny') return null
  if (weatherType === 'rain') return 'rgba(20,30,60,0.18)'
  if (weatherType === 'fog')  return 'rgba(180,190,200,0.20)'
  return null
}

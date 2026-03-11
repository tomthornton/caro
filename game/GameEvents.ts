/**
 * GameEvents — event names for Phaser ↔ React communication.
 *
 * Phaser scenes emit these on `this.game.events`.
 * GameCanvas.tsx listens on `game.events.on(...)`.
 *
 * Keep all cross-boundary communication here so nothing is coupled
 * to React callbacks directly inside scene code.
 */
export const GameEvents = {
  /** NPC clicked/[E]d — payload: npcId: string */
  NPC_INTERACT:      'game:npc_interact',

  /** Player entered a building — payload: BuildingEntry */
  ENTER_BUILDING:    'game:enter_building',

  /** Game clock ticked — payload: hour: number, minute: number */
  CLOCK_TICK:        'game:clock_tick',

  /** Nearest door changed — payload: BuildingEntry | null */
  NEAR_DOOR_CHANGE:  'game:near_door_change',

  /** Special interaction triggered — payload: 'noticeboard' | 'rest' */
  SPECIAL_ACTION:    'game:special_action',
} as const

export type GameEventName = typeof GameEvents[keyof typeof GameEvents]

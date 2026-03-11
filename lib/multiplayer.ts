/**
 * multiplayer.ts — Supabase Realtime presence for Caro multiplayer.
 *
 * Each player in a game broadcasts their position + character info
 * via a presence channel. Other players see each other as sprites.
 */

import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type PaletteColors = {
  body:  string
  shirt: string
  pants: string
  skin:  string
  hair:  string
}

export type PlayerPresence = {
  userId:        string
  characterName: string
  x:             number
  y:             number
  facing:        'left' | 'right' | 'up' | 'down'
  palette:       PaletteColors
}

type PresenceState = { [key: string]: PlayerPresence[] }

type Options = {
  gameId:        string
  userId:        string
  characterName: string
  palette:       PaletteColors
  onPlayersChange: (players: PlayerPresence[]) => void
}

const BROADCAST_INTERVAL_MS = 200   // position broadcast frequency
const IDLE_INTERVAL_MS      = 2000  // when not moving

export class MultiplayerSession {
  private channel:      RealtimeChannel
  private options:      Options
  private intervalId:   ReturnType<typeof setInterval> | null = null
  private currentX     = 0
  private currentY     = 0
  private currentFacing: PlayerPresence['facing'] = 'down'
  private lastBroadcast = 0

  constructor(options: Options) {
    this.options = options
    this.channel = supabase.channel(`caro:presence:${options.gameId}`, {
      config: { presence: { key: options.userId } },
    })
  }

  async connect(): Promise<void> {
    return new Promise((resolve) => {
      this.channel
        .on('presence', { event: 'sync' }, () => {
          this._emitPlayers()
        })
        .on('presence', { event: 'join' }, () => {
          this._emitPlayers()
        })
        .on('presence', { event: 'leave' }, () => {
          this._emitPlayers()
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track initial presence
            await this._track()
            resolve()
          }
        })
    })
  }

  /** Call from game loop — updates position state, broadcasts on interval */
  update(x: number, y: number, facing: PlayerPresence['facing']) {
    this.currentX      = x
    this.currentY      = y
    this.currentFacing = facing

    const now     = Date.now()
    const moving  = this.currentX !== x || this.currentY !== y
    const interval = moving ? BROADCAST_INTERVAL_MS : IDLE_INTERVAL_MS

    if (now - this.lastBroadcast >= interval) {
      this.lastBroadcast = now
      this._track()
    }
  }

  /** Force a position update (call on significant state change) */
  async forceUpdate(x: number, y: number, facing: PlayerPresence['facing']) {
    this.currentX      = x
    this.currentY      = y
    this.currentFacing = facing
    this.lastBroadcast = Date.now()
    await this._track()
  }

  async disconnect() {
    if (this.intervalId) clearInterval(this.intervalId)
    await supabase.removeChannel(this.channel)
  }

  private async _track() {
    const payload: PlayerPresence = {
      userId:        this.options.userId,
      characterName: this.options.characterName,
      x:             Math.round(this.currentX),
      y:             Math.round(this.currentY),
      facing:        this.currentFacing,
      palette:       this.options.palette,
    }
    try {
      await this.channel.track(payload)
    } catch { /* best effort */ }
  }

  private _emitPlayers() {
    const state = this.channel.presenceState() as PresenceState
    const players: PlayerPresence[] = []

    Object.entries(state).forEach(([, presences]) => {
      if (!presences || presences.length === 0) return
      const p = presences[0] as PlayerPresence
      // Exclude self
      if (p.userId === this.options.userId) return
      players.push(p)
    })

    this.options.onPlayersChange(players)
  }
}

/** Default player palette for when no world config is set */
export const DEFAULT_PLAYER_PALETTE: PaletteColors = {
  body:  '#4a6a5a',
  shirt: '#c0d0c0',
  pants: '#1a2a1a',
  skin:  '#c9956a',
  hair:  '#3a2010',
}

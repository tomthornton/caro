'use client'

/**
 * GameCanvas — React wrapper for the Phaser game.
 *
 * Responsibilities:
 *  1. Boot Phaser.Game with MainScene
 *  2. Populate game.registry with NPC + character data
 *  3. Bridge Phaser events → React callbacks
 *
 * All game logic lives in scenes/MainScene.ts.
 * All shared config lives in game/GameConfig.ts.
 * All event names live in game/GameEvents.ts.
 */

import { useEffect, useRef } from 'react'
import type { Character }  from '@/lib/supabase'
import type { NpcSoul }    from '@/lib/npcs'
import { GameEvents }      from '@/game/GameEvents'
import type { BuildingEntry, SpecialAction } from './GameCanvas.types'

// Re-export types so other components can import from the same place
export type { BuildingEntry, SpecialAction }

type Props = {
  character:       Character
  npcs:            NpcSoul[]
  onNpcInteract:   (npc: NpcSoul) => void
  onEnterBuilding: (b: BuildingEntry) => void
  onClockTick?:    (hour: number, minute: number) => void
  onNearDoor?:     (door: BuildingEntry | null) => void
  onSpecialAction?: (action: SpecialAction) => void
}

export default function GameCanvas({
  character, npcs, onNpcInteract, onEnterBuilding, onClockTick, onNearDoor, onSpecialAction,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef      = useRef<any>(null)

  // Keep callbacks in refs so scene event listeners never go stale
  const cbNpcInteract   = useRef(onNpcInteract)
  const cbEnterBuilding = useRef(onEnterBuilding)
  const cbClockTick     = useRef(onClockTick)
  const cbNearDoor      = useRef(onNearDoor)
  const cbSpecialAction = useRef(onSpecialAction)

  cbNpcInteract.current   = onNpcInteract
  cbEnterBuilding.current = onEnterBuilding
  cbClockTick.current     = onClockTick
  cbNearDoor.current      = onNearDoor
  cbSpecialAction.current = onSpecialAction

  // ── Boot Phaser (once) ───────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const init = async () => {
      const Phaser = (await import('phaser')).default
      const { MainScene } = await import('@/scenes/MainScene')

      const game = new Phaser.Game({
        type:            Phaser.AUTO,
        width:           window.innerWidth,
        height:          window.innerHeight,
        parent:          containerRef.current!,
        backgroundColor: '#5c9e3a',
        scene:           [MainScene],
        scale:           { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render:          { antialias: false, pixelArt: true, roundPixels: true },
        physics:         { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      })

      // Populate registry before scene starts
      game.registry.set('npcs',      npcs)
      game.registry.set('character', character)

      // ── Bridge Phaser → React ──────────────────────────────────────────
      game.events.on(GameEvents.NPC_INTERACT, (npcId: string) => {
        const npc = (game.registry.get('npcs') as NpcSoul[]).find(n => n.id === npcId)
        if (npc) cbNpcInteract.current(npc)
      })

      game.events.on(GameEvents.ENTER_BUILDING, (building: BuildingEntry) => {
        cbEnterBuilding.current(building)
      })

      game.events.on(GameEvents.CLOCK_TICK, (hour: number, minute: number) => {
        cbClockTick.current?.(hour, minute)
      })

      game.events.on(GameEvents.NEAR_DOOR_CHANGE, (door: BuildingEntry | null) => {
        cbNearDoor.current?.(door)
      })

      game.events.on(GameEvents.SPECIAL_ACTION, (action: SpecialAction) => {
        cbSpecialAction.current?.(action)
      })

      gameRef.current = game
    }

    init()
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  }, [])

  // ── Keep registry in sync with React props ───────────────────────────────
  useEffect(() => {
    gameRef.current?.registry.set('npcs', npcs)
  }, [npcs])

  useEffect(() => {
    gameRef.current?.registry.set('character', character)
  }, [character])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

'use client'

import { useEffect, useRef } from 'react'
import type { Character } from '@/lib/supabase'
import type { NpcSoul } from '@/lib/npcs'
import { generateSpriteCanvas, NPC_PALETTES } from '@/lib/char-sprites'
import { NPC_SCHEDULE, getCurrentEntry } from '@/lib/npc-schedule'

export type BuildingEntry = {
  id: string; name: string; npcId?: string
}

type Props = {
  character: Character
  npcs: NpcSoul[]
  onNpcInteract: (npc: NpcSoul) => void
  onEnterBuilding: (b: BuildingEntry) => void
  onClockTick?: (hour: number, minute: number) => void
}

// ── Tile constants ────────────────────────────────────────────────────────────
const T = {
  GRASS:0,GRASS_F1:1,GRASS_F2:2,
  TREE_S:5,TREE_TL:7,TREE_TR:8,TREE_BL:19,TREE_BR:20,
  BUSH_Y:27,BUSH_G:28,
  DIRT:25,COBB:32,
  TRN_TL:12,TRN_T:13,TRN_TR:14,TRN_L:24,TRN_R:26,TRN_BL:36,TRN_B:37,TRN_BR:38,
  ROOF_TL:48,ROOF_T:49,ROOF_TR:50,ROOF_ML:60,ROOF_M:61,ROOF_MR:62,
  ROOFRED_TL:52,ROOFRED_T:53,ROOFRED_TR:54,ROOFRED_ML:64,ROOFRED_M:65,ROOFRED_MR:66,
  WWALL_L:72,WWALL_C:73,WWALL_D:74,WWALL_W:75,
  WWALL_WL:84,WWALL_WD:85,WWALL_WR:86,
  WWALL_BL:96,WWALL_BC:97,WWALL_BR:99,
  SWALL_L:76,SWALL_C:77,SWALL_D:78,SWALL_R:79,
  SWALL_WL:88,SWALL_WD:89,SWALL_WR:90,
  SWALL_BL:100,SWALL_BC:101,SWALL_BR:103,
  FENCE_TL:33,FENCE_T:34,FENCE_TR:35,FENCE_L:45,FENCE_P:46,FENCE_R:47,
  FENCE_BL:57,FENCE_B:58,FENCE_BR:59,
  WELL:92,ANVIL:105,HAMMER:106,BARREL:107,SIGN:83,HAY:94,MUSHROOM:29,
}

const SOLID_TILES = new Set([
  // Roofs
  48,49,50,51,52,53,54,55,60,61,62,63,64,65,66,67,
  // Walls (mid + upper only; bottom row removed so player can approach doors)
  72,73,75,76,77,79,84,86,87,88,90,91,
  // NOTE: 96-103 (WWALL_BL/BC/BR, SWALL_BL/BC/BR) intentionally NOT solid
  // — player needs to walk up to the door threshold
  // Trees + bushes
  5,7,8,19,20,27,28,
  // Props
  92,105,106,107,
])

const DOORS: ({ tx:number; ty:number } & BuildingEntry)[] = [
  {tx:5,  ty:5,  id:'bakery',   name:"Eleanor's Bakery", npcId:'eleanor'},
  {tx:12, ty:5,  id:'townhall', name:'Town Hall',        npcId:'caleb'  },
  {tx:18, ty:5,  id:'shop',     name:'General Store'                    },
  {tx:2,  ty:16, id:'cottage',  name:"Maeve's Cottage",  npcId:'maeve'  },
  {tx:12, ty:16, id:'tavern',   name:'Tavern'                           },
  {tx:18, ty:16, id:'library',  name:'Library',          npcId:'ruth'   },
]

// prettier-ignore
const MAP_DATA: number[][] = [
  // Row 0 — top edge trees
  [T.TREE_TL,T.TREE_TR,T.GRASS,T.GRASS_F1,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_TL,T.TREE_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS_F2,T.GRASS,T.GRASS,T.TREE_TL,T.TREE_TR,T.GRASS],
  // Row 1
  [T.TREE_BL,T.TREE_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_BL,T.TREE_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_BL,T.TREE_BR,T.GRASS],
  // Row 2 — north building roofs
  [T.GRASS,T.GRASS,T.GRASS,T.ROOFRED_TL,T.ROOFRED_T,T.ROOFRED_T,T.ROOFRED_TR,T.GRASS,T.GRASS,T.GRASS,T.ROOF_TL,T.ROOF_T,T.ROOF_T,T.ROOF_T,T.ROOF_TR,T.GRASS,T.GRASS,T.ROOFRED_TL,T.ROOFRED_T,T.ROOFRED_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 3
  [T.GRASS,T.GRASS,T.GRASS,T.ROOFRED_ML,T.ROOFRED_M,T.ROOFRED_M,T.ROOFRED_MR,T.GRASS,T.GRASS,T.GRASS,T.ROOF_ML,T.ROOF_M,T.ROOF_M,T.ROOF_M,T.ROOF_MR,T.GRASS,T.GRASS,T.ROOFRED_ML,T.ROOFRED_M,T.ROOFRED_MR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 4 — walls with windows
  [T.GRASS,T.BUSH_G,T.GRASS,T.WWALL_L,T.WWALL_WL,T.WWALL_WD,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.SWALL_L,T.SWALL_WL,T.SWALL_WD,T.SWALL_WD,T.SWALL_WR,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_WD,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 5 — doors
  [T.GRASS,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_C,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.SWALL_L,T.SWALL_C,T.SWALL_D,T.SWALL_C,T.SWALL_R,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 6 — wall bases (no longer solid — acts as doorstep)
  [T.GRASS,T.GRASS,T.GRASS,T.WWALL_BL,T.WWALL_BC,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS,T.SWALL_BL,T.SWALL_BC,T.SWALL_BC,T.SWALL_BC,T.SWALL_BR,T.GRASS,T.GRASS,T.WWALL_BL,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 7 — road north border
  [T.TRN_TL,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_TR],
  // Row 8 — road
  [T.TRN_L,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.COBB,T.COBB,T.COBB,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_R],
  // Row 9 — road with well
  [T.TRN_L,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.COBB,T.WELL,T.COBB,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_R],
  // Row 10 — road
  [T.TRN_L,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.COBB,T.COBB,T.COBB,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_R],
  // Row 11 — road south border
  [T.TRN_BL,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_BR],
  // Row 12 — south building approach (clean grass)
  [T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS_F1,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 13 — south building roofs
  [T.GRASS,T.ROOF_TL,T.ROOF_T,T.ROOF_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.ROOFRED_TL,T.ROOFRED_T,T.ROOFRED_T,T.ROOFRED_TR,T.GRASS,T.GRASS,T.GRASS,T.ROOF_TL,T.ROOF_T,T.ROOF_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 14
  [T.GRASS,T.ROOF_ML,T.ROOF_M,T.ROOF_MR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.ROOFRED_ML,T.ROOFRED_M,T.ROOFRED_M,T.ROOFRED_MR,T.GRASS,T.TREE_TL,T.TREE_TR,T.ROOF_ML,T.ROOF_M,T.ROOF_MR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 15 — south building walls with windows
  [T.GRASS,T.SWALL_L,T.SWALL_WD,T.SWALL_R,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_WD,T.WWALL_WD,T.WWALL_W,T.GRASS,T.TREE_BL,T.TREE_BR,T.WWALL_L,T.WWALL_WD,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 16 — south building doors
  [T.GRASS,T.SWALL_L,T.SWALL_D,T.SWALL_R,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_C,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 17 — south building bases + bottom edge (no weird autumn trees or half-bushes)
  [T.GRASS,T.SWALL_BL,T.SWALL_BC,T.SWALL_BR,T.GRASS,T.BUSH_G,T.BUSH_G,T.GRASS,T.GRASS,T.GRASS,T.WWALL_BL,T.WWALL_BC,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS_F2,T.WWALL_BL,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
]

// (schedules imported from lib/npc-schedule.ts)

export default function GameCanvas({ character, npcs, onNpcInteract, onEnterBuilding, onClockTick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)
  const clockCallbackRef = useRef(onClockTick)
  clockCallbackRef.current = onClockTick

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const init = async () => {
      const Phaser = (await import('phaser')).default
      const TILE = 16, ZOOM = 3
      const COLS = 24, ROWS = 18
      const FW = 16, FH = 20  // sprite frame dimensions

      class TownScene extends Phaser.Scene {
        playerBody!: Phaser.Physics.Arcade.Image
        playerSpr!:  Phaser.GameObjects.Sprite
        playerName!: Phaser.GameObjects.Text
        npcSprites:  Map<string, Phaser.GameObjects.Sprite> = new Map()
        npcLabels:   Map<string, { name: Phaser.GameObjects.Text; role: Phaser.GameObjects.Text; badge: Phaser.GameObjects.Text }> = new Map()
        npcTargets:  Map<string, { x: number; y: number }> = new Map()
        npcFacing:   Map<string, string> = new Map()
        cursors!:    Phaser.Types.Input.Keyboard.CursorKeys
        wasd!:       any
        nearbyNpc:   string | null = null
        nearbyDoor:  BuildingEntry | null = null
        hint!:       Phaser.GameObjects.Container
        hintText!:   Phaser.GameObjects.Text
        joystick =   { on: false, x0: 0, y0: 0, cx: 0, cy: 0 }
        jBase!:      Phaser.GameObjects.Arc
        jThumb!:     Phaser.GameObjects.Arc
        // Game clock
        gameHour   = 8
        gameMinute = 0
        clockAcc   = 0  // accumulator ms

        constructor() { super({ key: 'TownScene' }) }

        preload() {
          this.load.image('tiles', '/assets/tilemap.png')
        }

        create() {
          const textRes  = Math.ceil(window.devicePixelRatio * 2)
          const isMobile = window.innerWidth < 768

          // ── Sprite sheets — synchronous via addSpriteSheet(canvas) ─
          const FW = 16, FH = 20
          const allKeys = [...npcs.map(n => n.id), 'player']
          allKeys.forEach(key => {
            if (this.textures.exists(key)) return
            const palette = NPC_PALETTES[key] ?? NPC_PALETTES.player
            const canvas = generateSpriteCanvas(palette)
            // addSpriteSheet accepts HTMLCanvasElement directly — fully synchronous
            this.textures.addSpriteSheet(key, canvas as any, { frameWidth: FW, frameHeight: FH })
          })

          // ── Tilemap + collision ─────────────────────────────────────
          const map = this.make.tilemap({ data: MAP_DATA, tileWidth: TILE, tileHeight: TILE })
          const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!
          const layer = map.createLayer(0, tileset, 0, 0)!
          layer.setScale(ZOOM).setDepth(0)
          layer.forEachTile(tile => { if (SOLID_TILES.has(tile.index)) tile.setCollision(true) })

          // ── Animations ─────────────────────────────────────────────
          const setupAnims = (key: string) => {
            if (!this.textures.exists(key)) return
            // down  (rows 0: frames 0,1,2)
            this.anims.create({ key: `${key}_idle_down`, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 0 }), frameRate: 1,  repeat: -1 })
            this.anims.create({ key: `${key}_walk_down`, frames: this.anims.generateFrameNumbers(key, { frames: [0,1,0,2] }),               frameRate: 8, repeat: -1 })
            // up    (row 1: frames 3,4,5)
            this.anims.create({ key: `${key}_idle_up`,   frames: this.anims.generateFrameNumbers(key, { start: 3, end: 3 }), frameRate: 1,  repeat: -1 })
            this.anims.create({ key: `${key}_walk_up`,   frames: this.anims.generateFrameNumbers(key, { frames: [3,4,3,5] }),               frameRate: 8, repeat: -1 })
            // side  (row 2: frames 6,7,8)  — flipX for left
            this.anims.create({ key: `${key}_idle_side`, frames: this.anims.generateFrameNumbers(key, { start: 6, end: 6 }), frameRate: 1,  repeat: -1 })
            this.anims.create({ key: `${key}_walk_side`, frames: this.anims.generateFrameNumbers(key, { frames: [6,7,6,8] }),               frameRate: 8, repeat: -1 })
          }
          allKeys.forEach(setupAnims)

          // ── NPCs ────────────────────────────────────────────────────
          npcs.forEach(npc => {
            const sched = NPC_SCHEDULE[npc.id]
            const startEntry = sched ? sched[0] : { tx: 6, ty: 9 }
            const wx = startEntry.tx * TILE * ZOOM + (TILE * ZOOM) / 2
            const wy = startEntry.ty * TILE * ZOOM + (TILE * ZOOM) / 2

            // Use a simple image for now (will switch to sprite once texture loads)
            const spr = this.add.sprite(wx, wy, npc.id, 0).setScale(ZOOM).setDepth(wy)
            this.npcSprites.set(npc.id, spr)
            this.npcTargets.set(npc.id, { x: wx, y: wy })
            this.npcFacing.set(npc.id, 'down')

            // Labels
            const nameTag = this.add.text(wx, wy - 36, npc.name, {
              fontSize: '11px', fontStyle: 'bold', color: '#f5f0e8',
              stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setResolution(textRes).setDepth(wy + 20)

            const roleTag = this.add.text(wx, wy - 24, npc.role, {
              fontSize: '9px', color: '#c9a84c',
              stroke: '#000000', strokeThickness: 2, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setResolution(textRes).setDepth(wy + 20)

            // Activity badge (shows what NPC is doing)
            const badge = this.add.text(wx, wy - 50, '', {
              fontSize: '8px', color: '#a0d890',
              stroke: '#000000', strokeThickness: 2, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setResolution(textRes).setDepth(wy + 20).setVisible(false)

            this.npcLabels.set(npc.id, { name: nameTag, role: roleTag, badge })

            // Tap to interact
            spr.setInteractive()
            spr.on('pointerdown', () => onNpcInteract(npc))
          })

          // ── Player ─────────────────────────────────────────────────
          // Start at (9,9) — on the path, clear of the well at (11,9)
          const sx = 9 * TILE * ZOOM + (TILE * ZOOM) / 2
          const sy = 9 * TILE * ZOOM + (TILE * ZOOM) / 2

          this.playerBody = this.physics.add.image(sx, sy, '__DEFAULT')
            .setVisible(false).setCollideWorldBounds(true)
            .setSize(TILE * ZOOM * 0.45, TILE * ZOOM * 0.3)
          this.physics.add.collider(this.playerBody, layer)

          this.playerSpr = this.add.sprite(sx, sy, 'player', 0)
            .setScale(ZOOM).setDepth(sy)

          this.playerName = this.add.text(sx, sy - 36, character.name, {
            fontSize: '11px', fontStyle: 'bold', color: '#e8c97a',
            stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5).setResolution(textRes).setDepth(sy + 20)

          // ── Camera ─────────────────────────────────────────────────
          this.cameras.main.setBounds(0, 0, COLS * TILE * ZOOM, ROWS * TILE * ZOOM)
          this.cameras.main.startFollow(this.playerBody, true, 0.1, 0.1)

          // Vignette
          const { width: sw, height: sh } = this.scale
          const v1 = this.add.graphics().setScrollFactor(0).setDepth(9990)
          v1.fillGradientStyle(0x000000,0x000000,0x000000,0x000000,0.5,0.5,0,0)
          v1.fillRect(0, 0, sw, sh * 0.1)
          const v2 = this.add.graphics().setScrollFactor(0).setDepth(9990)
          v2.fillGradientStyle(0x000000,0x000000,0x000000,0x000000,0,0,0.45,0.45)
          v2.fillRect(0, sh * 0.9, sw, sh * 0.1)

          // ── Hint ───────────────────────────────────────────────────
          this.hint = this.add.container(0, 0).setVisible(false).setDepth(9985)
          const hBg = this.add.graphics()
          hBg.fillStyle(0x111009,0.88); hBg.fillRoundedRect(-46,-14,92,28,6)
          hBg.lineStyle(1.5,0xc9a84c,0.8); hBg.strokeRoundedRect(-46,-14,92,28,6)
          this.hintText = this.add.text(0,0,'',{
            fontSize:'10px',fontStyle:'bold',color:'#c9a84c',fontFamily:'Inter, sans-serif'
          }).setOrigin(0.5).setResolution(textRes)
          this.hint.add([hBg, this.hintText])

          // ── Input ──────────────────────────────────────────────────
          this.cursors = this.input.keyboard!.createCursorKeys()
          this.wasd = this.input.keyboard!.addKeys({up:'W',down:'S',left:'A',right:'D'})
          this.input.keyboard!.enabled = true

          this.input.keyboard!.on('keydown-E', (e: KeyboardEvent) => {
            e.stopPropagation()
            if (!this.input.keyboard!.enabled) return
            // Door always takes priority — enter building first
            if (this.nearbyDoor) { onEnterBuilding(this.nearbyDoor); return }
            if (this.nearbyNpc) { const n=npcs.find(x=>x.id===this.nearbyNpc); if(n) onNpcInteract(n) }
          })

          // Disable movement keys while typing in a React input
          const onFI = (e:FocusEvent) => {
            const t = (e.target as HTMLElement)?.tagName
            if (t==='INPUT' || t==='TEXTAREA') this.input.keyboard!.enabled = false
          }
          const onFO = (e:FocusEvent) => {
            const t = (e.target as HTMLElement)?.tagName
            if (t==='INPUT' || t==='TEXTAREA') this.input.keyboard!.enabled = true
          }
          document.addEventListener('focusin',  onFI)
          document.addEventListener('focusout', onFO)
          this.events.once('destroy', () => {
            document.removeEventListener('focusin',  onFI)
            document.removeEventListener('focusout', onFO)
          })

          // ── Mobile joystick ────────────────────────────────────────
          if (isMobile) {
            const CH = this.scale.height
            this.jBase  = this.add.circle(70,CH-90,45,0x000000,0.5).setStrokeStyle(2,0xc9a84c,0.4).setScrollFactor(0).setDepth(9995)
            this.jThumb = this.add.circle(70,CH-90,20,0xc9a84c,0.6).setScrollFactor(0).setDepth(9996)
            this.input.on('pointerdown',(p:any)=>{ if(p.x<160) this.joystick={on:true,x0:p.x,y0:p.y,cx:p.x,cy:p.y} })
            this.input.on('pointermove',(p:any)=>{ if(this.joystick.on){this.joystick.cx=p.x;this.joystick.cy=p.y} })
            this.input.on('pointerup',()=>{ this.joystick.on=false; this.jThumb?.setPosition(70,this.scale.height-90) })
          }
        }

        // ── Helper: get facing direction from velocity ──────────────
        getFacing(vx: number, vy: number): string {
          if (Math.abs(vx) > Math.abs(vy)) return vx > 0 ? 'right' : 'left'
          return vy > 0 ? 'down' : 'up'
        }

        // ── Helper: play correct anim for sprite ────────────────────
        playAnim(spr: Phaser.GameObjects.Sprite, key: string, facing: string, moving: boolean) {
          const animKey = `${key}_${moving ? 'walk' : 'idle'}_${facing === 'left' || facing === 'right' ? 'side' : facing}`
          if (this.anims.exists(animKey) && spr.anims.currentAnim?.key !== animKey) {
            spr.play(animKey)
          }
          // Flip for left
          spr.setFlipX(facing === 'left')
        }

        // ── Helper: schedule target for this hour ───────────────────
        getScheduleTarget(npcId: string): { x: number; y: number } | null {
          const entry = getCurrentEntry(npcId, this.gameHour)
          if (!entry) return null
          return {
            x: entry.tx * TILE * ZOOM + (TILE * ZOOM) / 2,
            y: entry.ty * TILE * ZOOM + (TILE * ZOOM) / 2,
          }
        }

        getScheduleActivity(npcId: string): string {
          return getCurrentEntry(npcId, this.gameHour)?.activity ?? ''
        }

        isNpcInside(npcId: string): boolean {
          return !!getCurrentEntry(npcId, this.gameHour)?.inside
        }

        update(_: number, delta: number) {
          const TILE = 16, ZOOM = 3, SPD = 200

          // ── Game clock (1 real second = 2 game minutes) ─────────────
          this.clockAcc += delta
          if (this.clockAcc >= 1000) {
            this.clockAcc -= 1000
            this.gameMinute += 2
            if (this.gameMinute >= 60) { this.gameMinute -= 60; this.gameHour = (this.gameHour + 1) % 24 }
            clockCallbackRef.current?.(this.gameHour, this.gameMinute)
          }

          // ── Player input ────────────────────────────────────────────
          let vx = 0, vy = 0
          if      (this.wasd.left.isDown  || this.cursors.left.isDown)  vx = -SPD
          else if (this.wasd.right.isDown || this.cursors.right.isDown) vx =  SPD
          if      (this.wasd.up.isDown    || this.cursors.up.isDown)    vy = -SPD
          else if (this.wasd.down.isDown  || this.cursors.down.isDown)  vy =  SPD

          if (this.joystick?.on) {
            const dx = this.joystick.cx - this.joystick.x0
            const dy = this.joystick.cy - this.joystick.y0
            const d = Math.sqrt(dx*dx+dy*dy)
            if (d > 6) { const cl=Math.min(d,36); vx=(dx/d)*SPD*(cl/36); vy=(dy/d)*SPD*(cl/36); this.jThumb?.setPosition(70+(dx/d)*cl, this.scale.height-90+(dy/d)*cl) }
          }
          if (vx!==0&&vy!==0){vx*=0.707;vy*=0.707}
          this.playerBody.setVelocity(vx, vy)

          // Sync player sprite + name to physics body
          const px = this.playerBody.x, py = this.playerBody.y
          this.playerSpr.setPosition(px, py).setDepth(py)
          this.playerName.setPosition(px, py - 36).setDepth(py + 20)

          // Player animation
          const pMoving  = vx !== 0 || vy !== 0
          const pFacing  = pMoving ? this.getFacing(vx, vy) : (this.playerSpr.getData('facing') || 'down')
          if (pMoving) this.playerSpr.setData('facing', pFacing)
          this.playAnim(this.playerSpr, 'player', pFacing, pMoving)

          // ── NPC schedule movement ───────────────────────────────────
          const NPC_SPEED = 55  // slower than player, deliberate pace

          npcs.forEach(npc => {
            const spr    = this.npcSprites.get(npc.id)
            const labels = this.npcLabels.get(npc.id)
            if (!spr) return

            // Hide NPC when they're inside a building
            const inside = this.isNpcInside(npc.id)
            spr.setVisible(!inside)
            if (labels) {
              labels.name.setVisible(!inside)
              labels.role.setVisible(!inside)
              labels.badge.setVisible(false)
            }
            if (inside) return

            const target = this.getScheduleTarget(npc.id)
            if (!target) return

            const dx = target.x - spr.x
            const dy = target.y - spr.y
            const dist = Math.sqrt(dx*dx + dy*dy)

            if (dist > 6) {
              const dt = delta / 1000
              spr.x += (dx/dist) * NPC_SPEED * dt
              spr.y += (dy/dist) * NPC_SPEED * dt
              spr.setDepth(spr.y)

              const facing = this.getFacing(dx, dy)
              this.npcFacing.set(npc.id, facing)
              this.playAnim(spr, npc.id, facing, true)

              if (labels) {
                labels.badge.setText(this.getScheduleActivity(npc.id)).setVisible(true)
              }
            } else {
              spr.setDepth(spr.y)
              this.playAnim(spr, npc.id, this.npcFacing.get(npc.id) || 'down', false)
              if (labels) labels.badge.setVisible(false)
            }

            if (labels) {
              labels.name.setPosition(spr.x, spr.y - 36).setDepth(spr.y + 20)
              labels.role.setPosition(spr.x, spr.y - 24).setDepth(spr.y + 20)
              labels.badge.setPosition(spr.x, spr.y - 50).setDepth(spr.y + 25)
            }
          })

          // ── Proximity detection ─────────────────────────────────────
          // Door proximity (always wins over NPC for [E] — enter building first)
          let closestDoor: BuildingEntry | null = null, minDD = 150
          DOORS.forEach(door => {
            const wx = door.tx*TILE*ZOOM+(TILE*ZOOM)/2
            const wy = door.ty*TILE*ZOOM+(TILE*ZOOM)/2
            const d = Phaser.Math.Distance.Between(px, py, wx, wy)
            if (d < minDD) { minDD = d; closestDoor = door }
          })
          this.nearbyDoor = closestDoor

          // NPC proximity (only counts when NPC is visible outdoors)
          let closestNpc: string | null = null, minND = 72
          npcs.forEach(npc => {
            const spr = this.npcSprites.get(npc.id)
            if (!spr || !spr.visible) return
            const d = Phaser.Math.Distance.Between(px, py, spr.x, spr.y)
            if (d < minND) { minND = d; closestNpc = npc.id }
          })
          this.nearbyNpc = closestNpc

          // Hint — door takes priority
          if (closestDoor) {
            const d = closestDoor as any
            const isMob = window.innerWidth < 768
            this.hintText.setText(isMob ? '↑ Enter' : '[E] Enter')
            this.hint.setPosition(d.tx*TILE*ZOOM+(TILE*ZOOM)/2, d.ty*TILE*ZOOM+(TILE*ZOOM)/2-32).setVisible(true)
          } else if (closestNpc) {
            const spr = this.npcSprites.get(closestNpc)!
            this.hintText.setText(window.innerWidth < 768 ? 'Tap to talk' : '[E] Talk')
            this.hint.setPosition(spr.x, spr.y - 58).setVisible(true)
          } else {
            this.hint.setVisible(false)
          }
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: window.innerWidth, height: window.innerHeight,
        parent: containerRef.current!,
        backgroundColor: '#5c9e3a',
        scene: [TownScene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: false, pixelArt: true, roundPixels: true },
        physics: { default: 'arcade', arcade: { gravity: { x:0, y:0 }, debug: false } },
      })
      gameRef.current = game
    }

    init()
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

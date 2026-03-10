'use client'

import { useEffect, useRef } from 'react'
import type { Character } from '@/lib/supabase'
import type { NpcSoul } from '@/lib/npcs'

export type BuildingEntry = {
  id: string
  name: string
  npcId?: string // NPC who lives/works here
}

type Props = {
  character: Character
  npcs: NpcSoul[]
  onNpcInteract: (npc: NpcSoul) => void
  onEnterBuilding: (building: BuildingEntry) => void
}

// Tile index = row * 12 + col  (packed tilemap, 12 cols, 16×16 tiles, no spacing)
const T = {
  GRASS: 0, GRASS_F1: 1, GRASS_F2: 2,
  TREE_S: 5, TREE_TL: 7, TREE_TR: 8, TREE_BL: 19, TREE_BR: 20,
  TREE_ATL: 9, TREE_ATR: 10, TREE_ABL: 21, TREE_ABR: 22,
  BUSH_Y: 27, BUSH_G: 28, BUSH_HL: 30, BUSH_HR: 31,
  DIRT: 25, DIRT_V1: 39, DIRT_V2: 40, COBB: 32,
  TRN_TL: 12, TRN_T: 13, TRN_TR: 14,
  TRN_L: 24, TRN_R: 26,
  TRN_BL: 36, TRN_B: 37, TRN_BR: 38,
  ROOF_TL: 48, ROOF_T: 49, ROOF_TR: 50,
  ROOF_ML: 60, ROOF_M: 61, ROOF_MR: 62,
  ROOFRED_TL: 52, ROOFRED_T: 53, ROOFRED_TR: 54,
  ROOFRED_ML: 64, ROOFRED_M: 65, ROOFRED_MR: 66,
  WWALL_L: 72, WWALL_C: 73, WWALL_D: 74, WWALL_W: 75,
  WWALL_WL: 84, WWALL_WD: 85, WWALL_WR: 86,
  WWALL_BL: 96, WWALL_BC: 97, WWALL_BR: 99,
  SWALL_L: 76, SWALL_C: 77, SWALL_D: 78, SWALL_R: 79,
  SWALL_WL: 88, SWALL_WD: 89, SWALL_WR: 90,
  SWALL_BL: 100, SWALL_BC: 101, SWALL_BR: 103,
  FENCE_TL: 33, FENCE_T: 34, FENCE_TR: 35,
  FENCE_L: 45, FENCE_P: 46, FENCE_R: 47,
  FENCE_BL: 57, FENCE_B: 58, FENCE_BR: 59,
  WELL: 92, ANVIL: 105, HAMMER: 106, BARREL: 107,
  SIGN: 83, HAY: 94, MUSHROOM: 29,
}

// Tiles that block movement
const SOLID_TILES = new Set([
  // Roofs
  48,49,50,51,52,53,54,55,
  60,61,62,63,64,65,66,67,
  // Walls (all EXCEPT door tiles 74, 78 which are interactable)
  72,73,75,76,77,79,
  84,86,87,88,90,91,
  96,97,98,99,100,101,102,103,
  // Trees
  5,7,8,9,10,19,20,21,22,
  // Bushes
  27,28,30,31,
  // Fence
  33,34,35,45,46,47,57,58,59,
  // Props
  92,105,106,107,
])

// Building door tile positions (tile coords) + building info
const DOORS: ({ tx: number; ty: number } & BuildingEntry)[] = [
  { tx: 5,  ty: 5,  id: 'bakery',   name: "Eleanor's Bakery",  npcId: 'eleanor' },
  { tx: 12, ty: 5,  id: 'townhall', name: 'Town Hall',         npcId: 'caleb'   },
  { tx: 18, ty: 5,  id: 'shop',     name: 'General Store'                       },
  { tx: 2,  ty: 16, id: 'cottage',  name: "Maeve's Cottage",   npcId: 'maeve'   },
  { tx: 12, ty: 16, id: 'tavern',   name: 'Tavern'                              },
  { tx: 18, ty: 16, id: 'library',  name: 'Library',           npcId: 'ruth'    },
]

const NPC_TILE: Record<string, { tx: number; ty: number }> = {
  eleanor: { tx: 6,  ty: 7  },
  silas:   { tx: 18, ty: 6  },
  maeve:   { tx: 3,  ty: 13 },
  caleb:   { tx: 13, ty: 4  },
  ruth:    { tx: 20, ty: 13 },
}

const NPC_COLORS: Record<string, { body: number; hair: number; shirt: number }> = {
  eleanor: { body: 0xfde8cc, hair: 0x6b3515, shirt: 0xe07878 },
  silas:   { body: 0xd4a870, hair: 0x2a1a0a, shirt: 0x546a84 },
  maeve:   { body: 0xf2e0c8, hair: 0x1a0a2e, shirt: 0x7a5090 },
  caleb:   { body: 0xfcd8a8, hair: 0x7a5020, shirt: 0x4a8060 },
  ruth:    { body: 0xfde0cc, hair: 0x8b0808, shirt: 0x506088 },
}

// prettier-ignore
const MAP_DATA: number[][] = [
  [T.TREE_TL,T.TREE_TR,T.GRASS,T.GRASS_F1,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_TL,T.TREE_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS_F2,T.GRASS,T.GRASS,T.TREE_TL,T.TREE_TR,T.GRASS],
  [T.TREE_BL,T.TREE_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_BL,T.TREE_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_BL,T.TREE_BR,T.GRASS],
  [T.GRASS,T.GRASS,T.GRASS,T.ROOFRED_TL,T.ROOFRED_T,T.ROOFRED_T,T.ROOFRED_TR,T.GRASS,T.GRASS,T.GRASS,T.ROOF_TL,T.ROOF_T,T.ROOF_T,T.ROOF_T,T.ROOF_TR,T.GRASS,T.GRASS,T.ROOFRED_TL,T.ROOFRED_T,T.ROOFRED_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  [T.GRASS,T.GRASS,T.GRASS,T.ROOFRED_ML,T.ROOFRED_M,T.ROOFRED_M,T.ROOFRED_MR,T.GRASS,T.GRASS,T.GRASS,T.ROOF_ML,T.ROOF_M,T.ROOF_M,T.ROOF_M,T.ROOF_MR,T.GRASS,T.GRASS,T.ROOFRED_ML,T.ROOFRED_M,T.ROOFRED_MR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  [T.GRASS,T.BUSH_G,T.GRASS,T.WWALL_L,T.WWALL_WL,T.WWALL_WD,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.SWALL_L,T.SWALL_WL,T.SWALL_WD,T.SWALL_WD,T.SWALL_WR,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_WD,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  [T.GRASS,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_C,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.SWALL_L,T.SWALL_C,T.SWALL_D,T.SWALL_C,T.SWALL_R,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  [T.GRASS,T.GRASS,T.GRASS,T.WWALL_BL,T.WWALL_BC,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS,T.SWALL_BL,T.SWALL_BC,T.SWALL_BC,T.SWALL_BC,T.SWALL_BR,T.GRASS,T.GRASS,T.WWALL_BL,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  [T.TRN_TL,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_TR],
  [T.TRN_L,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.COBB,T.COBB,T.COBB,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_R],
  [T.TRN_L,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.COBB,T.WELL,T.COBB,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_R],
  [T.TRN_L,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.COBB,T.COBB,T.COBB,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_R],
  [T.TRN_BL,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_BR],
  [T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.FENCE_TL,T.FENCE_T,T.FENCE_T,T.FENCE_T,T.FENCE_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS_F1,T.GRASS,T.TREE_ATL,T.TREE_ATR,T.GRASS,T.GRASS],
  [T.GRASS,T.ROOF_TL,T.ROOF_T,T.ROOF_TR,T.FENCE_L,T.GRASS_F2,T.HAY,T.MUSHROOM,T.FENCE_R,T.GRASS,T.ROOFRED_TL,T.ROOFRED_T,T.ROOFRED_T,T.ROOFRED_TR,T.GRASS,T.GRASS,T.GRASS,T.ROOF_TL,T.ROOF_T,T.ROOF_TR,T.TREE_ABL,T.TREE_ABR,T.GRASS,T.GRASS],
  [T.GRASS,T.ROOF_ML,T.ROOF_M,T.ROOF_MR,T.FENCE_L,T.GRASS,T.GRASS,T.BARREL,T.FENCE_R,T.GRASS,T.ROOFRED_ML,T.ROOFRED_M,T.ROOFRED_M,T.ROOFRED_MR,T.GRASS,T.TREE_TL,T.TREE_TR,T.ROOF_ML,T.ROOF_M,T.ROOF_MR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  [T.GRASS,T.SWALL_L,T.SWALL_WD,T.SWALL_R,T.FENCE_BL,T.FENCE_B,T.FENCE_B,T.FENCE_B,T.FENCE_BR,T.GRASS,T.WWALL_L,T.WWALL_WD,T.WWALL_WD,T.WWALL_W,T.GRASS,T.TREE_BL,T.TREE_BR,T.WWALL_L,T.WWALL_WD,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  [T.GRASS,T.SWALL_L,T.SWALL_D,T.SWALL_R,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_C,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  [T.TREE_TL,T.SWALL_BL,T.SWALL_BC,T.SWALL_BR,T.GRASS,T.BUSH_HL,T.BUSH_HR,T.GRASS,T.GRASS,T.GRASS,T.WWALL_BL,T.WWALL_BC,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS_F2,T.WWALL_BL,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.TREE_ATL,T.TREE_ATR,T.TREE_TR],
]

export default function GameCanvas({ character, npcs, onNpcInteract, onEnterBuilding }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const init = async () => {
      const Phaser = (await import('phaser')).default
      const TILE = 16, ZOOM = 3
      const COLS = 24, ROWS = 18
      const isMobile = window.innerWidth < 768

      class TownScene extends Phaser.Scene {
        playerBody!: Phaser.Physics.Arcade.Image
        player!: Phaser.GameObjects.Container
        npcMap = new Map<string, Phaser.GameObjects.Container>()
        cursors!: Phaser.Types.Input.Keyboard.CursorKeys
        wasd!: Record<string, Phaser.Input.Keyboard.Key>
        nearbyNpc: string | null = null
        nearbyDoor: BuildingEntry | null = null
        hint!: Phaser.GameObjects.Container
        hintText!: Phaser.GameObjects.Text
        walkTimer = 0; walkFrame = 0
        joystick = { on: false, x0: 0, y0: 0, cx: 0, cy: 0 }
        jBase!: Phaser.GameObjects.Arc; jThumb!: Phaser.GameObjects.Arc

        constructor() { super({ key: 'TownScene' }) }

        makeCharSprite(key: string, bodyCol: number, hairCol: number, shirtCol: number, frame = 0) {
          const PX = 2
          const W = 8 * PX, H = 14 * PX
          const g = this.add.graphics()
          g.fillStyle(0x000000, 0.2)
          g.fillEllipse(W / 2, H + PX, W * 0.7, PX * 2)
          const lo = frame === 1 ? PX : frame === 2 ? -PX : 0
          g.fillStyle(0x2a1a0e)
          g.fillRect(PX, H - 2 * PX + lo, 2 * PX, PX)
          g.fillRect(4 * PX, H - 2 * PX - lo, 2 * PX, PX)
          g.fillStyle(0x2a3550)
          g.fillRect(PX, H - 5 * PX + lo, 2 * PX, 3 * PX)
          g.fillRect(4 * PX, H - 5 * PX - lo, 2 * PX, 3 * PX)
          g.fillStyle(shirtCol)
          g.fillRect(PX, H - 9 * PX, 6 * PX, 4 * PX)
          g.fillRect(0, H - 9 * PX, PX, 3 * PX)
          g.fillRect(7 * PX, H - 9 * PX, PX, 3 * PX)
          g.fillStyle(bodyCol)
          g.fillRect(0, H - 7 * PX, PX, PX)
          g.fillRect(7 * PX, H - 7 * PX, PX, PX)
          g.fillRect(3 * PX, H - 10 * PX, 2 * PX, PX)
          g.fillStyle(bodyCol)
          g.fillRect(2 * PX, H - 14 * PX, 5 * PX, 5 * PX)
          g.fillStyle(0x1a1a2e)
          g.fillRect(3 * PX, H - 12 * PX, PX, PX)
          g.fillRect(5 * PX, H - 12 * PX, PX, PX)
          g.fillStyle(hairCol)
          g.fillRect(2 * PX, H - 14 * PX, 5 * PX, 2 * PX)
          g.fillRect(PX, H - 13 * PX, PX, 2 * PX)
          g.generateTexture(key, W + PX, H + PX * 2)
          g.destroy()
        }

        preload() {
          this.load.image('tiles', '/assets/tilemap.png')
        }

        create() {
          const textRes = Math.ceil(window.devicePixelRatio * 2)

          // ── Tilemap + collision ─────────────────────────────────────
          const map = this.make.tilemap({ data: MAP_DATA, tileWidth: TILE, tileHeight: TILE })
          const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!
          const layer = map.createLayer(0, tileset, 0, 0)!
          layer.setScale(ZOOM).setDepth(0)

          // Mark solid tiles for physics collision
          layer.forEachTile(tile => {
            if (SOLID_TILES.has(tile.index)) tile.setCollision(true)
          })

          // ── Character sprites ───────────────────────────────────────
          this.makeCharSprite('p_idle', 0xffe0b0, 0x5a3a10, 0x3a5a8a, 0)
          this.makeCharSprite('p_w1',   0xffe0b0, 0x5a3a10, 0x3a5a8a, 1)
          this.makeCharSprite('p_w2',   0xffe0b0, 0x5a3a10, 0x3a5a8a, 2)
          npcs.forEach(npc => {
            const c = NPC_COLORS[npc.id] || { body: 0xfde0cc, hair: 0x3d1f00, shirt: 0x808080 }
            this.makeCharSprite(`npc_${npc.id}_i`, c.body, c.hair, c.shirt, 0)
          })

          // ── NPCs ────────────────────────────────────────────────────
          npcs.forEach(npc => {
            const tp = NPC_TILE[npc.id] || { tx: 5, ty: 9 }
            const wx = tp.tx * TILE * ZOOM + (TILE * ZOOM) / 2
            const wy = tp.ty * TILE * ZOOM + (TILE * ZOOM) / 2
            const spr = this.add.image(0, 0, `npc_${npc.id}_i`).setScale(ZOOM)
            const nameTag = this.add.text(0, -36, npc.name, {
              fontSize: '11px', fontStyle: 'bold', color: '#f5f0e8',
              stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setResolution(textRes)
            const roleTag = this.add.text(0, -23, npc.role, {
              fontSize: '9px', color: '#c9a84c',
              stroke: '#000000', strokeThickness: 2, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setResolution(textRes)
            const c = this.add.container(wx, wy, [spr, nameTag, roleTag])
            c.setDepth(wy + 10).setSize(TILE * ZOOM, TILE * ZOOM * 2).setInteractive()
            c.on('pointerdown', () => onNpcInteract(npc))
            c.on('pointerover', () => spr.setScale(ZOOM * 1.1))
            c.on('pointerout',  () => spr.setScale(ZOOM))
            c.setData('id', npc.id)
            this.tweens.add({
              targets: [nameTag, roleTag], y: `+=3`,
              duration: 1400 + Math.random() * 600, yoyo: true, repeat: -1,
              ease: 'Sine.InOut', delay: Math.random() * 1000,
            })
            this.npcMap.set(npc.id, c)
          })

          // ── Player — start in CENTER of map ─────────────────────────
          const startX = 11 * TILE * ZOOM + (TILE * ZOOM) / 2
          const startY = 9  * TILE * ZOOM + (TILE * ZOOM) / 2
          const pSpr = this.add.image(0, 0, 'p_idle').setScale(ZOOM)
          const pName = this.add.text(0, -36, character.name, {
            fontSize: '11px', fontStyle: 'bold', color: '#e8c97a',
            stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5).setResolution(textRes)
          this.player = this.add.container(startX, startY, [pSpr, pName])
          this.player.setDepth(startY + 10).setData('spr', pSpr)

          // Physics body (invisible, drives collision)
          this.playerBody = this.physics.add.image(startX, startY, '__DEFAULT')
            .setVisible(false)
            .setCollideWorldBounds(true)
            .setSize(TILE * ZOOM * 0.5, TILE * ZOOM * 0.35)

          this.physics.add.collider(this.playerBody, layer)

          // ── Camera ──────────────────────────────────────────────────
          this.cameras.main.setBounds(0, 0, COLS * TILE * ZOOM, ROWS * TILE * ZOOM)
          this.cameras.main.startFollow(this.playerBody, true, 0.1, 0.1)

          // Vignette
          const { width: sw, height: sh } = this.scale
          const v1 = this.add.graphics().setScrollFactor(0).setDepth(9990)
          v1.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0)
          v1.fillRect(0, 0, sw, sh * 0.1)
          const v2 = this.add.graphics().setScrollFactor(0).setDepth(9990)
          v2.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5)
          v2.fillRect(0, sh * 0.9, sw, sh * 0.1)

          // ── Interaction hint ────────────────────────────────────────
          this.hint = this.add.container(0, 0).setVisible(false).setDepth(9985)
          const hBg = this.add.graphics()
          hBg.fillStyle(0x111009, 0.88)
          hBg.fillRoundedRect(-44, -14, 88, 28, 6)
          hBg.lineStyle(1.5, 0xc9a84c, 0.8)
          hBg.strokeRoundedRect(-44, -14, 88, 28, 6)
          this.hintText = this.add.text(0, 0, '', {
            fontSize: '10px', fontStyle: 'bold', color: '#c9a84c', fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5).setResolution(textRes)
          this.hint.add([hBg, this.hintText])

          // ── Input ───────────────────────────────────────────────────
          this.input.keyboard!.disableGlobalCapture()
          this.cursors = this.input.keyboard!.createCursorKeys()
          this.wasd = this.input.keyboard!.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as any

          this.input.keyboard!.on('keydown-E', () => {
            if (!this.input.keyboard!.enabled) return
            if (this.nearbyNpc) {
              const npc = npcs.find(n => n.id === this.nearbyNpc)
              if (npc) { onNpcInteract(npc); return }
            }
            if (this.nearbyDoor) {
              onEnterBuilding(this.nearbyDoor)
            }
          })

          const onFocusIn  = (e: FocusEvent) => { const t = (e.target as HTMLElement)?.tagName; if (t === 'INPUT' || t === 'TEXTAREA') this.input.keyboard!.enabled = false }
          const onFocusOut = (e: FocusEvent) => { const t = (e.target as HTMLElement)?.tagName; if (t === 'INPUT' || t === 'TEXTAREA') this.input.keyboard!.enabled = true  }
          document.addEventListener('focusin',  onFocusIn)
          document.addEventListener('focusout', onFocusOut)
          this.events.once('destroy', () => {
            document.removeEventListener('focusin',  onFocusIn)
            document.removeEventListener('focusout', onFocusOut)
          })

          // ── Mobile joystick ─────────────────────────────────────────
          if (isMobile) {
            const CH = this.scale.height
            this.jBase  = this.add.circle(70, CH - 90, 45, 0x000000, 0.5).setStrokeStyle(2, 0xc9a84c, 0.4).setScrollFactor(0).setDepth(9995)
            this.jThumb = this.add.circle(70, CH - 90, 20, 0xc9a84c, 0.6).setScrollFactor(0).setDepth(9996)
            this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.x < 160) this.joystick = { on: true, x0: p.x, y0: p.y, cx: p.x, cy: p.y } })
            this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.joystick.on) { this.joystick.cx = p.x; this.joystick.cy = p.y } })
            this.input.on('pointerup',   () => { this.joystick.on = false; this.jThumb?.setPosition(70, this.scale.height - 90) })
          }
        }

        update(_: number, delta: number) {
          const SPD = 200
          let vx = 0, vy = 0

          if ((this.wasd as any).left.isDown  || this.cursors.left.isDown)  vx = -SPD
          else if ((this.wasd as any).right.isDown || this.cursors.right.isDown) vx = SPD
          if ((this.wasd as any).up.isDown    || this.cursors.up.isDown)    vy = -SPD
          else if ((this.wasd as any).down.isDown  || this.cursors.down.isDown)  vy = SPD

          if (this.joystick?.on) {
            const dx = this.joystick.cx - this.joystick.x0
            const dy = this.joystick.cy - this.joystick.y0
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist > 6) {
              const cl = Math.min(dist, 36)
              vx = (dx / dist) * SPD * (cl / 36)
              vy = (dy / dist) * SPD * (cl / 36)
              this.jThumb?.setPosition(70 + (dx / dist) * cl, this.scale.height - 90 + (dy / dist) * cl)
            }
          }

          if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }
          this.playerBody.setVelocity(vx, vy)

          // Sync visual container to physics body
          this.player.setPosition(this.playerBody.x, this.playerBody.y)
          this.player.setDepth(this.playerBody.y + 10)

          // Walk animation
          const moving = vx !== 0 || vy !== 0
          const spr = this.player.getData('spr') as Phaser.GameObjects.Image
          if (moving) {
            this.walkTimer += delta
            if (this.walkTimer > 220) { this.walkTimer = 0; this.walkFrame = this.walkFrame === 1 ? 2 : 1 }
            spr.setTexture(this.walkFrame === 1 ? 'p_w1' : 'p_w2')
          } else {
            spr.setTexture('p_idle'); this.walkTimer = 0
          }

          // NPC proximity
          const TILE = 16, ZOOM = 3
          let closestNpc: string | null = null, minNpcD = 80
          this.npcMap.forEach((c, id) => {
            const d = Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, c.x, c.y)
            if (d < minNpcD) { minNpcD = d; closestNpc = id }
          })
          this.nearbyNpc = closestNpc

          // Door proximity
          let closestDoor: BuildingEntry | null = null
          let minDoorD = 70
          DOORS.forEach(door => {
            const wx = door.tx * TILE * ZOOM + (TILE * ZOOM) / 2
            const wy = door.ty * TILE * ZOOM + (TILE * ZOOM) / 2
            const d = Phaser.Math.Distance.Between(this.playerBody.x, this.playerBody.y, wx, wy)
            if (d < minDoorD) { minDoorD = d; closestDoor = door }
          })
          this.nearbyDoor = closestDoor

          // Hint
          if (closestNpc) {
            const c = this.npcMap.get(closestNpc)!
            const mobile = window.innerWidth < 768
            this.hintText.setText(mobile ? 'Tap to talk' : '[E] Talk')
            this.hint.setPosition(c.x, c.y - 60).setVisible(true)
          } else if (closestDoor) {
            const door = closestDoor as BuildingEntry & { tx: number; ty: number }
            const wx = (door as any).tx * TILE * ZOOM + (TILE * ZOOM) / 2
            const wy = (door as any).ty * TILE * ZOOM + (TILE * ZOOM) / 2 - 30
            const mobile = window.innerWidth < 768
            this.hintText.setText(mobile ? `Tap — Enter` : `[E] Enter`)
            this.hint.setPosition(wx, wy).setVisible(true)
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
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      })
      gameRef.current = game
    }

    init()
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

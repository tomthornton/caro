'use client'

import { useEffect, useRef } from 'react'
import type { Character } from '@/lib/supabase'
import type { NpcSoul } from '@/lib/npcs'

type Props = {
  character: Character
  npcs: NpcSoul[]
  onNpcInteract: (npc: NpcSoul) => void
}

// Tile index = row * 12 + col  (packed tilemap, 12 wide, 16×16 tiles, no spacing)
const T = {
  GRASS:      0,
  GRASS_F1:   1,
  GRASS_F2:   2,
  TREE_S:     5,
  TREE_TL:    7,  TREE_TR:    8,
  TREE_BL:   19,  TREE_BR:   20,
  TREE_ATL:   9,  TREE_ATR:  10,
  TREE_ABL:  21,  TREE_ABR:  22,
  BUSH_Y:    27,  BUSH_G:    28,
  BUSH_HL:   30,  BUSH_HR:   31,
  DIRT:      25,
  DIRT_V1:   39,  DIRT_V2:   40,
  COBB:      32,
  // Grass/dirt transitions
  TRN_TL:    12,  TRN_T:     13,  TRN_TR:    14,
  TRN_L:     24,  TRN_R:     26,
  TRN_BL:    36,  TRN_B:     37,  TRN_BR:    38,
  // Blue-grey roof
  ROOF_TL:   48,  ROOF_T:    49,  ROOF_TR:   50,
  ROOF_ML:   60,  ROOF_M:    61,  ROOF_MR:   62,
  // Red-brick roof
  ROOFRED_TL:52, ROOFRED_T:  53, ROOFRED_TR: 54,
  ROOFRED_ML:64, ROOFRED_M:  65, ROOFRED_MR: 66,
  // Wooden building walls
  WWALL_L:   72,  WWALL_C:   73,  WWALL_D:   74,  WWALL_W:   75,
  WWALL_WL:  84,  WWALL_WD:  85,  WWALL_WR:  86,
  WWALL_BL:  96,  WWALL_BC:  97,  WWALL_BR:  99,
  // Stone building walls
  SWALL_L:   76,  SWALL_C:   77,  SWALL_D:   78,  SWALL_R:   79,
  SWALL_WL:  88,  SWALL_WD:  89,  SWALL_WR:  90,
  SWALL_BL: 100,  SWALL_BC: 101,  SWALL_BR: 103,
  // Fence
  FENCE_TL:  33,  FENCE_T:   34,  FENCE_TR:  35,
  FENCE_L:   45,  FENCE_P:   46,  FENCE_R:   47,
  FENCE_BL:  57,  FENCE_B:   58,  FENCE_BR:  59,
  // Decorations
  WELL:      92,
  ANVIL:    105,  HAMMER:   106,
  BARREL:   107,
  SIGN:      83,
  HAY:       94,
  MUSHROOM:  29,
}

// NPC world tile positions (in tile coords, 16px each, zoom 3×)
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

// 24×18 town map (row, col) — 0 = grass, use T constants
// prettier-ignore
const MAP_DATA: number[][] = [
  // Row 0
  [T.TREE_TL,T.TREE_TR,T.GRASS,T.GRASS_F1,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_TL,T.TREE_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS_F2,T.GRASS,T.GRASS,T.TREE_TL,T.TREE_TR,T.GRASS],
  // Row 1
  [T.TREE_BL,T.TREE_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_BL,T.TREE_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_BL,T.TREE_BR,T.GRASS],
  // Row 2 — top buildings row
  [T.GRASS,T.GRASS,T.GRASS,T.ROOFRED_TL,T.ROOFRED_T,T.ROOFRED_T,T.ROOFRED_TR,T.GRASS,T.GRASS,T.GRASS,T.ROOF_TL,T.ROOF_T,T.ROOF_T,T.ROOF_T,T.ROOF_TR,T.GRASS,T.GRASS,T.ROOFRED_TL,T.ROOFRED_T,T.ROOFRED_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 3 — roof mid
  [T.GRASS,T.GRASS,T.GRASS,T.ROOFRED_ML,T.ROOFRED_M,T.ROOFRED_M,T.ROOFRED_MR,T.GRASS,T.GRASS,T.GRASS,T.ROOF_ML,T.ROOF_M,T.ROOF_M,T.ROOF_M,T.ROOF_MR,T.GRASS,T.GRASS,T.ROOFRED_ML,T.ROOFRED_M,T.ROOFRED_MR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 4 — wall top
  [T.GRASS,T.BUSH_G,T.GRASS,T.WWALL_L,T.WWALL_WL,T.WWALL_WD,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.SWALL_L,T.SWALL_WL,T.SWALL_WD,T.SWALL_WD,T.SWALL_WR,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_WD,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 5 — wall door
  [T.GRASS,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_C,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.SWALL_L,T.SWALL_C,T.SWALL_D,T.SWALL_C,T.SWALL_R,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 6 — base
  [T.GRASS,T.GRASS,T.GRASS,T.WWALL_BL,T.WWALL_BC,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS,T.SWALL_BL,T.SWALL_BC,T.SWALL_BC,T.SWALL_BC,T.SWALL_BR,T.GRASS,T.GRASS,T.WWALL_BL,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 7 — horizontal path
  [T.TRN_TL,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_T,T.TRN_TR],
  // Row 8 — path center
  [T.TRN_L,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.COBB,T.COBB,T.COBB,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_R],
  // Row 9 — vertical path center (crossroad)
  [T.TRN_L,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.COBB,T.WELL,T.COBB,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_R],
  // Row 10 — path center 2
  [T.TRN_L,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.COBB,T.COBB,T.COBB,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_R],
  // Row 11 — path bottom edge
  [T.TRN_BL,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.DIRT,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_B,T.TRN_BR],
  // Row 12 — lower area
  [T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.FENCE_TL,T.FENCE_T,T.FENCE_T,T.FENCE_T,T.FENCE_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS_F1,T.GRASS,T.TREE_ATL,T.TREE_ATR,T.GRASS,T.GRASS],
  // Row 13 — lower buildings
  [T.GRASS,T.ROOF_TL,T.ROOF_T,T.ROOF_TR,T.FENCE_L,T.GRASS_F2,T.HAY,T.MUSHROOM,T.FENCE_R,T.GRASS,T.ROOFRED_TL,T.ROOFRED_T,T.ROOFRED_T,T.ROOFRED_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.TREE_ABL,T.TREE_ABR,T.GRASS,T.GRASS],
  // Row 14
  [T.GRASS,T.ROOF_ML,T.ROOF_M,T.ROOF_MR,T.FENCE_L,T.GRASS,T.GRASS,T.BARREL,T.FENCE_R,T.GRASS,T.ROOFRED_ML,T.ROOFRED_M,T.ROOFRED_M,T.ROOFRED_MR,T.GRASS,T.TREE_TL,T.TREE_TR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 15
  [T.GRASS,T.SWALL_L,T.SWALL_WD,T.SWALL_R,T.FENCE_BL,T.FENCE_B,T.FENCE_B,T.FENCE_B,T.FENCE_BR,T.GRASS,T.WWALL_L,T.WWALL_WD,T.WWALL_D,T.WWALL_W,T.GRASS,T.TREE_BL,T.TREE_BR,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS],
  // Row 16
  [T.GRASS,T.SWALL_L,T.SWALL_D,T.SWALL_R,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.GRASS,T.WWALL_L,T.WWALL_C,T.WWALL_D,T.WWALL_W,T.GRASS,T.GRASS,T.GRASS,T.GRASS_F1,T.GRASS,T.GRASS,T.TREE_TL,T.TREE_TR,T.GRASS,T.GRASS],
  // Row 17
  [T.TREE_TL,T.SWALL_BL,T.SWALL_BC,T.SWALL_BR,T.GRASS,T.BUSH_HL,T.BUSH_HR,T.GRASS,T.GRASS,T.GRASS,T.WWALL_BL,T.WWALL_BC,T.WWALL_BC,T.WWALL_BR,T.GRASS,T.GRASS,T.GRASS_F2,T.GRASS,T.GRASS,T.GRASS,T.TREE_BL,T.TREE_BR,T.GRASS,T.TREE_TR],
]

export default function GameCanvas({ character, npcs, onNpcInteract }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const init = async () => {
      const Phaser = (await import('phaser')).default
      const TILE = 16
      const ZOOM = 3
      const COLS = 24, ROWS = 18
      const WW = COLS * TILE * ZOOM
      const WH = ROWS * TILE * ZOOM
      const isMobile = window.innerWidth < 768

      class TownScene extends Phaser.Scene {
        player!: Phaser.GameObjects.Container
        npcMap: Map<string, Phaser.GameObjects.Container> = new Map()
        cursors!: Phaser.Types.Input.Keyboard.CursorKeys
        wasd!: Record<string, Phaser.Input.Keyboard.Key>
        nearbyNpc: string | null = null
        hint!: Phaser.GameObjects.Container
        walkTimer = 0; walkFrame = 0
        joystick = { on: false, x0: 0, y0: 0, cx: 0, cy: 0 }
        jBase!: Phaser.GameObjects.Arc; jThumb!: Phaser.GameObjects.Arc

        constructor() { super({ key: 'TownScene' }) }

        // Draw a tiny pixel-art character at 6×6 px per "pixel" for crisp look
        makeCharSprite(key: string, bodyCol: number, hairCol: number, shirtCol: number, frame = 0) {
          const PX = 2 // each "pixel" = 2 actual pixels
          const W = 8 * PX, H = 14 * PX
          const g = this.add.graphics()

          // Shadow
          g.fillStyle(0x000000, 0.2)
          g.fillEllipse(W / 2, H + PX, W * 0.7, PX * 2)

          // Shoes
          g.fillStyle(0x2a1a0e)
          const lo = frame === 1 ? PX : frame === 2 ? -PX : 0
          g.fillRect(PX, H - 2 * PX + lo, 2 * PX, PX)
          g.fillRect(4 * PX, H - 2 * PX - lo, 2 * PX, PX)

          // Pants
          g.fillStyle(0x2a3550)
          g.fillRect(PX, H - 5 * PX + lo, 2 * PX, 3 * PX)
          g.fillRect(4 * PX, H - 5 * PX - lo, 2 * PX, 3 * PX)

          // Shirt
          g.fillStyle(shirtCol)
          g.fillRect(PX, H - 9 * PX, 6 * PX, 4 * PX)

          // Arms
          g.fillRect(0, H - 9 * PX, PX, 3 * PX)
          g.fillRect(7 * PX, H - 9 * PX, PX, 3 * PX)

          // Skin (hands + neck)
          g.fillStyle(bodyCol)
          g.fillRect(0, H - 7 * PX, PX, PX)
          g.fillRect(7 * PX, H - 7 * PX, PX, PX)
          g.fillRect(3 * PX, H - 10 * PX, 2 * PX, PX)

          // Head
          g.fillStyle(bodyCol)
          g.fillRect(2 * PX, H - 14 * PX, 5 * PX, 5 * PX)

          // Eyes
          g.fillStyle(0x1a1a2e)
          g.fillRect(3 * PX, H - 12 * PX, PX, PX)
          g.fillRect(5 * PX, H - 12 * PX, PX, PX)

          // Hair
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
          // ── Tilemap ───────────────────────────────────────────────────
          const map = this.make.tilemap({
            data: MAP_DATA,
            tileWidth: TILE,
            tileHeight: TILE,
          })
          const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!
          const layer = map.createLayer(0, tileset, 0, 0)!
          layer.setScale(ZOOM)
          layer.setDepth(0)

          // ── Characters ─────────────────────────────────────────────────
          // Player sprite
          this.makeCharSprite('p_idle', 0xffe0b0, 0x5a3a10, 0x3a5a8a, 0)
          this.makeCharSprite('p_w1',   0xffe0b0, 0x5a3a10, 0x3a5a8a, 1)
          this.makeCharSprite('p_w2',   0xffe0b0, 0x5a3a10, 0x3a5a8a, 2)

          npcs.forEach(npc => {
            const c = NPC_COLORS[npc.id] || { body: 0xfde0cc, hair: 0x3d1f00, shirt: 0x808080 }
            this.makeCharSprite(`npc_${npc.id}_i`, c.body, c.hair, c.shirt, 0)
            this.makeCharSprite(`npc_${npc.id}_w`, c.body, c.hair, c.shirt, 1)
          })

          // ── NPCs ─────────────────────────────────────────────────────
          npcs.forEach(npc => {
            const tp = NPC_TILE[npc.id] || { tx: 5, ty: 9 }
            const wx = tp.tx * TILE * ZOOM + (TILE * ZOOM) / 2
            const wy = tp.ty * TILE * ZOOM + (TILE * ZOOM) / 2

            const spr = this.add.image(0, 0, `npc_${npc.id}_i`).setScale(ZOOM)
            const nameTag = this.add.text(0, -32, npc.name, {
              fontSize: '6px', fontStyle: 'bold', color: '#f5f0e8',
              stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setScale(ZOOM * 0.6)
            const roleTag = this.add.text(0, -22, npc.role, {
              fontSize: '5px', color: '#c9a84c',
              stroke: '#000000', strokeThickness: 2, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setScale(ZOOM * 0.6)

            const c = this.add.container(wx, wy, [spr, nameTag, roleTag])
            c.setDepth(wy + 10).setSize(TILE * ZOOM, TILE * ZOOM * 2).setInteractive()
            c.on('pointerdown', () => onNpcInteract(npc))
            c.on('pointerover', () => spr.setScale(ZOOM * 1.1))
            c.on('pointerout',  () => spr.setScale(ZOOM))
            c.setData('spr', spr); c.setData('id', npc.id)

            this.tweens.add({
              targets: [nameTag, roleTag], y: `+=3`,
              duration: 1400 + Math.random() * 600, yoyo: true, repeat: -1,
              ease: 'Sine.InOut', delay: Math.random() * 1000,
            })
            this.npcMap.set(npc.id, c)
          })

          // ── Player ────────────────────────────────────────────────────
          const sx = (character.position?.x ?? 9) * TILE * ZOOM
          const sy = (character.position?.y ?? 9) * TILE * ZOOM
          const pSpr = this.add.image(0, 0, 'p_idle').setScale(ZOOM)
          const pName = this.add.text(0, -32, character.name, {
            fontSize: '6px', fontStyle: 'bold', color: '#e8c97a',
            stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5).setScale(ZOOM * 0.6)

          this.player = this.add.container(sx, sy, [pSpr, pName])
          this.player.setDepth(sy + 10).setData('spr', pSpr)

          // ── Camera ────────────────────────────────────────────────────
          this.cameras.main.setBounds(0, 0, COLS * TILE * ZOOM, ROWS * TILE * ZOOM)
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

          // Soft vignette
          const { width: sw, height: sh } = this.scale
          const v1 = this.add.graphics().setScrollFactor(0).setDepth(9990)
          v1.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0)
          v1.fillRect(0, 0, sw, sh * 0.1)
          const v2 = this.add.graphics().setScrollFactor(0).setDepth(9990)
          v2.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.5, 0.5)
          v2.fillRect(0, sh * 0.9, sw, sh * 0.1)

          // ── Hint ──────────────────────────────────────────────────────
          this.hint = this.add.container(0, 0).setVisible(false).setDepth(9985)
          const hBg = this.add.graphics()
          hBg.fillStyle(0x111009, 0.85)
          hBg.fillRoundedRect(-40, -14, 80, 28, 6)
          hBg.lineStyle(1.5, 0xc9a84c, 0.8)
          hBg.strokeRoundedRect(-40, -14, 80, 28, 6)
          const hTxt = this.add.text(0, 0, isMobile ? 'Tap to talk' : '[E] Talk', {
            fontSize: '10px', fontStyle: 'bold', color: '#c9a84c', fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5)
          this.hint.add([hBg, hTxt])

          // ── Input ─────────────────────────────────────────────────────
          this.input.keyboard!.disableGlobalCapture()
          this.cursors = this.input.keyboard!.createCursorKeys()
          this.wasd = this.input.keyboard!.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }) as any

          this.input.keyboard!.on('keydown-E', () => {
            if (!this.input.keyboard!.enabled) return
            if (this.nearbyNpc) {
              const npc = npcs.find(n => n.id === this.nearbyNpc)
              if (npc) onNpcInteract(npc)
            }
          })

          const onFocusIn = (e: FocusEvent) => {
            const tag = (e.target as HTMLElement)?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') this.input.keyboard!.enabled = false
          }
          const onFocusOut = (e: FocusEvent) => {
            const tag = (e.target as HTMLElement)?.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') this.input.keyboard!.enabled = true
          }
          document.addEventListener('focusin', onFocusIn)
          document.addEventListener('focusout', onFocusOut)
          this.events.once('destroy', () => {
            document.removeEventListener('focusin', onFocusIn)
            document.removeEventListener('focusout', onFocusOut)
          })

          // ── Mobile joystick ───────────────────────────────────────────
          if (isMobile) {
            const CH = this.scale.height
            this.jBase = this.add.circle(70, CH - 90, 45, 0x000000, 0.5)
              .setStrokeStyle(2, 0xc9a84c, 0.4).setScrollFactor(0).setDepth(9995)
            this.jThumb = this.add.circle(70, CH - 90, 20, 0xc9a84c, 0.6)
              .setScrollFactor(0).setDepth(9996)

            this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
              if (p.x < 160) this.joystick = { on: true, x0: p.x, y0: p.y, cx: p.x, cy: p.y }
            })
            this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
              if (this.joystick.on) { this.joystick.cx = p.x; this.joystick.cy = p.y }
            })
            this.input.on('pointerup', () => {
              this.joystick.on = false
              this.jThumb?.setPosition(70, this.scale.height - 90)
            })
          }
        }

        update(_: number, delta: number) {
          const spd = 160
          let vx = 0, vy = 0

          if (this.cursors.left.isDown  || (this.wasd as any).left.isDown)  vx = -spd
          else if (this.cursors.right.isDown || (this.wasd as any).right.isDown) vx = spd
          if (this.cursors.up.isDown    || (this.wasd as any).up.isDown)    vy = -spd
          else if (this.cursors.down.isDown  || (this.wasd as any).down.isDown)  vy = spd

          if (this.joystick?.on) {
            const dx = this.joystick.cx - this.joystick.x0
            const dy = this.joystick.cy - this.joystick.y0
            const dist = Math.sqrt(dx * dx + dy * dy)
            const max = 36
            if (dist > 6) {
              const cl = Math.min(dist, max)
              vx = (dx / dist) * spd * (cl / max)
              vy = (dy / dist) * spd * (cl / max)
              this.jThumb?.setPosition(70 + (dx / dist) * cl, this.scale.height - 90 + (dy / dist) * cl)
            }
          }

          if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }
          const dt = delta / 1000
          const COLS = 24, ROWS = 18, TILE = 16, ZOOM = 3
          this.player.x = Phaser.Math.Clamp(this.player.x + vx * dt, TILE * ZOOM, (COLS - 1) * TILE * ZOOM)
          this.player.y = Phaser.Math.Clamp(this.player.y + vy * dt, TILE * ZOOM, (ROWS - 1) * TILE * ZOOM)
          this.player.setDepth(this.player.y + 10)

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
          let closest: string | null = null, minD = 80
          this.npcMap.forEach((c, id) => {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y)
            if (d < minD) { minD = d; closest = id }
          })
          this.nearbyNpc = closest
          if (closest) {
            const c = this.npcMap.get(closest)!
            this.hint.setPosition(c.x, c.y - 55).setVisible(true)
          } else {
            this.hint.setVisible(false)
          }
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        parent: containerRef.current!,
        backgroundColor: '#5c9e3a',
        scene: [TownScene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: {
          antialias: false,     // OFF for pixel art — critical
          pixelArt: true,       // nearest-neighbor scaling
          roundPixels: true,
        },
      })

      gameRef.current = game
    }

    init()
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

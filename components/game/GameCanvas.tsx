'use client'

import { useEffect, useRef } from 'react'
import type { Character } from '@/lib/supabase'
import type { NpcSoul } from '@/lib/npcs'

type Props = {
  character: Character
  npcs: NpcSoul[]
  onNpcInteract: (npc: NpcSoul) => void
}

const NPC_POS: Record<string, { x: number; y: number }> = {
  eleanor: { x: 260, y: 280 },
  silas:   { x: 740, y: 260 },
  maeve:   { x: 160, y: 520 },
  caleb:   { x: 500, y: 160 },
  ruth:    { x: 820, y: 490 },
}

const NPC_STYLE: Record<string, { body: number; hair: number; top: number; accent: number }> = {
  eleanor: { body: 0xfde8cc, hair: 0x6b3515, top: 0xe07878, accent: 0xf4a58a },
  silas:   { body: 0xd4a870, hair: 0x2a1a0a, top: 0x546a84, accent: 0x8aa4bc },
  maeve:   { body: 0xf2e0c8, hair: 0x1a0a2e, top: 0x7a5090, accent: 0xb09ac8 },
  caleb:   { body: 0xfcd8a8, hair: 0x7a5020, top: 0x4a8060, accent: 0x8cc0a0 },
  ruth:    { body: 0xfde0cc, hair: 0x8b0808, top: 0x506088, accent: 0x90a8c8 },
}

export default function GameCanvas({ character, npcs, onNpcInteract }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const init = async () => {
      const Phaser = (await import('phaser')).default

      class TownScene extends Phaser.Scene {
        player!: Phaser.GameObjects.Container
        npcMap: Map<string, Phaser.GameObjects.Container> = new Map()
        cursors!: Phaser.Types.Input.Keyboard.CursorKeys
        wasd!: any
        eKey!: Phaser.Input.Keyboard.Key
        nearbyNpc: string | null = null
        hint!: Phaser.GameObjects.Container
        walkTimer = 0
        walkFrame = 0
        joystick = { on: false, x0: 0, y0: 0, cx: 0, cy: 0 }
        jBase!: Phaser.GameObjects.Arc
        jThumb!: Phaser.GameObjects.Arc
        mobile = window.innerWidth < 768
        WW = 1024
        WH = 768

        constructor() { super({ key: 'TownScene' }) }

        // ── Texture generators ──────────────────────────────────────────

        makePerson(key: string, bodyCol: number, hairCol: number, topCol: number, accentCol: number, walk = 0) {
          const S = 4 // scale factor for crispness
          const W = 14 * S, H = 22 * S
          const g = this.add.graphics()

          // Soft shadow
          g.fillStyle(0x000000, 0.18)
          g.fillEllipse(W / 2, H + S, W * 0.7, S * 2)

          // Shoes
          g.fillStyle(0x2a1a0e)
          const lx = W / 2 - 4 * S, rx = W / 2 + S
          const lo = walk === 1 ? S : walk === 2 ? -S : 0
          g.fillRoundedRect(lx, H - 4 * S + lo, 4 * S, 3 * S, S)
          g.fillRoundedRect(rx, H - 4 * S - lo, 4 * S, 3 * S, S)

          // Pants
          g.fillStyle(0x2a3550)
          g.fillRoundedRect(lx, H - 9 * S + lo, 4 * S, 6 * S, S)
          g.fillRoundedRect(rx, H - 9 * S - lo, 4 * S, 6 * S, S)

          // Top/shirt
          g.fillStyle(topCol)
          g.fillRoundedRect(W / 2 - 5 * S, H - 16 * S, 10 * S, 8 * S, S)

          // Collar accent
          g.fillStyle(accentCol)
          g.fillRoundedRect(W / 2 - 2 * S, H - 16 * S, 4 * S, 2 * S, S * 0.5)

          // Arms
          g.fillStyle(topCol)
          g.fillRoundedRect(W / 2 - 8 * S, H - 15 * S, 3 * S, 6 * S, S)
          g.fillRoundedRect(W / 2 + 5 * S, H - 15 * S, 3 * S, 6 * S, S)

          // Hands
          g.fillStyle(bodyCol)
          g.fillCircle(W / 2 - 7 * S + S / 2, H - 9 * S, S * 1.5)
          g.fillCircle(W / 2 + 6 * S + S / 2, H - 9 * S, S * 1.5)

          // Neck
          g.fillStyle(bodyCol)
          g.fillRect(W / 2 - S, H - 18 * S, 2 * S, 3 * S)

          // Head
          g.fillStyle(bodyCol)
          g.fillRoundedRect(W / 2 - 4 * S, H - 22 * S, 8 * S, 7 * S, S * 1.5)

          // Blush
          g.fillStyle(0xffaaaa, 0.25)
          g.fillCircle(W / 2 - 3 * S, H - 17 * S, S)
          g.fillCircle(W / 2 + 3 * S, H - 17 * S, S)

          // Eyes
          g.fillStyle(0x1a1a2e)
          g.fillCircle(W / 2 - 2 * S, H - 19 * S, S * 0.8)
          g.fillCircle(W / 2 + 2 * S, H - 19 * S, S * 0.8)

          // Eye shine
          g.fillStyle(0xffffff, 0.9)
          g.fillCircle(W / 2 - 2 * S + S * 0.3, H - 19 * S - S * 0.3, S * 0.3)
          g.fillCircle(W / 2 + 2 * S + S * 0.3, H - 19 * S - S * 0.3, S * 0.3)

          // Hair
          g.fillStyle(hairCol)
          g.fillRoundedRect(W / 2 - 4 * S, H - 22 * S, 8 * S, 4 * S, { tl: S * 1.5, tr: S * 1.5, bl: 0, br: 0 })
          g.fillRect(W / 2 - 5 * S, H - 20 * S, S, 3 * S)
          g.fillRect(W / 2 + 4 * S, H - 20 * S, S, 2 * S)

          g.generateTexture(key, W + S, H + S * 2)
          g.destroy()
        }

        makeBuilding(key: string, w: number, h: number, wallCol: number, roofCol: number, accent: number) {
          const g = this.add.graphics()
          const S = 2

          // Drop shadow
          g.fillStyle(0x000000, 0.2)
          g.fillRoundedRect(S * 3, h / 2 + S * 3, w, h / 2 + S, S)

          // Wall
          g.fillStyle(wallCol)
          g.fillRoundedRect(0, h / 2, w, h / 2, { tl: 0, tr: 0, bl: S * 2, br: S * 2 })

          // Wall shading (left side darker)
          g.fillStyle(0x000000, 0.08)
          g.fillRect(0, h / 2, w * 0.25, h / 2)

          // Roof (pentagon shape)
          const roofH = h * 0.55
          g.fillStyle(roofCol)
          g.fillTriangle(0, h / 2, w / 2, h / 2 - roofH, w, h / 2)

          // Roof highlight
          g.fillStyle(0xffffff, 0.08)
          g.fillTriangle(w * 0.1, h / 2, w / 2, h / 2 - roofH, w * 0.5, h / 2)

          // Roof ridge
          g.lineStyle(S, accent, 0.4)
          g.lineBetween(w / 2, h / 2 - roofH + S, w / 2, h / 2)

          // Front door
          g.fillStyle(0x3d1f00)
          const dw = w * 0.2, dh = h * 0.24
          g.fillRoundedRect(w / 2 - dw / 2, h - dh, dw, dh, S)
          g.lineStyle(S, 0x1a0a00, 0.8)
          g.strokeRoundedRect(w / 2 - dw / 2, h - dh, dw, dh, S)

          // Door knob
          g.fillStyle(0xc9a84c)
          g.fillCircle(w / 2 + dw / 4, h - dh * 0.45, S * 1.5)

          // Left window
          this.drawWindow(g, w * 0.12, h * 0.56, w * 0.2, h * 0.2, S)
          // Right window
          this.drawWindow(g, w * 0.68, h * 0.56, w * 0.2, h * 0.2, S)

          // Outline
          g.lineStyle(S * 0.5, 0x000000, 0.15)
          g.strokeRoundedRect(0, h / 2, w, h / 2, { tl: 0, tr: 0, bl: S * 2, br: S * 2 })

          g.generateTexture(key, w + S * 4, h + S * 4)
          g.destroy()
        }

        drawWindow(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, S: number) {
          // Frame
          g.fillStyle(0x5a4020)
          g.fillRoundedRect(x - S, y - S, w + S * 2, h + S * 2, S)
          // Glass (warm glow)
          g.fillStyle(0xffd890, 0.85)
          g.fillRoundedRect(x, y, w, h, S * 0.5)
          // Cross pane
          g.lineStyle(S * 0.75, 0x8a6030, 0.6)
          g.lineBetween(x + w / 2, y, x + w / 2, y + h)
          g.lineBetween(x, y + h / 2, x + w, y + h / 2)
        }

        makeTree(key: string) {
          const g = this.add.graphics()
          const W = 60, H = 80

          // Shadow
          g.fillStyle(0x000000, 0.15)
          g.fillEllipse(W / 2, H - 6, 32, 10)

          // Trunk
          g.fillStyle(0x7a5030)
          g.fillRoundedRect(W / 2 - 5, H - 30, 10, 26, 3)
          g.fillStyle(0x9a6a40, 0.5)
          g.fillRect(W / 2, H - 30, 3, 26)

          // Canopy layers (dark to light, bottom to top)
          g.fillStyle(0x2a5e18)
          g.fillCircle(W / 2, H - 38, 22)
          g.fillStyle(0x388a22)
          g.fillCircle(W / 2 - 6, H - 44, 16)
          g.fillCircle(W / 2 + 6, H - 44, 16)
          g.fillStyle(0x4aaa2e)
          g.fillCircle(W / 2, H - 50, 16)
          g.fillStyle(0x5ec038)
          g.fillCircle(W / 2 - 3, H - 54, 10)
          g.fillCircle(W / 2 + 3, H - 55, 9)
          // Highlight
          g.fillStyle(0x78d84e, 0.5)
          g.fillCircle(W / 2 - 5, H - 57, 6)

          g.generateTexture(key, W, H)
          g.destroy()
        }

        makeGrassTile(key: string, variant: number) {
          const g = this.add.graphics()
          const colors = [0x5c9e3a, 0x60a83e, 0x58983a]
          g.fillStyle(colors[variant % 3])
          g.fillRect(0, 0, 64, 64)
          // Subtle blade details
          g.fillStyle(0x000000, 0.04)
          for (let i = 0; i < 6; i++) {
            g.fillRect(Math.random() * 60, Math.random() * 60, 2, 4)
          }
          g.fillStyle(0xffffff, 0.04)
          for (let i = 0; i < 4; i++) {
            g.fillCircle(Math.random() * 60, Math.random() * 60, 3)
          }
          g.generateTexture(key, 64, 64)
          g.destroy()
        }

        makePathTile() {
          const g = this.add.graphics()
          g.fillStyle(0xc4a86e)
          g.fillRect(0, 0, 64, 64)
          g.fillStyle(0xb49658, 0.5)
          g.fillRect(8, 20, 6, 6); g.fillRect(32, 8, 8, 5); g.fillRect(50, 34, 7, 5)
          g.fillStyle(0xd4b87e, 0.4)
          g.fillRect(18, 42, 5, 5); g.fillRect(44, 12, 4, 4)
          g.generateTexture('path', 64, 64)
          g.destroy()
        }

        makeWater(key: string, frame: number) {
          const g = this.add.graphics()
          g.fillStyle(0x3a8ec4)
          g.fillRect(0, 0, 64, 64)
          g.fillStyle(0x5aaee0, 0.6)
          g.fillRect(0, 0, 64, 64)
          // Ripples
          const offsets = [0, 8, 16]
          const o = offsets[frame % 3]
          g.fillStyle(0x80c8f0, 0.35)
          for (let i = 0; i < 4; i++) {
            g.fillRoundedRect((i * 18 + o) % 64, 10, 12, 3, 2)
            g.fillRoundedRect((i * 16 + o + 5) % 64, 36, 10, 2, 1)
            g.fillRoundedRect((i * 20 + o) % 64, 52, 8, 2, 1)
          }
          g.fillStyle(0xffffff, 0.08)
          g.fillRoundedRect(10, 18, 20, 4, 2)
          g.generateTexture(key, 64, 64)
          g.destroy()
        }

        makeFlowers() {
          const g = this.add.graphics()
          g.fillStyle(0x5c9e3a)
          g.fillRect(0, 0, 32, 32)
          const flowers = [[6, 20], [16, 10], [24, 22]]
          flowers.forEach(([fx, fy], i) => {
            const petal = [0xffdd44, 0xff88aa, 0xaa88ff][i]
            g.fillStyle(petal, 0.9)
            for (let a = 0; a < 5; a++) {
              const ra = (a / 5) * Math.PI * 2
              g.fillCircle(fx + Math.cos(ra) * 3, fy + Math.sin(ra) * 3, 2.5)
            }
            g.fillStyle(0xffee88)
            g.fillCircle(fx, fy, 2)
          })
          g.generateTexture('flowers', 32, 32)
          g.destroy()
        }

        makeFountain() {
          const g = this.add.graphics()
          const W = 72, H = 60
          // Basin
          g.fillStyle(0x8ab0d0)
          g.fillEllipse(W / 2, H * 0.7, W * 0.9, H * 0.4)
          g.fillStyle(0x6898b8)
          g.fillEllipse(W / 2, H * 0.7 + 4, W * 0.8, H * 0.3)
          // Water
          g.fillStyle(0x5aaee0, 0.8)
          g.fillEllipse(W / 2, H * 0.7, W * 0.75, H * 0.28)
          // Pillar
          g.fillStyle(0xd4c8a8)
          g.fillRect(W / 2 - 5, H * 0.2, 10, H * 0.5)
          // Top bowl
          g.fillStyle(0xc4b898)
          g.fillEllipse(W / 2, H * 0.22, 30, 12)
          // Water spray
          g.fillStyle(0x90d0f0, 0.7)
          g.fillCircle(W / 2, H * 0.1, 5)
          g.fillStyle(0xb0e4ff, 0.4)
          g.fillCircle(W / 2, H * 0.05, 3)
          g.generateTexture('fountain', W, H)
          g.destroy()
        }

        preload() {}

        create() {
          const WW = this.WW, WH = this.WH
          const TW = 64

          // Generate all textures
          for (let i = 0; i < 3; i++) this.makeGrassTile(`grass${i}`, i)
          this.makePathTile()
          for (let i = 0; i < 3; i++) this.makeWater(`water${i}`, i)
          this.makeFlowers()
          this.makeFountain()
          this.makeTree('tree')

          this.makeBuilding('bld_bakery',  160, 130, 0xead4a0, 0xb04040, 0xc8a060)
          this.makeBuilding('bld_forge',   150, 120, 0xb0a090, 0x505060, 0x808090)
          this.makeBuilding('bld_cottage', 140, 118, 0xb8c8a0, 0x506840, 0x90a878)
          this.makeBuilding('bld_hall',    200, 140, 0xe8dcb8, 0x905030, 0xc8a870)
          this.makeBuilding('bld_library', 170, 128, 0xb8c0d4, 0x485878, 0x8898b8)
          this.makeBuilding('bld_tavern',  150, 118, 0xd4b890, 0x884428, 0xb07848)

          // Player
          this.makePerson('p_idle', 0xffe0b0, 0x5a3a10, 0x3a5a8a, 0x7090c0, 0)
          this.makePerson('p_w1',   0xffe0b0, 0x5a3a10, 0x3a5a8a, 0x7090c0, 1)
          this.makePerson('p_w2',   0xffe0b0, 0x5a3a10, 0x3a5a8a, 0x7090c0, 2)

          // NPCs
          npcs.forEach(npc => {
            const s = NPC_STYLE[npc.id] || { body: 0xfde0cc, hair: 0x3d1f00, top: 0x808080, accent: 0xa0a0a0 }
            this.makePerson(`npc_${npc.id}_i`, s.body, s.hair, s.top, s.accent, 0)
            this.makePerson(`npc_${npc.id}_w`, s.body, s.hair, s.top, s.accent, 1)
          })

          // ── Tile map ──────────────────────────────────────
          const cols = Math.ceil(WW / TW) + 1, rows = Math.ceil(WH / TW) + 1
          const variants = ['grass0', 'grass0', 'grass0', 'grass1', 'grass2']
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const key = variants[Math.floor(Math.abs(Math.sin(r * 7 + c * 13) * 10)) % variants.length]
              this.add.image(c * TW, r * TW, key).setOrigin(0).setDisplaySize(TW, TW)
            }
          }

          // Paths (horizontal + vertical through center)
          const cx = WW / 2, cy = WH / 2
          for (let c = 0; c < cols + 1; c++) this.add.image(c * TW, cy - 24, 'path').setOrigin(0).setDisplaySize(TW, 48)
          for (let r = 0; r < rows + 1; r++) this.add.image(cx - 24, r * TW, 'path').setOrigin(0).setDisplaySize(48, TW)

          // Flower patches
          const flowerSpots: number[][] = [[100, 100], [180, 420], [600, 540], [820, 150], [340, 60], [760, 400]]
          flowerSpots.forEach(([fx, fy]) => {
            this.add.image(fx, fy, 'flowers').setDisplaySize(48, 48)
          })

          // Fountain at center
          const fountain = this.add.image(cx, cy, 'fountain').setDisplaySize(90, 76).setDepth(cy - 30)
          this.tweens.add({ targets: fountain, alpha: { from: 0.92, to: 1 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

          // Animated water tiles (pond top-right)
          const waterImages: Phaser.GameObjects.Image[] = []
          for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
            const wi = this.add.image(750 + i * 54, 340 + j * 40, 'water0').setDisplaySize(54, 40)
            waterImages.push(wi)
          }
          let wf = 0
          this.time.addEvent({ delay: 500, loop: true, callback: () => {
            wf = (wf + 1) % 3
            waterImages.forEach(wi => wi.setTexture(`water${wf}`))
          }})

          // ── Buildings ──────────────────────────────────────
          const blds = [
            { key: 'bld_bakery',  x: 240, y: 190, w: 168, h: 138, label: "Eleanor's Bakery" },
            { key: 'bld_forge',   x: 750, y: 185, w: 158, h: 128, label: "Silas's Forge" },
            { key: 'bld_cottage', x: 140, y: 490, w: 148, h: 126, label: "Maeve's Cottage" },
            { key: 'bld_hall',    x: 510, y: 150, w: 208, h: 148, label: "Town Hall" },
            { key: 'bld_library', x: 830, y: 460, w: 178, h: 136, label: "Library" },
            { key: 'bld_tavern',  x: 490, y: 560, w: 158, h: 126, label: "Tavern" },
          ]
          blds.forEach(b => {
            this.add.image(b.x, b.y, b.key).setDisplaySize(b.w, b.h).setDepth(b.y)
            this.add.text(b.x, b.y + b.h / 2 + 2, b.label, {
              fontSize: '10px', fontStyle: 'bold', color: '#f5f0e8',
              stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5, 0).setDepth(b.y + 1).setAlpha(0.85)
          })

          // ── Trees ──────────────────────────────────────────
          const treeSpots: number[][] = [[60, 60], [960, 60], [60, 700], [960, 700], [60, 380], [960, 380], [400, 620], [580, 40], [200, 640], [840, 620]]
          treeSpots.forEach(([tx, ty]) => {
            this.add.image(tx, ty, 'tree').setDisplaySize(60, 80).setDepth(ty + 40)
          })

          // ── NPCs ──────────────────────────────────────────
          npcs.forEach(npc => {
            const pos = NPC_POS[npc.id] || { x: 400, y: 400 }
            const spr = this.add.image(0, 0, `npc_${npc.id}_i`).setDisplaySize(40, 62)
            const name = this.add.text(0, -40, npc.name, {
              fontSize: '11px', fontStyle: 'bold', color: '#f5f0e8',
              stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5)
            const role = this.add.text(0, -28, npc.role, {
              fontSize: '9px', color: '#c9a84c',
              stroke: '#000000', strokeThickness: 2, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5)

            const c = this.add.container(pos.x, pos.y, [spr, name, role])
            c.setDepth(pos.y); c.setSize(44, 66); c.setInteractive()
            c.on('pointerdown', () => onNpcInteract(npc))
            c.setData('spr', spr); c.setData('id', npc.id)

            // Hover effect
            c.on('pointerover', () => spr.setScale(1.08))
            c.on('pointerout', () => spr.setScale(1))

            // Subtle idle sway
            this.tweens.add({
              targets: [name, role], y: `+=4`,
              duration: 1600 + Math.random() * 600, yoyo: true, repeat: -1,
              ease: 'Sine.InOut', delay: Math.random() * 1200,
            })

            this.npcMap.set(npc.id, c)
          })

          // ── Player ──────────────────────────────────────────
          const sx = character.position?.x ?? WW / 2, sy = character.position?.y ?? WH / 2
          const pSpr = this.add.image(0, 0, 'p_idle').setDisplaySize(40, 62)
          const pName = this.add.text(0, -40, character.name, {
            fontSize: '11px', fontStyle: 'bold', color: '#e8c97a',
            stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5)
          this.player = this.add.container(sx, sy, [pSpr, pName])
          this.player.setDepth(sy)
          this.player.setData('spr', pSpr)

          // ── Camera ──────────────────────────────────────────
          this.cameras.main.setBounds(0, 0, WW, WH)
          this.cameras.main.startFollow(this.player, true, 0.09, 0.09)
          this.cameras.main.setZoom(this.mobile ? 1.1 : 0.95)

          // Soft vignette
          const vign = this.add.graphics().setScrollFactor(0).setDepth(9990)
          const { width: sw, height: sh } = this.scale
          vign.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0)
          vign.fillRect(0, 0, sw, sh * 0.12)
          const vign2 = this.add.graphics().setScrollFactor(0).setDepth(9990)
          vign2.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.4, 0.4)
          vign2.fillRect(0, sh * 0.88, sw, sh * 0.12)

          // ── Interaction hint ──────────────────────────────────
          this.hint = this.add.container(0, 0).setVisible(false).setDepth(9985)
          const hBg = this.add.graphics()
          hBg.fillStyle(0x111009, 0.85)
          hBg.fillRoundedRect(-38, -13, 76, 26, 6)
          hBg.lineStyle(1, 0xc9a84c, 0.7)
          hBg.strokeRoundedRect(-38, -13, 76, 26, 6)
          const hTxt = this.add.text(0, 0, this.mobile ? 'Tap to talk' : '[E] Talk', {
            fontSize: '10px', fontStyle: 'bold', color: '#c9a84c', fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5)
          this.hint.add([hBg, hTxt])

          // ── Input ──────────────────────────────────────────
          // Prevent Phaser from swallowing key events (fixes Space in chat input)
          this.input.keyboard!.disableGlobalCapture()

          this.cursors = this.input.keyboard!.createCursorKeys()
          this.wasd = this.input.keyboard!.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' })
          this.eKey = this.input.keyboard!.addKey('E')

          // Reliable E-key handler via event listener (not JustDown in update loop)
          this.input.keyboard!.on('keydown-E', () => {
            const el = document.activeElement
            if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') return
            if (this.nearbyNpc) {
              const npc = npcs.find(n => n.id === this.nearbyNpc)
              if (npc) onNpcInteract(npc)
            }
          })

          // ── Mobile joystick ──────────────────────────────────
          if (this.mobile) {
            const { height: CH } = this.scale
            this.jBase = this.add.circle(75, CH - 95, 48, 0x000000, 0.5)
              .setStrokeStyle(2, 0xc9a84c, 0.4).setScrollFactor(0).setDepth(9995)
            this.jThumb = this.add.circle(75, CH - 95, 22, 0xc9a84c, 0.6)
              .setScrollFactor(0).setDepth(9996)

            this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
              if (p.x < 170) this.joystick = { on: true, x0: p.x, y0: p.y, cx: p.x, cy: p.y }
            })
            this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
              if (this.joystick.on) { this.joystick.cx = p.x; this.joystick.cy = p.y }
            })
            this.input.on('pointerup', () => {
              this.joystick.on = false
              const CH2 = this.scale.height
              this.jThumb?.setPosition(75, CH2 - 95)
            })
          }
        }

        update(_: number, delta: number) {
          // ── FIX: don't process keyboard when HTML input is focused ──
          const active = document.activeElement
          const typing = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA'

          let vx = 0, vy = 0
          const spd = 160

          if (!typing) {
            if (this.cursors.left.isDown  || this.wasd.left.isDown)  vx = -spd
            else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = spd
            if (this.cursors.up.isDown    || this.wasd.up.isDown)    vy = -spd
            else if (this.cursors.down.isDown  || this.wasd.down.isDown)  vy = spd
          }

          if (this.mobile && this.joystick.on) {
            const dx = this.joystick.cx - this.joystick.x0
            const dy = this.joystick.cy - this.joystick.y0
            const dist = Math.sqrt(dx * dx + dy * dy)
            const max = 38
            if (dist > 6) {
              const cl = Math.min(dist, max)
              vx = (dx / dist) * spd * (cl / max)
              vy = (dy / dist) * spd * (cl / max)
              this.jThumb?.setPosition(75 + (dx / dist) * cl, this.scale.height - 95 + (dy / dist) * cl)
            }
          }

          if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

          const dt = delta / 1000
          this.player.x = Phaser.Math.Clamp(this.player.x + vx * dt, 30, this.WW - 30)
          this.player.y = Phaser.Math.Clamp(this.player.y + vy * dt, 30, this.WH - 30)
          this.player.setDepth(this.player.y)

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
          let closest: string | null = null, minD = 90
          this.npcMap.forEach((c, id) => {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y)
            if (d < minD) { minD = d; closest = id }
          })
          this.nearbyNpc = closest
          if (closest) {
            const c = this.npcMap.get(closest)!
            this.hint.setPosition(c.x, c.y - 60).setVisible(true)
          } else {
            this.hint.setVisible(false)
          }

        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#5c9e3a',
        parent: containerRef.current!,
        scene: [TownScene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: true, pixelArt: false, roundPixels: false },
      })

      gameRef.current = game
    }

    init()
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

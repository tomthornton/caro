'use client'

import { useEffect, useRef } from 'react'
import type { Character } from '@/lib/supabase'
import type { NpcSoul } from '@/lib/npcs'

type Props = {
  character: Character
  npcs: NpcSoul[]
  onNpcInteract: (npc: NpcSoul) => void
}

const NPC_POSITIONS: Record<string, { x: number; y: number }> = {
  eleanor: { x: 220, y: 220 },
  silas:   { x: 620, y: 200 },
  maeve:   { x: 130, y: 430 },
  caleb:   { x: 430, y: 130 },
  ruth:    { x: 680, y: 410 },
}

const NPC_COLORS: Record<string, { body: number; hair: number; shirt: number }> = {
  eleanor: { body: 0xffe0c0, hair: 0x8b4513, shirt: 0xe07070 },
  silas:   { body: 0xd4a870, hair: 0x3d2b1f, shirt: 0x607090 },
  maeve:   { body: 0xf0d8b0, hair: 0x1a0a2a, shirt: 0x5a3a7a },
  caleb:   { body: 0xffd0a0, hair: 0x6b4a20, shirt: 0x4a7a5c },
  ruth:    { body: 0xffe0c0, hair: 0x8b0000, shirt: 0x5a5a8a },
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
        playerSprites: Phaser.GameObjects.Image[] = []
        npcContainers: Map<string, Phaser.GameObjects.Container> = new Map()
        cursors!: Phaser.Types.Input.Keyboard.CursorKeys
        wasd!: any
        eKey!: Phaser.Input.Keyboard.Key
        nearbyNpc: string | null = null
        hintContainer!: Phaser.GameObjects.Container
        moveDir = { x: 0, y: 0 }
        facing = 'down'
        walkFrame = 0
        walkTimer = 0
        joystick = { active: false, x0: 0, y0: 0, cx: 0, cy: 0 }
        jBase!: Phaser.GameObjects.Arc
        jThumb!: Phaser.GameObjects.Arc
        isMobile = window.innerWidth < 768
        WORLD_W = 800
        WORLD_H = 600

        constructor() { super({ key: 'TownScene' }) }

        makeCharTex(key: string, bodyColor: number, hairColor: number, shirtColor: number, pantsColor: number, facing: string = 'down', frame: number = 0) {
          const g = this.add.graphics()
          const W = 20, H = 30

          // Shadow
          g.fillStyle(0x000000, 0.25)
          g.fillEllipse(W/2, H + 2, W * 0.8, 5)

          // Legs (animated)
          g.fillStyle(pantsColor)
          const legOff = frame === 1 ? 2 : frame === 3 ? -2 : 0
          g.fillRect(W/2 - 6, H - 8, 5, 9 + legOff)
          g.fillRect(W/2 + 1, H - 8, 5, 9 - legOff)

          // Shoes
          g.fillStyle(0x2a1a0a)
          g.fillRect(W/2 - 7, H + 1 + legOff, 6, 3)
          g.fillRect(W/2 + 0, H + 1 - legOff, 6, 3)

          // Body/shirt
          g.fillStyle(shirtColor)
          g.fillRoundedRect(W/2 - 7, H - 18, 14, 11, 2)

          // Arms
          g.fillStyle(shirtColor)
          g.fillRect(W/2 - 11, H - 17, 4, 8)
          g.fillRect(W/2 + 7, H - 17, 4, 8)

          // Skin hands
          g.fillStyle(bodyColor)
          g.fillCircle(W/2 - 9, H - 9, 2.5)
          g.fillCircle(W/2 + 9, H - 9, 2.5)

          // Neck
          g.fillStyle(bodyColor)
          g.fillRect(W/2 - 2, H - 21, 4, 4)

          // Head
          g.fillStyle(bodyColor)
          g.fillRoundedRect(W/2 - 6, H - 30, 12, 11, 3)

          // Eyes
          g.fillStyle(0x1a1a2a)
          if (facing !== 'up') {
            g.fillCircle(W/2 - 2, H - 22, 1.2)
            g.fillCircle(W/2 + 2, H - 22, 1.2)
          }

          // Hair
          g.fillStyle(hairColor)
          g.fillRoundedRect(W/2 - 6, H - 30, 12, 5, { tl: 3, tr: 3, bl: 0, br: 0 })
          if (facing !== 'up') g.fillRect(W/2 - 7, H - 27, 2, 5)

          g.generateTexture(key, W + 4, H + 6)
          g.destroy()
        }

        buildingTex(key: string, w: number, h: number, wallColor: number, roofColor: number, label: string) {
          const g = this.add.graphics()

          // Wall shadow
          g.fillStyle(0x000000, 0.3)
          g.fillRect(3, h / 2 + 3, w, h / 2)

          // Wall
          g.fillStyle(wallColor)
          g.fillRect(0, h / 2, w, h / 2)

          // Wall outline
          g.lineStyle(1.5, 0x000000, 0.5)
          g.strokeRect(0, h / 2, w, h / 2)

          // Roof (triangle-ish using polygon)
          g.fillStyle(roofColor)
          g.fillTriangle(0, h / 2, w / 2, 0, w, h / 2)
          g.lineStyle(1.5, 0x000000, 0.4)
          g.strokeTriangle(0, h / 2, w / 2, 0, w, h / 2)

          // Door
          g.fillStyle(0x3d1f00)
          const dw = w * 0.18, dh = h * 0.25
          g.fillRoundedRect(w/2 - dw/2, h - dh, dw, dh, 2)

          // Windows
          g.fillStyle(0xffd88a, 0.85)
          g.fillRect(w * 0.15, h * 0.55, w * 0.18, h * 0.18)
          g.fillRect(w * 0.67, h * 0.55, w * 0.18, h * 0.18)

          // Window frames
          g.lineStyle(1, 0x000000, 0.6)
          g.strokeRect(w * 0.15, h * 0.55, w * 0.18, h * 0.18)
          g.strokeRect(w * 0.67, h * 0.55, w * 0.18, h * 0.18)

          g.generateTexture(key, w + 4, h + 4)
          g.destroy()
        }

        treeTex(key: string) {
          const g = this.add.graphics()
          // Shadow
          g.fillStyle(0x000000, 0.2)
          g.fillEllipse(16, 42, 20, 7)
          // Trunk
          g.fillStyle(0x5c3d1e)
          g.fillRect(12, 28, 8, 16)
          // Canopy layers
          g.fillStyle(0x2d6a1a)
          g.fillCircle(16, 22, 14)
          g.fillStyle(0x3d8a25)
          g.fillCircle(13, 18, 10)
          g.fillCircle(19, 17, 10)
          g.fillStyle(0x4da832)
          g.fillCircle(16, 14, 8)
          g.generateTexture(key, 32, 48)
          g.destroy()
        }

        waterTex(key: string, frame: number) {
          const g = this.add.graphics()
          g.fillStyle(0x1a6fa0)
          g.fillRect(0, 0, 32, 32)
          g.fillStyle(0x2a8fc0, 0.5)
          const offset = (frame * 4) % 16
          for (let i = 0; i < 3; i++) {
            g.fillRect(offset + i * 12, 8, 8, 2)
            g.fillRect(offset + i * 12 + 6, 20, 6, 2)
          }
          g.generateTexture(key, 32, 32)
          g.destroy()
        }

        grassTex() {
          const g = this.add.graphics()
          g.fillStyle(0x3a6b28)
          g.fillRect(0, 0, 32, 32)
          g.fillStyle(0x2d5a1e, 0.4)
          g.fillRect(4, 8, 3, 8); g.fillRect(16, 4, 3, 10); g.fillRect(24, 14, 3, 7)
          g.fillStyle(0x4a7a35, 0.3)
          g.fillRect(10, 18, 2, 6); g.fillRect(22, 6, 2, 5)
          g.generateTexture('grass', 32, 32)
          g.destroy()
        }

        pathTex() {
          const g = this.add.graphics()
          g.fillStyle(0x8a7055)
          g.fillRect(0, 0, 32, 32)
          g.fillStyle(0x7a6045, 0.5)
          g.fillRect(5, 10, 4, 4); g.fillRect(18, 6, 3, 3); g.fillRect(24, 20, 5, 3)
          g.fillStyle(0x9a8065, 0.3)
          g.fillRect(2, 22, 3, 3); g.fillRect(14, 16, 4, 4)
          g.generateTexture('path', 32, 32)
          g.destroy()
        }

        flowerTex() {
          const g = this.add.graphics()
          g.fillStyle(0x3a6b28)
          g.fillRect(0, 0, 16, 16)
          g.fillStyle(0xffcc00)
          g.fillCircle(4, 12, 2); g.fillCircle(12, 6, 2); g.fillCircle(8, 10, 1.5)
          g.fillStyle(0xff6688)
          g.fillCircle(6, 5, 2.5); g.fillCircle(13, 13, 2)
          g.generateTexture('flower', 16, 16)
          g.destroy()
        }

        preload() {}

        create() {
          const W = this.WORLD_W, H = this.WORLD_H

          // Generate textures
          this.grassTex()
          this.pathTex()
          this.flowerTex()
          this.waterTex('water0', 0)
          this.waterTex('water1', 1)
          this.waterTex('water2', 2)
          this.treeTex('tree')

          // Buildings
          this.buildingTex('bld_bakery', 100, 80, 0xd4a870, 0xa03030, 'Bakery')
          this.buildingTex('bld_forge', 90, 75, 0x7a6050, 0x444444, 'Forge')
          this.buildingTex('bld_cottage', 80, 70, 0x8a9a70, 0x4a6a30, 'Cottage')
          this.buildingTex('bld_hall', 130, 85, 0xd4c090, 0x8a5020, 'Town Hall')
          this.buildingTex('bld_library', 110, 78, 0x8090b0, 0x405080, 'Library')

          // Character textures (4 walk frames × 4 directions = more but simplified to down)
          this.makeCharTex('player_idle', 0xffe0b2, 0x5a3a10, 0x3a5a8a, 0x2a3a6a, 'down', 0)
          this.makeCharTex('player_walk1', 0xffe0b2, 0x5a3a10, 0x3a5a8a, 0x2a3a6a, 'down', 1)
          this.makeCharTex('player_walk2', 0xffe0b2, 0x5a3a10, 0x3a5a8a, 0x2a3a6a, 'down', 3)

          Object.entries(NPC_COLORS).forEach(([id, c]) => {
            this.makeCharTex(`npc_${id}_idle`, c.body, c.hair, c.shirt, 0x2a3a5a, 'down', 0)
            this.makeCharTex(`npc_${id}_walk1`, c.body, c.hair, c.shirt, 0x2a3a5a, 'down', 1)
          })

          // ── Tile world ──
          const TW = 32
          const cols = Math.ceil(W / TW) + 1
          const rows = Math.ceil(H / TW) + 1

          // Grass base
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              this.add.image(c * TW + TW/2, r * TW + TW/2, 'grass').setDisplaySize(TW, TW)
            }
          }

          // Paths (cross shape through center)
          const cx = W / 2, cy = H / 2
          for (let c = 0; c < cols; c++) {
            this.add.image(c * TW + TW/2, cy, 'path').setDisplaySize(TW, TW)
          }
          for (let r = 0; r < rows; r++) {
            this.add.image(cx, r * TW + TW/2, 'path').setDisplaySize(TW, TW)
          }

          // Flowers scattered
          const flowerSpots = [[80,80],[160,350],[500,480],[680,120],[300,50],[720,300],[50,500]]
          flowerSpots.forEach(([fx, fy]) => {
            this.add.image(fx, fy, 'flower').setDisplaySize(16, 16)
          })

          // Small pond (top right area)
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
              this.add.image(650 + i * 32, 290 + j * 32, 'water0').setDisplaySize(32, 32)
            }
          }

          // Animated water
          this.time.addEvent({
            delay: 600, loop: true,
            callback: () => {
              this.walkFrame = (this.walkFrame + 1) % 3
            }
          })

          // ── Buildings ──
          const buildings = [
            { key: 'bld_bakery',  x: 200, y: 160, w: 104, h: 84, label: "Eleanor's Bakery" },
            { key: 'bld_forge',   x: 600, y: 175, w: 94,  h: 79, label: "Silas's Forge" },
            { key: 'bld_cottage', x: 110, y: 410, w: 84,  h: 74, label: "Maeve's Cottage" },
            { key: 'bld_hall',    x: 400, y: 110, w: 134, h: 89, label: "Town Hall" },
            { key: 'bld_library', x: 670, y: 370, w: 114, h: 82, label: "Library" },
          ]

          buildings.forEach(b => {
            const img = this.add.image(b.x, b.y, b.key).setDisplaySize(b.w, b.h)
            img.setDepth(b.y)
            const lbl = this.add.text(b.x, b.y + b.h/2 - 2, b.label, {
              fontSize: '8px', color: '#c9a84c', fontFamily: 'Inter, sans-serif',
              stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5, 0).setDepth(b.y + 1)
          })

          // ── Trees ──
          const treeSpots = [[55,55],[745,55],[55,540],[745,540],[55,280],[745,280],[370,480],[500,50]]
          treeSpots.forEach(([tx, ty]) => {
            this.add.image(tx, ty, 'tree').setDisplaySize(36, 52).setDepth(ty + 26)
          })

          // ── NPCs ──
          npcs.forEach(npc => {
            const pos = NPC_POSITIONS[npc.id] || { x: 300, y: 300 }
            const container = this.add.container(pos.x, pos.y)

            const sprite = this.add.image(0, 0, `npc_${npc.id}_idle`).setDisplaySize(22, 32)
            const nameTag = this.add.text(0, -28, npc.name, {
              fontSize: '9px', color: '#f5f0e8', fontFamily: 'Inter, sans-serif',
              fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
            }).setOrigin(0.5)
            const roleTag = this.add.text(0, -19, npc.role, {
              fontSize: '7px', color: '#c9a84c', fontFamily: 'Inter, sans-serif',
              stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5)

            container.add([sprite, nameTag, roleTag])
            container.setDepth(pos.y)
            container.setSize(30, 50)
            container.setInteractive()
            container.on('pointerdown', () => onNpcInteract(npc))
            container.setData('sprite', sprite)
            container.setData('npcId', npc.id)

            // Idle float
            this.tweens.add({
              targets: [nameTag, roleTag],
              y: `+=3`,
              duration: 1400 + Math.random() * 600,
              yoyo: true, repeat: -1, ease: 'Sine.inOut',
              delay: Math.random() * 1000,
            })

            this.npcContainers.set(npc.id, container)
          })

          // ── Player ──
          const sx = character.position?.x ?? W / 2
          const sy = character.position?.y ?? H / 2
          const pSprite = this.add.image(0, 0, 'player_idle').setDisplaySize(22, 32)
          const pName = this.add.text(0, -28, character.name, {
            fontSize: '9px', fontStyle: 'bold', color: '#e8c97a',
            fontFamily: 'Inter, sans-serif', stroke: '#000000', strokeThickness: 3,
          }).setOrigin(0.5)

          this.player = this.add.container(sx, sy, [pSprite, pName])
          this.player.setDepth(sy)
          this.player.setData('sprite', pSprite)
          this.playerSprites = [pSprite]

          // ── Camera ──
          this.cameras.main.setBounds(0, 0, W, H)
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
          this.cameras.main.setZoom(this.isMobile ? 1.6 : 1.3)

          // ── Vignette ──
          const vign = this.add.graphics()
          vign.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.6, 0.6, 0, 0)
          vign.fillRect(0, 0, W, H * 0.2)
          vign.setScrollFactor(0).setDepth(9990)

          // ── Interaction hint ──
          this.hintContainer = this.add.container(0, 0)
          const hintBg = this.add.graphics()
          hintBg.fillStyle(0x000000, 0.75)
          hintBg.fillRoundedRect(-36, -10, 72, 20, 5)
          hintBg.lineStyle(1, 0xc9a84c, 0.6)
          hintBg.strokeRoundedRect(-36, -10, 72, 20, 5)
          const hintText = this.add.text(0, 0, this.isMobile ? 'Tap to talk' : '[E] Talk', {
            fontSize: '8px', color: '#c9a84c', fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
          }).setOrigin(0.5)
          this.hintContainer.add([hintBg, hintText])
          this.hintContainer.setVisible(false).setDepth(9980)

          // ── Input ──
          this.cursors = this.input.keyboard!.createCursorKeys()
          this.wasd = this.input.keyboard!.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' })
          this.eKey = this.input.keyboard!.addKey('E')

          // ── Mobile joystick ──
          if (this.isMobile) {
            const CH = this.scale.height
            this.jBase = this.add.circle(70, CH - 90, 44, 0x000000, 0.45)
              .setStrokeStyle(1.5, 0xc9a84c, 0.4).setScrollFactor(0).setDepth(9995)
            this.jThumb = this.add.circle(70, CH - 90, 18, 0xc9a84c, 0.55)
              .setScrollFactor(0).setDepth(9996)

            this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
              if (p.x < 160) {
                this.joystick = { active: true, x0: p.x, y0: p.y, cx: p.x, cy: p.y }
              }
            })
            this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
              if (this.joystick.active) { this.joystick.cx = p.x; this.joystick.cy = p.y }
            })
            this.input.on('pointerup', () => {
              this.joystick.active = false
              const CH2 = this.scale.height
              this.jThumb.setPosition(70, CH2 - 90)
              this.moveDir = { x: 0, y: 0 }
            })
          }
        }

        update(_: number, delta: number) {
          const spd = 140
          let vx = 0, vy = 0

          if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -spd
          else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = spd
          if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -spd
          else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = spd

          if (this.isMobile && this.joystick.active) {
            const dx = this.joystick.cx - this.joystick.x0
            const dy = this.joystick.cy - this.joystick.y0
            const dist = Math.sqrt(dx * dx + dy * dy)
            const max = 36
            const clamped = Math.min(dist, max)
            if (dist > 6) {
              vx = (dx / dist) * spd * (clamped / max)
              vy = (dy / dist) * spd * (clamped / max)
              const CH = this.scale.height
              this.jThumb.setPosition(70 + (dx / dist) * clamped, CH - 90 + (dy / dist) * clamped)
            }
          }

          if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

          const dt = delta / 1000
          this.player.x = Phaser.Math.Clamp(this.player.x + vx * dt, 20, this.WORLD_W - 20)
          this.player.y = Phaser.Math.Clamp(this.player.y + vy * dt, 20, this.WORLD_H - 20)
          this.player.setDepth(this.player.y)

          // Walk animation
          const moving = vx !== 0 || vy !== 0
          if (moving) {
            this.walkTimer += delta
            if (this.walkTimer > 200) {
              this.walkTimer = 0
              this.walkFrame = this.walkFrame === 1 ? 2 : 1
            }
            const sprite = this.player.getData('sprite') as Phaser.GameObjects.Image
            sprite.setTexture(this.walkFrame === 1 ? 'player_walk1' : 'player_walk2')
          } else {
            const sprite = this.player.getData('sprite') as Phaser.GameObjects.Image
            sprite.setTexture('player_idle')
            this.walkTimer = 0
          }

          // NPC walk animation
          this.npcContainers.forEach((container) => {
            const sprite = container.getData('sprite') as Phaser.GameObjects.Image
            const id = container.getData('npcId') as string
            if (moving && Math.random() < 0.002) {
              sprite.setTexture(`npc_${id}_walk1`)
              this.time.delayedCall(200, () => sprite.setTexture(`npc_${id}_idle`))
            }
          })

          // NPC proximity
          let closestId: string | null = null
          let closestDist = 75

          this.npcContainers.forEach((c, id) => {
            const dx = c.x - this.player.x
            const dy = c.y - this.player.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < closestDist) { closestDist = dist; closestId = id }
          })

          this.nearbyNpc = closestId
          if (closestId) {
            const c = this.npcContainers.get(closestId)!
            this.hintContainer.setPosition(c.x, c.y - 48).setVisible(true)
          } else {
            this.hintContainer.setVisible(false)
          }

          if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.nearbyNpc) {
            const npc = npcs.find(n => n.id === this.nearbyNpc)
            if (npc) onNpcInteract(npc)
          }
        }
      }

      const w = window.innerWidth
      const h = window.innerHeight

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: w, height: h,
        backgroundColor: '#3a6b28',
        parent: containerRef.current!,
        scene: [TownScene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { pixelArt: false, antialias: true },
      })

      gameRef.current = game
    }

    init()
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

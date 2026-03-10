'use client'

import { useEffect, useRef } from 'react'
import type { Character } from '@/lib/supabase'
import type { NpcSoul } from '@/lib/npcs'

type Props = {
  gameId: string
  character: Character
  npcs: NpcSoul[]
  onNpcInteract: (npc: NpcSoul) => void
}

// NPC positions in the world
const NPC_POSITIONS: Record<string, { x: number; y: number }> = {
  eleanor: { x: 220, y: 180 },
  silas:   { x: 580, y: 200 },
  maeve:   { x: 140, y: 380 },
  caleb:   { x: 400, y: 140 },
  ruth:    { x: 650, y: 370 },
}

export default function GameCanvas({ gameId, character, npcs, onNpcInteract }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    let game: any

    const init = async () => {
      const Phaser = (await import('phaser')).default

      // ── Scene ──
      class TownScene extends Phaser.Scene {
        player!: Phaser.GameObjects.Container
        playerBody!: Phaser.GameObjects.Rectangle
        playerLabel!: Phaser.GameObjects.Text
        npcSprites: Map<string, Phaser.GameObjects.Container> = new Map()
        cursors!: Phaser.Types.Input.Keyboard.CursorKeys
        wasd!: any
        interactKey!: Phaser.Input.Keyboard.Key
        nearbyNpc: string | null = null
        interactHint!: Phaser.GameObjects.Container
        speed = 160
        isMobile = window.innerWidth < 768
        joystick: { active: boolean; startX: number; startY: number; currentX: number; currentY: number } = {
          active: false, startX: 0, startY: 0, currentX: 0, currentY: 0
        }
        joystickBase!: Phaser.GameObjects.Arc
        joystickThumb!: Phaser.GameObjects.Arc

        constructor() { super({ key: 'TownScene' }) }

        preload() {}

        create() {
          const W = this.scale.width
          const H = this.scale.height

          // ── World background (grass) ──
          this.add.rectangle(W / 2, H / 2, W, H, 0x2d4a1e)

          // ── Paths ──
          this.add.rectangle(W / 2, H / 2, 40, H, 0x7a6545)  // vertical
          this.add.rectangle(W / 2, H / 2, W, 40, 0x7a6545)  // horizontal

          // ── Buildings ──
          const buildings = [
            { x: 200, y: 160, w: 140, h: 90, color: 0x8b5e3c, label: "Eleanor's Bakery" },
            { x: 580, y: 185, w: 120, h: 80, color: 0x5c4a3a, label: "Silas's Forge" },
            { x: 130, y: 370, w: 100, h: 80, color: 0x3a5a3c, label: "Maeve's Cottage" },
            { x: 400, y: 115, w: 160, h: 70, color: 0x6a4a2c, label: "Town Hall" },
            { x: 655, y: 360, w: 130, h: 85, color: 0x4a4a6a, label: "Library" },
            { x: 400, y: 430, w: 100, h: 70, color: 0x5a3a2c, label: "Tavern" },
          ]

          buildings.forEach(b => {
            this.add.rectangle(b.x, b.y, b.w, b.h, b.color)
            this.add.rectangle(b.x, b.y, b.w, b.h).setStrokeStyle(1, 0x000000, 0.4)
            this.add.text(b.x, b.y, b.label, {
              fontSize: '7px', color: '#f0e6d0',
              fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setAlpha(0.5)
          })

          // ── Trees ──
          const treePairs = [
            [60, 60], [720, 60], [60, 470], [720, 470],
            [60, 270], [720, 270], [300, 450], [500, 450],
          ]
          treePairs.forEach(([tx, ty]) => {
            this.add.circle(tx, ty, 18, 0x1e6b2e)
            this.add.circle(tx, ty, 18).setStrokeStyle(1, 0x155222, 0.8)
          })

          // ── NPCs ──
          npcs.forEach(npc => {
            const pos = NPC_POSITIONS[npc.id] || { x: 300, y: 300 }
            const container = this.add.container(pos.x, pos.y)

            const shadow = this.add.ellipse(0, 12, 24, 8, 0x000000, 0.3)
            const body = this.add.rectangle(0, 0, 20, 26, this.getNpcColor(npc.id))
            const head = this.add.circle(0, -18, 9, this.getNpcColor(npc.id))
            const label = this.add.text(0, 22, npc.name, {
              fontSize: '8px', color: '#c9a84c',
              fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
            }).setOrigin(0.5)
            const emoji = this.add.text(0, -18, npc.emoji, { fontSize: '10px' }).setOrigin(0.5)

            container.add([shadow, body, head, label, emoji])
            container.setSize(40, 60)
            container.setInteractive()
            container.on('pointerdown', () => onNpcInteract(npc))

            // Idle float animation
            this.tweens.add({
              targets: container,
              y: pos.y - 4,
              duration: 1200 + Math.random() * 800,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.inOut',
              delay: Math.random() * 1000,
            })

            this.npcSprites.set(npc.id, container)
          })

          // ── Player ──
          const startX = character.position?.x ?? W / 2
          const startY = character.position?.y ?? H / 2
          this.player = this.add.container(startX, startY)

          const pShadow = this.add.ellipse(0, 14, 28, 10, 0x000000, 0.35)
          this.playerBody = this.add.rectangle(0, 0, 22, 28, 0xc9a84c)
          const pHead = this.add.circle(0, -20, 10, 0xe8c97a)
          this.playerLabel = this.add.text(0, 26, character.name, {
            fontSize: '9px', color: '#ffffff',
            fontFamily: 'Inter, sans-serif', fontStyle: 'bold',
          }).setOrigin(0.5)

          this.player.add([pShadow, this.playerBody, pHead, this.playerLabel])
          this.player.setDepth(10)

          // ── Camera ──
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1)
          this.cameras.main.setBounds(0, 0, W, H)

          // ── Input ──
          this.cursors = this.input.keyboard!.createCursorKeys()
          this.wasd = this.input.keyboard!.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' })
          this.interactKey = this.input.keyboard!.addKey('E')

          // ── Interact hint ──
          this.interactHint = this.add.container(0, 0)
          const hintBg = this.add.rectangle(0, 0, 60, 18, 0x000000, 0.7).setStrokeStyle(1, 0xc9a84c, 0.6)
          const hintText = this.add.text(0, 0, this.isMobile ? 'Tap to talk' : 'E to talk', {
            fontSize: '8px', color: '#c9a84c', fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5)
          this.interactHint.add([hintBg, hintText])
          this.interactHint.setVisible(false).setDepth(20)

          // ── Mobile joystick ──
          if (this.isMobile) {
            this.joystickBase = this.add.circle(80, H - 100, 50, 0x000000, 0.4)
              .setStrokeStyle(2, 0xc9a84c, 0.4)
              .setScrollFactor(0).setDepth(30)
            this.joystickThumb = this.add.circle(80, H - 100, 22, 0xc9a84c, 0.6)
              .setScrollFactor(0).setDepth(31)

            this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              if (ptr.x < 160) {
                this.joystick.active = true
                this.joystick.startX = ptr.x
                this.joystick.startY = ptr.y
              }
            })
            this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
              if (this.joystick.active) {
                this.joystick.currentX = ptr.x
                this.joystick.currentY = ptr.y
              }
            })
            this.input.on('pointerup', () => {
              this.joystick.active = false
              this.joystickThumb.setPosition(80, H - 100)
            })
          }
        }

        getNpcColor(id: string): number {
          const colors: Record<string, number> = {
            eleanor: 0x9b5e6c, silas: 0x5c6b7a, maeve: 0x4a7a5c,
            caleb: 0x7a6b3c, ruth: 0x6b5a7a,
          }
          return colors[id] || 0x7a7a7a
        }

        update() {
          const speed = this.speed
          let vx = 0, vy = 0

          // Keyboard
          if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed
          else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed
          if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed
          else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed

          // Mobile joystick
          if (this.isMobile && this.joystick.active) {
            const dx = this.joystick.currentX - this.joystick.startX
            const dy = this.joystick.currentY - this.joystick.startY
            const dist = Math.sqrt(dx * dx + dy * dy)
            const maxDist = 40
            const clampedDist = Math.min(dist, maxDist)
            if (dist > 8) {
              vx = (dx / dist) * speed * (clampedDist / maxDist)
              vy = (dy / dist) * speed * (clampedDist / maxDist)
              const H = this.scale.height
              this.joystickThumb.setPosition(
                80 + (dx / dist) * clampedDist,
                H - 100 + (dy / dist) * clampedDist
              )
            }
          }

          // Normalize diagonal
          if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

          // Move player
          this.player.x += vx * (1 / 60)
          this.player.y += vy * (1 / 60)

          // Clamp to world
          this.player.x = Phaser.Math.Clamp(this.player.x, 20, this.scale.width - 20)
          this.player.y = Phaser.Math.Clamp(this.player.y, 20, this.scale.height - 20)

          // Player direction tint
          if (vx < 0) this.playerBody.setFillStyle(0xb8933c)
          else if (vx > 0) this.playerBody.setFillStyle(0xddb85c)
          else this.playerBody.setFillStyle(0xc9a84c)

          // Check NPC proximity
          let closestNpc: string | null = null
          let closestDist = 70

          this.npcSprites.forEach((sprite, id) => {
            const dx = sprite.x - this.player.x
            const dy = sprite.y - this.player.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < closestDist) { closestDist = dist; closestNpc = id }
          })

          this.nearbyNpc = closestNpc

          if (closestNpc) {
            const sprite = this.npcSprites.get(closestNpc)!
            this.interactHint.setPosition(sprite.x, sprite.y - 45).setVisible(true)
          } else {
            this.interactHint.setVisible(false)
          }

          // E key interact
          if (Phaser.Input.Keyboard.JustDown(this.interactKey) && this.nearbyNpc) {
            const npc = npcs.find(n => n.id === this.nearbyNpc)
            if (npc) onNpcInteract(npc)
          }
        }
      }

      const w = containerRef.current?.clientWidth || window.innerWidth
      const h = containerRef.current?.clientHeight || window.innerHeight

      game = new Phaser.Game({
        type: Phaser.AUTO,
        width: w,
        height: h,
        backgroundColor: '#2d4a1e',
        parent: containerRef.current!,
        scene: [TownScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: w,
          height: h,
        },
        render: { pixelArt: true, antialias: false },
      })

      gameRef.current = game
    }

    init()
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  }, [])

  return <div ref={containerRef} className="w-full h-full" />
}

'use client'

import { useEffect, useRef } from 'react'
import type { BuildingEntry } from './GameCanvas'
import type { NpcSoul } from '@/lib/npcs'

// Interior tile index map  (same Kenney tileset)
const F = {
  FLOOR:    108,  // grey stone floor
  FLOOR2:   109,
  FLOOR3:   120,
  FLOOR4:   121,
  WALL_T:    49,  // blue-grey roof tile repurposed as interior top wall
  WALL_L:    60,
  WALL_R:    62,
  RUG_TL:    48, RUG_TR: 50,
  RUG_BL:    60, RUG_BR: 62,
  TABLE:     94,  // hay bale -> table prop
  BARREL:   107,
  SIGN:      83,
  WELL:      92,
  CHEST:     94,
}

// Per-building 10×8 interior layouts
const INTERIORS: Record<string, { map: number[][]; name: string; color: string }> = {
  bakery: {
    name: "Eleanor's Bakery", color: '#3d1500',
    map: [
      [49,49,49,49,49,49,49,49,49,49],
      [60,108,109,108,109,108,109,108,109,62],
      [60,120,121,120,121,107,120,121,120,62],
      [60,108,109,108,109,120,108,109,108,62],
      [60,120,94,120,121,121,94,120,121,62],
      [60,108,109,108,108,108,109,108,109,62],
      [60,120,121,120,121,120,121,120,121,62],
      [60,108,74,108,108,108,74,108,108,62],  // 74 = door tile at bottom
    ],
  },
  townhall: {
    name: 'Town Hall', color: '#1a0e00',
    map: [
      [49,49,49,49,49,49,49,49,49,49],
      [60,108,109,108,109,108,109,108,109,62],
      [60,92,109,108,109,108,109,108,92,62],
      [60,108,109,108,121,121,109,108,109,62],
      [60,120,121,120,121,121,121,120,121,62],
      [60,108,109,108,121,121,109,108,109,62],
      [60,120,83,120,121,120,83,120,121,62],
      [60,108,78,108,108,108,78,108,108,62],
    ],
  },
  cottage: {
    name: "Maeve's Cottage", color: '#0a0a1a',
    map: [
      [49,49,49,49,49,49,49,49,49,49],
      [60,108,109,108,109,108,109,108,109,62],
      [60,120,29,120,121,120,29,120,121,62],
      [60,108,109,108,108,108,109,108,109,62],
      [60,120,121,120,94,94,121,120,121,62],
      [60,108,109,108,108,108,109,108,109,62],
      [60,120,121,120,121,120,121,120,121,62],
      [60,108,78,108,108,108,78,108,108,62],
    ],
  },
  tavern: {
    name: 'Tavern', color: '#1a0800',
    map: [
      [49,49,49,49,49,49,49,49,49,49],
      [60,108,109,108,109,108,109,108,109,62],
      [60,107,109,108,109,108,109,108,107,62],
      [60,108,94,108,109,108,94,108,109,62],
      [60,120,94,120,121,121,94,120,121,62],
      [60,108,109,108,108,108,109,108,109,62],
      [60,120,121,120,121,120,121,120,121,62],
      [60,108,74,108,108,108,74,108,108,62],
    ],
  },
  shop: {
    name: 'General Store', color: '#0d1200',
    map: [
      [49,49,49,49,49,49,49,49,49,49],
      [60,108,109,108,109,108,109,108,109,62],
      [60,107,107,107,109,108,107,107,107,62],
      [60,108,83,108,109,108,83,108,109,62],
      [60,120,121,120,121,121,121,120,121,62],
      [60,108,109,108,108,108,109,108,109,62],
      [60,120,121,120,121,120,121,120,121,62],
      [60,108,74,108,108,108,74,108,108,62],
    ],
  },
  library: {
    name: 'Library', color: '#0a0818',
    map: [
      [49,49,49,49,49,49,49,49,49,49],
      [60,108,109,108,109,108,109,108,109,62],
      [60,83,109,108,109,108,109,108,83,62],
      [60,83,109,108,109,108,109,108,83,62],
      [60,120,121,120,121,121,121,120,121,62],
      [60,108,109,108,92,108,109,108,109,62],
      [60,120,121,120,121,120,121,120,121,62],
      [60,108,78,108,108,108,78,108,108,62],
    ],
  },
}

type Props = {
  building: BuildingEntry
  characterName: string
  npc?: NpcSoul
  onExit: () => void
  onNpcInteract?: (npc: NpcSoul) => void
}

export default function BuildingInterior({ building, characterName, npc, onExit, onNpcInteract }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const init = async () => {
      const Phaser = (await import('phaser')).default
      const TILE = 16, ZOOM = 4  // slightly bigger zoom for interiors
      const interior = INTERIORS[building.id] || INTERIORS['tavern']

      class InteriorScene extends Phaser.Scene {
        player!: Phaser.Physics.Arcade.Image
        playerVis!: Phaser.GameObjects.Container
        npcVis?: Phaser.GameObjects.Container
        cursors!: Phaser.Types.Input.Keyboard.CursorKeys
        wasd!: any
        exitHint!: Phaser.GameObjects.Container
        npcHint!: Phaser.GameObjects.Container
        nearNpc = false
        joystick = { on: false, x0: 0, y0: 0, cx: 0, cy: 0 }
        jBase!: Phaser.GameObjects.Arc; jThumb!: Phaser.GameObjects.Arc

        constructor() { super({ key: 'InteriorScene' }) }

        makeCharSprite(key: string, body: number, hair: number, shirt: number) {
          const PX = 2, W = 8*PX, H = 14*PX
          const g = this.add.graphics()
          g.fillStyle(0x000000, 0.2); g.fillEllipse(W/2, H+PX, W*0.7, PX*2)
          g.fillStyle(0x2a1a0e); g.fillRect(PX, H-2*PX, 2*PX, PX); g.fillRect(4*PX, H-2*PX, 2*PX, PX)
          g.fillStyle(0x2a3550); g.fillRect(PX, H-5*PX, 2*PX, 3*PX); g.fillRect(4*PX, H-5*PX, 2*PX, 3*PX)
          g.fillStyle(shirt); g.fillRect(PX, H-9*PX, 6*PX, 4*PX); g.fillRect(0,H-9*PX,PX,3*PX); g.fillRect(7*PX,H-9*PX,PX,3*PX)
          g.fillStyle(body); g.fillRect(2*PX,H-14*PX,5*PX,5*PX); g.fillRect(3*PX,H-10*PX,2*PX,PX)
          g.fillStyle(0x1a1a2e); g.fillRect(3*PX,H-12*PX,PX,PX); g.fillRect(5*PX,H-12*PX,PX,PX)
          g.fillStyle(hair); g.fillRect(2*PX,H-14*PX,5*PX,2*PX); g.fillRect(PX,H-13*PX,PX,2*PX)
          g.generateTexture(key, W+PX, H+PX*2); g.destroy()
        }

        preload() { this.load.image('tiles', '/assets/tilemap.png') }

        create() {
          const isMobile = window.innerWidth < 768
          const textRes = Math.ceil(window.devicePixelRatio * 2)
          const mapW = interior.map[0].length
          const mapH = interior.map.length

          // Tilemap
          const map = this.make.tilemap({ data: interior.map, tileWidth: TILE, tileHeight: TILE })
          const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!
          const layer = map.createLayer(0, tileset, 0, 0)!
          layer.setScale(ZOOM)

          // Mark solid: top wall + side walls + furniture
          layer.forEachTile(tile => {
            const solid = [49,60,62,92,83,107,94,29].includes(tile.index)
            if (solid) tile.setCollision(true)
          })

          // Sprites
          this.makeCharSprite('pc', 0xffe0b0, 0x5a3a10, 0x3a5a8a)
          if (npc) this.makeCharSprite('npc', 0xfde8cc, 0x6b3515, 0xe07878)

          // Player — starts near bottom center (door)
          const psx = (mapW / 2) * TILE * ZOOM
          const psy = (mapH - 1.5) * TILE * ZOOM
          this.player = this.physics.add.image(psx, psy, '__DEFAULT')
            .setVisible(false).setCollideWorldBounds(true)
            .setSize(TILE * ZOOM * 0.4, TILE * ZOOM * 0.3)
          this.physics.add.collider(this.player, layer)

          const pSpr = this.add.image(0, 0, 'pc').setScale(ZOOM)
          const pName = this.add.text(0, -28, characterName, {
            fontSize: '9px', fontStyle: 'bold', color: '#e8c97a',
            stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5).setResolution(textRes)
          this.playerVis = this.add.container(psx, psy, [pSpr, pName]).setDepth(psy)

          // NPC inside building
          if (npc) {
            const nx = (mapW / 2) * TILE * ZOOM
            const ny = 2.5 * TILE * ZOOM
            const nSpr = this.add.image(0, 0, 'npc').setScale(ZOOM)
            const nName = this.add.text(0, -28, npc.name, {
              fontSize: '9px', fontStyle: 'bold', color: '#f5f0e8',
              stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setResolution(textRes)
            const nRole = this.add.text(0, -18, npc.role, {
              fontSize: '8px', color: '#c9a84c',
              stroke: '#000000', strokeThickness: 2, fontFamily: 'Inter, sans-serif',
            }).setOrigin(0.5).setResolution(textRes)
            this.npcVis = this.add.container(nx, ny, [nSpr, nName, nRole]).setDepth(ny + 10)
            this.npcVis.setSize(TILE * ZOOM, TILE * ZOOM * 2).setInteractive()
            this.npcVis.on('pointerdown', () => npc && onNpcInteract?.(npc))
          }

          // Camera
          this.cameras.main.setBounds(0, 0, mapW * TILE * ZOOM, mapH * TILE * ZOOM)
          this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

          // Exit hint at bottom
          this.exitHint = this.add.container(0, 0).setScrollFactor(0).setDepth(9990)
          const eBg = this.add.graphics()
          eBg.fillStyle(0x111009, 0.85); eBg.fillRoundedRect(-55, -14, 110, 28, 6)
          eBg.lineStyle(1.5, 0xc9a84c, 0.8); eBg.strokeRoundedRect(-55, -14, 110, 28, 6)
          const eTxt = this.add.text(0, 0, isMobile ? 'Walk to door — Exit' : '[E] Exit building', {
            fontSize: '9px', fontStyle: 'bold', color: '#c9a84c', fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5).setResolution(textRes)
          this.exitHint.add([eBg, eTxt])
          this.exitHint.setPosition(this.scale.width / 2, this.scale.height - 36).setVisible(false)

          // NPC hint
          this.npcHint = this.add.container(0, 0).setDepth(9985)
          const nBg = this.add.graphics()
          nBg.fillStyle(0x111009, 0.85); nBg.fillRoundedRect(-40, -14, 80, 28, 6)
          nBg.lineStyle(1.5, 0xc9a84c, 0.8); nBg.strokeRoundedRect(-40, -14, 80, 28, 6)
          const nTxt = this.add.text(0, 0, isMobile ? 'Tap to talk' : '[E] Talk', {
            fontSize: '9px', fontStyle: 'bold', color: '#c9a84c', fontFamily: 'Inter, sans-serif',
          }).setOrigin(0.5).setResolution(textRes)
          this.npcHint.add([nBg, nTxt]); this.npcHint.setVisible(false)

          // Input
          this.input.keyboard!.disableGlobalCapture()
          this.cursors = this.input.keyboard!.createCursorKeys()
          this.wasd = this.input.keyboard!.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' })

          this.input.keyboard!.on('keydown-E', () => {
            if (!this.input.keyboard!.enabled) return
            if (this.nearNpc && npc) { onNpcInteract?.(npc); return }
            // Near bottom door row
            const wy = this.player.y / (TILE * ZOOM)
            if (wy >= mapH - 1.8) onExit()
          })

          const onFI = (e: FocusEvent) => { const t = (e.target as HTMLElement)?.tagName; if (t === 'INPUT' || t === 'TEXTAREA') this.input.keyboard!.enabled = false }
          const onFO = (e: FocusEvent) => { const t = (e.target as HTMLElement)?.tagName; if (t === 'INPUT' || t === 'TEXTAREA') this.input.keyboard!.enabled = true }
          document.addEventListener('focusin', onFI); document.addEventListener('focusout', onFO)
          this.events.once('destroy', () => { document.removeEventListener('focusin', onFI); document.removeEventListener('focusout', onFO) })

          if (isMobile) {
            const CH = this.scale.height
            this.jBase  = this.add.circle(70, CH-90, 45, 0x000000, 0.5).setStrokeStyle(2, 0xc9a84c, 0.4).setScrollFactor(0).setDepth(9995)
            this.jThumb = this.add.circle(70, CH-90, 20, 0xc9a84c, 0.6).setScrollFactor(0).setDepth(9996)
            this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.x < 160) this.joystick = { on: true, x0: p.x, y0: p.y, cx: p.x, cy: p.y } })
            this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.joystick.on) { this.joystick.cx = p.x; this.joystick.cy = p.y } })
            this.input.on('pointerup',   () => { this.joystick.on = false; this.jThumb?.setPosition(70, this.scale.height - 90) })
          }
        }

        update() {
          const SPD = 160, TILE = 16, ZOOM = 4
          let vx = 0, vy = 0
          if ((this.wasd as any).left.isDown  || this.cursors.left.isDown)  vx = -SPD
          else if ((this.wasd as any).right.isDown || this.cursors.right.isDown) vx = SPD
          if ((this.wasd as any).up.isDown    || this.cursors.up.isDown)    vy = -SPD
          else if ((this.wasd as any).down.isDown  || this.cursors.down.isDown)  vy = SPD
          if (this.joystick?.on) {
            const dx = this.joystick.cx - this.joystick.x0
            const dy = this.joystick.cy - this.joystick.y0
            const dist = Math.sqrt(dx*dx+dy*dy)
            if (dist > 6) { const cl = Math.min(dist,36); vx=(dx/dist)*SPD*(cl/36); vy=(dy/dist)*SPD*(cl/36); this.jThumb?.setPosition(70+(dx/dist)*cl, this.scale.height-90+(dy/dist)*cl) }
          }
          if (vx!==0&&vy!==0){vx*=0.707;vy*=0.707}
          this.player.setVelocity(vx, vy)
          this.playerVis.setPosition(this.player.x, this.player.y).setDepth(this.player.y)

          // Near door (bottom)
          const mapH = interior.map.length
          const nearDoor = this.player.y / (TILE * ZOOM) >= mapH - 1.9
          this.exitHint.setVisible(nearDoor)
          if (nearDoor && vx === 0 && vy === 0) {} // idle at door

          // Auto-exit when walking into door tile at very bottom
          if (this.player.y / (TILE * ZOOM) >= mapH - 0.9) onExit()

          // NPC proximity inside
          if (this.npcVis) {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npcVis.x, this.npcVis.y)
            this.nearNpc = d < 70
            if (this.nearNpc) {
              this.npcHint.setPosition(this.npcVis.x, this.npcVis.y - 50).setVisible(true)
            } else {
              this.npcHint.setVisible(false)
            }
          }
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: window.innerWidth, height: window.innerHeight,
        parent: containerRef.current!,
        backgroundColor: interior.color,
        scene: [InteriorScene],
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        render: { antialias: false, pixelArt: true, roundPixels: true },
        physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      })
      gameRef.current = game
    }

    init()
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  }, [building.id])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

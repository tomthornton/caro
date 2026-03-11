/**
 * MainScene — the primary game world scene for Caro.
 *
 * This is a standalone Phaser.Scene subclass with no React imports or
 * closure dependencies. All data comes from `this.registry` (set by
 * GameCanvas.tsx before/after scene start) and all outbound events
 * fire via `this.game.events.emit(GameEvents.*, payload)`.
 *
 * Compatible with Phaser Editor 2D — open this file in the editor
 * to visually arrange scene objects.
 */

import * as Phaser from 'phaser'
import type { NpcSoul } from '../lib/npcs'
import type { Character } from '../lib/supabase'
import { NPC_PALETTES, generateSpriteCanvas } from '../lib/char-sprites'
import { NPC_SCHEDULE, getCurrentEntry } from '../lib/npc-schedule'
import {
  TILE, ZOOM, COLS, ROWS, FW, FH,
  NPC_SPEED, PLAYER_SPEED,
  SOLID_TILES, MAP_DATA, DOORS, SPECIALS,
  type BuildingEntry,
} from '../game/GameConfig'
import { GameEvents } from '../game/GameEvents'
import type { PlayerPresence } from '../lib/multiplayer'

type NpcLabels = {
  name:  Phaser.GameObjects.Text
  role:  Phaser.GameObjects.Text
  badge: Phaser.GameObjects.Text
}

type Joystick = { on: boolean; x0: number; y0: number; cx: number; cy: number }

export class MainScene extends Phaser.Scene {
  // ── Player ──────────────────────────────────────────────────────────────
  playerBody!: Phaser.Physics.Arcade.Image
  playerSpr!:  Phaser.GameObjects.Sprite
  playerName!: Phaser.GameObjects.Text

  // ── NPCs ────────────────────────────────────────────────────────────────
  npcSprites: Map<string, Phaser.GameObjects.Sprite>                 = new Map()
  npcLabels:  Map<string, NpcLabels>                                  = new Map()
  npcFacing:  Map<string, string>                                     = new Map()
  npcTweens:  Map<string, Phaser.Tweens.Tween>                       = new Map()

  // ── Input ────────────────────────────────────────────────────────────────
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  wasd!:    Record<string, Phaser.Input.Keyboard.Key>
  joystick: Joystick = { on: false, x0: 0, y0: 0, cx: 0, cy: 0 }
  jBase?:   Phaser.GameObjects.Arc
  jThumb?:  Phaser.GameObjects.Arc

  // ── HUD ──────────────────────────────────────────────────────────────────
  hint!:     Phaser.GameObjects.Container
  hintText!: Phaser.GameObjects.Text

  // ── Proximity state ──────────────────────────────────────────────────────
  nearbyNpc:      string | null       = null
  nearbyDoor:     BuildingEntry | null = null
  prevNearbyDoor: BuildingEntry | null = null
  nearbySpecial:  string | null       = null

  // ── Clock ────────────────────────────────────────────────────────────────
  gameHour   = 8
  gameMinute = 0
  clockAcc   = 0

  // ── Persistence ──────────────────────────────────────────────────────────
  positionSaveAcc = 0

  // ── Multiplayer ───────────────────────────────────────────────────────────
  otherPlayerSprites: Map<string, Phaser.GameObjects.Sprite>   = new Map()
  otherPlayerNames:   Map<string, Phaser.GameObjects.Text>     = new Map()
  otherPlayerTargets: Map<string, { x: number; y: number }>    = new Map()

  constructor() {
    super({ key: 'MainScene' })

    /* START-USER-CTR-CODE */
    /* END-USER-CTR-CODE */
  }

  /* START OF COMPILED CODE */
  editorCreate(): void {
    this.events.emit('scene-awake')
  }
  /* END OF COMPILED CODE */

  // ── Preload ──────────────────────────────────────────────────────────────

  preload() {
    this.load.image('tiles', '/assets/tilemap.png')
  }

  // ── Create ───────────────────────────────────────────────────────────────

  create() {
    const npcs      = this.registry.get('npcs')      as NpcSoul[]
    const character = this.registry.get('character') as Character
    const textRes   = Math.ceil(window.devicePixelRatio * 2)
    const isMobile  = window.innerWidth < 768

    // ── Restore saved game clock ──────────────────────────────────────────
    this.gameHour   = this.registry.get('initialHour')   ?? 8
    this.gameMinute = this.registry.get('initialMinute') ?? 0

    // ── Sprite sheets (synchronous — HTMLCanvasElement) ─────────────────
    const allKeys = [...npcs.map(n => n.id), 'player']
    allKeys.forEach(key => {
      if (this.textures.exists(key)) return
      const palette = NPC_PALETTES[key] ?? NPC_PALETTES.player
      const canvas  = generateSpriteCanvas(palette)
      this.textures.addSpriteSheet(key, canvas as any, { frameWidth: FW, frameHeight: FH })
    })

    // ── Animations ────────────────────────────────────────────────────────
    allKeys.forEach(key => this._setupAnims(key))

    // ── Tilemap ───────────────────────────────────────────────────────────
    const map     = this.make.tilemap({ data: MAP_DATA, tileWidth: TILE, tileHeight: TILE })
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!
    const layer   = map.createLayer(0, tileset, 0, 0)!
    layer.setScale(ZOOM).setDepth(0)
    layer.forEachTile(tile => { if (SOLID_TILES.has(tile.index)) tile.setCollision(true) })

    // ── NPCs ──────────────────────────────────────────────────────────────
    npcs.forEach(npc => {
      const sched      = NPC_SCHEDULE[npc.id]
      const startEntry = sched ? sched[0] : { tx: 6, ty: 9 }
      const wx = startEntry.tx * TILE * ZOOM + (TILE * ZOOM) / 2
      const wy = startEntry.ty * TILE * ZOOM + (TILE * ZOOM) / 2

      const spr = this.add.sprite(wx, wy, npc.id, 0).setScale(ZOOM).setDepth(wy)
      spr.setInteractive()
      spr.on('pointerdown', () => this.game.events.emit(GameEvents.NPC_INTERACT, npc.id))

      this.npcSprites.set(npc.id, spr)
      this.npcFacing.set(npc.id, 'down')

      const nameTag = this.add.text(wx, wy - 36, npc.name, {
        fontSize: '11px', fontStyle: 'bold', color: '#f5f0e8',
        stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
      }).setOrigin(0.5).setResolution(textRes).setDepth(wy + 20)

      const roleTag = this.add.text(wx, wy - 24, npc.role, {
        fontSize: '9px', color: '#c9a84c',
        stroke: '#000000', strokeThickness: 2, fontFamily: 'Inter, sans-serif',
      }).setOrigin(0.5).setResolution(textRes).setDepth(wy + 20)

      const badge = this.add.text(wx, wy - 50, '', {
        fontSize: '8px', color: '#a0d890',
        stroke: '#000000', strokeThickness: 2, fontFamily: 'Inter, sans-serif',
      }).setOrigin(0.5).setResolution(textRes).setDepth(wy + 20).setVisible(false)

      this.npcLabels.set(npc.id, { name: nameTag, role: roleTag, badge })
    })

    // ── Player ────────────────────────────────────────────────────────────
    const defaultX = 9 * TILE * ZOOM + (TILE * ZOOM) / 2
    const defaultY = 9 * TILE * ZOOM + (TILE * ZOOM) / 2
    const sx = this.registry.get('initialX') ?? defaultX
    const sy = this.registry.get('initialY') ?? defaultY

    this.playerBody = this.physics.add.image(sx, sy, '__DEFAULT')
      .setVisible(false)
      .setCollideWorldBounds(true)
      .setSize(TILE * ZOOM * 0.45, TILE * ZOOM * 0.3)
    this.physics.add.collider(this.playerBody, layer)

    this.playerSpr = this.add.sprite(sx, sy, 'player', 0)
      .setScale(ZOOM).setDepth(sy)

    this.playerName = this.add.text(sx, sy - 36, character?.name ?? '', {
      fontSize: '11px', fontStyle: 'bold', color: '#e8c97a',
      stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
    }).setOrigin(0.5).setResolution(textRes).setDepth(sy + 20)

    // ── Camera ────────────────────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, COLS * TILE * ZOOM, ROWS * TILE * ZOOM)
    this.cameras.main.startFollow(this.playerBody, true, 0.1, 0.1)

    // Vignette
    const { width: sw, height: sh } = this.scale
    const v1 = this.add.graphics().setScrollFactor(0).setDepth(9990)
    v1.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0)
    v1.fillRect(0, 0, sw, sh * 0.1)
    const v2 = this.add.graphics().setScrollFactor(0).setDepth(9990)
    v2.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.45, 0.45)
    v2.fillRect(0, sh * 0.9, sw, sh * 0.1)

    // ── Hint bubble ───────────────────────────────────────────────────────
    this.hint = this.add.container(0, 0).setVisible(false).setDepth(9985)
    const hBg = this.add.graphics()
    hBg.fillStyle(0x111009, 0.88); hBg.fillRoundedRect(-52, -16, 104, 32, 8)
    hBg.lineStyle(1.5, 0xc9a84c, 0.8); hBg.strokeRoundedRect(-52, -16, 104, 32, 8)
    this.hintText = this.add.text(0, 0, '', {
      fontSize: '11px', fontStyle: 'bold', color: '#c9a84c', fontFamily: 'Inter, sans-serif',
    }).setOrigin(0.5).setResolution(textRes)
    this.hint.add([hBg, this.hintText])
    this.hint.setSize(130, 44).setInteractive({ useHandCursor: true })
    this.hint.on('pointerdown', (ptr: any) => {
      ptr?.event?.stopPropagation?.()
      if (this.nearbySpecial) { this.game.events.emit(GameEvents.SPECIAL_ACTION, this.nearbySpecial); return }
      if (this.nearbyDoor)    { this.game.events.emit(GameEvents.ENTER_BUILDING, this.nearbyDoor); return }
      if (this.nearbyNpc)     { this.game.events.emit(GameEvents.NPC_INTERACT, this.nearbyNpc) }
    })

    // ── Keyboard input ────────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd    = this.input.keyboard!.addKeys({ up:'W', down:'S', left:'A', right:'D' }) as any
    this.input.keyboard!.enabled = true

    this.input.keyboard!.on('keydown-E', (e: KeyboardEvent) => {
      e.stopPropagation()
      if (!this.input.keyboard!.enabled) return
      if (this.nearbySpecial) { this.game.events.emit(GameEvents.SPECIAL_ACTION, this.nearbySpecial); return }
      if (this.nearbyDoor)    { this.game.events.emit(GameEvents.ENTER_BUILDING, this.nearbyDoor); return }
      if (this.nearbyNpc)     { this.game.events.emit(GameEvents.NPC_INTERACT, this.nearbyNpc) }
    })

    // Disable movement while typing in React inputs
    const onFocusIn  = (e: FocusEvent) => { const t = (e.target as HTMLElement)?.tagName; if (t === 'INPUT' || t === 'TEXTAREA') this.input.keyboard!.enabled = false }
    const onFocusOut = (e: FocusEvent) => { const t = (e.target as HTMLElement)?.tagName; if (t === 'INPUT' || t === 'TEXTAREA') this.input.keyboard!.enabled = true  }
    document.addEventListener('focusin',  onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    this.events.once('destroy', () => {
      document.removeEventListener('focusin',  onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    })

    // ── Multiplayer: listen for other player updates ──────────────────────
    this.game.events.on(GameEvents.OTHER_PLAYERS_UPDATE, this._handleOtherPlayers, this)

    // ── Mobile joystick ───────────────────────────────────────────────────
    if (isMobile) {
      const CH = this.scale.height
      this.jBase  = this.add.circle(70, CH - 90, 45, 0x000000, 0.5).setStrokeStyle(2, 0xc9a84c, 0.4).setScrollFactor(0).setDepth(9995)
      this.jThumb = this.add.circle(70, CH - 90, 20, 0xc9a84c, 0.6).setScrollFactor(0).setDepth(9996)
      this.input.on('pointerdown', (p: any) => { if (p.x < 160) this.joystick = { on: true, x0: p.x, y0: p.y, cx: p.x, cy: p.y } })
      this.input.on('pointermove', (p: any) => { if (this.joystick.on) { this.joystick.cx = p.x; this.joystick.cy = p.y } })
      this.input.on('pointerup',   ()       => { this.joystick.on = false; this.jThumb?.setPosition(70, this.scale.height - 90) })
    }
  }

  // ── Update ───────────────────────────────────────────────────────────────

  update(_time: number, delta: number) {
    const npcs = this.registry.get('npcs') as NpcSoul[]

    // ── Clock ──────────────────────────────────────────────────────────────
    this.clockAcc += delta
    if (this.clockAcc >= 1000) {
      this.clockAcc -= 1000
      this.gameMinute += 2
      if (this.gameMinute >= 60) { this.gameMinute -= 60; this.gameHour = (this.gameHour + 1) % 24 }
      this.game.events.emit(GameEvents.CLOCK_TICK, this.gameHour, this.gameMinute)
    }

    // ── Position save (every 5s) ─────────────────────────────────────────
    this.positionSaveAcc += delta
    if (this.positionSaveAcc >= 5000) {
      this.positionSaveAcc = 0
      this.game.events.emit(GameEvents.POSITION_UPDATE, this.playerBody.x, this.playerBody.y)
    }

    // ── Player input ───────────────────────────────────────────────────────
    let vx = 0, vy = 0
    if      (this.wasd.left.isDown  || this.cursors.left.isDown)  vx = -PLAYER_SPEED
    else if (this.wasd.right.isDown || this.cursors.right.isDown) vx =  PLAYER_SPEED
    if      (this.wasd.up.isDown    || this.cursors.up.isDown)    vy = -PLAYER_SPEED
    else if (this.wasd.down.isDown  || this.cursors.down.isDown)  vy =  PLAYER_SPEED

    if (this.joystick.on) {
      const dx = this.joystick.cx - this.joystick.x0
      const dy = this.joystick.cy - this.joystick.y0
      const d  = Math.sqrt(dx * dx + dy * dy)
      if (d > 6) {
        const cl = Math.min(d, 36)
        vx = (dx / d) * PLAYER_SPEED * (cl / 36)
        vy = (dy / d) * PLAYER_SPEED * (cl / 36)
        this.jThumb?.setPosition(70 + (dx / d) * cl, this.scale.height - 90 + (dy / d) * cl)
      }
    }

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }
    this.playerBody.setVelocity(vx, vy)

    const px = this.playerBody.x, py = this.playerBody.y
    this.playerSpr.setPosition(px, py).setDepth(py)
    this.playerName.setPosition(px, py - 36).setDepth(py + 20)

    const pMoving = vx !== 0 || vy !== 0
    const pFacing = pMoving ? this._getFacing(vx, vy) : (this.playerSpr.getData('facing') || 'down')
    if (pMoving) this.playerSpr.setData('facing', pFacing)
    this._playAnim(this.playerSpr, 'player', pFacing, pMoving)

    // ── NPC movement ──────────────────────────────────────────────────────
    npcs.forEach(npc => {
      const spr    = this.npcSprites.get(npc.id)
      const labels = this.npcLabels.get(npc.id)
      if (!spr) return

      const inside = !!getCurrentEntry(npc.id, this.gameHour)?.inside
      spr.setVisible(!inside)
      if (labels) { labels.name.setVisible(!inside); labels.role.setVisible(!inside); labels.badge.setVisible(false) }
      if (inside) return

      const entry = getCurrentEntry(npc.id, this.gameHour)
      if (!entry) return
      const tx = entry.tx * TILE * ZOOM + (TILE * ZOOM) / 2
      const ty = entry.ty * TILE * ZOOM + (TILE * ZOOM) / 2

      const dx   = tx - spr.x
      const dy   = ty - spr.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > 6) {
        // Walking — cancel idle bob
        if (this.npcTweens.has(npc.id)) {
          this.npcTweens.get(npc.id)!.stop()
          this.npcTweens.delete(npc.id)
        }
        const dt = delta / 1000
        spr.x += (dx / dist) * NPC_SPEED * dt
        spr.y += (dy / dist) * NPC_SPEED * dt
        spr.setDepth(spr.y)

        const facing = this._getFacing(dx, dy)
        this.npcFacing.set(npc.id, facing)
        this._playAnim(spr, npc.id, facing, true)
        labels?.badge.setText(entry.activity).setVisible(true)
      } else {
        // Arrived — idle bob
        spr.setDepth(spr.y)
        this._playAnim(spr, npc.id, this.npcFacing.get(npc.id) || 'down', false)
        labels?.badge.setVisible(false)

        if (!this.npcTweens.has(npc.id)) {
          const tween = this.tweens.add({
            targets: spr, y: spr.y - 2,
            duration: 900 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          })
          this.npcTweens.set(npc.id, tween)
        }
      }

      if (labels) {
        labels.name.setPosition(spr.x, spr.y - 36).setDepth(spr.y + 20)
        labels.role.setPosition(spr.x, spr.y - 24).setDepth(spr.y + 20)
        labels.badge.setPosition(spr.x, spr.y - 50).setDepth(spr.y + 25)
      }
    })

    // ── Proximity detection ───────────────────────────────────────────────
    // Doors
    let closestDoor: BuildingEntry | null = null, minDD = 150
    DOORS.forEach(door => {
      const wx = door.tx * TILE * ZOOM + (TILE * ZOOM) / 2
      const wy = door.ty * TILE * ZOOM + (TILE * ZOOM) / 2
      const d  = Phaser.Math.Distance.Between(px, py, wx, wy)
      if (d < minDD) { minDD = d; closestDoor = door }
    })
    this.nearbyDoor = closestDoor as BuildingEntry | null

    // Notify React if door changed
    if ((this.nearbyDoor?.id ?? null) !== (this.prevNearbyDoor?.id ?? null)) {
      this.prevNearbyDoor = this.nearbyDoor
      this.game.events.emit(GameEvents.NEAR_DOOR_CHANGE, this.nearbyDoor)
    }

    // NPCs
    let closestNpc: string | null = null, minND = 72
    npcs.forEach(npc => {
      const spr = this.npcSprites.get(npc.id)
      if (!spr?.visible) return
      const d = Phaser.Math.Distance.Between(px, py, spr.x, spr.y)
      if (d < minND) { minND = d; closestNpc = npc.id }
    })
    this.nearbyNpc = closestNpc

    // Special points
    let closestSpecial: string | null = null, minSD = 80
    SPECIALS.forEach(sp => {
      const wx = sp.tx * TILE * ZOOM + (TILE * ZOOM) / 2
      const wy = sp.ty * TILE * ZOOM + (TILE * ZOOM) / 2
      const d  = Phaser.Math.Distance.Between(px, py, wx, wy)
      if (d < minSD) { minSD = d; closestSpecial = sp.id }
    })
    this.nearbySpecial = closestSpecial

    // ── Other players ──────────────────────────────────────────────────────
    this._tickOtherPlayers(delta)

    // ── Hint bubble ───────────────────────────────────────────────────────
    const isMob = window.innerWidth < 768
    if (closestSpecial) {
      const sp = SPECIALS.find(s => s.id === closestSpecial)!
      this.hintText.setText(isMob ? sp.label : `[E] ${sp.label}`)
      this.hint.setPosition(sp.tx * TILE * ZOOM + (TILE * ZOOM) / 2, sp.ty * TILE * ZOOM + (TILE * ZOOM) / 2 - 44).setVisible(true)
    } else if (closestDoor) {
      const d = closestDoor as BuildingEntry & { tx: number; ty: number }
      this.hintText.setText(isMob ? '🚪 Tap to Enter' : '[E] Enter')
      this.hint.setPosition(d.tx * TILE * ZOOM + (TILE * ZOOM) / 2, d.ty * TILE * ZOOM + (TILE * ZOOM) / 2 - 40).setVisible(true)
    } else if (closestNpc) {
      const spr = this.npcSprites.get(closestNpc)!
      this.hintText.setText(isMob ? '💬 Tap to Talk' : '[E] Talk')
      this.hint.setPosition(spr.x, spr.y - 58).setVisible(true)
    } else {
      this.hint.setVisible(false)
    }
  }

  // ── Other player sprite interpolation ─────────────────────────────────────
  // Smooth other players toward their broadcast position each frame
  _tickOtherPlayers(delta: number) {
    this.otherPlayerTargets.forEach((target, userId) => {
      const spr = this.otherPlayerSprites.get(userId)
      if (!spr) return
      const dx = target.x - spr.x
      const dy = target.y - spr.y
      const d  = Math.sqrt(dx * dx + dy * dy)
      if (d > 2) {
        const spd = Math.min(d, 8 * (delta / 16))  // smooth lerp
        spr.x += (dx / d) * spd
        spr.y += (dy / d) * spd
        spr.setDepth(spr.y)
      }
      const name = this.otherPlayerNames.get(userId)
      if (name) name.setPosition(spr.x, spr.y - 38).setDepth(spr.y + 20)
    })
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _handleOtherPlayers(players: PlayerPresence[]) {
    const textRes = Math.ceil(window.devicePixelRatio * 2)
    const activeIds = new Set(players.map(p => p.userId))

    // Remove players who left
    this.otherPlayerSprites.forEach((spr, userId) => {
      if (!activeIds.has(userId)) {
        spr.destroy()
        this.otherPlayerNames.get(userId)?.destroy()
        this.otherPlayerSprites.delete(userId)
        this.otherPlayerNames.delete(userId)
        this.otherPlayerTargets.delete(userId)
      }
    })

    // Add or update each other player
    players.forEach(p => {
      const texKey = `op_${p.userId.slice(0, 8)}`

      // Generate sprite sheet if not exists
      if (!this.textures.exists(texKey)) {
        const canvas = generateSpriteCanvas(p.palette as any)
        this.textures.addSpriteSheet(texKey, canvas as any, { frameWidth: FW, frameHeight: FH })
        this._setupAnims(texKey)
      }

      if (!this.otherPlayerSprites.has(p.userId)) {
        const spr = this.add.sprite(p.x, p.y, texKey, 0).setScale(ZOOM).setDepth(p.y)
        const nameTag = this.add.text(p.x, p.y - 38, p.characterName, {
          fontSize: '10px', fontStyle: 'bold', color: '#a0d0ff',
          stroke: '#000000', strokeThickness: 3, fontFamily: 'Inter, sans-serif',
        }).setOrigin(0.5).setResolution(textRes).setDepth(p.y + 20)
        this.otherPlayerSprites.set(p.userId, spr)
        this.otherPlayerNames.set(p.userId, nameTag)
      }

      // Update target for interpolation
      this.otherPlayerTargets.set(p.userId, { x: p.x, y: p.y })

      // Play anim
      const spr = this.otherPlayerSprites.get(p.userId)!
      this._playAnim(spr, texKey, p.facing, false)
    })
  }

  private _getFacing(vx: number, vy: number): string {
    if (Math.abs(vx) > Math.abs(vy)) return vx > 0 ? 'right' : 'left'
    return vy > 0 ? 'down' : 'up'
  }

  private _playAnim(spr: Phaser.GameObjects.Sprite, key: string, facing: string, moving: boolean) {
    const dir     = facing === 'left' || facing === 'right' ? 'side' : facing
    const animKey = `${key}_${moving ? 'walk' : 'idle'}_${dir}`
    if (this.anims.exists(animKey) && spr.anims.currentAnim?.key !== animKey) spr.play(animKey)
    spr.setFlipX(facing === 'left')
  }

  private _setupAnims(key: string) {
    if (!this.textures.exists(key)) return
    const c = (start: number, end: number) => this.anims.generateFrameNumbers(key, { start, end })
    const f = (frames: number[]) => this.anims.generateFrameNumbers(key, { frames })
    this.anims.create({ key: `${key}_idle_down`, frames: c(0, 0), frameRate: 1, repeat: -1 })
    this.anims.create({ key: `${key}_walk_down`, frames: f([0,1,0,2]),            frameRate: 8, repeat: -1 })
    this.anims.create({ key: `${key}_idle_up`,   frames: c(3, 3), frameRate: 1, repeat: -1 })
    this.anims.create({ key: `${key}_walk_up`,   frames: f([3,4,3,5]),            frameRate: 8, repeat: -1 })
    this.anims.create({ key: `${key}_idle_side`, frames: c(6, 6), frameRate: 1, repeat: -1 })
    this.anims.create({ key: `${key}_walk_side`, frames: f([6,7,6,8]),            frameRate: 8, repeat: -1 })
  }
}

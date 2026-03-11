/**
 * Phaser Editor 2D entry point.
 *
 * This file exists so Phaser Editor v5 can recognize the project structure
 * and open/edit scenes. It is NOT used by the Next.js app — the app boots
 * Phaser via components/game/GameCanvas.tsx.
 *
 * To preview a scene in Phaser Editor:
 *   1. Run `npm run dev` (starts Next.js on localhost:3000)
 *   2. Open Phaser Editor → File → Open Project → select caro/
 *   3. Double-click scenes/MainScene.scene in the editor file tree
 */

import Phaser from 'phaser'
import { MainScene } from '../scenes/MainScene'

window.addEventListener('load', () => {
    new Phaser.Game({
        type: Phaser.AUTO,
        width: 1152,
        height: 864,
        backgroundColor: '#2d5a1b',
        parent: 'game-container',
        physics: {
            default: 'arcade',
            arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        scene: [MainScene],
    })
})

// Generates a 48×60 sprite sheet (3 frames × 3 directions, 16×20 px each)
// Directions: row 0 = down, row 1 = up, row 2 = side (mirrored for left)
// Frames: col 0 = idle, col 1 = walk_a, col 2 = walk_b

export type CharColors = {
  skin: string; hair: string; shirt: string
  pants: string; shoe: string; detail: string
}

// r(ctx, x, y, w, h, color) — draw a rectangle of pixels
function r(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c; ctx.fillRect(x, y, w, h)
}

function drawDown(ctx: CanvasRenderingContext2D, ox: number, oy: number, c: CharColors, frame: number) {
  // frame: 0=idle, 1=step_r (right leg fwd), 2=step_l (left leg fwd)
  const ll = frame === 1 ? 1 : frame === 2 ? -1 : 0  // left leg offset
  const rl = -ll  // right leg opposite

  // Hair
  r(ctx, ox+4, oy,   8, 2, c.hair)
  r(ctx, ox+3, oy+2, 10, 2, c.hair)
  r(ctx, ox+3, oy+4, 2,  2, c.hair)
  r(ctx, ox+11,oy+4, 2,  2, c.hair)

  // Face (skin)
  r(ctx, ox+3, oy+4, 10, 4, c.skin)
  // Eyes
  r(ctx, ox+5, oy+5, 2, 1, '#1a1a2e')
  r(ctx, ox+9, oy+5, 2, 1, '#1a1a2e')
  // Eye shine
  r(ctx, ox+5, oy+5, 1, 1, '#4a4a6e')
  r(ctx, ox+9, oy+5, 1, 1, '#4a4a6e')

  // Neck
  r(ctx, ox+6, oy+8, 4, 2, c.skin)

  // Shirt body
  r(ctx, ox+2, oy+8,  12, 5, c.shirt)
  // Collar/detail
  r(ctx, ox+6, oy+8,  4,  2, c.detail)

  // Arms (skin below shirt)
  r(ctx, ox+0, oy+9,  2, 4, c.shirt)
  r(ctx, ox+14,oy+9,  2, 4, c.shirt)
  r(ctx, ox+0, oy+13, 2, 1, c.skin)
  r(ctx, ox+14,oy+13, 2, 1, c.skin)

  // Legs (with walk offset)
  r(ctx, ox+3, oy+13+ll, 4, 5, c.pants)
  r(ctx, ox+9, oy+13+rl, 4, 5, c.pants)

  // Shoes
  r(ctx, ox+2, oy+18+ll, 5, 2, c.shoe)
  r(ctx, ox+9, oy+18+rl, 5, 2, c.shoe)
}

function drawUp(ctx: CanvasRenderingContext2D, ox: number, oy: number, c: CharColors, frame: number) {
  const ll = frame === 1 ? 1 : frame === 2 ? -1 : 0
  const rl = -ll

  // Back of hair (no face visible)
  r(ctx, ox+3, oy,   10, 6, c.hair)
  r(ctx, ox+2, oy+2, 12, 4, c.hair)
  // Back of head (hair edge shows skin at bottom)
  r(ctx, ox+3, oy+6, 10, 2, c.skin)

  // Neck
  r(ctx, ox+6, oy+8, 4, 2, c.skin)

  // Shirt back
  r(ctx, ox+2, oy+8,  12, 5, c.shirt)
  r(ctx, ox+0, oy+9,  2, 4, c.shirt)
  r(ctx, ox+14,oy+9,  2, 4, c.shirt)
  r(ctx, ox+0, oy+13, 2, 1, c.skin)
  r(ctx, ox+14,oy+13, 2, 1, c.skin)

  // Legs
  r(ctx, ox+3, oy+13+ll, 4, 5, c.pants)
  r(ctx, ox+9, oy+13+rl, 4, 5, c.pants)
  r(ctx, ox+2, oy+18+ll, 5, 2, c.shoe)
  r(ctx, ox+9, oy+18+rl, 5, 2, c.shoe)
}

function drawSide(ctx: CanvasRenderingContext2D, ox: number, oy: number, c: CharColors, frame: number) {
  // Profile view — character facing right
  const legA = frame === 1 ? 1 : frame === 2 ? -1 : 0
  const legB = -legA
  const armF = frame === 1 ? -1 : frame === 2 ? 1 : 0  // front arm swings opp to front leg

  // Hair
  r(ctx, ox+4, oy,   7, 2, c.hair)
  r(ctx, ox+3, oy+2, 9, 4, c.hair)
  r(ctx, ox+3, oy+4, 2, 3, c.hair) // side sideburn

  // Profile face
  r(ctx, ox+4, oy+3, 7, 5, c.skin)
  // Single eye
  r(ctx, ox+9, oy+5, 2, 1, '#1a1a2e')
  r(ctx, ox+9, oy+5, 1, 1, '#4a4a6e')

  // Neck
  r(ctx, ox+5, oy+8, 4, 2, c.skin)

  // Shirt body (narrower in profile)
  r(ctx, ox+3, oy+8, 8, 5, c.shirt)
  r(ctx, ox+3, oy+8, 8, 2, c.detail)

  // Arms (front arm swings)
  r(ctx, ox+11, oy+9+armF, 2, 4, c.shirt)  // front arm
  r(ctx, ox+11, oy+13+armF, 2, 1, c.skin)
  r(ctx, ox+1,  oy+9-armF, 2, 4, c.shirt)  // back arm
  r(ctx, ox+1,  oy+13-armF, 2, 1, c.skin)

  // Legs
  r(ctx, ox+4, oy+13+legA, 4, 5, c.pants)  // front leg
  r(ctx, ox+7, oy+13+legB, 3, 5, c.pants)  // back leg (slightly behind)
  r(ctx, ox+3, oy+18+legA, 6, 2, c.shoe)   // front shoe
  r(ctx, ox+7, oy+18+legB, 4, 2, c.shoe)   // back shoe
}

// Returns the raw HTMLCanvasElement so callers can use it synchronously
// (e.g. Phaser's textures.addSpriteSheet which accepts a canvas directly)
export function generateSpriteCanvas(colors: CharColors): HTMLCanvasElement {
  const FW = 16, FH = 20
  const canvas = document.createElement('canvas')
  canvas.width  = FW * 3  // 3 frames
  canvas.height = FH * 3  // 3 directions: down, up, side
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let f = 0; f < 3; f++) {
    drawDown(ctx, f * FW, 0,       colors, f)
    drawUp  (ctx, f * FW, FH,      colors, f)
    drawSide(ctx, f * FW, FH * 2,  colors, f)
  }

  return canvas
}

/** @deprecated use generateSpriteCanvas */
export function generateSpriteSheet(colors: CharColors): string {
  return generateSpriteCanvas(colors).toDataURL('image/png')
}

// Predefined NPC color palettes
export const NPC_PALETTES: Record<string, CharColors> = {
  eleanor: {
    skin: '#fde8cc', hair: '#6b3515', shirt: '#d45555',
    pants: '#5a3020', shoe: '#2a1008', detail: '#f4a58a'
  },
  silas: {
    skin: '#c8905e', hair: '#1a0e06', shirt: '#4a6080',
    pants: '#2a3240', shoe: '#1a0e06', detail: '#8aaac0'
  },
  maeve: {
    skin: '#f0ddc8', hair: '#0e0618', shirt: '#6a4080',
    pants: '#2a1840', shoe: '#1a0a28', detail: '#b090d0'
  },
  caleb: {
    skin: '#fcd8a8', hair: '#6a4018', shirt: '#3a7050',
    pants: '#284838', shoe: '#1a0e08', detail: '#70b090'
  },
  ruth: {
    skin: '#fcdcc8', hair: '#780808', shirt: '#404878',
    pants: '#282840', shoe: '#180808', detail: '#8890c0'
  },
  player: {
    skin: '#ffe0b0', hair: '#5a3a10', shirt: '#3a5a8a',
    pants: '#2a3a6a', shoe: '#1a1208', detail: '#7090c0'
  },
}

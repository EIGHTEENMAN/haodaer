import Phaser from "phaser"

const TILE = 80
const COLS = 50
const ROWS = 30

export class MapBuilder {
  private scene: Phaser.Scene
  ground: null = null
  walls: Phaser.Physics.Arcade.StaticGroup | null = null
  trees: Phaser.Physics.Arcade.StaticGroup | null = null

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  build() {
    const W = COLS * TILE
    const H = ROWS * TILE
    const seed = Math.floor(Math.random() * 10000)
    const P = 20

    // Single Graphics object for ALL ground visuals
    const gfx = this.scene.add.graphics()

    // --- Ground pixel blocks ---
    for (let x = 0; x < W; x += P) {
      for (let y = 0; y < H; y += P) {
        const noise = ((x * 7 + y * 13 + seed * 3) % 10)
        let r = 74, g = 142, b = 54
        if (noise < 3) { r = 67; g = 130; b = 48 }
        else if (noise < 5) { r = 82; g = 155; b = 60 }
        else if (noise === 9) { r = 60; g = 120; b = 42 }
        gfx.fillStyle(Phaser.Display.Color.GetColor(r, g, b))
        gfx.fillRect(x, y, P, P)
      }
    }

    // --- Flowers ---
    for (let i = 0; i < 60; i++) {
      const fx = Phaser.Math.Between(2, COLS - 3) * TILE + Phaser.Math.Between(0, TILE - 1)
      const fy = Phaser.Math.Between(2, ROWS - 3) * TILE + Phaser.Math.Between(0, TILE - 1)
      const fColor = Math.random() < 0.5 ? 0xff4444 : 0xffdd44
      gfx.fillStyle(fColor)
      gfx.fillRect(fx, fy, 8, 10)
      gfx.fillStyle(0x2d6a1e)
      gfx.fillRect(fx + 2, fy + 8, 3, 5)
    }

    // --- Mining areas ---
    for (let i = 0; i < 8; i++) {
      const mx = Phaser.Math.Between(4, COLS - 5) * TILE
      const my = Phaser.Math.Between(4, ROWS - 5) * TILE
      for (let px = 0; px < TILE * 2; px += P) {
        for (let py = 0; py < TILE; py += P) {
          const shade = Math.random() < 0.3 ? 0x555555 : 0x666666
          gfx.fillStyle(shade)
          gfx.fillRect(mx + px, my + py, P, P)
          if (Math.random() < 0.15) {
            gfx.fillStyle(0x222222)
            gfx.fillRect(mx + px + 5, my + py + 5, 8, 8)
          }
        }
      }
    }

    // --- Generate WALL texture (small, 80x80) ---
    const wallGfx = this.scene.add.graphics()
    const halfT = TILE / 2
    for (let px = -halfT; px < halfT; px += P) {
      for (let py = -halfT; py < halfT; py += P) {
        const isOffset = (Math.floor(px / P) + Math.floor(py / P)) % 2 === 0
        const shade = isOffset ? 0x777777 : 0x888888
        wallGfx.fillStyle(shade)
        // Draw relative to (0,0) origin
        wallGfx.fillRect(halfT + px, halfT + py, P, P)
        if (Math.random() < 0.2) {
          wallGfx.fillStyle(0x555555)
          wallGfx.fillRect(halfT + px + 5, halfT + py + 5, 5, 5)
        }
      }
    }
    wallGfx.lineStyle(2, 0x444444, 0.5)
    wallGfx.strokeRect(0, 0, TILE, TILE)
    wallGfx.generateTexture("__WALL", TILE, TILE)
    wallGfx.destroy()

    // --- Walls ---
    this.walls = this.scene.physics.add.staticGroup()

    // Draw wall cobblestone on gfx too (backup visual layer)
    const wallVisual = this.scene.add.graphics()
    for (let wx = 0; wx < COLS; wx++) {
      // Top wall
      this.walls.create(wx * TILE + TILE / 2, TILE / 2, "__WALL")
      // Bottom wall
      this.walls.create(wx * TILE + TILE / 2, (ROWS - 1) * TILE + TILE / 2, "__WALL")
    }
    for (let wy = 1; wy < ROWS - 1; wy++) {
      // Left wall
      this.walls.create(TILE / 2, wy * TILE + TILE / 2, "__WALL")
      // Right wall
      this.walls.create((COLS - 1) * TILE + TILE / 2, wy * TILE + TILE / 2, "__WALL")
    }

    // Draw wall cobblestone on gfx as well (so walls show even without texture)
    for (let wx = 0; wx < COLS; wx++) {
      this.drawCobblestone(gfx, wx * TILE + TILE / 2, TILE / 2)
      this.drawCobblestone(gfx, wx * TILE + TILE / 2, (ROWS - 1) * TILE + TILE / 2)
    }
    for (let wy = 1; wy < ROWS - 1; wy++) {
      this.drawCobblestone(gfx, TILE / 2, wy * TILE + TILE / 2)
      this.drawCobblestone(gfx, (COLS - 1) * TILE + TILE / 2, wy * TILE + TILE / 2)
    }

    // --- Trees ---
    this.trees = this.scene.physics.add.staticGroup()
    const treePositions = new Set<string>()
    for (let i = 0; i < 25; i++) {
      const tx = Phaser.Math.Between(3, COLS - 4) * TILE + TILE / 2
      const ty = Phaser.Math.Between(3, ROWS - 4) * TILE + TILE / 2
      const key = `${Math.floor(tx / TILE)},${Math.floor(ty / TILE)}`
      if (!treePositions.has(key)) {
        treePositions.add(key)
        // Create physics body (visible with WALL texture, we'll draw tree on top)
        const treeBody = this.trees.create(tx, ty, "__WALL")
        // Draw tree canopy on gfx (overlays the wall texture)
        this.drawBlockyTree(gfx, tx, ty)
      }
    }

    this.scene.physics.world.setBounds(0, 0, W, H)
  }

  private drawCobblestone(gfx: Phaser.GameObjects.Graphics, wx: number, wy: number) {
    const P = 20
    const halfT = TILE / 2
    for (let px = -halfT; px < halfT; px += P) {
      for (let py = -halfT; py < halfT; py += P) {
        const isOffset = (Math.floor((wx + px) / P) + Math.floor((wy + py) / P)) % 2 === 0
        gfx.fillStyle(isOffset ? 0x777777 : 0x888888)
        gfx.fillRect(wx + px, wy + py, P, P)
      }
    }
    gfx.lineStyle(2, 0x444444, 0.5)
    gfx.strokeRect(wx - halfT, wy - halfT, TILE, TILE)
  }

  private drawBlockyTree(gfx: Phaser.GameObjects.Graphics, tx: number, ty: number) {
    const size = 40 + Math.floor(Math.random() * 20)
    const halfSize = size / 2
    const canopyGreen = Math.random() < 0.3 ? 0x2d8a1e : 0x3a9d22
    gfx.fillStyle(canopyGreen)
    gfx.fillRect(tx - halfSize, ty - halfSize - 25, size, size)
    for (let px = 0; px < size; px += 10) {
      for (let py = 0; py < size; py += 10) {
        if (Math.random() < 0.3) {
          gfx.fillStyle(Math.random() < 0.5 ? 0x4ab82e : 0x2a7a18)
          gfx.fillRect(tx - halfSize + px, ty - halfSize - 25 + py, 10, 10)
        }
      }
    }
    gfx.fillStyle(0x5c3a1e)
    gfx.fillRect(tx - 8, ty - 15, 16, 35)
    gfx.fillStyle(0x4a2e15)
    gfx.fillRect(tx - 3, ty - 10, 5, 20)
  }

  getWorldBounds() {
    return { width: COLS * TILE, height: ROWS * TILE }
  }

  getRandomCreeperSpot(): { x: number; y: number } | null {
    if (Math.random() > 0.01) return null
    return {
      x: Phaser.Math.Between(3, COLS - 3) * TILE,
      y: Phaser.Math.Between(3, ROWS - 3) * TILE,
    }
  }
}

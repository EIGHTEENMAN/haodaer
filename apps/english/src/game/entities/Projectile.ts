import Phaser from "phaser"

export type ProjectileType = "FIREBALL" | "LETTER" | "SCATTER" | "BOSS"

const SPEEDS: Record<ProjectileType, number> = {
  FIREBALL: 140,
  LETTER: 180,
  SCATTER: 200,
  BOSS: 280,
}

const COLORS: Record<ProjectileType, number> = {
  FIREBALL: 0xff4400,
  LETTER: 0x44ccff,
  SCATTER: 0xffdd44,
  BOSS: 0xff2244,
}

const SIZES: Record<ProjectileType, number> = {
  FIREBALL: 16,
  LETTER: 16,
  SCATTER: 8,
  BOSS: 24,
}

const MAX_LIFETIME = 8000
const TRAIL_INTERVAL = 40 // ms between trail particles

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  bulletType: ProjectileType
  letter: string
  private vx: number
  private vy: number
  private born: number
  private tracking: boolean
  private target: { x: number; y: number } | null
  private lastTrail = 0
  private fireColors: number[]

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: ProjectileType,
    dirX: number,
    dirY: number,
    letter = "",
    target?: { x: number; y: number }
  ) {
    const key = `__PROJ_${type}_${Math.random().toString(36).slice(2, 6)}`
    createProjectileTexture(scene, key, type)
    super(scene, x, y, key)
    this.bulletType = type
    this.letter = letter
    this.born = scene.time.now
    this.tracking = type === "FIREBALL" || type === "BOSS"
    this.target = target || null
    this.fireColors = [0xff2200, 0xff4400, 0xff6600, 0xff8800, 0xffaa00]

    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1
    const speed = SPEEDS[type]
    this.vx = (dirX / len) * speed
    this.vy = (dirY / len) * speed

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(8)
    this.setSize(SIZES[type] * 0.7, SIZES[type] * 0.7)

    // Letter label for LETTER type
    if (type === "LETTER" && letter) {
      const label = scene.add.text(x, y, letter.toUpperCase(), {
        fontSize: "11px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
        fontFamily: "monospace",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(9)
      this.on("destroy", () => {
        if (label.active) label.destroy()
      })
      scene.events.on("update", () => {
        if (this.active) label.setPosition(this.x, this.y)
      })
    }

    this.setVelocity(this.vx, this.vy)
  }

  update(playerX: number, playerY: number) {
    if (!this.active) return

    // Lifetime check
    if (this.scene.time.now - this.born > MAX_LIFETIME) {
      this.kill()
      return
    }

    // Tracking: gentle homing toward player
    if (this.tracking && this.target) {
      const dx = playerX - this.x
      const dy = playerY - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 5) {
        const baseSpeed = SPEEDS[this.bulletType]
        const steer = 0.05
        const tx = (dx / dist) * baseSpeed
        const ty = (dy / dist) * baseSpeed
        this.vx += (tx - this.vx) * steer
        this.vy += (ty - this.vy) * steer
        this.setVelocity(this.vx, this.vy)
      }
    }

    // Rotate for visual flair
    if (this.bulletType === "FIREBALL" || this.bulletType === "BOSS") {
      this.rotation += 0.15
    } else {
      this.rotation += 0.1
    }

    // 🔥 Fire trail particles (FIREBALL and BOSS)
    if ((this.bulletType === "FIREBALL" || this.bulletType === "BOSS") && this.scene) {
      const now = this.scene.time.now
      if (now - this.lastTrail > TRAIL_INTERVAL) {
        this.lastTrail = now
        this.spawnTrailParticle()
      }
    }

    // Kill if out of bounds
    const cam = this.scene.cameras.main
    const margin = 100
    if (
      this.x < cam.scrollX - margin ||
      this.x > cam.scrollX + cam.width + margin ||
      this.y < cam.scrollY - margin ||
      this.y > cam.scrollY + cam.height + margin
    ) {
      this.kill()
    }
  }

  private spawnTrailParticle() {
    const isBoss = this.bulletType === "BOSS"
    const size = isBoss ? 4 + Math.random() * 3 : 2 + Math.random() * 2
    const color = this.fireColors[Math.floor(Math.random() * this.fireColors.length)]
    const alpha = 0.4 + Math.random() * 0.3
    const p = this.scene.add.circle(this.x, this.y, size, color, alpha).setDepth(6)

    this.scene.tweens.add({
      targets: p,
      x: p.x + (Math.random() - 0.5) * 20,
      y: p.y + (Math.random() - 0.5) * 20,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 200 + Math.random() * 150,
      ease: "Power2",
      onComplete: () => p.destroy(),
    })
  }

  kill() {
    // 🔥 Enhanced particle burst on destruction
    const type = this.bulletType
    const isFire = type === "FIREBALL" || type === "BOSS"
    const particleCount = isFire ? 12 : 4

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3
      const dist = 10 + Math.random() * 25

      if (isFire) {
        // Fire-colored particles
        const colors = [0xff2200, 0xff4400, 0xff6600, 0xffaa00, 0xffdd00]
        const color = colors[Math.floor(Math.random() * colors.length)]
        const size = 2 + Math.random() * 3
        const p = this.scene.add.circle(this.x, this.y, size, color, 0.8).setDepth(8)

        this.scene.tweens.add({
          targets: p,
          x: this.x + Math.cos(angle) * dist,
          y: this.y + Math.sin(angle) * dist,
          scaleX: 0.1,
          scaleY: 0.1,
          alpha: 0,
          duration: 200 + Math.random() * 200,
          ease: "Power2",
          onComplete: () => p.destroy(),
        })
      } else {
        const color = COLORS[type]
        const p = this.scene.add.rectangle(this.x, this.y, 3, 3, color, 0.7).setDepth(8)
        this.scene.tweens.add({
          targets: p,
          x: p.x + Math.cos(angle) * dist,
          y: p.y + Math.sin(angle) * dist,
          alpha: 0,
          duration: 150 + Math.random() * 150,
          onComplete: () => p.destroy(),
        })
      }
    }

    this.destroy()
  }

  static spawnScatter(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number) {
    const dx = targetX - x
    const dy = targetY - y
    const baseAngle = Math.atan2(dy, dx)
    const spread = 0.3
    const bullets: Projectile[] = []
    for (let i = -1; i <= 1; i++) {
      const angle = baseAngle + spread * i
      const b = new Projectile(scene, x, y, "SCATTER", Math.cos(angle), Math.sin(angle))
      bullets.push(b)
    }
    return bullets
  }
}

function createProjectileTexture(scene: Phaser.Scene, key: string, type: ProjectileType) {
  if (scene.textures.exists(key)) return
  const gfx = scene.add.graphics()
  const size = SIZES[type]

  switch (type) {
    case "FIREBALL": {
      // 🔥 Multi-layered fireball with outer glow and flame spikes
      const cx = size / 2
      const cy = size / 2

      // Outer glow layer
      gfx.fillStyle(0xff2200, 0.15)
      gfx.fillCircle(cx, cy, size * 0.65)

      // Mid glow
      gfx.fillStyle(0xff4400, 0.30)
      gfx.fillCircle(cx, cy, size * 0.5)

      // Main body (bright red-orange)
      gfx.fillStyle(0xff4400, 1)
      gfx.fillCircle(cx, cy, size * 0.42)

      // Mid layer (orange)
      gfx.fillStyle(0xff8800, 0.9)
      gfx.fillCircle(cx, cy, size * 0.3)

      // Inner (bright yellow)
      gfx.fillStyle(0xffcc00, 0.85)
      gfx.fillCircle(cx, cy, size * 0.18)

      // Core (white-hot)
      gfx.fillStyle(0xffffff, 0.8)
      gfx.fillCircle(cx, cy, size * 0.08)

      // Flame spikes around the edge
      const spikeCount = 7
      for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2 + 0.1
        const spikeDist = size * 0.4
        const sx = cx + Math.cos(angle) * spikeDist
        const sy = cy + Math.sin(angle) * spikeDist
        const spikeSize = 2.5 + Math.random() * 1.5
        gfx.fillStyle(0xff6600, 0.5)
        gfx.fillCircle(sx, sy, spikeSize)
        // Smaller outer spike
        const outerDist = size * 0.48
        const ox = cx + Math.cos(angle) * outerDist
        const oy = cy + Math.sin(angle) * outerDist
        gfx.fillStyle(0xff2200, 0.25)
        gfx.fillCircle(ox, oy, 1.5)
      }
      break
    }
    case "LETTER": {
      // Square with border
      gfx.fillStyle(0x222244, 1)
      gfx.fillRect(0, 0, size, size)
      gfx.fillStyle(COLORS.LETTER, 1)
      gfx.fillRect(1, 1, size - 2, size - 2)
      break
    }
    case "SCATTER": {
      // Small diamond
      gfx.fillStyle(COLORS.SCATTER, 1)
      gfx.fillTriangle(size / 2, 0, 0, size, size, size)
      gfx.fillTriangle(size / 2, size, 0, 0, size, 0)
      break
    }
    case "BOSS": {
      // 🔥 Menacing dark fireball
      const cx = size / 2
      const cy = size / 2

      // Dark outer aura
      gfx.fillStyle(0x440000, 0.25)
      gfx.fillCircle(cx, cy, size * 0.7)

      // Outer ring
      gfx.fillStyle(0x880000, 0.4)
      gfx.fillCircle(cx, cy, size * 0.55)

      // Main body
      gfx.fillStyle(0xcc0000, 1)
      gfx.fillCircle(cx, cy, size * 0.45)

      // Mid layer
      gfx.fillStyle(0xff2200, 1)
      gfx.fillCircle(cx, cy, size * 0.32)

      // Inner glow
      gfx.fillStyle(0xff6600, 0.9)
      gfx.fillCircle(cx, cy, size * 0.2)

      // Core (white-hot)
      gfx.fillStyle(0xffcc00, 0.8)
      gfx.fillCircle(cx, cy, size * 0.1)

      // Skull-like pattern
      gfx.fillStyle(0xffffff, 0.15)
      gfx.fillRect(cx - 4, cy - 3, 8, 2)
      gfx.fillRect(cx - 3, cy + 1, 6, 1)

      // Menacing flame spikes
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2
        const dist = size * 0.42
        gfx.fillStyle(0xcc0000, 0.5)
        gfx.fillCircle(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 3)
      }
      break
    }
  }

  gfx.generateTexture(key, size + 6, size + 6)
  gfx.destroy()
}

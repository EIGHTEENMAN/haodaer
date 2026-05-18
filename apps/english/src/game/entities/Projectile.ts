import Phaser from "phaser"

export type ProjectileType = "FIREBALL" | "LETTER" | "SCATTER" | "BOSS"

const SPEEDS: Record<ProjectileType, number> = {
  FIREBALL: 120,
  LETTER: 180,
  SCATTER: 200,
  BOSS: 280,
}

const COLORS: Record<ProjectileType, number> = {
  FIREBALL: 0xff6622,
  LETTER: 0x44ccff,
  SCATTER: 0xffdd44,
  BOSS: 0xff2244,
}

const SIZES: Record<ProjectileType, number> = {
  FIREBALL: 12,
  LETTER: 16,
  SCATTER: 8,
  BOSS: 20,
}

const MAX_LIFETIME = 8000

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  bulletType: ProjectileType
  letter: string
  private vx: number
  private vy: number
  private born: number
  private tracking: boolean
  private target: { x: number; y: number } | null

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

    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1
    const speed = SPEEDS[type]
    this.vx = (dirX / len) * speed
    this.vy = (dirY / len) * speed

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setDepth(8)
    this.setSize(SIZES[type] * 0.8, SIZES[type] * 0.8)

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
    this.rotation += 0.1

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

  kill() {
    // Small particle burst on destruction
    const color = COLORS[this.bulletType]
    for (let i = 0; i < 4; i++) {
      const p = this.scene.add.rectangle(this.x, this.y, 3, 3, color, 0.7).setDepth(8)
      this.scene.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-20, 20),
        y: p.y + Phaser.Math.Between(-20, 20),
        alpha: 0,
        duration: 200,
        onComplete: () => p.destroy(),
      })
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
  const color = COLORS[type]
  const size = SIZES[type]

  switch (type) {
    case "FIREBALL": {
      // Round-ish fireball
      gfx.fillStyle(color, 1)
      gfx.fillCircle(size / 2, size / 2, size / 2)
      // Inner glow
      gfx.fillStyle(0xffff44, 0.6)
      gfx.fillCircle(size / 2, size / 2, size / 4)
      // Trail
      gfx.fillStyle(color, 0.3)
      gfx.fillCircle(size / 2 - 4, size / 2, size / 3)
      break
    }
    case "LETTER": {
      // Square with border
      gfx.fillStyle(0x222244, 1)
      gfx.fillRect(0, 0, size, size)
      gfx.fillStyle(color, 1)
      gfx.fillRect(1, 1, size - 2, size - 2)
      break
    }
    case "SCATTER": {
      // Small diamond
      gfx.fillStyle(color, 1)
      gfx.fillTriangle(size / 2, 0, 0, size, size, size)
      gfx.fillTriangle(size / 2, size, 0, 0, size, 0)
      break
    }
    case "BOSS": {
      // Large ominous square with skull pattern
      gfx.fillStyle(0x330000, 1)
      gfx.fillRect(0, 0, size, size)
      gfx.fillStyle(color, 1)
      gfx.fillRect(2, 2, size - 4, size - 4)
      // Inner pattern
      gfx.fillStyle(0xffffff, 0.3)
      gfx.fillRect(6, 3, size - 12, 3)
      gfx.fillRect(4, 8, size - 8, 2)
      break
    }
  }

  gfx.generateTexture(key, size + 4, size + 4)
  gfx.destroy()
}

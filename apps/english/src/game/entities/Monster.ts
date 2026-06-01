import Phaser from "phaser"
import type { WordData } from "../../stores/gameStore"

export class Monster {
  container: Phaser.GameObjects.Container
  bodyGraphics: Phaser.GameObjects.Graphics
  physicsSprite: Phaser.Physics.Arcade.Image
  wordData: WordData
  maxHp: number
  currentHp: number
  isBoss: boolean

  // Chase & melee
  chaseSpeed: number
  meleeDamage: number
  meleeRange = 42
  meleeCooldown = 1000
  lastMeleeTime = 0

  // Stuck/confused
  private stuckTimer = 0
  isConfused = false
  private confusedDirection = 0
  private confusedTimer = 0
  private readonly CONFUSED_DURATION = 1500

  // Labels
  private wordLabel: Phaser.GameObjects.Text
  private emojiLabel: Phaser.GameObjects.Text
  private hpBar: Phaser.GameObjects.Graphics
  private confusedEmoji: Phaser.GameObjects.Text | null = null

  // Visual variety
  private bodyType: number
  private scene: Phaser.Scene

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    wordData: WordData,
    chaseSpeed: number,
    meleeDamage: number,
    isBoss: boolean,
  ) {
    this.scene = scene
    this.wordData = wordData
    this.isBoss = isBoss
    this.bodyType = wordData.id % 4
    this.chaseSpeed = chaseSpeed
    this.meleeDamage = meleeDamage

    // HP scales with difficulty
    const hpBase = isBoss ? 500 : 80
    this.maxHp = hpBase + wordData.difficulty * 20
    this.currentHp = this.maxHp

    // Container (visual root)
    this.container = scene.add.container(x, y).setDepth(9)

    // Body graphics — draw the monster shape
    this.bodyGraphics = scene.add.graphics()
    this.container.add(this.bodyGraphics)
    this.drawMonsterBody(wordData.difficulty)

    // Physics sprite (invisible, for colliders and world bounds)
    this.physicsSprite = scene.physics.add.image(x, y, "__PIXEL")
    this.physicsSprite.setVisible(false)
    this.physicsSprite.body.setSize(36, 44)
    this.physicsSprite.setCollideWorldBounds(true)
    this.physicsSprite.setDepth(9)

    // Emoji label (above monster)
    const emojiChar = wordData.emoji || (this.isBoss ? "👑" : "👾")
    this.emojiLabel = scene.add.text(0, -72, emojiChar, {
      fontSize: this.isBoss ? "30px" : "22px",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12)
    this.container.add(this.emojiLabel)

    // Word label (English word above monster)
    this.wordLabel = scene.add.text(0, -44, wordData.word, {
      fontSize: "12px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(12)
    this.container.add(this.wordLabel)

    // HP bar (child of container, drawn relative to (0,0))
    this.hpBar = scene.add.graphics().setDepth(12)
    this.container.add(this.hpBar)
    this.updateHpBar()

    // Boss idle bob
    if (this.isBoss) {
      scene.tweens.add({
        targets: this.container,
        y: y - 8,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      })
    }
  }

  private drawMonsterBody(difficulty: number) {
    this.bodyGraphics.clear()
    const hue = (difficulty * 51) % 360
    const bodyColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.45).color
    const headColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.5, 0.55).color

    if (this.isBoss) {
      drawMonsterBody(this.bodyGraphics, bodyColor, headColor, 0, 0, 52, 66)
      this.bodyGraphics.fillStyle(0xffd700)
      this.bodyGraphics.fillRect(16, -12, 36, 10)
      this.bodyGraphics.fillRect(20, -16, 8, 8)
      this.bodyGraphics.fillRect(30, -14, 8, 6)
      this.bodyGraphics.fillRect(40, -16, 8, 8)
    } else {
      const configs: [number, number, number, number][] = [
        [0, 0, 52, 66],
        [6, -4, 40, 76],
        [-4, 2, 60, 56],
        [2, -2, 48, 64],
      ]
      const c = configs[this.bodyType] || configs[0]
      drawMonsterBody(this.bodyGraphics, bodyColor, headColor, c[0], c[1], c[2], c[3])
    }
  }

  updateHpBar() {
    this.hpBar.clear()
    const barWidth = 54
    const barHeight = 5
    const x = -barWidth / 2
    const y = -52
    const ratio = this.currentHp / this.maxHp

    this.hpBar.fillStyle(0x333333)
    this.hpBar.fillRect(x, y, barWidth, barHeight)
    const hpColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444
    const fillW = Math.max(0, Math.floor(ratio * barWidth))
    this.hpBar.fillStyle(hpColor)
    this.hpBar.fillRect(x, y, fillW, barHeight)
  }

  /** Sync container position to physics sprite position */
  syncVisual() {
    this.container.setPosition(this.physicsSprite.x, this.physicsSprite.y)
  }

  /** Physics proxy getters */
  get x() { return this.physicsSprite.x }
  get y() { return this.physicsSprite.y }
  set x(v: number) { this.physicsSprite.x = v }
  set y(v: number) { this.physicsSprite.y = v }
  get active() { return this.physicsSprite.active }
  get body() { return this.physicsSprite.body }

  setVelocity(vx: number, vy: number) {
    this.physicsSprite.setVelocity(vx, vy)
  }

  setCollideWorldBounds(v: boolean) {
    this.physicsSprite.setCollideWorldBounds(v)
  }

  takeDamage(amount: number, fromX?: number): boolean {
    this.currentHp -= amount
    this.updateHpBar()

    // Knockback: push monster away from attack source
    if (fromX !== undefined) {
      const dir = this.x > fromX ? 1 : -1
      this.setVelocity(dir * 300, -100)
      setTimeout(() => {
        if (this.active) this.setVelocity(0, 0)
      }, 200)
    }

    // Squash & stretch effect on container
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 0.7,
      scaleY: 1.3,
      duration: 60,
      ease: "Power1",
      onComplete: () => {
        if (!this.active) return
        this.scene.tweens.add({
          targets: this.container,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: "Bounce.easeOut",
        })
      },
    })

    // Red flash via alpha on bodyGraphics
    this.scene.tweens.add({
      targets: this.bodyGraphics,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      ease: "Quad.easeOut",
    })

    return this.currentHp <= 0
  }

  updateLabels() {
    // Labels are children of the container at fixed offsets, no manual repositioning needed
    // Just refresh HP bar position within container space
    this.updateHpBar()
  }

  /**
   * Chase & melee AI
   * Returns true if this monster did a melee attack this frame
   */
  updateAI(delta: number, playerX: number, playerY: number): boolean {
    if (!this.active || this.currentHp <= 0) return false

    const dx = playerX - this.x
    const dy = playerY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Handle confused state
    if (this.isConfused) {
      this.confusedTimer += delta
      if (this.confusedTimer >= this.CONFUSED_DURATION) {
        this.endConfused()
      } else {
        this.setVelocity(
          Math.cos(this.confusedDirection) * this.chaseSpeed * 0.6,
          Math.sin(this.confusedDirection) * this.chaseSpeed * 0.6,
        )
      }
      return false
    }

    if (dist <= this.meleeRange) {
      this.setVelocity(0, 0)

      const now = this.scene.time.now
      if (now - this.lastMeleeTime >= this.meleeCooldown) {
        this.lastMeleeTime = now
        this.scene.tweens.add({
          targets: this.container,
          scaleX: 1.2,
          scaleY: 0.8,
          duration: 100,
          yoyo: true,
          ease: "Power1",
          onComplete: () => {
            if (this.active) {
              this.container.setScale(1)
            }
          },
        })
        return true
      }
    } else {
      const targetVx = (dx / dist) * this.chaseSpeed
      const targetVy = (dy / dist) * this.chaseSpeed
      this.setVelocity(targetVx, targetVy)
      this.container.rotation = Math.atan2(dy, dx) - Math.PI / 2

      if (dist > this.meleeRange * 2) {
        const b = this.body as Phaser.Physics.Arcade.Body
        const blocked = b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down
        if (blocked) {
          this.stuckTimer += delta
          if (this.stuckTimer > 600 && !this.isConfused) {
            this.startConfused()
          }
        } else {
          this.stuckTimer = 0
        }
      }
    }

    return false
  }

  private startConfused() {
    this.isConfused = true
    this.confusedTimer = 0
    this.confusedDirection = Math.random() * Math.PI * 2
    this.confusedEmoji = this.scene.add.text(0, -96, "?", {
      fontSize: "20px",
      color: "#ff4444",
      stroke: "#000000",
      strokeThickness: 3,
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(13)
    this.container.add(this.confusedEmoji)
  }

  private endConfused() {
    this.isConfused = false
    this.stuckTimer = 0
    if (this.confusedEmoji) {
      this.confusedEmoji.destroy()
      this.confusedEmoji = null
    }
  }

  destroyMonster() {
    this.endConfused()
    this.emojiLabel.destroy()
    this.wordLabel.destroy()
    this.hpBar.destroy()
    this.bodyGraphics.destroy()
    this.physicsSprite.destroy()
    this.container.destroy()
  }
}

// --- Monster drawing helpers (unchanged) ---

function drawMonsterBody(gfx: Phaser.GameObjects.Graphics, bodyColor: number, headColor: number, ox: number, oy: number, w: number, h: number) {
  const bw = w - 8
  const bh = h - 28
  const hw = w - 16
  const hh = h - 34

  gfx.fillStyle(bodyColor)
  gfx.fillRect(ox + 4, oy + 24, bw, bh)
  gfx.fillStyle(headColor)
  gfx.fillRect(ox + 8, oy + 0, hw, hh)
  gfx.fillStyle(0xffffff)
  gfx.fillRect(ox + 14, oy + 8, 7, 8)
  gfx.fillRect(ox + w - 21, oy + 8, 7, 8)
  gfx.fillStyle(0xff4444)
  gfx.fillRect(ox + 16, oy + 10, 4, 5)
  gfx.fillRect(ox + w - 19, oy + 10, 4, 5)
  gfx.fillStyle(0x000000)
  gfx.fillRect(ox + 16, oy + hh - 2, w - 32, 3)
}

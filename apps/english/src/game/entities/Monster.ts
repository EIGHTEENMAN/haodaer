import Phaser from "phaser"
import { WordData } from "../../stores/gameStore"

export class Monster extends Phaser.Physics.Arcade.Sprite {
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

  static preCreateTexture(scene: Phaser.Scene, wordId: number, difficulty: number, isBoss: boolean) {
    const bodyType = wordId % 4
    const key = `__MON_${wordId}_${difficulty}_${bodyType}`
    if (scene.textures.exists(key)) return
    const gfx = scene.add.graphics()
    const hue = (difficulty * 51) % 360
    const bodyColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.45).color
    const headColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.5, 0.55).color

    if (isBoss) {
      drawMonsterBody(gfx, bodyColor, headColor, 0, 0, 52, 66)
      gfx.fillStyle(0xffd700)
      gfx.fillRect(16, -12, 36, 10)
      gfx.fillRect(20, -16, 8, 8)
      gfx.fillRect(30, -14, 8, 6)
      gfx.fillRect(40, -16, 8, 8)
      gfx.generateTexture(key, 64, 80)
    } else {
      const [w, h] = drawMonsterShape(gfx, bodyColor, headColor, bodyType)
      gfx.generateTexture(key, w, h)
    }
    gfx.destroy()
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    wordData: WordData,
    chaseSpeed: number,
    meleeDamage: number,
    isBoss: boolean,
  ) {
    const textureKey = `__MON_${wordData.id}_${wordData.difficulty}_${wordData.id % 4}`
    super(scene, x, y, textureKey)

    this.wordData = wordData
    this.isBoss = isBoss
    this.bodyType = wordData.id % 4

    // Chase speed: player SPEED=250, monster slower so player can outrun
    this.chaseSpeed = chaseSpeed  // 120-220 range
    this.meleeDamage = meleeDamage // 8-20 range

    // HP scales with difficulty
    const hpBase = isBoss ? 500 : 80
    this.maxHp = hpBase + wordData.difficulty * 20
    this.currentHp = this.maxHp

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setSize(36, 44)
    this.setDepth(9)

    this.createMonsterTexture(textureKey, wordData.difficulty)

    // Emoji label (above monster)
    const emojiChar = wordData.emoji || (this.isBoss ? "👑" : "👾")
    this.emojiLabel = scene.add.text(x, y - 72, emojiChar, {
      fontSize: this.isBoss ? "30px" : "22px",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12)

    // Word label (English word above monster)
    this.wordLabel = scene.add.text(x, y - 44, wordData.word, {
      fontSize: "12px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(12)

    this.hpBar = scene.add.graphics().setDepth(12)
    this.updateHpBar()

    // Boss idle bob
    if (this.isBoss) {
      scene.tweens.add({
        targets: this,
        y: y - 8,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      })
    }
  }

  private createMonsterTexture(key: string, difficulty: number) {
    if (this.scene.textures.exists(key)) return
    const gfx = this.scene.add.graphics()
    const hue = (difficulty * 51) % 360
    const bodyColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.45).color
    const headColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.5, 0.55).color

    if (this.isBoss) {
      drawMonsterBody(gfx, bodyColor, headColor, 0, 0, 52, 66)
      gfx.fillStyle(0xffd700)
      gfx.fillRect(16, -12, 36, 10)
      gfx.fillRect(20, -16, 8, 8)
      gfx.fillRect(30, -14, 8, 6)
      gfx.fillRect(40, -16, 8, 8)
      gfx.generateTexture(key, 64, 80)
    } else {
      const [w, h] = drawMonsterShape(gfx, bodyColor, headColor, this.bodyType)
      gfx.generateTexture(key, w, h)
    }
    gfx.destroy()
  }

  updateHpBar() {
    this.hpBar.clear()
    const barWidth = 54
    const barHeight = 5
    const x = this.x - barWidth / 2
    const y = this.y - 52
    const ratio = this.currentHp / this.maxHp

    this.hpBar.fillStyle(0x333333)
    this.hpBar.fillRect(x, y, barWidth, barHeight)
    const hpColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444
    const fillW = Math.max(0, Math.floor(ratio * barWidth))
    this.hpBar.fillStyle(hpColor)
    this.hpBar.fillRect(x, y, fillW, barHeight)
  }

  takeDamage(amount: number, fromX?: number): boolean {
    this.currentHp -= amount
    this.updateHpBar()

    // Knockback: push monster away from attack source
    if (fromX !== undefined) {
      const dir = this.x > fromX ? 1 : -1
      this.setVelocity(dir * 300, -100)
      this.scene.time.delayedCall(200, () => {
        if (this.active) this.setVelocity(0, 0)
      })
    }

    // Squash & stretch effect
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.7,
      scaleY: 1.3,
      duration: 60,
      ease: "Power1",
      onComplete: () => {
        if (!this.active) return
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: "Bounce.easeOut",
        })
      },
    })

    // Red flash
    this.setTint(0xff4444)
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint()
    })

    return this.currentHp <= 0
  }

  updateLabels() {
    this.emojiLabel.setPosition(this.x, this.y - 72)
    this.wordLabel.setPosition(this.x, this.y - 44)
    if (this.confusedEmoji) {
      this.confusedEmoji.setPosition(this.x, this.y - 96)
    }
    this.hpBar.setPosition(0, 0)
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
        // Wander in confused direction
        this.setVelocity(
          Math.cos(this.confusedDirection) * this.chaseSpeed * 0.6,
          Math.sin(this.confusedDirection) * this.chaseSpeed * 0.6,
        )
      }
      return false
    }

    if (dist <= this.meleeRange) {
      // In melee range - attack player
      this.setVelocity(0, 0)

      const now = this.scene.time.now
      if (now - this.lastMeleeTime >= this.meleeCooldown) {
        this.lastMeleeTime = now
        // Wind-up squash
        this.scene.tweens.add({
          targets: this,
          scaleX: 1.2,
          scaleY: 0.8,
          duration: 100,
          yoyo: true,
          ease: "Power1",
          onComplete: () => {
            if (this.active) {
              this.setScale(1)
            }
          },
        })
        return true // dealt melee damage this frame
      }
    } else {
      // Chase the player
      const targetVx = (dx / dist) * this.chaseSpeed
      const targetVy = (dy / dist) * this.chaseSpeed
      this.setVelocity(targetVx, targetVy)

      // Face toward movement direction
      this.rotation = Math.atan2(dy, dx) - Math.PI / 2

      // Check if stuck on obstacle
      if (dist > this.meleeRange * 2) {
        const body = this.body as Phaser.Physics.Arcade.Body
        const blocked = body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down
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

    // Show "?" emoji
    this.confusedEmoji = this.scene.add.text(this.x, this.y - 96, "?", {
      fontSize: "20px",
      color: "#ff4444",
      stroke: "#000000",
      strokeThickness: 3,
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(13)
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
    if (this.emojiLabel) this.emojiLabel.destroy()
    if (this.wordLabel) this.wordLabel.destroy()
    if (this.hpBar) this.hpBar.destroy()
    this.destroy()
  }
}

// --- Monster texture helpers (unchanged) ---

function drawMonsterShape(gfx: Phaser.GameObjects.Graphics, bodyColor: number, headColor: number, type: number): [number, number] {
  const configs: [number, number, number, number][] = [
    [0, 0, 52, 66],
    [6, -4, 40, 76],
    [-4, 2, 60, 56],
    [2, -2, 48, 64],
  ]
  const c = configs[type] || configs[0]
  drawMonsterBody(gfx, bodyColor, headColor, c[0], c[1], c[2], c[3])
  return [c[2], c[3]]
}

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

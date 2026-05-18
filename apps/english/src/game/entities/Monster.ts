import Phaser from "phaser"
import { WordData } from "../../stores/gameStore"
import { Projectile } from "./Projectile"
import { StageConfig } from "../../data/stages"

export class Monster extends Phaser.Physics.Arcade.Sprite {
  wordData: WordData
  maxHp: number
  currentHp: number
  isBoss: boolean
  private wordLabel: Phaser.GameObjects.Text
  private emojiLabel: Phaser.GameObjects.Text
  private hpBar: Phaser.GameObjects.Graphics
  private projectilesGroup: Phaser.Physics.Arcade.Group
  private fireTimer = 0
  private fireInterval: number
  private hasScatter: boolean
  private bulletSpeedLevel: number
  private driftAngle = Math.random() * Math.PI * 2
  private driftSpeed = 15 + Math.random() * 10

  // Generate texture BEFORE sprite creation so Phaser has it at super() time
  static preCreateTexture(scene: Phaser.Scene, wordId: number, difficulty: number, isBoss: boolean) {
    const key = '__MON_' + wordId + '_' + difficulty
    if (scene.textures.exists(key)) return
    const gfx = scene.add.graphics()
    const hue = (difficulty * 51) % 360
    const bodyColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.45).color
    const headColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.5, 0.55).color
    gfx.fillStyle(bodyColor)
    gfx.fillRect(4, 24, 44, 40)
    gfx.fillStyle(headColor)
    gfx.fillRect(8, 0, 36, 30)
    gfx.fillStyle(0xffffff)
    gfx.fillRect(14, 8, 10, 10)
    gfx.fillRect(30, 8, 10, 10)
    gfx.fillStyle(0xff4444)
    gfx.fillRect(17, 11, 6, 6)
    gfx.fillRect(33, 11, 6, 6)
    gfx.fillStyle(0x000000)
    gfx.fillRect(16, 22, 22, 4)
    if (isBoss) {
      gfx.fillStyle(0xffd700)
      gfx.fillRect(12, -6, 30, 8)
      gfx.fillRect(16, -10, 6, 6)
      gfx.fillRect(24, -8, 6, 4)
      gfx.fillRect(32, -10, 6, 6)
    }
    const w = 52 + (isBoss ? 8 : 0)
    const h = 66 + (isBoss ? 12 : 0)
    gfx.generateTexture(key, w, h)
    gfx.destroy()
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    wordData: WordData,
    projectilesGroup: Phaser.Physics.Arcade.Group,
    stageConfig: StageConfig
  ) {
    // Simple colored texture key unique per monster
    const textureKey = `__MON_${wordData.id}_${wordData.difficulty}`
    super(scene, x, y, textureKey)

    this.wordData = wordData
    this.projectilesGroup = projectilesGroup
    this.isBoss = stageConfig.stage === 6
    this.bulletSpeedLevel = stageConfig.bulletSpeed
    this.hasScatter = stageConfig.hasScatter

    // Fire rate based on bullet speed config (0-3)
    const fireRates = [0, 3000, 2000, 1200, 800]
    this.fireInterval = fireRates[Math.min(this.bulletSpeedLevel, 4)]

    // HP scales with difficulty
    this.maxHp = wordData.difficulty * (this.isBoss ? 200 : 30)
    this.currentHp = this.maxHp

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setSize(48, 56)
    this.setDepth(9)

    this.createMonsterTexture(textureKey, wordData.difficulty)

    // Emoji
    const emojiChar = wordData.emoji || (this.isBoss ? "👑" : "👾")
    this.emojiLabel = scene.add.text(x, y - 80, emojiChar, {
      fontSize: this.isBoss ? "30px" : "24px",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12)

    // Word label (English word on monster)
    this.wordLabel = scene.add.text(x, y - 48, wordData.word, {
      fontSize: "12px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(12)

    this.hpBar = scene.add.graphics().setDepth(12)
    this.updateHpBar()

    // Boss gets a slow idle bob
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

    // Square body
    gfx.fillStyle(bodyColor)
    gfx.fillRect(4, 24, 44, 40)

    // Square head
    gfx.fillStyle(headColor)
    gfx.fillRect(8, 0, 36, 30)

    // Eyes
    gfx.fillStyle(0xffffff)
    gfx.fillRect(14, 8, 10, 10)
    gfx.fillRect(30, 8, 10, 10)
    gfx.fillStyle(0xff4444)
    gfx.fillRect(17, 11, 6, 6)
    gfx.fillRect(33, 11, 6, 6)

    // Mouth
    gfx.fillStyle(0x000000)
    gfx.fillRect(16, 22, 22, 4)

    // Boss has a crown
    if (this.isBoss) {
      gfx.fillStyle(0xffd700)
      gfx.fillRect(12, -6, 30, 8)
      gfx.fillRect(16, -10, 6, 6)
      gfx.fillRect(24, -8, 6, 4)
      gfx.fillRect(32, -10, 6, 6)
    }

    gfx.generateTexture(key, 52 + (this.isBoss ? 8 : 0), 66 + (this.isBoss ? 12 : 0))
    gfx.destroy()
  }

  updateHpBar() {
    this.hpBar.clear()
    const barWidth = 60
    const barHeight = 6
    const x = this.x - barWidth / 2
    const y = this.y - 56
    const ratio = this.currentHp / this.maxHp

    this.hpBar.fillStyle(0x333333)
    this.hpBar.fillRect(x, y, barWidth, barHeight)
    const hpColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444
    const fillW = Math.max(0, Math.floor(ratio * barWidth))
    this.hpBar.fillStyle(hpColor)
    this.hpBar.fillRect(x, y, fillW, barHeight)
  }

  takeDamage(amount: number): boolean {
    this.currentHp -= amount
    this.updateHpBar()

    // Red flash
    this.setTint(0xff4444)
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint()
    })

    return this.currentHp <= 0
  }

  updateLabelPositions() {
    this.emojiLabel.setPosition(this.x, this.y - 80)
    this.wordLabel.setPosition(this.x, this.y - 48)
    this.hpBar.setPosition(0, 0)
    this.updateHpBar()
  }

  fireAtPlayer(playerX: number, playerY: number) {
    if (this.fireInterval <= 0) return // bulletSpeed = 0 means no bullets

    const now = this.scene.time.now
    if (now - this.fireTimer < this.fireInterval) return
    this.fireTimer = now

    const dx = playerX - this.x
    const dy = playerY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 10) return

    const nx = dx / dist
    const ny = dy / dist

    // Choose bullet type based on stage config
    if (this.hasScatter && Math.random() < 0.25) {
      // Scatter shot
      const bullets = Projectile.spawnScatter(this.scene, this.x, this.y, playerX, playerY)
      bullets.forEach(b => this.projectilesGroup.add(b))
    } else if (this.bulletSpeedLevel >= 2 && Math.random() < 0.3) {
      // Letter bullet
      const letter = this.wordData.word.charAt(Math.floor(Math.random() * this.wordData.word.length))
      const p = new Projectile(this.scene, this.x, this.y, "LETTER", nx, ny, letter, { x: playerX, y: playerY })
      this.projectilesGroup.add(p)
    } else {
      // Fireball (with tracking if boss)
      const type = this.isBoss ? "BOSS" : "FIREBALL"
      const p = new Projectile(this.scene, this.x, this.y, type, nx, ny, "", this.isBoss ? undefined : undefined)
      this.projectilesGroup.add(p)
    }
  }

  destroyMonster() {
    this.emojiLabel.destroy()
    this.wordLabel.destroy()
    this.hpBar.destroy()
    this.destroy()
  }
}

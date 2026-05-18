import Phaser from "phaser"
import { WordData } from "../../stores/gameStore"

const TILE = 80

export class Monster extends Phaser.Physics.Arcade.Sprite {
  wordData: WordData
  maxHp: number
  currentHp: number
  private wordLabel: Phaser.GameObjects.Text
  private emojiLabel: Phaser.GameObjects.Text
  private hpBar: Phaser.GameObjects.Graphics
  private chaseRange = 400
  private speed = 100
  private isBoss = false

  constructor(scene: Phaser.Scene, x: number, y: number, wordData: WordData) {
    super(scene, x, y, "__MONSTER")
    this.wordData = wordData
    this.isBoss = wordData.difficulty >= 5 && wordData.difficulty % 5 === 0

    this.maxHp = this.isBoss ? wordData.difficulty * 150 : wordData.difficulty * 50
    this.currentHp = this.maxHp
    if (this.isBoss) this.speed = 75

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.setCollideWorldBounds(true)
    this.setSize(60, 70)
    this.setDepth(9)

    this.createMonsterTexture(wordData.difficulty)

    // Emoji label above monster
    const emojiChar = wordData.emoji || "👾"
    this.emojiLabel = scene.add.text(x, y - 120, emojiChar, {
      fontSize: this.isBoss ? "36px" : "28px",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12)

    // Word label
    this.wordLabel = scene.add.text(x, y - 70, wordData.word, {
      fontSize: this.isBoss ? "16px" : "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(12)

    this.hpBar = scene.add.graphics().setDepth(12)
    this.updateHpBar()

    scene.tweens.add({
      targets: this,
      y: y - 10,
      duration: 1000 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    })
  }

  private createMonsterTexture(difficulty: number) {
    if (this.scene.textures.exists("__MONSTER")) return
    const gfx = this.scene.add.graphics()

    const hue = (difficulty * 36) % 360
    const bodyColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.6, 0.4).color
    const headColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.5, 0.5).color
    const darkColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.7, 0.25).color

    if (this.isBoss) {
      gfx.fillStyle(0x444444)
      gfx.fillRect(5, 0, 70, 85)
      gfx.fillStyle(0x555555)
      gfx.fillRect(0, 5, 80, 10)
      gfx.fillStyle(0xff0000)
      gfx.fillRect(20, 20, 10, 10)
      gfx.fillRect(50, 20, 10, 10)
      gfx.fillStyle(0x880000)
      gfx.fillRect(25, 45, 30, 10)
      gfx.fillRect(30, 55, 20, 5)
    } else {
      // Square body (creeper-like)
      gfx.fillStyle(bodyColor)
      gfx.fillRect(10, 25, 60, 50)

      // Square head
      gfx.fillStyle(headColor)
      gfx.fillRect(15, 0, 50, 40)

      // Pixel eyes
      gfx.fillStyle(0xffffff)
      gfx.fillRect(22, 10, 12, 12)
      gfx.fillRect(45, 10, 12, 12)
      gfx.fillStyle(0x000000)
      gfx.fillRect(27, 15, 8, 8)
      gfx.fillRect(50, 15, 8, 8)

      // Mouth
      gfx.fillStyle(0x000000)
      gfx.fillRect(25, 30, 30, 5)

      // Feet
      gfx.fillStyle(darkColor)
      gfx.fillRect(12, 75, 22, 12)
      gfx.fillRect(45, 75, 22, 12)

      // Body stripes
      gfx.fillStyle(darkColor)
      gfx.fillRect(17, 40, 45, 5)
      gfx.fillRect(17, 60, 45, 5)
    }

    gfx.generateTexture("__MONSTER", TILE, Math.floor(TILE * 1.2))
    gfx.destroy()
  }

  updateHpBar() {
    this.hpBar.clear()
    const barWidth = 75
    const barHeight = 8
    const x = this.x - barWidth / 2
    const y = this.y - 80
    const ratio = this.currentHp / this.maxHp

    this.hpBar.fillStyle(0x333333)
    this.hpBar.fillRect(x, y, barWidth, barHeight)
    const hpColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444
    const blockWidth = Math.floor(ratio * 25) * 3
    this.hpBar.fillStyle(hpColor)
    this.hpBar.fillRect(x, y, blockWidth, barHeight)
  }

  takeDamage(amount: number): boolean {
    this.currentHp -= amount
    this.updateHpBar()

    // Red flash
    this.setTint(0xff4444)
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint()
    })

    // Knockback
    const angle = Math.atan2(this.y - this.scene.physics.world.bounds.centerY, this.x - this.scene.physics.world.bounds.centerX)
    this.scene.tweens.add({
      targets: this,
      x: Math.round((this.x + Math.cos(angle) * 20) / 10) * 10,
      y: Math.round((this.y + Math.sin(angle) * 20) / 10) * 10,
      duration: 80,
      yoyo: true,
    })

    return this.currentHp <= 0
  }

  update(playerX: number, playerY: number) {
    const dx = playerX - this.x
    const dy = playerY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < this.chaseRange && dist > 50) {
      const body = this.body as Phaser.Physics.Arcade.Body
      if (body) {
        body.setVelocity(
          (dx / dist) * this.speed,
          (dy / dist) * this.speed
        )
      }
    } else {
      const body = this.body as Phaser.Physics.Arcade.Body
      if (body) body.setVelocity(0, 0)
    }

    this.emojiLabel.setPosition(this.x, this.y - 120)
    this.wordLabel.setPosition(this.x, this.y - 70)
    this.hpBar.setPosition(0, 0)
    this.updateHpBar()
  }

  destroyMonster() {
    this.emojiLabel.destroy()
    this.wordLabel.destroy()
    this.hpBar.destroy()
    this.destroy()
  }
}

import Phaser from "phaser"

const SPEED = 400
const TILE = 80

export class Player {
  sprite: Phaser.Physics.Arcade.Sprite
  private scene: Phaser.Scene
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null
  private wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | null = null

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene
    this.createPlayerTexture()
    this.sprite = scene.physics.add.sprite(x, y, "__PLAYER")
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setSize(50, 70)
    this.sprite.setDepth(10)

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys()
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      }
    }

    const nameTag = scene.add.text(x, y - 70, "小勇士", {
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(11)
    this.sprite.on("destroy", () => nameTag.destroy())

    scene.events.on("update", () => {
      nameTag.setPosition(this.sprite.x, this.sprite.y - 70)
    })
  }

  private createPlayerTexture() {
    if (this.scene.textures.exists("__PLAYER")) return
    const gfx = this.scene.add.graphics()

    // Hat (red)
    gfx.fillStyle(0xdd4444)
    gfx.fillRect(20, 0, 40, 10)
    gfx.fillRect(18, 5, 45, 8)

    // Head block
    gfx.fillStyle(0xffcc99)
    gfx.fillRect(20, 10, 40, 35)

    // Hair
    gfx.fillStyle(0xcc9966)
    gfx.fillRect(20, 10, 40, 5)

    // Pixel eyes
    gfx.fillStyle(0x000000)
    gfx.fillRect(28, 20, 8, 8)
    gfx.fillRect(45, 20, 8, 8)
    gfx.fillStyle(0xffffff)
    gfx.fillRect(30, 20, 3, 3)
    gfx.fillRect(47, 20, 3, 3)

    // Mouth
    gfx.fillStyle(0x000000)
    gfx.fillRect(30, 35, 20, 3)

    // Body (blue shirt)
    gfx.fillStyle(0x4488cc)
    gfx.fillRect(25, 45, 30, 30)

    // Shirt stripe
    gfx.fillStyle(0x3377bb)
    gfx.fillRect(25, 60, 30, 5)

    // Arms
    gfx.fillStyle(0x4488cc)
    gfx.fillRect(15, 45, 10, 25)
    gfx.fillRect(55, 45, 10, 25)

    // Hands
    gfx.fillStyle(0xffcc99)
    gfx.fillRect(15, 65, 10, 8)
    gfx.fillRect(55, 65, 10, 8)

    // Legs
    gfx.fillStyle(0x335599)
    gfx.fillRect(28, 75, 12, 15)
    gfx.fillRect(45, 75, 12, 15)

    // Shoes
    gfx.fillStyle(0x333333)
    gfx.fillRect(25, 88, 15, 10)
    gfx.fillRect(43, 88, 15, 10)

    gfx.generateTexture("__PLAYER", TILE, Math.floor(TILE * 1.3))
    gfx.destroy()
  }

  setVelocity(vx: number, vy: number) {
    this.sprite.setVelocity(vx * SPEED, vy * SPEED)
  }

  update() {
    let vx = 0, vy = 0

    if (this.wasd) {
      if (this.wasd.W.isDown || this.cursors?.up.isDown) vy = -1
      if (this.wasd.S.isDown || this.cursors?.down.isDown) vy = 1
      if (this.wasd.A.isDown || this.cursors?.left.isDown) vx = -1
      if (this.wasd.D.isDown || this.cursors?.right.isDown) vx = 1
    }

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707
      vy *= 0.707
    }

    this.sprite.setVelocity(vx * SPEED, vy * SPEED)
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y }
  }

  destroy() {
    this.sprite.destroy()
  }
}

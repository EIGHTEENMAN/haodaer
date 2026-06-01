import Phaser from "phaser"
import eventBus, { GameEvents } from "../scenes/EventBus"

const SPEED = 250

export class Player {
  container: Phaser.GameObjects.Container
  graphics: Phaser.GameObjects.Graphics
  physicsSprite: Phaser.Physics.Arcade.Image
  private scene: Phaser.Scene
  private keys: {
    W: Phaser.Input.Keyboard.Key
    A: Phaser.Input.Keyboard.Key
    S: Phaser.Input.Keyboard.Key
    D: Phaser.Input.Keyboard.Key
    UP: Phaser.Input.Keyboard.Key
    DOWN: Phaser.Input.Keyboard.Key
    LEFT: Phaser.Input.Keyboard.Key
    RIGHT: Phaser.Input.Keyboard.Key
  } | null = null
  private spaceKey: Phaser.Input.Keyboard.Key | null = null

  // Touch input state
  private touchStartX = 0
  private touchStartY = 0
  private touchActive = false
  private touchId = -1

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene

    // Container (visual root)
    this.container = scene.add.container(x, y).setDepth(10)

    // Graphics — draw the player character
    this.graphics = scene.add.graphics()
    this.container.add(this.graphics)
    this.drawPlayer()

    // Physics sprite (invisible, for colliders and world bounds)
    this.physicsSprite = scene.physics.add.image(x, y, "__PIXEL")
    this.physicsSprite.setVisible(false)
    this.physicsSprite.body.setSize(36, 50)
    this.physicsSprite.setCollideWorldBounds(true)
    this.physicsSprite.setDepth(10)

    // Keyboard
    if (scene.input.keyboard) {
      this.keys = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        UP: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        DOWN: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        LEFT: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        RIGHT: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      }
      this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    }

    // Touch for mobile dodge
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.y < scene.scale.height * 0.85) {
        this.touchStartX = p.x
        this.touchStartY = p.y
        this.touchActive = true
        this.touchId = p.id
      }
    })
    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.touchActive && p.id === this.touchId) {
        const dx = p.x - this.touchStartX
        const dy = p.y - this.touchStartY
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 15) {
          this.physicsSprite.setVelocity(
            (dx / len) * SPEED,
            (dy / len) * SPEED
          )
        }
      }
    })
    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.id === this.touchId) {
        this.touchActive = false
        this.physicsSprite.setVelocity(0, 0)
      }
    })
  }

  private drawPlayer() {
    this.graphics.clear()
    const gfx = this.graphics

    // Head (skin tone)
    gfx.fillStyle(0xffcc99)
    gfx.fillRect(14 - 28, 5 - 33, 28, 22)

    // Black hair on top of head
    gfx.fillStyle(0x111111)
    gfx.fillRect(14 - 28, 5 - 33, 28, 6)

    // Eyes
    gfx.fillStyle(0x000000)
    gfx.fillRect(19 - 28, 11 - 33, 6, 5)
    gfx.fillRect(31 - 28, 11 - 33, 6, 5)

    // Mouth (determined)
    gfx.fillStyle(0x000000)
    gfx.fillRect(22 - 28, 18 - 33, 12, 2)

    // Body — yellow jumpsuit
    gfx.fillStyle(0xeebb00)
    gfx.fillRect(10 - 28, 27 - 33, 36, 24)

    // Black stripe
    gfx.fillStyle(0x222222)
    gfx.fillRect(26 - 28, 27 - 33, 4, 24)

    // Arms
    gfx.fillStyle(0xffcc99)
    gfx.fillRect(3 - 28, 28 - 33, 7, 18)
    gfx.fillRect(46 - 28, 28 - 33, 7, 18)

    // Legs
    gfx.fillStyle(0x222222)
    gfx.fillRect(14 - 28, 51 - 33, 12, 14)
    gfx.fillRect(30 - 28, 51 - 33, 12, 14)

    // Shoes
    gfx.fillStyle(0x333333)
    gfx.fillRect(14 - 28, 62 - 33, 12, 4)
    gfx.fillRect(30 - 28, 62 - 33, 12, 4)
  }

  /** Sync container to physics sprite position */
  syncVisual() {
    this.container.setPosition(this.physicsSprite.x, this.physicsSprite.y)
  }

  /** Proxy getters */
  get x() { return this.physicsSprite.x }
  get y() { return this.physicsSprite.y }
  get sprite() { return this.physicsSprite }

  update() {
    let vx = 0, vy = 0
    if (this.keys) {
      if (this.keys.W.isDown || this.keys.UP.isDown) vy = -1
      if (this.keys.S.isDown || this.keys.DOWN.isDown) vy = 1
      if (this.keys.A.isDown || this.keys.LEFT.isDown) vx = -1
      if (this.keys.D.isDown || this.keys.RIGHT.isDown) vx = 1
    }

    if (!this.touchActive && this.keys) {
      if (vx !== 0 && vy !== 0) {
        vx *= 0.707
        vy *= 0.707
      }
      this.physicsSprite.setVelocity(vx * SPEED, vy * SPEED)
    }

    // Space to trigger skill select / question
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      eventBus.emit(GameEvents.PLAYER_ATTACK)
    }
  }

  getPosition() {
    return { x: this.physicsSprite.x, y: this.physicsSprite.y }
  }

  destroy() {
    this.graphics.destroy()
    this.physicsSprite.destroy()
    this.container.destroy()
  }
}

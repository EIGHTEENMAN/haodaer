import Phaser from "phaser"
import eventBus, { GameEvents } from "../scenes/EventBus"

const SPEED = 250

export class Player {
  sprite: Phaser.Physics.Arcade.Sprite
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
    this.createPlayerTexture()
    this.sprite = scene.physics.add.sprite(x, y, "__PLAYER_NEW")
    this.sprite.setCollideWorldBounds(true)
    this.sprite.setSize(36, 50)
    this.sprite.setDepth(10)

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
          this.sprite.setVelocity(
            (dx / len) * SPEED,
            (dy / len) * SPEED
          )
        }
      }
    })
    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.id === this.touchId) {
        this.touchActive = false
        this.sprite.setVelocity(0, 0)
      }
    })
  }

  private createPlayerTexture() {
    if (this.scene.textures.exists("__PLAYER_NEW")) return
    const gfx = this.scene.add.graphics()

    // Body / armor (blue)
    gfx.fillStyle(0x4488cc)
    gfx.fillRect(10, 20, 36, 30)

    // Head (smaller for bullet dodge hitbox)
    gfx.fillStyle(0xffcc99)
    gfx.fillRect(14, 5, 28, 22)

    // Eyes
    gfx.fillStyle(0x000000)
    gfx.fillRect(19, 10, 6, 6)
    gfx.fillRect(31, 10, 6, 6)

    // Mouth (determined)
    gfx.fillStyle(0x000000)
    gfx.fillRect(22, 18, 12, 2)

    // Helmet visor
    gfx.fillStyle(0x88ccff)
    gfx.fillRect(14, 6, 28, 4)

    // Legs
    gfx.fillStyle(0x335599)
    gfx.fillRect(14, 50, 12, 14)
    gfx.fillRect(30, 50, 12, 14)

    gfx.generateTexture("__PLAYER_NEW", 56, 66)
    gfx.destroy()
  }

  update() {
    // WASD + Arrow keys movement
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
      this.sprite.setVelocity(vx * SPEED, vy * SPEED)
    }

    // Space to trigger skill select / question
    if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      eventBus.emit(GameEvents.PLAYER_ATTACK)
    }
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y }
  }

  destroy() {
    this.sprite.destroy()
  }
}

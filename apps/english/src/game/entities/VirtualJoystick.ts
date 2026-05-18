import Phaser from "phaser"

const BASE_RADIUS = 50
const THUMB_RADIUS = 25
const MAX_DISTANCE = 40

export class VirtualJoystick {
  private scene: Phaser.Scene
  private base: Phaser.GameObjects.Arc | null = null
  private thumb: Phaser.GameObjects.Arc | null = null
  private baseX = 100
  private baseY = 500
  private active = false
  private pointerId = -1
  dx = 0
  dy = 0
  visible = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.visible = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ("ontouchstart" in window && window.innerWidth < 1024)

    if (!this.visible) return

    this.base = scene.add.circle(this.baseX, this.baseY, BASE_RADIUS, 0xffffff, 0.2)
    this.thumb = scene.add.circle(this.baseX, this.baseY, THUMB_RADIUS, 0xffffff, 0.5)
    this.base.setDepth(100)
    this.thumb.setDepth(101)

    scene.input.on("pointerdown", this.onPointerDown.bind(this))
    scene.input.on("pointermove", this.onPointerMove.bind(this))
    scene.input.on("pointerup", this.onPointerUp.bind(this))
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.visible) return
    // Only respond to left side of screen
    if (pointer.x > this.scene.scale.width / 2) return
    this.active = true
    this.pointerId = pointer.id
    this.baseX = Math.min(pointer.x, this.scene.scale.width / 2 - 20)
    this.baseY = Math.max(pointer.y, this.scene.scale.height * 0.3)
    this.base?.setPosition(this.baseX, this.baseY)
    this.thumb?.setPosition(this.baseX, this.baseY)
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.active || pointer.id !== this.pointerId) return
    const dx = pointer.x - this.baseX
    const dy = pointer.y - this.baseY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > MAX_DISTANCE) {
      const angle = Math.atan2(dy, dx)
      this.thumb?.setPosition(this.baseX + Math.cos(angle) * MAX_DISTANCE, this.baseY + Math.sin(angle) * MAX_DISTANCE)
    } else {
      this.thumb?.setPosition(pointer.x, pointer.y)
    }
    this.dx = dx / MAX_DISTANCE
    this.dy = dy / MAX_DISTANCE
    // Clamp
    this.dx = Math.max(-1, Math.min(1, this.dx))
    this.dy = Math.max(-1, Math.min(1, this.dy))
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.active || pointer.id !== this.pointerId) return
    this.active = false
    this.dx = 0
    this.dy = 0
    this.thumb?.setPosition(this.baseX, this.baseY)
  }

  isActive() {
    return this.active
  }

  destroy() {
    this.base?.destroy()
    this.thumb?.destroy()
  }
}

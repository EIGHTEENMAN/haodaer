import Phaser from "phaser"

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" })
  }

  create() {
    const { width, height } = this.scale

    // Background
    this.cameras.main.setBackgroundColor("#1a1a2e")

    // Title
    const title = this.add.text(width / 2, height / 2 - 60, "学 英 语", {
      fontSize: "48px",
      color: "#ffd700",
      stroke: "#8b4513",
      strokeThickness: 6,
      fontFamily: "monospace",
    }).setOrigin(0.5)

    // Pixel-style underline effect
    const underline = this.add.text(width / 2, height / 2 - 10, "▔▔▔▔▔▔▔▔", {
      fontSize: "24px",
      color: "#ffd700",
    }).setOrigin(0.5)

    // Subtitle
    this.add.text(width / 2, height / 2 + 30, "打怪学单词", {
      fontSize: "20px",
      color: "#88ccff",
      fontFamily: "monospace",
    }).setOrigin(0.5)

    // Loading bar
    const barBg = this.add.graphics()
    barBg.fillStyle(0x333333)
    barBg.fillRect(width / 2 - 100, height / 2 + 80, 200, 20)

    const bar = this.add.graphics()
    let progress = 0

    // Simulate loading
    const timer = this.time.addEvent({
      delay: 30,
      repeat: 30,
      callback: () => {
        progress += 1 / 30
        bar.clear()
        bar.fillStyle(0x44cc44)
        bar.fillRect(width / 2 - 98, height / 2 + 82, 196 * progress, 16)

        if (progress >= 1) {
          this.cameras.main.fadeOut(500, 0, 0, 0)
          this.time.delayedCall(500, () => {
            this.scene.start("GameScene")
          })
        }
      },
    })

    // Fade in
    this.cameras.main.fadeIn(500)
  }
}

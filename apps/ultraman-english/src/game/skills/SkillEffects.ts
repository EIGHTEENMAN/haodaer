import Phaser from "phaser"

export class SkillEffects {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  playSkillEffect(skillIndex: number, targetX: number, targetY: number, comboLevel: number) {
    switch (skillIndex) {
      case 0: this.punchEffect(targetX, targetY, comboLevel); break
      case 1: this.flyingKickEffect(targetX, targetY, comboLevel); break
      case 2: this.shoulderThrowEffect(targetX, targetY, comboLevel); break
      case 3: this.spinningKickEffect(targetX, targetY, comboLevel); break
      case 4: this.specialMoveEffect(targetX, targetY, comboLevel); break
    }
  }

  private shake(duration: number, intensity: number) {
    this.scene.cameras.main.shake(duration, intensity / 1000)
  }

  private flash(color: number, duration: number) {
    const f = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.scale.width * 2,
      this.scene.scale.height * 2,
      color, 0.8
    ).setDepth(200).setScrollFactor(0)

    this.scene.tweens.add({
      targets: f,
      alpha: 0,
      duration,
      onComplete: () => f.destroy(),
    })
  }

  private showSkillName(name: string, color: string, extra = false) {
    const names = ["👊 拳击", "🦶 飞踢", "💪 过肩摔", "🌀 旋风腿", "🌟 必杀技"]
    const idx = SKILL_NAMES.indexOf(name)
    const displayName = idx >= 0 ? names[idx] : name

    const text = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 40,
      displayName,
      {
        fontSize: extra ? "56px" : "42px",
        color,
        stroke: "#000000",
        strokeThickness: extra ? 8 : 5,
        fontFamily: "monospace",
        fontStyle: "bold",
      }
    ).setOrigin(0.5).setDepth(300).setScrollFactor(0).setScale(0)

    this.scene.tweens.add({
      targets: text,
      scale: 1.5,
      duration: 200,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          x: text.x + Phaser.Math.Between(-3, 3),
          y: text.y + Phaser.Math.Between(-3, 3),
          duration: 50,
          repeat: 5,
          yoyo: true,
          onComplete: () => {
            this.scene.tweens.add({
              targets: text,
              alpha: 0,
              scale: 0.5,
              duration: 800,
              delay: 500,
              onComplete: () => text.destroy(),
            })
          },
        })
      },
    })

    if (extra) {
      const border = this.scene.add.graphics().setDepth(301).setScrollFactor(0)
      border.lineStyle(4, 0xffd700, 0.8)
      border.strokeRect(
        this.scene.cameras.main.centerX - 180,
        this.scene.cameras.main.centerY - 100,
        360, 120
      )
      this.scene.tweens.add({
        targets: border,
        alpha: 0,
        duration: 2000,
        onComplete: () => border.destroy(),
      })
    }
  }

  private speedLines() {
    const cx = this.scene.cameras.main.centerX
    const cy = this.scene.cameras.main.centerY
    const count = 25 + Math.floor(Math.random() * 15)

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 200 + Math.random() * 300
      const startX = cx + Math.cos(angle) * dist
      const startY = cy + Math.sin(angle) * dist
      const len = 30 + Math.random() * 60

      const line = this.scene.add.graphics().setDepth(199).setScrollFactor(0)
      line.lineStyle(2, 0xffffff, 0.6)
      line.beginPath()
      line.moveTo(startX, startY)
      line.lineTo(startX - Math.cos(angle) * len, startY - Math.sin(angle) * len)
      line.strokePath()

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        onComplete: () => line.destroy(),
      })
    }
  }

  // Square particles (Minecraft style)
  private squareBurst(x: number, y: number, color: number, count: number, size = 4) {
    for (let i = 0; i < count; i++) {
      const pSize = size * (0.5 + Math.random() * 0.5)
      const p = this.scene.add.rectangle(x, y, pSize, pSize, color, 0.9).setDepth(50)
      const angle = Math.random() * Math.PI * 2
      const dist = 20 + Math.random() * 70
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        angle: Math.random() * 360,
        duration: 350 + Math.random() * 300,
        ease: "Power2",
        onComplete: () => p.destroy(),
      })
    }
  }

  private punchEffect(x: number, y: number, combo: number) {
    this.shake(100, 5 + combo * 2)
    const impact = this.scene.add.rectangle(x, y, 30, 30, 0xffff00, 0.7).setDepth(50)
    this.scene.tweens.add({
      targets: impact,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 200,
      onComplete: () => impact.destroy(),
    })
    this.squareBurst(x, y, 0xffdd44, 25 + combo * 5)
    this.showSkillName("拳击", "#ffdd44")
  }

  private flyingKickEffect(x: number, y: number, combo: number) {
    this.shake(150, 8 + combo * 2)
    this.flash(0x4488ff, 100)
    for (let i = 0; i < 5; i++) {
      const trail = this.scene.add.rectangle(
        x - 20 + i * 10,
        y + Phaser.Math.Between(-10, 10),
        12 - i * 2, 12 - i * 2,
        0x4488ff, 0.5 - i * 0.08
      ).setDepth(49)
      this.scene.tweens.add({
        targets: trail,
        alpha: 0,
        angle: 45 * i,
        duration: 200 + i * 50,
        onComplete: () => trail.destroy(),
      })
    }
    this.squareBurst(x, y, 0x4488ff, 40 + combo * 5)
    this.showSkillName("飞踢", "#88bbff")
  }

  private shoulderThrowEffect(x: number, y: number, combo: number) {
    this.shake(200, 10 + combo * 3)
    this.flash(0xaa44ff, 80)
    const ring = this.scene.add.rectangle(x, y, 20, 20, 0xaa44ff, 0.8).setDepth(50)
    this.scene.tweens.add({
      targets: ring,
      scaleX: 6,
      scaleY: 6,
      alpha: 0,
      duration: 300,
      onComplete: () => ring.destroy(),
    })
    this.squareBurst(x, y, 0xaa44ff, 50 + combo * 8)
    this.showSkillName("过肩摔", "#cc88ff")
  }

  private spinningKickEffect(x: number, y: number, combo: number) {
    this.shake(250, 12 + combo * 4)
    this.flash(0xffffff, 150)
    this.speedLines()
    const spinSquare = this.scene.add.graphics().setDepth(50)
    spinSquare.lineStyle(4, 0xff4444, 0.8)
    spinSquare.strokeRect(x - 40, y - 40, 80, 80)
    this.scene.tweens.add({
      targets: spinSquare,
      scaleX: 3.5,
      scaleY: 3.5,
      alpha: 0,
      angle: 180,
      duration: 400,
      onComplete: () => spinSquare.destroy(),
    })
    this.squareBurst(x, y, 0xff4444, 60 + combo * 10)
    this.squareBurst(x, y, 0x44ff44, 30 + combo * 5)
    this.showSkillName("旋风腿", "#ff6644")
  }

  private specialMoveEffect(x: number, y: number, combo: number) {
    this.shake(400, 20 + combo * 5)
    this.flash(0xffffff, 80)
    this.scene.time.delayedCall(100, () => this.flash(0x000000, 80))
    this.scene.time.delayedCall(200, () => this.flash(0xffffff, 100))
    this.speedLines()
    this.scene.cameras.main.zoomTo(1.3, 300, "Sine.easeInOut")
    this.scene.time.delayedCall(800, () => {
      this.scene.cameras.main.zoomTo(1, 400, "Sine.easeInOut")
    })
    const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff]
    colors.forEach((c, i) => {
      this.scene.time.delayedCall(i * 50, () => {
        this.squareBurst(x, y, c, 20, 5 + Math.random() * 3)
      })
    })
    const bigRing = this.scene.add.rectangle(x, y, 40, 40, 0xffd700, 0.9).setDepth(50)
    this.scene.tweens.add({
      targets: bigRing,
      scaleX: 7,
      scaleY: 7,
      alpha: 0,
      angle: 90,
      duration: 500,
      onComplete: () => bigRing.destroy(),
    })
    this.showSkillName("必杀技", "#ffd700", true)
  }

  playDeathEffect(x: number, y: number) {
    this.squareBurst(x, y, 0xff4444, 15, 4)
    this.squareBurst(x, y, 0xffffff, 10, 6)
    const xpText = this.scene.add.text(x, y, "+XP", {
      fontSize: "18px",
      color: "#44ff44",
      stroke: "#000000",
      strokeThickness: 3,
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(50)
    this.scene.tweens.add({
      targets: xpText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => xpText.destroy(),
    })
  }

  playComboPopup(combo: number) {
    if (combo < 3) return
    const comboTexts = ["3x COMBO!", "5x COMBO!", "10x COMBO!", "20x COMBO!!!"]
    const idx = combo >= 20 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1 : 0
    const colors = ["#44ff44", "#44ccff", "#ff44ff", "#ffd700"]

    const text = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY + 60,
      comboTexts[idx],
      {
        fontSize: idx >= 3 ? "48px" : "36px",
        color: colors[idx],
        stroke: "#000000",
        strokeThickness: 6,
        fontFamily: "monospace",
        fontStyle: "bold",
      }
    ).setOrigin(0.5).setDepth(250).setScrollFactor(0).setScale(0)

    this.scene.tweens.add({
      targets: text,
      scale: 1.3,
      duration: 150,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          scale: 1,
          alpha: 0,
          duration: 1500,
          delay: 800,
          onComplete: () => text.destroy(),
        })
      },
    })
  }
}

const SKILL_NAMES = ["拳击", "飞踢", "过肩摔", "旋风腿", "必杀技"]

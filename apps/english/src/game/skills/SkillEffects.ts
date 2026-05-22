import Phaser from "phaser"

export class SkillEffects {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // ─── Space mash: hit effect (BIG) ───

  playHitEffect(x: number, y: number, combo = 0) {
    // Big sweeping slash arc (90px)
    this.slashArc(x - 40, y - 25, x + 40, y + 25, 0xffdd44, 4)
    this.slashArc(x - 30, y - 15, x + 30, y + 15, 0xffffff, 2)

    // Expanding golden ring
    const ring = this.scene.add.circle(x, y, 6, 0xffdd44, 0.7).setDepth(50)
    this.scene.tweens.add({
      targets: ring,
      scaleX: 4.5, scaleY: 4.5,
      alpha: 0,
      duration: 250,
      ease: "Power2",
      onComplete: () => ring.destroy(),
    })

    // Particle burst: more at higher combo
    const particleCount = combo >= 20 ? 40 : combo >= 10 ? 30 : 20
    this.squareBurst(x, y, 0xffdd44, particleCount, 4)

    // Screen shake scales with combo
    const shakeIntensity = 0.003 + Math.min(0.01, combo * 0.0005)
    const shakeDuration = 40 + Math.min(60, combo * 3)
    this.shake(shakeDuration, shakeIntensity)

    // Ground cracks at combo >= 5
    if (combo >= 5) {
      this.groundCracks(x, y, 0xffdd44, 6 + Math.floor(combo / 5))
    }

    // Screen flash at combo >= 10
    if (combo >= 10) {
      this.flash(0xffffff, 40)
    }

    // Second ring at combo >= 15
    if (combo >= 15) {
      const ring2 = this.scene.add.circle(x, y, 4, 0xffaa00, 0.5).setDepth(50)
      this.scene.tweens.add({
        targets: ring2,
        scaleX: 6, scaleY: 6,
        alpha: 0,
        duration: 350,
        delay: 60,
        ease: "Power2",
        onComplete: () => ring2.destroy(),
      })
    }
  }

  // ─── Space mash: whiff (wrong monster) ───

  playWhiffEffect(x: number, y: number) {
    // Small dull spark, no damage feel
    this.sparkBurst(x, y, 0x666666, 3)
  }

  // ─── Skills 1-5 ───

  playSkillEffect(skillIndex: number, px: number, py: number, mx: number, my: number, combo: number) {
    switch (skillIndex) {
      case 0: this.shockPunch(mx, my, combo); break
      case 1: this.windKick(px, py, mx, my, combo); break
      case 2: this.groundSlam(mx, my, combo); break
      case 3: this.flashSlash(combo); break
      case 4: this.ultimate(mx, my, combo); break
    }
  }

  // ─── AOE Ultimate (Skill 4 SPECIAL) ───

  playAoeUltimateEffect(x: number, y: number) {
    this.shake(300, 0.025)
    this.flash(0xffffff, 60)
    this.scene.time.delayedCall(100, () => this.flash(0xffd700, 80))

    // Slow-mo camera zoom
    this.scene.cameras.main.zoomTo(1.3, 150, "Sine.easeInOut")
    this.scene.time.delayedCall(500, () => {
      this.scene.cameras.main.zoomTo(1, 300, "Sine.easeInOut")
    })

    // Giant expanding ring (12x)
    const ring = this.scene.add.circle(x, y, 20, 0xffd700, 0.9).setDepth(50)
    this.scene.tweens.add({
      targets: ring,
      scaleX: 12, scaleY: 12,
      alpha: 0,
      duration: 500,
      ease: "Power2",
      onComplete: () => ring.destroy(),
    })

    // Second ring
    const ring2 = this.scene.add.circle(x, y, 15, 0xffffff, 0.6).setDepth(50)
    this.scene.tweens.add({
      targets: ring2,
      scaleX: 8, scaleY: 8,
      alpha: 0,
      duration: 350,
      delay: 80,
      ease: "Power2",
      onComplete: () => ring2.destroy(),
    })

    // Ground cracks — spider web radiating from center
    for (let r = 0; r < 3; r++) {
      this.scene.time.delayedCall(r * 60, () => {
        this.groundCracks(x, y, [0xffd700, 0xffffff, 0xff8800][r], 12 + r * 4)
      })
    }

    // Massive particle burst
    this.squareBurst(x, y, 0xffd700, 50, 6)
    this.squareBurst(x, y, 0xffffff, 30, 8)
    this.squareBurst(x, y, 0xff8800, 20, 4)

    // Extra delayed explosions around the area
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(100 + i * 40, () => {
        const ex = x + Phaser.Math.Between(-60, 60)
        const ey = y + Phaser.Math.Between(-60, 60)
        this.squareBurst(ex, ey, [0xffd700, 0xff8800, 0xffffff][i % 3], 10, 5)
      })
    }

    this.showSkillName("SPECIAL", "#ffd700", true)
  }

  private shockPunch(x: number, y: number, combo: number) {
    this.shake(150, 0.01 + combo * 0.003)

    // Big expanding ring
    const ring = this.scene.add.circle(x, y, 10, 0xffffff, 0.9).setDepth(50)
    this.scene.tweens.add({
      targets: ring,
      scaleX: 8, scaleY: 8,
      alpha: 0,
      duration: 350,
      ease: "Power2",
      onComplete: () => ring.destroy(),
    })

    // Second ring (golden)
    const ring2 = this.scene.add.circle(x, y, 6, 0xffdd44, 0.7).setDepth(50)
    this.scene.tweens.add({
      targets: ring2,
      scaleX: 6, scaleY: 6,
      alpha: 0,
      duration: 250,
      delay: 60,
      onComplete: () => ring2.destroy(),
    })

    // Ground cracks
    this.groundCracks(x, y, 0xffdd44, 10 + Math.floor(combo / 3))
    this.squareBurst(x, y, 0xffdd44, 30 + combo * 3, 5)
    this.flash(0xffdd44, 60)
    this.showSkillName("SHOCK PUNCH", "#ffdd44")
  }

  private windKick(px: number, py: number, mx: number, my: number, combo: number) {
    this.shake(120, 0.008 + combo * 0.002)

    // Afterimage trail along path (more steps for bigger effect)
    const steps = 12
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / (steps + 1)
      const tx = px + (mx - px) * t
      const ty = py + (my - py) * t
      this.scene.time.delayedCall(i * 20, () => {
        const trail = this.scene.add.rectangle(tx, ty, 24, 12, 0x4488ff, 0.5 - i * 0.035).setDepth(48)
        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          angle: 60,
          duration: 250,
          onComplete: () => trail.destroy(),
        })
      })
    }

    // Big wind blades at target (3x larger)
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        const bx = mx + Phaser.Math.Between(-20, 20)
        const by = my + Phaser.Math.Between(-20, 20)
        const blade = this.scene.add.rectangle(bx, by, 50, 10, 0x88ccff, 0.7).setDepth(50)
        blade.rotation = Math.random() * Math.PI
        this.scene.tweens.add({
          targets: blade,
          scaleX: 3, alpha: 0,
          duration: 300,
          onComplete: () => blade.destroy(),
        })
      })
    }

    this.squareBurst(mx, my, 0x4488ff, 40 + combo * 5, 5)
    this.shake(80, 0.006)
    this.showSkillName("WIND KICK", "#88bbff")
  }

  private groundSlam(x: number, y: number, combo: number) {
    this.shake(250, 0.014 + combo * 0.004)

    // Big expanding ring (ground impact) — 10x
    const ring = this.scene.add.circle(x, y, 12, 0xaa44ff, 0.9).setDepth(50)
    this.scene.tweens.add({
      targets: ring,
      scaleX: 10, scaleY: 10,
      alpha: 0,
      duration: 450,
      ease: "Power2",
      onComplete: () => ring.destroy(),
    })

    // Second ring
    const ring2 = this.scene.add.circle(x, y, 8, 0xdd88ff, 0.6).setDepth(50)
    this.scene.tweens.add({
      targets: ring2,
      scaleX: 7, scaleY: 7,
      alpha: 0,
      duration: 300,
      delay: 80,
      onComplete: () => ring2.destroy(),
    })

    // Ground crack lines (spider web)
    this.groundCracks(x, y, 0xaa44ff, 16)
    this.groundCracks(x, y, 0xdd88ff, 8)

    // Screen flash
    this.flash(0xaa44ff, 100)

    // Rising particles (doubled)
    for (let i = 0; i < 30; i++) {
      const size = 2 + Math.random() * 4
      const p = this.scene.add.rectangle(
        x + Phaser.Math.Between(-60, 60),
        y + Phaser.Math.Between(-15, 15),
        size, size, 0xaa44ff, 0.8
      ).setDepth(50)

      this.scene.tweens.add({
        targets: p,
        y: p.y - 60 - Math.random() * 40,
        alpha: 0,
        duration: 500 + Math.random() * 200,
        onComplete: () => p.destroy(),
      })
    }

    this.squareBurst(x, y, 0xaa44ff, 50 + combo * 8, 5)
    this.showSkillName("GROUND SLAM", "#cc88ff")
  }

  private flashSlash(combo: number) {
    this.shake(250, 0.012 + combo * 0.004)
    this.flash(0xffffff, 80)
    this.scene.time.delayedCall(100, () => this.flash(0xffffff, 50))

    // Light beams from edges toward center (thicker)
    const cx = this.scene.cameras.main.centerX
    const cy = this.scene.cameras.main.centerY
    const vpw = this.scene.scale.width
    const vph = this.scene.scale.height

    const beamConfigs = [
      { x: 0, y: cy, w: vpw, h: 6 },
      { x: cx, y: 0, w: 6, h: vph },
      { x: 0, y: cy, w: vpw / 2, h: 3 },
      { x: cx, y: 0, w: 3, h: vph / 2 },
      { x: 0, y: cy, w: vpw, h: 2 },
      { x: cx, y: 0, w: 2, h: vph },
    ]

    beamConfigs.forEach((bc, i) => {
      this.scene.time.delayedCall(i * 30, () => {
        const beam = this.scene.add.rectangle(bc.x, bc.y, bc.w, bc.h, 0xffffff, 0.8).setDepth(50).setScrollFactor(0)
        this.scene.tweens.add({
          targets: beam,
          alpha: 0,
          duration: 350,
          onComplete: () => beam.destroy(),
        })
      })
    })

    this.squareBurst(cx, cy, 0xffffff, 30 + combo * 5, 6)
    this.showSkillName("FLASH SLASH", "#ff6644")
  }

  private ultimate(x: number, y: number, combo: number) {
    this.shake(400, 0.02 + combo * 0.008)
    this.flash(0xffffff, 50)
    this.scene.time.delayedCall(80, () => this.flash(0x000000, 60))
    this.scene.time.delayedCall(160, () => this.flash(0xffffff, 80))

    // Slow-mo feel (camera zoom)
    this.scene.cameras.main.zoomTo(1.3, 200, "Sine.easeInOut")
    this.scene.time.delayedCall(600, () => {
      this.scene.cameras.main.zoomTo(1, 400, "Sine.easeInOut")
    })

    // Multi-color explosions
    const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x8800ff, 0xff00ff, 0xffd700]
    colors.forEach((c, i) => {
      this.scene.time.delayedCall(i * 50, () => {
        this.squareBurst(x + Phaser.Math.Between(-20, 20), y + Phaser.Math.Between(-20, 20), c, 15, 4)
      })
    })

    // Big expanding ring
    const ring = this.scene.add.circle(x, y, 15, 0xffd700, 1).setDepth(50)
    this.scene.tweens.add({
      targets: ring,
      scaleX: 8, scaleY: 8,
      alpha: 0,
      angle: 90,
      duration: 600,
      onComplete: () => ring.destroy(),
    })

    this.squareBurst(x, y, 0xffd700, 60 + combo * 10)
    this.showSkillName("ULTIMATE", "#ffd700", true)
  }

  // ─── Death effect ───

  playDeathEffect(x: number, y: number) {
    this.shake(100, 0.005)
    this.squareBurst(x, y, 0xff4444, 20, 5)
    this.squareBurst(x, y, 0xffffff, 12, 7)

    // XP text
    const xpText = this.scene.add.text(x, y, "+XP", {
      fontSize: "18px", color: "#44ff44",
      stroke: "#000000", strokeThickness: 3,
      fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(50)

    this.scene.tweens.add({
      targets: xpText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => xpText.destroy(),
    })
  }

  // ─── Breakable obstacle destruction ───

  playObstacleBreak(x: number, y: number) {
    this.shake(60, 0.004)
    // Debris burst
    this.squareBurst(x, y, 0x888888, 10, 3)
    // Small dust cloud
    const dust = this.scene.add.circle(x, y, 5, 0xaaaaaa, 0.6).setDepth(50)
    this.scene.tweens.add({
      targets: dust,
      scaleX: 4, scaleY: 4,
      alpha: 0,
      duration: 300,
      onComplete: () => dust.destroy(),
    })
  }

  // ─── Combo popup ───

  playComboPopup(combo: number) {
    if (combo < 3) return
    const comboTexts = ["3x COMBO!", "5x COMBO!", "10x COMBO!", "20x COMBO!!!"]
    const idx = combo >= 20 ? 3 : combo >= 10 ? 2 : combo >= 5 ? 1 : 0
    const colors = ["#44ff44", "#44ccff", "#ff44ff", "#ffd700"]

    const text = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY + 40,
      comboTexts[idx],
      {
        fontSize: idx >= 3 ? "48px" : "36px",
        color: colors[idx],
        stroke: "#000000", strokeThickness: 6,
        fontFamily: "monospace", fontStyle: "bold",
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
          scale: 1, alpha: 0,
          duration: 1500, delay: 800,
          onComplete: () => text.destroy(),
        })
      },
    })
  }

  // ─── Helpers ───

  private shake(duration: number, intensity: number) {
    this.scene.cameras.main.shake(duration, intensity)
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
    const text = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY - 60,
      name,
      {
        fontSize: extra ? "52px" : "38px",
        color,
        stroke: "#000000",
        strokeThickness: extra ? 8 : 5,
        fontFamily: "monospace",
        fontStyle: "bold",
      }
    ).setOrigin(0.5).setDepth(300).setScrollFactor(0).setScale(0)

    this.scene.tweens.add({
      targets: text,
      scale: extra ? 1.8 : 1.4,
      duration: 200,
      ease: "Back.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          x: text.x + Phaser.Math.Between(-3, 3),
          y: text.y + Phaser.Math.Between(-3, 3),
          duration: 50, repeat: 5, yoyo: true,
          onComplete: () => {
            this.scene.tweens.add({
              targets: text,
              alpha: 0, scale: 0.5,
              duration: 800, delay: 400,
              onComplete: () => text.destroy(),
            })
          },
        })
      },
    })

    if (extra) {
      const border = this.scene.add.graphics().setDepth(301).setScrollFactor(0)
      border.lineStyle(4, 0xffd700, 0.8)
      border.strokeRect(this.scene.cameras.main.centerX - 160, this.scene.cameras.main.centerY - 110, 320, 100)
      this.scene.tweens.add({
        targets: border,
        alpha: 0,
        duration: 2000,
        onComplete: () => border.destroy(),
      })
    }
  }

  private groundCracks(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
      const len = 15 + Math.random() * 25
      const g = this.scene.add.graphics().setDepth(48)
      g.lineStyle(2, color, 0.6)
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
      g.strokePath()
      this.scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        onComplete: () => g.destroy(),
      })
    }
  }

  private sparkBurst(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const size = 1.5 + Math.random() * 1.5
      const s = this.scene.add.circle(x, y, size, color, 0.9).setDepth(49)
      const angle = Math.random() * Math.PI * 2
      const dist = 10 + Math.random() * 20
      this.scene.tweens.add({
        targets: s,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 150 + Math.random() * 100,
        onComplete: () => s.destroy(),
      })
    }
  }

  private squareBurst(x: number, y: number, color: number, count: number, size = 4) {
    for (let i = 0; i < count; i++) {
      const pSize = size * (0.5 + Math.random() * 0.5)
      const p = this.scene.add.rectangle(x, y, pSize, pSize, color, 0.9).setDepth(50)
      const angle = Math.random() * Math.PI * 2
      const dist = 20 + Math.random() * 60
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        angle: Math.random() * 360,
        duration: 300 + Math.random() * 300,
        ease: "Power2",
        onComplete: () => p.destroy(),
      })
    }
  }

  private slashArc(x1: number, y1: number, x2: number, y2: number, color: number, lineWidth = 3) {
    const g = this.scene.add.graphics().setDepth(49)
    g.lineStyle(lineWidth, color, 0.9)
    g.beginPath()
    g.moveTo(x1, y1)
    // Quadratic bezier for curved slash
    const cx = (x1 + x2) / 2 + Phaser.Math.Between(-12, 12)
    const cy = (y1 + y2) / 2 + Phaser.Math.Between(-12, 12)
    g.lineTo(cx, cy)
    g.lineTo(x2, y2)
    g.strokePath()

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 200,
      onComplete: () => g.destroy(),
    })
  }
}

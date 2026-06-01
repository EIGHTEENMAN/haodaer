import Phaser from "phaser"
import { words as allWords } from "../../data/words"
import { WORLDS, WORLD_BG_COLORS, WORLD_OBSTACLE_COLORS } from "../../data/stages"
import { createBattleMonster, battleStore, buildTeam, setFirstAliveMonster, switchMonster, autoSwitchToNext, reviveAll, playerAttack, playerFocusAttack, enemyTurn, checkBattleEnd, attemptCapture, resetBattle } from "../../stores/battleStore"
import { addXp, addScore } from "../../stores/playerStore"
import { recordAnswer } from "../../stores/wordStore"
import { captureMonster, recordFocusCorrect, pokedexStore } from "../../stores/pokedexStore"
import WordMonster from "../entities/WordMonster"
import eventBus, { GameEvents } from "./EventBus"

export class BattleScene extends Phaser.Scene {
  private playerMonster!: WordMonster
  private wildMonster!: WordMonster
  private bgGraphics!: Phaser.GameObjects.Graphics
  private fgDecorations!: Phaser.GameObjects.Graphics
  private messageText!: Phaser.GameObjects.Text
  private hpBarWild!: Phaser.GameObjects.Graphics
  private hpBarPlayer!: Phaser.GameObjects.Graphics
  private hpTextWild!: Phaser.GameObjects.Text
  private hpTextPlayer!: Phaser.GameObjects.Text
  private wildWordData: any = null
  private worldId = "ANIMAL"
  private actionButtons: Phaser.GameObjects.GameObject[] = []
  private buttonHitAreas: Phaser.GameObjects.Rectangle[] = []
  private focusActive = false
  private focusButtons: Phaser.GameObjects.GameObject[] = []
  private focusWord: any = null
  private captureBallSprite!: Phaser.GameObjects.Graphics
  private isBoss = false
  private bossName = ""
  private switchMenuObjects: Phaser.GameObjects.GameObject[] = []

  constructor() {
    super({ key: "BattleScene" })
  }

  init(data: { worldId: string; wildMonsterData: any; isBoss?: boolean; bossName?: string }) {
    this.worldId = data.worldId || "ANIMAL"
    this.wildWordData = data.wildMonsterData
    this.isBoss = data.isBoss || false
    this.bossName = data.bossName || ""
    this.focusActive = false
    this.actionButtons = []
    this.focusButtons = []
  }

  create() {
    const worldIdx = WORLDS.findIndex(w => w.id === this.worldId)
    const bgColor = WORLD_BG_COLORS[worldIdx] || 0x1a1a2e
    const obsColor = WORLD_OBSTACLE_COLORS[this.worldId] || 0x4a8c3f

    // Dark overlay for boss
    if (this.isBoss) {
      this.cameras.main.setBackgroundColor(0x000000)
    }

    // Background
    this.bgGraphics = this.add.graphics()
    this.drawBattleBackground(bgColor, obsColor)

    // Foreground theme decorations
    this.fgDecorations = this.add.graphics()
    this.drawForegroundDecorations(this.worldId, obsColor)

    if (!this.wildWordData) {
      this.showSimpleMessage("没有遇到单词兽...", () => this.returnToOverworld())
      return
    }

    // Build team from captured monsters
    const capturedEntries = Array.from(pokedexStore.entries.values()).filter(e => e.captured)
    buildTeam(allWords, capturedEntries)
    const hasTeam = setFirstAliveMonster()

    // If no team, create a default monster from the current encounter
    let playerWord = this.wildWordData
    if (!hasTeam) {
      const playerMonsterData = createBattleMonster(playerWord, false)
      battleStore.playerMonster = playerMonsterData
      battleStore.team = [playerMonsterData]
      battleStore.currentTeamIndex = 0
    } else if (battleStore.playerMonster) {
      playerWord = allWords.find(w => w.id === battleStore.playerMonster!.id) || this.wildWordData
    }
    const playerMonsterData = battleStore.playerMonster!
    battleStore.playerMonster = playerMonsterData

    // Player monster
    this.playerMonster = new WordMonster(this, 200, 280, playerWord)
    this.playerMonster.setScale(1.8)
    this.add.existing(this.playerMonster)

    // Player HP bar
    this.hpBarPlayer = this.add.graphics()
    this.drawHpBar(this.hpBarPlayer, 120, 180, 120, 14, playerMonsterData.hp, playerMonsterData.maxHp, 0x44cc44)
    this.hpTextPlayer = this.add.text(120, 160, `${playerWord.word} LV.${playerMonsterData.level}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    })

    // Wild monster
    this.wildMonster = new WordMonster(this, 600, 260, this.wildWordData)
    this.wildMonster.setScale(this.isBoss ? 2.5 : 2.0)
    this.add.existing(this.wildMonster)

    // Boss aura
    if (this.isBoss) {
      const aura = this.add.graphics()
      aura.fillStyle(0xff4444, 0.15)
      aura.fillCircle(600, 260, 80)
      this.tweens.add({
        targets: aura,
        alpha: { from: 0.6, to: 0.2 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
      })
    }

    // Wild HP bar
    this.hpBarWild = this.add.graphics()
    const wildMonsterData = battleStore.wildMonster!
    this.drawHpBar(this.hpBarWild, 530, 160, 140, 16, wildMonsterData.hp, wildMonsterData.maxHp, 0xff4444)
    const wildLabel = this.isBoss
      ? `${this.bossName || this.wildWordData.word} ${this.wildWordData.word} LV.${wildMonsterData.level}`
      : `野生 ${this.wildWordData.word} LV.${wildMonsterData.level}`
    this.hpTextWild = this.add.text(530, 140, wildLabel, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: this.isBoss ? "#ff2222" : "#ffdd44",
      stroke: "#000000",
      strokeThickness: 2,
    })

    // VS text
    const vsText = this.add.text(400, 200, this.isBoss ? "⚔ BOSS ⚔" : "VS", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: this.isBoss ? "24px" : "20px",
      color: this.isBoss ? "#ff2222" : "#ffd700",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5)
    this.tweens.add({
      targets: vsText,
      scaleX: 1.2, scaleY: 1.2, alpha: 0.6,
      duration: 800, yoyo: true, repeat: -1,
    })

    // Message area
    this.messageText = this.add.text(400, 490, this.isBoss
      ? `⚠ ${this.bossName} 出现了！` : `野生的 ${this.wildWordData.word} 出现了！`, {
      fontFamily: '-apple-system, "Noto Sans SC", sans-serif',
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      wordWrap: { width: 700 },
      align: "center",
    }).setOrigin(0.5)

    // Action buttons
    this.createActionButtons()

    // Entrance effects
    this.cameras.main.fadeIn(300)

    if (this.isBoss) {
      // Boss entrance: screen shake + flash
      this.cameras.main.shake(300, 0.01)
      this.time.delayedCall(100, () => {
        this.cameras.main.flash(300, 255, 0, 0)
      })
      this.time.delayedCall(500, () => {
        this.cameras.main.flash(200, 255, 255, 255)
      })
    } else {
      this.cameras.main.shake(100, 0.005)
      this.time.delayedCall(500, () => {
        this.cameras.main.flash(200, 255, 255, 255)
      })
    }
  }

  private drawBattleBackground(bgColor: number, obsColor: number) {
    const g = this.bgGraphics
    g.fillStyle(bgColor, 0.85)
    g.fillRect(0, 0, 800, 600)

    // Ground line gradient
    g.fillStyle(bgColor + 0x222222, 0.4)
    g.fillRect(0, 310, 800, 290)

    // Ground highlight line
    g.lineStyle(2, 0xffffff, 0.1)
    g.lineBetween(0, 310, 800, 310)

    // Subtle grid on battlefield
    g.lineStyle(1, 0xffffff, 0.03)
    for (let x = 0; x < 800; x += 40) {
      g.lineBetween(x, 310, x, 600)
    }
    for (let y = 310; y < 600; y += 20) {
      g.lineBetween(0, y, 800, y)
    }
  }

  private drawForegroundDecorations(worldId: string, color: number) {
    const g = this.fgDecorations

    switch (worldId) {
      case 'ANIMAL':
        // Grass blades at bottom
        g.fillStyle(0x66bb6a, 0.2)
        for (let i = 0; i < 12; i++) {
          const gx = 30 + i * 65
          g.fillTriangle(gx, 600, gx + 8, 560, gx + 16, 600)
          g.fillTriangle(gx + 25, 600, gx + 33, 565, gx + 40, 600)
        }
        break
      case 'FOOD':
        // Plate shapes on ground
        g.fillStyle(0xffffff, 0.08)
        for (let i = 0; i < 5; i++) {
          g.fillEllipse(70 + i * 160, 580, 50, 16)
        }
        break
      case 'COLOR':
        // Rainbow stripes on ground
        const rainbow = [0xff4444, 0xffaa44, 0xffff44, 0x44cc44, 0x4488ff, 0x8844ff]
        for (let i = 0; i < 6; i++) {
          g.fillStyle(rainbow[i], 0.06)
          g.fillRect(i * 135, 500, 135, 100)
        }
        break
      case 'NATURE':
        // Puddle shapes
        g.fillStyle(0x4488ff, 0.08)
        for (let i = 0; i < 6; i++) {
          g.fillEllipse(60 + i * 130, 560 + Math.sin(i) * 15, 40, 14)
        }
        break
      case 'ACTION':
        // Speed lines
        g.lineStyle(1, 0xff6600, 0.06)
        for (let i = 0; i < 10; i++) {
          const gy = 330 + Math.random() * 250
          g.lineBetween(0, gy, 800, gy)
        }
        break
    }
  }

  private createActionButtons() {
    this.clearButtons()
    const actions = [
      { label: "FIGHT", icon: "👊", action: () => this.doFight() },
      { label: "FOCUS", icon: "⭐", action: () => this.doFocus() },
      { label: "SWITCH", icon: "🔄", action: () => this.doSwitch() },
      { label: "FLEE", icon: "🏃", action: () => this.doFlee() },
    ]
    actions.forEach((a, i) => {
      this.createButton(120 + i * 160, 550, a.icon, a.label, a.action)
    })
  }

  private createButton(x: number, y: number, icon: string, label: string, onClick: () => void) {
    const bg = this.add.graphics()
    this.drawButtonBg(bg, x, y, 0x333333, 0x88ccff)
    this.actionButtons.push(bg)

    const lbl = this.add.text(x, y, `${icon} ${label}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "11px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5)
    this.actionButtons.push(lbl)

    const hitRect = this.add.rectangle(x, y, 130, 44, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(1000)
    hitRect.on("pointerover", () => {
      bg.clear()
      this.drawButtonBg(bg, x, y, 0x555555, 0xaaddff)
    })
    hitRect.on("pointerout", () => {
      bg.clear()
      this.drawButtonBg(bg, x, y, 0x333333, 0x88ccff)
    })
    hitRect.on("pointerdown", onClick)
    this.buttonHitAreas.push(hitRect)
  }

  private drawButtonBg(g: Phaser.GameObjects.Graphics, x: number, y: number, fill: number, stroke: number) {
    g.fillStyle(fill, 0.9)
    g.fillRoundedRect(x - 65, y - 22, 130, 44, 8)
    g.lineStyle(2, stroke, 0.8)
    g.strokeRoundedRect(x - 65, y - 22, 130, 44, 8)
  }

  private clearButtons() {
    this.actionButtons.forEach(b => b.destroy())
    this.actionButtons = []
    this.buttonHitAreas.forEach(h => h.destroy())
    this.buttonHitAreas = []
    this.focusButtons.forEach(b => b.destroy())
    this.focusButtons = []
    this.hideSwitchMenu()
  }

  private doFight() {
    if (battleStore.turnPhase !== "playerTurn" || this.focusActive) return
    playerAttack()
    try {
      this.playHitEffect(this.wildMonster)
    } catch(e) { console.error('playHitEffect error:', e) }
    this.showMessageAndProcess()
  }

  private doFocus() {
    if (battleStore.turnPhase !== "playerTurn" || !this.wildWordData) return

    const correct = this.wildWordData.word
    const theme = this.wildWordData.theme
    const themeWords = allWords.filter(w => w.theme === theme && w.word !== correct)
    const options = [correct]

    const shuffled = themeWords.sort(() => Math.random() - 0.5).slice(0, 3)
    shuffled.forEach(w => options.push(w.word))

    const shuffledOptions = options.sort(() => Math.random() - 0.5)

    this.focusActive = true
    this.clearButtons()

    const quizBg = this.add.graphics()
    quizBg.fillStyle(0x000000, 0.85)
    quizBg.fillRoundedRect(100, 130, 600, 340, 16)
    quizBg.lineStyle(2, 0xffd700)
    quizBg.strokeRoundedRect(100, 130, 600, 340, 16)

    const questionText = this.add.text(400, 170, "选出正确的单词:", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "14px",
      color: "#ffd700",
      align: "center",
    }).setOrigin(0.5)

    const wordDisplay = this.add.text(400, 210, `"${this.wildWordData.meaning}"`, {
      fontFamily: '-apple-system, "Noto Sans SC", sans-serif',
      fontSize: "28px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5)

    const focusHitRects: Phaser.GameObjects.Rectangle[] = []
    const focusBtns: Phaser.GameObjects.GameObject[] = []
    shuffledOptions.forEach((opt, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const bx = 220 + col * 250
      const by = 280 + row * 60

      const bg = this.add.graphics()
      bg.fillStyle(0x444488, 0.9)
      bg.fillRoundedRect(bx - 90, by - 20, 180, 40, 8)
      focusBtns.push(bg)

      const txt = this.add.text(bx, by, opt.toUpperCase(), {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "12px",
        color: "#ffffff",
        align: "center",
      }).setOrigin(0.5)
      focusBtns.push(txt)

      const hitRect = this.add.rectangle(bx, by, 180, 40, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true })
        .setDepth(1000)
      focusHitRects.push(hitRect)
      this.buttonHitAreas.push(hitRect)

      hitRect.on("pointerdown", () => {
        const correctAnswer = opt === correct
        if (correctAnswer) {
          battleStore.message = "✨ 正确！伤害翻倍！"
          this.playCorrectEffect()
        } else {
          battleStore.message = `不对哦，正确是 ${correct}`
        }
        playerFocusAttack(correctAnswer)
        recordFocusCorrect(this.wildWordData.id)

        quizBg.destroy()
        questionText.destroy()
        wordDisplay.destroy()
        focusHitRects.forEach(r => r.destroy())
        focusBtns.forEach(b => b.destroy())

        this.focusActive = false
        this.playHitEffect(this.wildMonster)
        this.showMessageAndProcess()
      })
    })
  }

  private playCorrectEffect() {
    // Star burst particle effect — draw circles radiating outward
    const container = this.add.graphics()
    const colors = [0xffd700, 0xffee44, 0xffffff, 0xffaa00]
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const sx = 400 + Math.cos(angle) * 60
      const sy = 260 + Math.sin(angle) * 50
      container.fillStyle(colors[i % colors.length])
      container.fillCircle(sx, sy, 4 + Math.random() * 4)
    }
    this.tweens.add({
      targets: container,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 600,
      ease: "Quad.easeOut",
      onComplete: () => container.destroy(),
    })
  }

  private playHitEffect(target: WordMonster) {
    // Flash + squash
    target.playHitAnimation()
    this.cameras.main.shake(50, 0.003)
  }

  private doCapture() {
    if (battleStore.turnPhase !== "playerTurn" && battleStore.turnPhase !== "won") {
      this.showSimpleMessage("继续战斗削弱它再捕捉！")
      return
    }

    const success = attemptCapture()
    if (success && this.wildWordData) {
      this.clearButtons()
      this.drawCaptureBall(400, 260)
      this.wildMonster.playCaptureAnimation(() => {
        captureMonster(this.wildWordData)
        const xpGain = 10 + this.wildWordData.difficulty * 5
        addXp(xpGain)
        addScore(50)
        recordAnswer(this.wildWordData.id, this.wildWordData.word, this.wildWordData.meaning, true)

        // Celebration effect
        this.playCaptureCelebration()

        this.showSimpleMessage(
          `✨ 成功捕捉 ${this.wildWordData.word}！\n获得 ${xpGain} XP！已加入图鉴`,
          () => { reviveAll(); resetBattle(); this.returnToOverworld() }
        )
      })
    } else if (this.wildMonster) {
      this.wildMonster.playShakeAnimation()
      this.showSimpleMessage(`${this.wildWordData?.word} 挣脱了！继续战斗！`, () => {
        this.createCaptureOnlyButtons()
      })
    }
  }

  private playCaptureCelebration() {
    // Confetti-like burst
    for (let i = 0; i < 12; i++) {
      const circle = this.add.graphics()
      const colors = [0xffd700, 0xff4444, 0x44cc44, 0x4488ff, 0xff66ff, 0xffaa00]
      circle.fillStyle(colors[i % colors.length])
      circle.fillCircle(0, 0, 4)
      circle.setPosition(400, 260)

      this.tweens.add({
        targets: circle,
        x: 400 + (Math.random() - 0.5) * 300,
        y: 260 + (Math.random() - 0.5) * 200,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 600 + Math.random() * 400,
        ease: "Quad.easeOut",
        onComplete: () => circle.destroy(),
      })
    }
  }

  private doFlee() {
    this.showSimpleMessage("逃跑了！", () => {
      reviveAll()
      resetBattle()
      this.returnToOverworld()
    })
  }

  private doSwitch() {
    if (battleStore.turnPhase !== "playerTurn") return
    this.showSwitchMenu()
  }

  private showSwitchMenu() {
    this.clearButtons()
    this.hideSwitchMenu()

    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.85)
    overlay.fillRoundedRect(100, 80, 600, 450, 16)
    overlay.lineStyle(2, 0x88ccff)
    overlay.strokeRoundedRect(100, 80, 600, 450, 16)

    const title = this.add.text(400, 105, "SWITCH MONSTER", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "14px",
      color: "#88ccff",
      align: "center",
    }).setOrigin(0.5)

    const objects: Phaser.GameObjects.GameObject[] = [overlay, title]
    const team = battleStore.team

    // Team member cards (2 cols × 3 rows)
    team.forEach((member, i) => {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cx = 180 + col * 250
      const cy = 170 + row * 100

      const isActive = i === battleStore.currentTeamIndex
      const isFainted = member.hp <= 0

      const cardBg = this.add.graphics()
      if (isActive) {
        cardBg.fillStyle(0x444488, 0.7)
      } else if (isFainted) {
        cardBg.fillStyle(0x333333, 0.5)
      } else {
        cardBg.fillStyle(0x224422, 0.7)
      }
      cardBg.fillRoundedRect(cx - 110, cy - 35, 220, 70, 10)
      if (!isActive && !isFainted) {
        cardBg.lineStyle(2, 0x44cc44)
        cardBg.strokeRoundedRect(cx - 110, cy - 35, 220, 70, 10)
      }
      objects.push(cardBg)

      // Word icon
      const emojis = ['🔵', '🟣', '🔴']
      const icon = this.add.text(cx - 95, cy - 20, emojis[Math.min(member.evolutionStage, 2)], {
        fontSize: "24px",
      })
      objects.push(icon)

      // Word name
      const nameText = this.add.text(cx - 60, cy - 22, member.wordData.word.toUpperCase(), {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "11px",
        color: isFainted ? "#666" : "#ffffff",
      })
      objects.push(nameText)

      // HP bar
      const hpBar = this.add.graphics()
      hpBar.fillStyle(0x444444)
      hpBar.fillRoundedRect(cx - 60, cy - 2, 150, 10, 3)
      const ratio = Math.max(0, member.hp / member.maxHp)
      const fillColor = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xffaa00 : 0xff4444
      hpBar.fillStyle(isFainted ? 0x555555 : fillColor)
      hpBar.fillRoundedRect(cx - 60, cy - 2, 150 * ratio, 10, 3)
      objects.push(hpBar)

      // HP text
      const hpText = this.add.text(cx - 60, cy + 14, `${member.hp} / ${member.maxHp}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "8px",
        color: "#aaa",
      })
      objects.push(hpText)

      // Status label
      let statusLabel = ""
      if (isActive) statusLabel = "ACTIVE"
      else if (isFainted) statusLabel = "FAINTED"
      else statusLabel = "TAP TO SWITCH"

      const statusText = this.add.text(cx + 100, cy, statusLabel, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "7px",
        color: isActive ? "#88ccff" : isFainted ? "#666" : "#44cc44",
        align: "right",
      }).setOrigin(1, 0.5)
      objects.push(statusText)

      // Evolution stage stars
      const stars = this.add.text(cx - 60, cy + 28, '⭐'.repeat(member.evolutionStage + 1), {
        fontSize: "8px",
      })
      objects.push(stars)

      // Click handler for alive, non-active members
      if (!isActive && !isFainted) {
        const hitArea = this.add.rectangle(cx, cy, 220, 70, 0x000000, 0.001)
        hitArea.setInteractive({ useHandCursor: true })
        hitArea.on("pointerdown", () => {
          if (switchMonster(i)) {
            this.hideSwitchMenu()
            this.clearButtons()
            this.messageText.setText(`Go! ${member.wordData.word}!`)
            this.time.delayedCall(600, () => {
              this.showMessageAndProcess()
            })
          }
        })
        objects.push(hitArea)
      }
    })

    // Fill empty slots with empty indicators
    for (let i = team.length; i < battleStore.maxTeamSize; i++) {
      const col = i % 2
      const row = Math.floor(i / 2)
      const cx = 180 + col * 250
      const cy = 170 + row * 100

      const emptyBg = this.add.graphics()
      emptyBg.fillStyle(0x222222, 0.4)
      emptyBg.fillRoundedRect(cx - 110, cy - 35, 220, 70, 10)
      emptyBg.lineStyle(1, 0x444444)
      emptyBg.strokeRoundedRect(cx - 110, cy - 35, 220, 70, 10)
      objects.push(emptyBg)

      const emptyText = this.add.text(cx, cy, "— EMPTY —", {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "10px",
        color: "#444",
        align: "center",
      }).setOrigin(0.5)
      objects.push(emptyText)
    }

    // Cancel button
    const cancelBg = this.add.graphics()
    cancelBg.fillStyle(0x444444, 0.9)
    cancelBg.fillRoundedRect(330, 485, 140, 35, 8)
    objects.push(cancelBg)

    const cancelText = this.add.text(400, 502, "CANCEL", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: "#ffffff",
      align: "center",
    }).setOrigin(0.5)
    objects.push(cancelText)

    const cancelHit = this.add.rectangle(400, 502, 140, 35, 0x000000, 0.001)
    cancelHit.setInteractive({ useHandCursor: true })
    cancelHit.on("pointerdown", () => {
      this.hideSwitchMenu()
      this.clearButtons()
      this.createActionButtons()
    })
    objects.push(cancelHit)

    this.switchMenuObjects = objects
  }

  private hideSwitchMenu() {
    this.switchMenuObjects.forEach(o => o.destroy())
    this.switchMenuObjects = []
  }

  private drawHpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, hp: number, maxHp: number, color: number) {
    g.clear()
    // Background
    g.fillStyle(0x333333)
    g.fillRoundedRect(x, y, w, h, 4)
    // HP fill
    const ratio = Math.max(0, hp / maxHp)
    const fillColor = ratio > 0.5 ? color : ratio > 0.25 ? 0xffaa00 : 0xff4444
    g.fillStyle(fillColor)
    g.fillRoundedRect(x, y, w * ratio, h, 4)
    // Border
    g.lineStyle(2, 0xffffff, 0.6)
    g.strokeRoundedRect(x, y, w, h, 4)
  }

  private drawCaptureBall(x: number, y: number) {
    this.captureBallSprite = this.add.graphics()
    // Red top half
    this.captureBallSprite.fillStyle(0xff4444)
    this.captureBallSprite.beginPath()
    this.captureBallSprite.arc(x, y, 30, Math.PI, 0)
    this.captureBallSprite.fillPath()
    // White bottom half
    this.captureBallSprite.fillStyle(0xffffff)
    this.captureBallSprite.beginPath()
    this.captureBallSprite.arc(x, y, 30, 0, Math.PI)
    this.captureBallSprite.fillPath()
    // Center band
    this.captureBallSprite.fillStyle(0x333333)
    this.captureBallSprite.fillRect(x - 30, y - 3, 60, 6)
    // Center button
    this.captureBallSprite.fillStyle(0xffffff)
    this.captureBallSprite.fillCircle(x, y, 6)
    this.captureBallSprite.lineStyle(2, 0xcccccc)
    this.captureBallSprite.strokeCircle(x, y, 6)

    // Shake animation
    this.tweens.add({
      targets: this.captureBallSprite,
      x: { from: -5, to: 5 },
      duration: 80,
      yoyo: true,
      repeat: 5,
      ease: "Quad.easeInOut",
      onComplete: () => {
        this.cameras.main.flash(200, 255, 255, 255)
        this.tweens.add({
          targets: this.captureBallSprite,
          scaleX: 1.3,
          scaleY: 1.3,
          alpha: 0,
          duration: 300,
          ease: "Back.easeOut",
        })
      },
    })
  }

  private showMessageAndProcess() {
    if (!battleStore.wildMonster || !battleStore.playerMonster) {
      console.error('showMessageAndProcess: missing monsters');
      return
    }

    // Update HP bars
    this.drawHpBar(this.hpBarWild, 530, 160, 140, 16, battleStore.wildMonster.hp, battleStore.wildMonster.maxHp, 0xff4444)
    this.drawHpBar(this.hpBarPlayer, 120, 180, 120, 14, battleStore.playerMonster.hp, battleStore.playerMonster.maxHp, 0x44cc44)

    if (battleStore.wildMonster.hp <= 0) {
      battleStore.turnPhase = "won"
      this.clearButtons()
      this.playDefeatEffect()
      this.showSimpleMessage(
        `击败了 ${this.wildWordData?.word}！\n可以捕捉了！`,
        () => {
          this.createCaptureOnlyButtons()
        }
      )
      return
    }

    if (battleStore.playerMonster.hp <= 0) {
      battleStore.playerMonster.isAlive = false
      const nextIdx = autoSwitchToNext()
      if (nextIdx >= 0) {
        // Auto-switch succeeded, continue battle
        this.messageText.setText(`${battleStore.team[nextIdx].wordData.word}，上场！`)
        this.createActionButtons()
        return
      }
      // All fainted
      battleStore.turnPhase = "lost"
      this.clearButtons()
      this.showSimpleMessage(
        "队伍全部倒下了！\n回到营地休息...",
        () => {
          reviveAll()
          resetBattle()
          this.returnToOverworld()
        }
      )
      return
    }

    // Enemy's turn
    setTimeout(() => {
      try {
        enemyTurn()
        this.drawHpBar(this.hpBarWild, 530, 160, 140, 16, battleStore.wildMonster!.hp, battleStore.wildMonster!.maxHp, 0xff4444)
        this.drawHpBar(this.hpBarPlayer, 120, 180, 120, 14, battleStore.playerMonster!.hp, battleStore.playerMonster!.maxHp, 0x44cc44)
        this.wildMonster.playHitAnimation()
        this.cameras.main.shake(80, 0.005)
        this.messageText.setText(battleStore.message)

        setTimeout(() => {
          checkBattleEnd()
          if (battleStore.turnPhase === "playerTurn") {
            this.messageText.setText(battleStore.message)
            this.createActionButtons()
          } else if (battleStore.turnPhase === "won") {
            this.clearButtons()
            this.playDefeatEffect()
            this.createCaptureOnlyButtons()
          } else if (battleStore.turnPhase === "lost") {
            this.clearButtons()
            this.showSimpleMessage("队伍全部倒下了！\n回到营地休息...", () => {
              reviveAll()
              resetBattle()
              this.returnToOverworld()
            })
          }
        }, 500)
      } catch(e) { console.error('enemyTurn error:', e) }
    }, 800)
  }

  private playDefeatEffect() {
    // Flash + small celebration burst
    this.cameras.main.flash(150, 255, 255, 200)
  }

  private createCaptureOnlyButtons() {
    this.clearButtons()
    const captureBtn = this.createButton(250, 550, "🔴", "CAPTURE", () => this.doCapture())
    this.actionButtons.push(captureBtn)
    const backBtn = this.createButton(550, 550, "↩", "LEAVE", () => {
      addXp(5)
      addScore(20)
      reviveAll()
      resetBattle()
      this.returnToOverworld()
    })
    this.actionButtons.push(backBtn)
    this.messageText.setText(battleStore.message || "可以捕捉了！")
  }

  private showSimpleMessage(msg: string, onDone?: () => void) {
    this.messageText.setText(msg)
    if (onDone) {
      this.time.delayedCall(1500, onDone)
    }
  }

  private returnToOverworld() {
    // Signal Vue to restart OverworldScene via EventBus (avoids scene lifecycle conflicts)
    eventBus.emit(GameEvents.BATTLE_END, { worldId: this.worldId })
  }
}

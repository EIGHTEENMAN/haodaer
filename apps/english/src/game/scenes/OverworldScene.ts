import Phaser from "phaser"
import { words as allWords } from "../../data/words"
import { WORLDS, WORLD_BG_COLORS, WORLD_OBSTACLE_COLORS, BOSS_NAMES, getStageForCapturedCount } from "../../data/stages"
import { pickRandomEncounter } from "../entities/WordMonster"
import { createBattleMonster, startWildBattle } from "../../stores/battleStore"
import { player } from "../../stores/playerStore"
import { getOrCreateEntry, getCaptureCount } from "../../stores/pokedexStore"
import eventBus, { GameEvents } from "./EventBus"


const TILE = 32
const MAP_COLS = 25
const MAP_ROWS = 18
const MAP_W = MAP_COLS * TILE
const MAP_H = MAP_ROWS * TILE

export class OverworldScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Graphics
  private playerX = MAP_COLS * TILE / 2
  private playerY = MAP_ROWS * TILE / 2
  private decorationTiles: Phaser.GameObjects.Graphics[] = []
  private encounterCooldown = 0
  private currentWorld = ""
  private encounterZones: { x: number; y: number; shape: string; w: number; h: number }[] = []
  private canMove = true
  private bgGraphics!: Phaser.GameObjects.Graphics
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private collectionText!: Phaser.GameObjects.Text
  private stageText!: Phaser.GameObjects.Text
  // Fallback key tracking for Phaser 4 scene restart keyboard quirk
  private _pressedKeys: Record<string, boolean> = {}
  private _onKeyDown!: (e: KeyboardEvent) => void
  private _onKeyUp!: (e: KeyboardEvent) => void

  constructor() {
    super({ key: "OverworldScene" })
  }

  init(data: { worldId: string }) {
    this.currentWorld = data.worldId || "ANIMAL"
    this.playerX = MAP_COLS * TILE / 2
    this.playerY = MAP_ROWS * TILE / 2
    this.canMove = true
    this.encounterCooldown = 0
  }

  create() {
    const worldId = this.currentWorld
    const worldConfig = WORLDS.find(w => w.id === worldId)
    const worldName = worldConfig?.nameCn || worldId
    const theme = worldConfig?.theme || ""
    const worldIdx = WORLDS.findIndex(w => w.id === worldId)
    const bgColor = WORLD_BG_COLORS[worldIdx] || 0x4caf50

    // Background
    this.bgGraphics = this.add.graphics()
    this.drawBackground(worldId, bgColor)

    // World-specific decorations (theme-relevant encounter zones)
    this.encounterZones = []
    this.drawWorldDecorations(worldId)

    // Top UI
    const worldLabel = this.add.text(MAP_W / 2, 16, `${worldName}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(100)

    // Exit button
    const exitBtn = this.add.text(16, 16, "← 返回", {
      fontFamily: '-apple-system, "Noto Sans SC", sans-serif',
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      backgroundColor: "rgba(0,0,0,0.4)",
      padding: { x: 8, y: 4 },
    }).setOrigin(0, 0).setDepth(100).setInteractive({ useHandCursor: true })
    exitBtn.on("pointerdown", () => {
      eventBus.emit(GameEvents.BACK_TO_MAP)
    })

    // Collection count — live updating
    this.collectionText = this.add.text(MAP_W - 16, 16, "", {
      fontFamily: '-apple-system, "Noto Sans SC", sans-serif',
      fontSize: "12px",
      color: "#ffd700",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(100)
    this.refreshCollectionText()

    // Current stage display
    this.stageText = this.add.text(MAP_W / 2, MAP_H - 30, "", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "9px",
      color: "#88ccff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(100)

    // Bottom info
    const infoText = this.add.text(MAP_W / 2, MAP_H - 12, "箭头/WASD 移动 · 草丛中遇到单词兽", {
      fontFamily: '-apple-system, "Noto Sans SC", sans-serif',
      fontSize: "10px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(100)

    // Player
    this.player = this.add.graphics().setDepth(50)
    this.drawPlayer()

    // Set up keys — may not be ready on scene restart; deferred to update()
    this.cursors = undefined as any
    this.wasdKeys = undefined as any
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasdKeys = this.input.keyboard.addKeys("W,A,S,D") as any
    }

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    this.cameras.main.fadeIn(300)

    // Fallback: Phaser 4 may drop canvas keyboard listeners on scene restart
    this._pressedKeys = {}
    this._onKeyDown = (e: KeyboardEvent) => { this._pressedKeys[e.key] = true }
    this._onKeyUp = (e: KeyboardEvent) => { this._pressedKeys[e.key] = false }
    window.addEventListener("keydown", this._onKeyDown)
    window.addEventListener("keyup", this._onKeyUp)

    // Phaser 4 may not set scene active on re-start — force it so update() runs
    if (this.sys && !this.sys.isActive()) {
      try { this.sys.setActive(true) } catch {}
    }
  }

  shutdown() {
    window.removeEventListener("keydown", this._onKeyDown)
    window.removeEventListener("keyup", this._onKeyUp)
  }

  private drawBackground(worldId: string, bgColor: number) {
    const g = this.bgGraphics
    g.fillStyle(bgColor)
    g.fillRect(0, 0, MAP_W, MAP_H)

    // Subtle ground texture based on world
    const worldIdx = WORLDS.findIndex(w => w.id === worldId)
    const lineColor = [0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff, 0xffffff][worldIdx] || 0xffffff

    g.lineStyle(1, lineColor, 0.04)
    for (let x = 0; x < MAP_COLS; x++) {
      g.moveTo(x * TILE, 0); g.lineTo(x * TILE, MAP_H)
    }
    for (let y = 0; y < MAP_ROWS; y++) {
      g.moveTo(0, y * TILE); g.lineTo(MAP_W, y * TILE)
    }
    g.strokePath()

    // Sky gradient (upper portion of map)
    g.fillStyle(0x000000, 0.08)
    g.fillRect(0, 0, MAP_W, MAP_H * 0.3)
  }

  private drawWorldDecorations(worldId: string) {
    const obsColor = WORLD_OBSTACLE_COLORS[worldId] || 0x4a8c3f

    switch (worldId) {
      case 'ANIMAL':
        // Bushes and tree stumps
        for (let i = 0; i < 25; i++) {
          this.addBushEncounterZone(obsColor)
        }
        // Some tall grass patches
        for (let i = 0; i < 8; i++) {
          const gx = 30 + Math.random() * (MAP_W - 60)
          const gy = 30 + Math.random() * (MAP_H - 60)
          const tallGrass = this.add.graphics()
          tallGrass.fillStyle(0x66bb6a, 0.3)
          for (let j = 0; j < 5; j++) {
            tallGrass.fillRect(gx + j * 8 - 20, gy - 10 + Math.random() * 8, 6, 14 + Math.random() * 8)
          }
          this.decorationTiles.push(tallGrass)
        }
        break

      case 'FOOD':
        // Kitchen counters and pots
        for (let i = 0; i < 20; i++) {
          this.addShapeEncounterZone(obsColor, 'round')
        }
        // Stove top decorations
        for (let i = 0; i < 6; i++) {
          const gx = 50 + Math.random() * (MAP_W - 100)
          const gy = 50 + Math.random() * (MAP_H - 100)
          const stove = this.add.graphics()
          stove.fillStyle(0x444444, 0.4)
          stove.fillRoundedRect(gx - 20, gy - 15, 40, 30, 4)
          stove.fillStyle(0xff4444, 0.3)
          stove.fillCircle(gx - 8, gy, 6)
          stove.fillCircle(gx + 8, gy, 6)
          this.decorationTiles.push(stove)
        }
        break

      case 'COLOR':
        // Rainbow colored zones
        const rainbow = [0xff4444, 0xffaa44, 0xffff44, 0x44cc44, 0x4488ff, 0x8844ff]
        for (let i = 0; i < 24; i++) {
          const gx = 20 + Math.random() * (MAP_W - 40)
          const gy = 20 + Math.random() * (MAP_H - 40)
          const circle = this.add.graphics()
          circle.fillStyle(rainbow[i % rainbow.length], 0.2)
          circle.fillCircle(gx, gy, 12 + Math.random() * 10)
          this.addShapeEncounterZone(obsColor, 'star')
          this.decorationTiles.push(circle)
        }
        break

      case 'BODY':
        // Body-themed shapes
        for (let i = 0; i < 20; i++) {
          this.addShapeEncounterZone(obsColor, 'round')
        }
        for (let i = 0; i < 6; i++) {
          const gx = 50 + Math.random() * (MAP_W - 100)
          const gy = 60 + Math.random() * (MAP_H - 120)
          const hand = this.add.graphics()
          hand.fillStyle(0xffcc99, 0.2)
          hand.fillCircle(gx, gy, 8)
          hand.fillStyle(0xffaa88, 0.15)
          hand.fillCircle(gx + 12, gy - 3, 6)
          hand.fillCircle(gx - 12, gy - 3, 6)
          this.decorationTiles.push(hand)
        }
        break

      case 'CLOTHES':
        // Fabric rolls / clothing shapes
        for (let i = 0; i < 28; i++) {
          this.addBushEncounterZone(obsColor)
        }
        // Hangers
        for (let i = 0; i < 5; i++) {
          const gx = 50 + Math.random() * (MAP_W - 100)
          const gy = 50 + Math.random() * (MAP_H - 100)
          const hanger = this.add.graphics()
          hanger.lineStyle(2, 0x888888, 0.3)
          hanger.beginPath()
          hanger.arc(gx, gy, 12, Math.PI * 1.1, Math.PI * 1.9)
          hanger.strokePath()
          this.decorationTiles.push(hanger)
        }
        break

      case 'NATURE':
        // Clouds and rain puddles
        for (let i = 0; i < 20; i++) {
          this.addShapeEncounterZone(obsColor, 'round')
        }
        for (let i = 0; i < 5; i++) {
          const gx = 40 + Math.random() * (MAP_W - 80)
          const gy = 40 + Math.random() * (MAP_H - 80)
          const cloud = this.add.graphics()
          cloud.fillStyle(0xffffff, 0.12)
          cloud.fillCircle(gx, gy, 18)
          cloud.fillCircle(gx + 14, gy - 4, 14)
          cloud.fillCircle(gx - 12, gy + 2, 12)
          this.decorationTiles.push(cloud)
        }
        break

      case 'DAILY':
        // House interior shapes
        for (let i = 0; i < 18; i++) {
          this.addRectEncounterZone(obsColor)
        }
        // Tables
        for (let i = 0; i < 4; i++) {
          const gx = 50 + Math.random() * (MAP_W - 100)
          const gy = 60 + Math.random() * (MAP_H - 120)
          const table = this.add.graphics()
          table.fillStyle(0x8b6b4a, 0.25)
          table.fillRoundedRect(gx - 20, gy - 12, 40, 24, 4)
          this.decorationTiles.push(table)
        }
        break

      case 'NUMBER':
        // Metal column shapes
        for (let i = 0; i < 22; i++) {
          this.addRectEncounterZone(obsColor)
        }
        // Digit decorations
        for (let i = 0; i < 6; i++) {
          const gx = 40 + Math.random() * (MAP_W - 80)
          const gy = 40 + Math.random() * (MAP_H - 80)
          const digitText = this.add.text(gx, gy, String(Math.floor(Math.random() * 9) + 1), {
            fontSize: "24px",
            color: "#4488ff",
            alpha: 0.2,
            fontFamily: 'monospace',
          }).setOrigin(0.5).setAlpha(0.15).setDepth(1)
        }
        break

      case 'FAMILY':
        // Brick wall shapes
        for (let i = 0; i < 20; i++) {
          this.addRectEncounterZone(obsColor)
        }
        // Window frames
        for (let i = 0; i < 5; i++) {
          const gx = 50 + Math.random() * (MAP_W - 100)
          const gy = 50 + Math.random() * (MAP_H - 100)
          const window = this.add.graphics()
          window.lineStyle(2, 0x88ccff, 0.2)
          window.strokeRect(gx - 15, gy - 15, 30, 30)
          window.lineBetween(gx, gy - 15, gx, gy + 15)
          window.lineBetween(gx - 15, gy, gx + 15, gy)
          this.decorationTiles.push(window)
        }
        break

      case 'ACTION':
        // Dynamic star shapes
        for (let i = 0; i < 25; i++) {
          this.addShapeEncounterZone(obsColor, 'star')
        }
        // Speed lines
        for (let i = 0; i < 8; i++) {
          const gx = 20 + Math.random() * (MAP_W - 40)
          const gy = 20 + Math.random() * (MAP_H - 40)
          const line = this.add.graphics()
          line.lineStyle(2, 0xff6600, 0.12)
          const angle = Math.random() * Math.PI * 2
          line.beginPath()
          line.moveTo(gx, gy)
          line.lineTo(gx + Math.cos(angle) * 30, gy + Math.sin(angle) * 30)
          line.strokePath()
          this.decorationTiles.push(line)
        }
        break
    }
  }

  private addBushEncounterZone(color: number) {
    const bx = 50 + Math.random() * (MAP_W - 100)
    const by = 50 + Math.random() * (MAP_H - 100)
    const bw = 40 + Math.random() * 30
    const bh = 20 + Math.random() * 15
    this.encounterZones.push({ x: bx, y: by, shape: 'bush', w: bw, h: bh })

    const bush = this.add.graphics()
    bush.fillStyle(color, 0.45)
    bush.fillEllipse(bx, by, bw, bh)
    bush.fillStyle(color + 0x224422, 0.25) // slightly lighter center
    bush.fillEllipse(bx - 4, by - 3, bw * 0.6, bh * 0.7)
    this.decorationTiles.push(bush)
  }

  private addRectEncounterZone(color: number) {
    const bx = 40 + Math.random() * (MAP_W - 80)
    const by = 40 + Math.random() * (MAP_H - 80)
    const bw = 24 + Math.random() * 20
    const bh = 24 + Math.random() * 20
    this.encounterZones.push({ x: bx, y: by, shape: 'rect', w: bw, h: bh })

    const rect = this.add.graphics()
    rect.fillStyle(color, 0.35)
    rect.fillRect(bx - bw / 2, by - bh / 2, bw, bh)
    this.decorationTiles.push(rect)
  }

  private addShapeEncounterZone(color: number, shape: string) {
    const bx = 50 + Math.random() * (MAP_W - 100)
    const by = 50 + Math.random() * (MAP_H - 100)
    const size = 18 + Math.random() * 16
    this.encounterZones.push({ x: bx, y: by, shape, w: size, h: size })

    const g = this.add.graphics()
    g.fillStyle(color, 0.3)
    if (shape === 'star') {
      // Simple diamond shape
      g.beginPath()
      g.moveTo(bx, by - size / 2)
      g.lineTo(bx + size / 2, by)
      g.lineTo(bx, by + size / 2)
      g.lineTo(bx - size / 2, by)
      g.closePath()
      g.fillPath()
    } else {
      g.fillCircle(bx, by, size / 2)
    }
    this.decorationTiles.push(g)
  }

  private refreshCollectionText() {
    const count = getCaptureCount()
    this.collectionText.setText(`图鉴: ${count}/3000`)
    const currentStage = getStageForCapturedCount(count)
    if (this.stageText) {
      this.stageText.setText(`探索阶段 ${currentStage}/6`)
    }
  }

  private drawPlayer() {
    const g = this.player
    g.clear()

    // Player body color per world theme
    const playerColors: Record<string, number> = {
      ANIMAL: 0x66bb6a, FOOD: 0xff8a65, COLOR: 0xce93d8,
      BODY: 0xf48fb1, CLOTHES: 0x7e57c2, NATURE: 0x4fc3f7,
      DAILY: 0xffcc80, NUMBER: 0x7c4dc2, FAMILY: 0xef5350, ACTION: 0xff6f00,
    }
    const bodyColor = playerColors[this.currentWorld] || 0x4488ff

    // Shadow
    g.fillStyle(0x000000, 0.2)
    g.fillEllipse(0, 8, 18, 6)
    // Body (squatter, rounder)
    g.fillStyle(bodyColor)
    g.fillEllipse(0, 0, 22, 18)
    // Head (bigger)
    g.fillStyle(0xffddbb)
    g.fillCircle(0, -16, 14)
    // Eyes (bigger + catchlight)
    g.fillStyle(0xffffff)
    g.fillCircle(-5, -18, 5)
    g.fillCircle(5, -18, 5)
    g.fillStyle(0x333333)
    g.fillCircle(-4, -18, 3)
    g.fillCircle(6, -18, 3)
    g.fillStyle(0xffffff)
    g.fillCircle(-3, -19, 1.5)
    g.fillCircle(7, -19, 1.5)
    // Cheeks
    g.fillStyle(0xff8a80, 0.4)
    g.fillCircle(-11, -13, 4)
    g.fillCircle(11, -13, 4)
    // Cute "w" mouth
    g.lineStyle(2, 0xcc6666, 0.8)
    g.beginPath()
    g.arc(-4, -12, 3, 0.5, Math.PI - 0.5, false)
    g.arc(4, -12, 3, 0.5, Math.PI - 0.5, false)
    g.strokePath()
    // Hat
    g.fillStyle(0xff4444)
    g.fillRect(-12, -24, 24, 4)
    g.fillRect(-7, -29, 14, 6)
  }

  update(time: number, delta: number) {
    if (!this.canMove) return
    // Deferred keyboard init: may not be ready on scene restart
    if (this.input.keyboard && (!this.cursors || !this.cursors.left)) {
      this.cursors = this.input.keyboard.createCursorKeys()
      this.wasdKeys = this.input.keyboard.addKeys("W,A,S,D") as any
    }
    if (!this.cursors) return

    let dx = 0, dy = 0

    // Phaser cursors (may not work after scene restart — use fallback)
    if (this.cursors && this.cursors.left) {
      if (this.cursors.left.isDown) dx = -2
      else if (this.cursors.right.isDown) dx = 2
      if (this.cursors.up.isDown) dy = -2
      else if (this.cursors.down.isDown) dy = 2

      if (this.wasdKeys) {
        if (!dx && this.wasdKeys.A?.isDown) dx = -2
        if (!dx && this.wasdKeys.D?.isDown) dx = 2
        if (!dy && this.wasdKeys.W?.isDown) dy = -2
        if (!dy && this.wasdKeys.S?.isDown) dy = 2
      }
    }

    // Fallback: window-level key tracking (works across scene restarts)
    if (dx === 0 && dy === 0) {
      if (this._pressedKeys["ArrowLeft"] || this._pressedKeys["a"] || this._pressedKeys["A"]) dx = -2
      else if (this._pressedKeys["ArrowRight"] || this._pressedKeys["d"] || this._pressedKeys["D"]) dx = 2
      if (this._pressedKeys["ArrowUp"] || this._pressedKeys["w"] || this._pressedKeys["W"]) dy = -2
      else if (this._pressedKeys["ArrowDown"] || this._pressedKeys["s"] || this._pressedKeys["S"]) dy = 2
    }

    if (dx !== 0 || dy !== 0) {
      this.playerX = Phaser.Math.Clamp(this.playerX + dx, 20, MAP_W - 20)
      this.playerY = Phaser.Math.Clamp(this.playerY + dy, 20, MAP_H - 20)

      // Encounter check
      this.encounterCooldown -= delta
      if (this.encounterCooldown <= 0) {
        for (const zone of this.encounterZones) {
          const dist = Phaser.Math.Distance.Between(this.playerX, this.playerY, zone.x, zone.y)
          const zoneRadius = Math.max(zone.w, zone.h) / 2 + 10
          if (dist < zoneRadius && Math.random() < 0.008) {
            this.triggerEncounter()
            break
          }
        }
      }
    }

    // Player float animation
    const floatY = Math.sin(time * 0.005) * 2
    this.player.setPosition(this.playerX, this.playerY + floatY)
  }

  private triggerEncounter() {
    this.canMove = false
    this.encounterCooldown = 3000

    const worldConfig = WORLDS.find(w => w.id === this.currentWorld)
    if (!worldConfig) { this.canMove = true; return }

    const theme = worldConfig.theme

    // Determine current difficulty stage based on capture progress
    const captureCount = getCaptureCount()
    const currentStage = getStageForCapturedCount(captureCount)
    const stageConfig = worldConfig.stages[currentStage - 1]

    // Pick word within difficulty range
    const wordData = pickRandomEncounter(allWords, theme, player.level, stageConfig.wordDifficulty)
    if (!wordData) { this.canMove = true; return }

    const entry = getOrCreateEntry(wordData)
    const monster = createBattleMonster(wordData, true, currentStage)
    startWildBattle(monster)

    // Transition to battle — use launch() so OverworldScene keeps running (Phaser 4 restart breaks update())
    const doTransition = () => {
      this.scene.launch("BattleScene", {
        worldId: this.currentWorld,
        wildMonsterData: wordData,
        isBoss: stageConfig.boss,
        bossName: stageConfig.boss ? BOSS_NAMES[this.currentWorld] : undefined,
      })
    }
    if (this.cameras.main && typeof this.cameras.main.fadeOut === 'function') {
      this.cameras.main.fadeOut(300, 0, 0, 0, (_cam: any, progress: number) => {
        if (progress >= 1) doTransition()
      })
    } else {
      doTransition()
    }
  }

  resumeExploration() {
    this.canMove = true
    this.encounterCooldown = 2000
    this.refreshCollectionText()
    // Reset camera from battle transition fadeOut — prevents brief black screen
    this.cameras.main.fadeIn(0)
  }
}

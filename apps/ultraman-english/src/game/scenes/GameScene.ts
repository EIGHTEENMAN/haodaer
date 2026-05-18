import Phaser from "phaser"
import { Player } from "../entities/Player"
import { Monster } from "../entities/Monster"
import { Projectile } from "../entities/Projectile"
import eventBus, { GameEvents } from "./EventBus"
import { player, addXp, addScore, addCombo, resetCombo, takeDamage } from "../../stores/playerStore"
import { gameStore, SKILLS, startCooldown, unlockSkillsForStage, saveProgress } from "../../stores/gameStore"
import { SkillEffects } from "../skills/SkillEffects"
import { WORLDS, WORLD_BG_COLORS } from "../../data/stages"
import { words as allWords } from "../../data/words"

const TILE = 80
const ARENA_COLS = 10
const ARENA_ROWS = 7
const ARENA_W = ARENA_COLS * TILE
const ARENA_H = ARENA_ROWS * TILE
const WALL_THICK = TILE / 2

function brightenColor(color: number, amount: number): number {
  let r = (color >> 16) & 0xff
  let g = (color >> 8) & 0xff
  let b = color & 0xff
  r = Math.min(255, r + amount)
  g = Math.min(255, g + amount)
  b = Math.min(255, b + amount)
  return (r << 16) | (g << 8) | b
}

function darkenColor(color: number, amount: number): number {
  let r = (color >> 16) & 0xff
  let g = (color >> 8) & 0xff
  let b = color & 0xff
  r = Math.max(0, r - amount)
  g = Math.max(0, g - amount)
  b = Math.max(0, b - amount)
  return (r << 16) | (g << 8) | b
}

export class GameScene extends Phaser.Scene {
  private playerEntity!: Player
  private monsters: Monster[] = []
  private projectilesGroup!: Phaser.Physics.Arcade.Group
  private skillEffects!: SkillEffects
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private currentMonster: Monster | null = null
  private stageTimer = 0
  private timerEvent: Phaser.Time.TimerEvent | null = null
  private stageStartTime = 0
  private stageCleared = false
  private gameOverShown = false

  constructor() {
    super({ key: "GameScene" })
  }

  create() {
    this.stageCleared = false
    this.gameOverShown = false
    this.monsters = []
    this.currentMonster = null

    // Read stage config
    const worldId = gameStore.currentWorld
    const stageNum = gameStore.currentStage
    const world = WORLDS.find(w => w.id === worldId)
    if (!world) {
      console.error("World not found:", worldId)
      return
    }
    const stageConfig = world.stages.find(s => s.stage === stageNum)
    if (!stageConfig) {
      console.error("Stage config not found:", worldId, stageNum)
      return
    }

    // Reset stage state
    gameStore.showQuestion = false
    gameStore.showSkillSelect = false
    gameStore.showStageClear = false
    gameStore.showGameOver = false
    gameStore.stageMonstersAlive = stageConfig.monsterCount
    gameStore.stageMonstersTotal = stageConfig.monsterCount
    gameStore.wordsLearnedInStage = 0
    gameStore.remainingTime = stageConfig.timeLimit

    // Unlock skills for this stage
    unlockSkillsForStage(stageNum)

    // Build arena
    this.buildArena(worldId)

    // Player at bottom center (bullet hell arena)
    this.playerEntity = new Player(this, ARENA_W / 2, ARENA_H * 0.78)
    this.physics.add.collider(this.playerEntity.sprite, this.walls)

    // Projectiles group
    this.projectilesGroup = this.physics.add.group({ runChildUpdate: false })

    // Spawn monsters
    this.spawnMonsters(stageConfig.monsterCount, world, {
      stage: stageConfig.stage,
      wordDifficulty: stageConfig.wordDifficulty,
      hasScatter: stageConfig.hasScatter,
      bulletSpeed: stageConfig.bulletSpeed,
      monsterCount: stageConfig.monsterCount,
      timeLimit: stageConfig.timeLimit,
    })

    // Bullet hit player
    this.physics.add.overlap(
      this.playerEntity.sprite,
      this.projectilesGroup,
      this.onBulletHitPlayer as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    )

    // Skill effects
    this.skillEffects = new SkillEffects(this)

    // Event listeners
    eventBus.on(GameEvents.QUESTION_RESULT, this.onQuestionResult = this.onQuestionResult.bind(this))
    eventBus.on(GameEvents.CLOSE_QUESTION, this.onCloseQuestion = this.onCloseQuestion.bind(this))
    eventBus.on(GameEvents.PLAYER_ATTACK, this.onPlayerAttack = this.onPlayerAttack.bind(this))
    // Register scene shutdown to clean up eventBus listeners on scene restart
    this.events.on('shutdown', this.shutdown, this)

    // Stage timer
    this.stageStartTime = this.time.now
    if (stageConfig.timeLimit > 0) {
      this.stageTimer = stageConfig.timeLimit * 1000
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          const elapsed = this.time.now - this.stageStartTime
          const remaining = Math.max(0, stageConfig.timeLimit - Math.floor(elapsed / 1000))
          gameStore.remainingTime = remaining
          if (remaining <= 0) {
            this.onStageTimeout()
          }
        },
      })
    }

    // Stage info text
    const worldIdx = WORLDS.findIndex(w => w.id === worldId) + 1
    const stageText = this.add.text(ARENA_W / 2, ARENA_H / 2 - 40, `STAGE ${worldIdx}-${stageNum}`, {
      fontSize: "32px",
      color: "#ffd700",
      stroke: "#000000",
      strokeThickness: 6,
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(20).setAlpha(0)

    // Animate stage intro
    this.tweens.add({
      targets: stageText,
      alpha: 1,
      y: ARENA_H / 2 - 80,
      duration: 600,
      ease: "Power2",
      onComplete: () => {
        this.tweens.add({
          targets: stageText,
          alpha: 0,
          delay: 800,
          duration: 400,
          onComplete: () => stageText.destroy(),
        })
      },
    })

    this.cameras.main.fadeIn(300)
  }

  private buildArena(worldId: string) {
    const bgColor = WORLD_BG_COLORS[worldId] || 0x2d5a27

    // Floor
    const floor = this.add.graphics()
    floor.fillStyle(bgColor, 1)
    floor.fillRect(0, 0, ARENA_W, ARENA_H)
    floor.setDepth(0)

    // Grid pattern on floor for spatial reference
    const gridColor = brightenColor(bgColor, 20)
    floor.lineStyle(1, gridColor, 0.15)
    for (let x = 0; x <= ARENA_COLS; x++) {
      floor.lineBetween(x * TILE, 0, x * TILE, ARENA_H)
    }
    for (let y = 0; y <= ARENA_ROWS; y++) {
      floor.lineBetween(0, y * TILE, ARENA_W, y * TILE)
    }

    // Generate 1px wall texture for static sprite bodies (Phaser 4 needs sprite objects for physics)
    const wallTexKey = '__wall_tex'
    if (!this.textures.exists(wallTexKey)) {
      const g = this.add.graphics()
      g.fillStyle(0xffffff, 0)
      g.fillRect(0, 0, 1, 1)
      g.generateTexture(wallTexKey, 1, 1)
      g.destroy()
    }

    // Walls (static physics bodies)
    this.walls = this.physics.add.staticGroup()
    const wallThick = TILE / 2
    const wallColor = darkenColor(bgColor, 50)

    // Wall visual (graphics only, no physics)
    const wallGfx = this.add.graphics().setDepth(1)
    wallGfx.fillStyle(wallColor, 1)
    wallGfx.fillRect(0, 0, ARENA_W, wallThick)
    wallGfx.fillRect(0, ARENA_H - wallThick, ARENA_W, wallThick)
    wallGfx.fillRect(0, 0, wallThick, ARENA_H)
    wallGfx.fillRect(ARENA_W - wallThick, 0, wallThick, ARENA_H)

    // Invisible static sprite bodies for reliable collision in Phaser 4
    const wallDefs = [
      { x: ARENA_W / 2, y: wallThick / 2, w: ARENA_W, h: wallThick },
      { x: ARENA_W / 2, y: ARENA_H - wallThick / 2, w: ARENA_W, h: wallThick },
      { x: wallThick / 2, y: ARENA_H / 2, w: wallThick, h: ARENA_H },
      { x: ARENA_W - wallThick / 2, y: ARENA_H / 2, w: wallThick, h: ARENA_H },
    ]
    for (const w of wallDefs) {
      const wall = this.walls.create(w.x, w.y, wallTexKey)
      wall.setVisible(false)
      wall.body.setSize(w.w, w.h)
    }

    // Physics world bounds
    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H)
  }

  private spawnMonsters(count: number, world: typeof WORLDS[0], stageConfig: {
    stage: number; wordDifficulty: number; hasScatter: boolean; bulletSpeed: number; monsterCount: number; timeLimit: number
  }) {
    // Filter words by theme and difficulty
    const pool = allWords.filter(w =>
      w.theme === world.theme && w.difficulty === stageConfig.wordDifficulty
    )

    // Fallback: use difficulty only
    const fallbackPool = allWords.filter(w => w.difficulty === stageConfig.wordDifficulty)

    // Boss stage: need 1 monster with higher HP, special treatment
    const isBoss = stageConfig.stage === 6
    const monsterCount = isBoss ? 1 : count

    // Position monsters in a pattern
    const positions = this.getMonsterPositions(monsterCount, isBoss)

    for (let i = 0; i < monsterCount; i++) {
      const usePool = pool.length >= monsterCount ? pool : fallbackPool
      const wordData = usePool.length > 0
        ? usePool[i % usePool.length]
        : { id: 0, word: "HELLO", meaning: "你好", phonetic: "/həˈloʊ/", difficulty: 1, theme: world.theme, emoji: "👾", sentence: "Hello!", sentenceCn: "你好！" }

      const pos = positions[i]
      Monster.preCreateTexture(this, wordData.id, wordData.difficulty, isBoss)
      const monster = new Monster(this, pos.x, pos.y, {
        id: wordData.id,
        word: wordData.word,
        meaning: wordData.meaning,
        phonetic: wordData.phonetic,
        difficulty: wordData.difficulty,
        theme: wordData.theme,
        sentence: wordData.sentence,
        sentenceCn: wordData.sentenceCn,
      }, this.projectilesGroup, {
        stage: stageConfig.stage,
        monsterCount,
        timeLimit: stageConfig.timeLimit,
        bulletSpeed: stageConfig.bulletSpeed,
        hasScatter: stageConfig.hasScatter,
        wordDifficulty: stageConfig.wordDifficulty,
      })
      this.monsters.push(monster)
    }
  }

  private getMonsterPositions(count: number, isBoss: boolean): { x: number; y: number }[] {
    const margin = TILE * 1.5
    const innerW = ARENA_W - margin * 2
    const topY = WALL_THICK + TILE * 0.8

    if (isBoss) {
      return [{ x: ARENA_W / 2, y: topY }]
    }

    // Bullet hell: monsters spread horizontally at top of arena
    const positions: { x: number; y: number }[] = []
    for (let i = 0; i < count; i++) {
      positions.push({
        x: margin + (innerW / Math.max(count - 1, 1)) * i,
        y: topY + (i % 2) * TILE * 0.6,
      })
    }
    return positions
  }

  private onPlayerAttack() {
    if (this.stageCleared || gameStore.showQuestion || gameStore.showSkillSelect || gameStore.showStageClear || gameStore.showGameOver) return

    const pos = this.playerEntity.getPosition()
    let nearest: Monster | null = null
    let nearDist = Infinity
    for (const m of this.monsters) {
      if (!m.active || m.currentHp <= 0) continue
      const dx = m.x - pos.x
      const dy = m.y - pos.y
      const d = dx * dx + dy * dy
      if (d < nearDist) {
        nearDist = d
        nearest = m
      }
    }
    if (!nearest) return

    this.currentMonster = nearest
    gameStore.currentMonsterId = nearest.wordData.id
    gameStore.currentWord = nearest.wordData

    gameStore.showSkillSelect = true
    eventBus.emit(GameEvents.SHOW_SKILL_SELECT, {
      monsterId: nearest.wordData.id,
      word: nearest.wordData,
    })
  }

  private onQuestionResult(data: { correct: boolean; skillIndex: number }) {
    startCooldown(data.skillIndex)

    if (data.correct) {
      addCombo()
      this.skillEffects.playComboPopup(player.combo)
      const skill = SKILLS[data.skillIndex]
      const result = addScore(100)
      const comboMul = result.multiplier
      const baseDamage = 30 + (skill?.level || 1) * 20
      const damage = baseDamage + result.points

      addXp(30 + (skill?.level || 1) * 10)
      gameStore.wordsLearnedInStage++

      if (this.currentMonster && this.currentMonster.active) {
        this.skillEffects.playSkillEffect(data.skillIndex, this.currentMonster.x, this.currentMonster.y, comboMul)

        const isDead = this.currentMonster.takeDamage(damage)
        if (isDead) {
          player.monstersKilled++
          gameStore.stageMonstersAlive = Math.max(0, gameStore.stageMonstersAlive - 1)
          addXp(50)
          this.skillEffects.playDeathEffect(this.currentMonster.x, this.currentMonster.y)
          this.currentMonster.destroyMonster()
        }
      }
    } else {
      resetCombo()
      const isDead = takeDamage(15)
      this.cameras.main.flash(200, 255, 0, 0)
      if (isDead) {
        this.onGameOver()
      }
    }

    this.currentMonster = null
    gameStore.showQuestion = false
    this.checkStageClear()
  }

  private onCloseQuestion() {
    gameStore.showQuestion = false
    this.currentMonster = null
  }

  private onBulletHitPlayer(_player: any, bullet: Projectile) {
    if (!bullet.active) return
    bullet.kill()
    this.cameras.main.shake(100, 0.005)
    const isDead = takeDamage(10)
    if (isDead) {
      this.onGameOver()
    }
  }

  private checkStageClear() {
    const alive = this.monsters.filter(m => m.active && m.currentHp > 0)
    if (alive.length > 0) return

    this.stageCleared = true
    gameStore.stageMonstersAlive = 0
    gameStore.showStageClear = true

    saveProgress(gameStore.currentWorld, gameStore.currentStage)

    if (gameStore.remainingTime > 0) {
      addScore(gameStore.remainingTime * 5)
    }

    if (this.timerEvent) {
      this.timerEvent.remove()
    }

    this.time.delayedCall(2500, () => {
      this.shutdown()
      gameStore.showStageClear = false
      // Auto-advance to next stage (bullet hell flow)
      const world = WORLDS.find(w => w.id === gameStore.currentWorld)
      const currentStageNum = gameStore.currentStage
      if (world && currentStageNum < 6) {
        eventBus.emit(GameEvents.ADVANCE_STAGE)
      } else {
        gameStore.screen = "stageMap"
      }
    })
  }

  private onStageTimeout() {
    this.onGameOver()
  }

  private onGameOver() {
    if (this.gameOverShown) return
    this.gameOverShown = true
    gameStore.showGameOver = true

    if (this.timerEvent) {
      this.timerEvent.remove()
    }

    this.time.delayedCall(2500, () => {
      this.shutdown()
      gameStore.showGameOver = false
      gameStore.screen = "stageMap"
    })
  }

  update() {
    if (gameStore.showQuestion || gameStore.showSkillSelect || this.stageCleared || this.gameOverShown) return

    this.playerEntity.update()

    const pos = this.playerEntity.getPosition()
    for (const m of this.monsters) {
      if (!m.active || m.currentHp <= 0) continue
      m.fireAtPlayer(pos.x, pos.y)
    }

    const projectiles = this.projectilesGroup.getChildren() as Projectile[]
    for (const p of projectiles) {
      if (p.active) {
        p.update(pos.x, pos.y)
      }
    }

    for (const m of this.monsters) {
      if (m.active) m.updateLabelPositions()
    }
  }

  private shutdown() {
    eventBus.off(GameEvents.QUESTION_RESULT, this.onQuestionResult)
    eventBus.off(GameEvents.CLOSE_QUESTION, this.onCloseQuestion)
    eventBus.off(GameEvents.PLAYER_ATTACK, this.onPlayerAttack)

    this.monsters.forEach(m => {
      if (m.active) m.destroyMonster()
    })
    this.monsters = []

    this.projectilesGroup.clear(true, true)
  }
}

import Phaser from "phaser"
import { Player } from "../entities/Player"
import { Monster } from "../entities/Monster"
import eventBus, { GameEvents } from "./EventBus"
import { player, addXp, addScore, addCombo, resetCombo, takeDamage } from "../../stores/playerStore"
import { playWordAudio, playBruceLeeShout, getSkillPitch } from "../../utils/audio"
import { gameStore, SKILLS, startCooldown, unlockSkillsForStage, saveProgress } from "../../stores/gameStore"
import { recordAnswer } from "../../stores/wordStore"
import { SkillEffects } from "../skills/SkillEffects"
import { WORLDS, WORLD_BG_COLORS, WORLD_OBSTACLE_COLORS, StageConfig } from "../../data/stages"
import { words as allWords } from "../../data/words"
import { WordData } from "../../stores/gameStore"

const TILE = 80
const ARENA_COLS = 20
const ARENA_ROWS = 7
const ARENA_W = ARENA_COLS * TILE
const ARENA_H = ARENA_ROWS * TILE
const WALL_THICK = TILE / 2

// Chase speed by stage difficulty (0-4)
const CHASE_SPEEDS = [0, 60, 110, 160, 220]
// Melee damage by stage difficulty (0-4)
const MELEE_DAMAGES = [0, 6, 10, 14, 20]

function brightenColor(color: number, amount: number): number {
  let r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff
  r = Math.min(255, r + amount)
  g = Math.min(255, g + amount)
  b = Math.min(255, b + amount)
  return (r << 16) | (g << 8) | b
}

function darkenColor(color: number, amount: number): number {
  let r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff
  r = Math.max(0, r - amount)
  g = Math.max(0, g - amount)
  b = Math.max(0, b - amount)
  return (r << 16) | (g << 8) | b
}

export class GameScene extends Phaser.Scene {
  private playerEntity!: Player
  private monsters: Monster[] = []
  private monsterGroup!: Phaser.GameObjects.Group
  private skillEffects!: SkillEffects
  private walls!: Phaser.Physics.Arcade.StaticGroup
  private obstacles!: Phaser.Physics.Arcade.StaticGroup

  // Attack state
  private spaceCooldown = 0
  private readonly SPACE_COOLDOWN_MS = 150 // max ~7 attacks/sec on mash

  // Hint/target system
  private currentTarget: Monster | null = null
  private hintType: 'audio' | 'chinese' | 'emoji' = 'chinese'

  // Invulnerability after question
  private invulnerableTimer = 0

  // Stage
  private stageTimer = 0
  private timerEvent: Phaser.Time.TimerEvent | null = null
  private stageStartTime = 0
  private stageCleared = false
  private gameOverShown = false

  // Keyboard
  private skillKeys: Phaser.Input.Keyboard.Key[] = []

  constructor() {
    super({ key: "GameScene" })
  }

  create() {
    this.stageCleared = false
    this.gameOverShown = false
    this.monsters = []
    this.currentTarget = null
    this.invulnerableTimer = 0
    this.monsterGroup = this.add.group()

    // Generate 1x1 pixel texture for invisible physics sprites
    if (!this.textures.exists("__PIXEL")) {
      const g = this.add.graphics()
      g.fillStyle(0xffffff, 1)
      g.fillRect(0, 0, 1, 1)
      g.generateTexture("__PIXEL", 1, 1)
      g.destroy()
    }

    const worldId = gameStore.currentWorld
    const stageNum = gameStore.currentStage
    const world = WORLDS.find(w => w.id === worldId)
    if (!world) { console.error("World not found:", worldId); return }
    const stageConfig = world.stages.find(s => s.stage === stageNum)
    if (!stageConfig) { console.error("Stage config not found:", worldId, stageNum); return }

    // Provide defaults for optional arena fields
    const monsterCount = stageConfig.monsterCount ?? 2
    const timeLimit = stageConfig.timeLimit ?? 0
    const bulletSpeed = stageConfig.bulletSpeed ?? 1

    gameStore.showQuestion = false
    gameStore.showSkillSelect = false
    gameStore.showStageClear = false
    gameStore.showGameOver = false
    gameStore.stageMonstersAlive = monsterCount
    gameStore.stageMonstersTotal = monsterCount
    gameStore.wordsLearnedInStage = 0
    gameStore.remainingTime = timeLimit

    unlockSkillsForStage(stageNum)

    this.buildArena(worldId)

    // Player
    this.playerEntity = new Player(this, ARENA_W / 2, ARENA_H * 0.8)
    this.physics.world.addCollider(this.playerEntity.physicsSprite, this.walls)

    // Camera follows player's physics sprite
    this.cameras.main.setBounds(0, 0, ARENA_W, ARENA_H)
    this.cameras.main.startFollow(this.playerEntity.physicsSprite, true, 0.08, 0.08)

    // Spawn monsters
    const monsterPositions = this.getMonsterPositions(monsterCount, stageConfig.stage === 6)
    this.spawnMonsters(monsterPositions, stageConfig, world)

    // Obstacles
    this.obstacles = this.generateObstacles(worldId, monsterPositions)
    this.physics.world.addCollider(this.playerEntity.physicsSprite, this.obstacles)
    this.physics.world.addCollider(this.monsterGroup, this.obstacles)

    // Monster ↔ walls
    this.physics.world.addCollider(this.monsterGroup, this.walls)

    // Skill effects
    this.skillEffects = new SkillEffects(this)

    // Events
    eventBus.on(GameEvents.PLAYER_ATTACK, this.onPlayerAttack)
    eventBus.on(GameEvents.BACK_TO_MAP, this.goBackToMap)
    this.events.on('shutdown', this.shutdown, this)

    // Keyboard: skill keys 1-5
    if (this.input.keyboard) {
      for (let i = 0; i < 5; i++) {
        const key = this.input.keyboard.addKey(49 + i) // keycodes 1-5
        this.skillKeys.push(key)
      }
    }

    // Stage timer
    this.stageStartTime = this.time.now
    if (timeLimit > 0) {
      this.stageTimer = timeLimit * 1000
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          const elapsed = this.time.now - this.stageStartTime
          const remaining = Math.max(0, timeLimit - Math.floor(elapsed / 1000))
          gameStore.remainingTime = remaining
          if (remaining <= 0) this.onStageTimeout()
        },
      })
    }

    // Stage intro text
    const worldIdx = WORLDS.findIndex(w => w.id === worldId) + 1
    const stageText = this.add.text(ARENA_W / 2, ARENA_H / 2 - 40,
      `STAGE ${worldIdx}-${stageNum}`, {
        fontSize: "32px", color: "#ffd700",
        stroke: "#000000", strokeThickness: 6,
        fontFamily: "monospace", fontStyle: "bold",
      }
    ).setOrigin(0.5).setDepth(20).setAlpha(0)

    this.tweens.add({
      targets: stageText,
      alpha: 1, y: ARENA_H / 2 - 80,
      duration: 600, ease: "Power2",
      onComplete: () => {
        this.tweens.add({
          targets: stageText,
          alpha: 0, delay: 800, duration: 400,
          onComplete: () => stageText.destroy(),
        })
      },
    })

    // Pick first target after a short delay
    this.time.delayedCall(1200, () => this.selectNewTarget())

    this.cameras.main.fadeIn(300)
  }

  private buildArena(worldId: string) {
    const bgColor = WORLD_BG_COLORS[worldId] || 0x2d5a27

    const floor = this.add.graphics()
    floor.fillStyle(bgColor, 1)
    floor.fillRect(0, 0, ARENA_W, ARENA_H)
    floor.setDepth(0)

    // Grid
    const gridColor = brightenColor(bgColor, 20)
    floor.lineStyle(1, gridColor, 0.15)
    for (let x = 0; x <= ARENA_COLS; x++) floor.lineBetween(x * TILE, 0, x * TILE, ARENA_H)
    for (let y = 0; y <= ARENA_ROWS; y++) floor.lineBetween(0, y * TILE, ARENA_W, y * TILE)

    // 1px wall texture
    const wallTexKey = '__wall_tex'
    if (!this.textures.exists(wallTexKey)) {
      const g = this.add.graphics()
      g.fillStyle(0xffffff, 0)
      g.fillRect(0, 0, 1, 1)
      g.generateTexture(wallTexKey, 1, 1)
      g.destroy()
    }

    this.walls = this.physics.add.staticGroup()
    const wallColor = darkenColor(bgColor, 50)
    const wallGfx = this.add.graphics().setDepth(1)
    wallGfx.fillStyle(wallColor, 1)
    wallGfx.fillRect(0, 0, ARENA_W, WALL_THICK)
    wallGfx.fillRect(0, ARENA_H - WALL_THICK, ARENA_W, WALL_THICK)
    wallGfx.fillRect(0, 0, WALL_THICK, ARENA_H)
    wallGfx.fillRect(ARENA_W - WALL_THICK, 0, WALL_THICK, ARENA_H)

    const wallDefs = [
      { x: ARENA_W / 2, y: WALL_THICK / 2, w: ARENA_W, h: WALL_THICK },
      { x: ARENA_W / 2, y: ARENA_H - WALL_THICK / 2, w: ARENA_W, h: WALL_THICK },
      { x: WALL_THICK / 2, y: ARENA_H / 2, w: WALL_THICK, h: ARENA_H },
      { x: ARENA_W - WALL_THICK / 2, y: ARENA_H / 2, w: WALL_THICK, h: ARENA_H },
    ]
    for (const w of wallDefs) {
      const wall = this.walls.create(w.x, w.y, wallTexKey)
      wall.setVisible(false)
      wall.body.setSize(w.w, w.h)
    }

    this.physics.world.setBounds(0, 0, ARENA_W, ARENA_H)
  }

  private getMonsterPositions(count: number, isBoss: boolean): { x: number; y: number }[] {
    const margin = TILE * 1.5
    if (isBoss) return [{ x: ARENA_W / 2, y: ARENA_H * 0.3 }]

    // Grid-based spawning: divide arena into cells, place one monster per cell
    // Use upper 65% of arena for monster spawns (above player spawn zone)
    const usableH = ARENA_H * 0.65
    const cols = Math.ceil(Math.sqrt(count * 2))
    const rows = Math.ceil(count / cols)
    const cellW = (ARENA_W - margin * 2) / cols
    const cellH = (usableH - margin) / rows

    const positions: { x: number; y: number }[] = []
    const shuffled: number[] = []
    for (let i = 0; i < cols * rows; i++) shuffled.push(i)
    // Fisher-Yates shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    for (let i = 0; i < count && i < shuffled.length; i++) {
      const idx = shuffled[i]
      const col = idx % cols
      const row = Math.floor(idx / cols)
      // Add jitter within cell
      const jx = (Math.random() - 0.5) * cellW * 0.4
      const jy = (Math.random() - 0.5) * cellH * 0.4
      positions.push({
        x: margin + col * cellW + cellW / 2 + jx,
        y: margin + row * cellH + cellH / 2 + jy,
      })
    }

    // Fill remaining if we ran out of cells
    while (positions.length < count) {
      positions.push({
        x: margin + Math.random() * (ARENA_W - margin * 2),
        y: margin + Math.random() * (usableH - margin),
      })
    }

    return positions
  }

  private spawnMonsters(
    positions: { x: number; y: number }[],
    stageConfig: StageConfig,
    world: typeof WORLDS[0]
  ) {
    // Arena mode uses first difficulty value from the [min, max] tuple
    const diff = stageConfig.wordDifficulty[0]
    const mCount = stageConfig.monsterCount ?? 2
    const bSpeed = stageConfig.bulletSpeed ?? 1
    let pool = allWords.filter(w => w.theme === world.theme && w.difficulty === diff)
    const fallbackPool = allWords.filter(w => w.difficulty === diff)
    if (pool.length < mCount) {
      pool = fallbackPool
    }
    const isBoss = stageConfig.stage === 6
    const monsterCount = isBoss ? 1 : mCount

    // Offset each stage's slice so consecutive stages don't repeat words
    let offset = 0
    for (const s of world.stages) {
      if (s.stage >= stageConfig.stage) break
      const sDiff = Array.isArray(s.wordDifficulty) ? s.wordDifficulty[0] : s.wordDifficulty
      if (sDiff === diff) offset += (s as any).monsterCount ?? 2
    }
    offset = offset % (pool.length || 1)

    // Map old bulletSpeed to chase speed index
    const speedIdx = Math.min(bSpeed, 4)
    const chaseSpeed = CHASE_SPEEDS[speedIdx]
    const meleeDamage = MELEE_DAMAGES[speedIdx]

    for (let i = 0; i < monsterCount; i++) {
      const wordData = pool.length > 0
        ? pool[(offset + i) % pool.length]
        : { id: 0, word: "HELLO", meaning: "你好", phonetic: "/həˈloʊ/", difficulty: 1, theme: world.theme, emoji: "👾", sentence: "Hello!", sentenceCn: "你好！" }

      const pos = positions[i]
      const monster = new Monster(this, pos.x, pos.y, wordData, chaseSpeed, meleeDamage, isBoss)
      this.monsters.push(monster)
      this.monsterGroup.add(monster.physicsSprite)
    }

    // Save stage words (deduplicated) for the word summary page
    const seen = new Set<number>()
    gameStore.stageWords = this.monsters
      .map(m => m.wordData)
      .filter(w => {
        if (seen.has(w.id)) return false
        seen.add(w.id)
        return true
      })
  }

  private generateObstacles(worldId: string, excludePositions: { x: number; y: number }[]): Phaser.Physics.Arcade.StaticGroup {
    const obs = this.physics.add.staticGroup()
    const baseColor = WORLD_OBSTACLE_COLORS[worldId] || 0x666666
    const texKey = '__obs_tex'
    if (!this.textures.exists(texKey)) {
      const g = this.add.graphics()
      g.fillStyle(0xffffff, 0)
      g.fillRect(0, 0, 1, 1)
      g.generateTexture(texKey, 1, 1)
      g.destroy()
    }

    const obsGfx = this.add.graphics().setDepth(2)

    // Tile-based maze layouts (arena: 20 cols × 7 rows)
    const layouts = [
      // Layout 0: Snake corridors — zigzag walls with gaps
      () => {
        // Horizontal walls across the arena, each with gaps
        const rows = [1, 3, 5]
        for (const r of rows) {
          this.addObstacleTile(obs, obsGfx, baseColor, 0, r, 5, 1)    // left segment
          this.addObstacleTile(obs, obsGfx, baseColor, 8, r, 5, 1)    // middle segment
          this.addObstacleTile(obs, obsGfx, baseColor, 15, r, 5, 1)   // right segment
        }
      },
      // Layout 1: Central hub with spokes
      () => {
        // Large center pillar
        this.addObstacleTile(obs, obsGfx, baseColor, 9, 2, 2, 4, true)
        // Horizontal dividers left and right of center
        this.addObstacleTile(obs, obsGfx, baseColor, 1, 3, 5, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 14, 3, 5, 1)
        // Scatter pillars
        for (const [c, r] of [[2,1], [17,1], [4,5], [15,5]]) {
          this.addObstacleTile(obs, obsGfx, baseColor, c, r, 1, 1, true)
        }
      },
      // Layout 2: L-shaped room dividers
      () => {
        // L-shaped walls creating 3 rooms
        // Room 1 (left)
        this.addObstacleTile(obs, obsGfx, baseColor, 0, 1, 4, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 4, 1, 1, 2)
        // Room 2 (center)
        this.addObstacleTile(obs, obsGfx, baseColor, 7, 2, 6, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 12, 3, 1, 3)
        // Room 3 (right)
        this.addObstacleTile(obs, obsGfx, baseColor, 15, 1, 5, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 15, 1, 1, 3)
        // Scattered breakable pillars
        this.addObstacleTile(obs, obsGfx, baseColor, 2, 4, 1, 1, true)
        this.addObstacleTile(obs, obsGfx, baseColor, 10, 5, 1, 1, true)
        this.addObstacleTile(obs, obsGfx, baseColor, 17, 4, 1, 1, true)
      },
      // Layout 3: Checkerboard pillars
      () => {
        for (let c = 1; c < 19; c += 2) {
          for (let r = 1; r < 6; r += 2) {
            const isBreakable = Math.random() > 0.4
            this.addObstacleTile(obs, obsGfx, baseColor, c, r, 1, 1, isBreakable)
          }
        }
      },
      // Layout 4: Enclosed rooms with connecting gaps
      () => {
        // Top room walls
        this.addObstacleTile(obs, obsGfx, baseColor, 1, 1, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 4, 1, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 7, 1, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 10, 1, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 13, 1, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 16, 1, 2, 1)
        // Vertical dividers
        this.addObstacleTile(obs, obsGfx, baseColor, 3, 2, 1, 2, true)
        this.addObstacleTile(obs, obsGfx, baseColor, 8, 2, 1, 2, true)
        this.addObstacleTile(obs, obsGfx, baseColor, 13, 2, 1, 2, true)
        this.addObstacleTile(obs, obsGfx, baseColor, 18, 2, 1, 2, true)
        // Bottom horizontal
        this.addObstacleTile(obs, obsGfx, baseColor, 1, 5, 3, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 7, 5, 5, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 15, 5, 3, 1)
      },
      // Layout 5: Diagonal corridors with pillars
      () => {
        // Staggered walls creating a slalom path
        this.addObstacleTile(obs, obsGfx, baseColor, 2, 1, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 5, 2, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 8, 1, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 11, 2, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 14, 1, 2, 1)
        this.addObstacleTile(obs, obsGfx, baseColor, 17, 2, 2, 1)
        // Bottom row walls
        this.addObstacleTile(obs, obsGfx, baseColor, 2, 5, 1, 1, true)
        this.addObstacleTile(obs, obsGfx, baseColor, 6, 5, 2, 1, true)
        this.addObstacleTile(obs, obsGfx, baseColor, 10, 5, 1, 1, true)
        this.addObstacleTile(obs, obsGfx, baseColor, 14, 5, 2, 1, true)
        this.addObstacleTile(obs, obsGfx, baseColor, 18, 5, 1, 1, true)
      },
    ]

    // Pick random layout
    const layout = layouts[Math.floor(Math.random() * layouts.length)]
    layout()

    return obs
  }

  /** Place obstacle at tile (col, row), spanning (w, h) tiles */
  private addObstacleTile(
    obs: Phaser.Physics.Arcade.StaticGroup,
    gfx: Phaser.GameObjects.Graphics,
    baseColor: number,
    col: number, row: number,
    w: number, h: number,
    breakable = false
  ) {
    const x = (col + w / 2) * TILE
    const y = (row + h / 2) * TILE
    const wall = this.addObstacleRect(obs, gfx, baseColor, x, y, w * TILE - 4, h * TILE - 4)
    if (breakable && wall) {
      wall.setData('breakable', true)
      wall.setData('hp', 1)
    }
  }

  private addObstacleRect(
    obs: Phaser.Physics.Arcade.StaticGroup,
    gfx: Phaser.GameObjects.Graphics,
    baseColor: number,
    x: number, y: number,
    w: number, h: number
  ): Phaser.Physics.Arcade.Sprite {
    const texKey = '__obs_tex'
    const wall = obs.create(x, y, texKey)
    wall.setVisible(false)
    wall.body.setSize(w, h)
    wall.setDepth(3)

    const brightColor = brightenColor(baseColor, 60)
    gfx.fillStyle(brightColor, 0.85)
    gfx.fillRect(x - w / 2, y - h / 2, w, h)
    gfx.lineStyle(2, 0xffffff, 0.15)
    gfx.strokeRect(x - w / 2, y - h / 2, w, h)
    // Inner highlight
    gfx.fillStyle(0xffffff, 0.08)
    gfx.fillRect(x - w / 2 + 3, y - h / 2 + 3, w * 0.3, h - 6)

    return wall
  }

  /** Create floating damage number (Phaser text, camera-aware) */
  private showDamageNumber(text: string, x: number, y: number, color: string) {
    const txt = this.add.text(x, y, text, {
      fontSize: "20px", color,
      stroke: "#000000", strokeThickness: 3,
      fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(50)

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => txt.destroy(),
    })
  }

  /** Destroy breakable obstacles within radius */
  private destroyBreakableObstacles(x: number, y: number, radius: number) {
    this.obstacles.getChildren().forEach((child) => {
      const obs = child as Phaser.Physics.Arcade.Sprite
      if (!obs.active || !obs.getData('breakable')) return
      const dx = obs.x - x
      const dy = obs.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= radius) {
        this.skillEffects.playObstacleBreak(obs.x, obs.y)
        obs.destroy()
      }
    })
  }

  // ─── Hint / Target System ───

  private selectNewTarget() {
    const alive = this.monsters.filter(m => m.active && m.currentHp > 0)
    if (alive.length === 0) return

    // Pick a random alive monster
    const target = alive[Math.floor(Math.random() * alive.length)]
    this.currentTarget = target

    const types: ('audio' | 'chinese' | 'emoji')[] = ['audio', 'chinese', 'emoji']
    this.hintType = types[Math.floor(Math.random() * types.length)]

    // Highlight target visually (add a glow indicator via alpha pulse)
    target.container.setAlpha(0.7)
    this.time.delayedCall(200, () => {
      if (target.active) target.container.setAlpha(1)
    })

    // Emit hint to Vue HUD
    eventBus.emit(GameEvents.HINT_UPDATE, {
      word: target.wordData,
      hintType: this.hintType,
    })

    // Play pronunciation for audio hint
    if (this.hintType === 'audio') {
      playWordAudio(target.wordData.word)
    }
  }

  // ─── Player Attack (Space Mash / Skill Execution) ───

  private onPlayerAttack = () => {
    if (this.stageCleared || this.gameOverShown || gameStore.isPaused) return

    // Check if a skill is selected → fire it
    if (gameStore.selectedSkill >= 0) {
      const idx = gameStore.selectedSkill
      gameStore.selectedSkill = -1 // consume selection
      this.useSkill(idx)
      return
    }

    const now = this.time.now
    if (now - this.spaceCooldown < this.SPACE_COOLDOWN_MS) return
    this.spaceCooldown = now

    const pos = this.playerEntity.getPosition()

    // Find nearest monster in melee range
    let nearest: Monster | null = null
    let nearestDist = 65
    for (const m of this.monsters) {
      if (!m.active || m.currentHp <= 0) continue
      const dx = m.x - pos.x, dy = m.y - pos.y
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < nearestDist) {
        nearestDist = d
        nearest = m
      }
    }

    if (!nearest) {
      // Whiff — Bruce Lee light shout + small effect
      playBruceLeeShout(0.8)
      this.skillEffects.playWhiffEffect(pos.x, pos.y)
      return
    }

    // Only hit if it's the current target
    const isTarget = this.currentTarget && nearest.wordData.id === this.currentTarget.wordData.id

    if (isTarget) {
      // Bruce Lee shout! 阿达!
      playBruceLeeShout()

      // Damage with real combo multiplier
      const comboMul = player.combo >= 20 ? 3 : player.combo >= 10 ? 2 : 1
      const damage = Math.floor((12 + Math.min(8, Math.floor(player.combo / 5) * 2)) * comboMul)
      const isDead = nearest.takeDamage(damage, pos.x)
      addCombo()
      addScore(damage)

      // Combo popup
      this.skillEffects.playComboPopup(player.combo)

      // Big hit effect with combo escalation
      this.skillEffects.playHitEffect(nearest.x, nearest.y, player.combo)

      // Damage number
      this.showDamageNumber(`+${damage}`, nearest.x, nearest.y - 60, "#ffdd44")

      if (isDead) {
        player.monstersKilled++
        gameStore.stageMonstersAlive = Math.max(0, gameStore.stageMonstersAlive - 1)
        player.maxCombo = Math.max(player.maxCombo, player.combo)
        this.skillEffects.playDeathEffect(nearest.x, nearest.y)
        addXp(30)
        nearest.destroyMonster()
        this.checkStageClear()
      }

      // New target
      this.selectNewTarget()
    } else {
      // Wrong monster — light shout + small hit, no damage
      playBruceLeeShout(0.8)
      this.skillEffects.playWhiffEffect(nearest.x, nearest.y)
    }
  }

  // ─── Skills 1-5 ───

  private useSkill(skillIndex: number) {
    if (this.stageCleared || this.gameOverShown || gameStore.isPaused) return

    const skill = SKILLS[skillIndex]
    if (!skill || !skill.unlocked || skill.cooldown > 0) return

    const pos = this.playerEntity.getPosition()

    // Bruce Lee shout with skill-specific pitch
    playBruceLeeShout(getSkillPitch(skillIndex))

    startCooldown(skillIndex)

    // Skill 4 (SPECIAL): AOE ultimate — damage all monsters in 200px radius
    if (skillIndex === 4) {
      const ULTIMATE_RADIUS = 200
      const ULTIMATE_RADIUS_SQ = ULTIMATE_RADIUS * ULTIMATE_RADIUS
      let hitCount = 0

      for (const m of this.monsters) {
        if (!m.active || m.currentHp <= 0) continue
        const dx = m.x - pos.x, dy = m.y - pos.y
        if (dx * dx + dy * dy <= ULTIMATE_RADIUS_SQ) {
          hitCount++
          const damage = Math.max(20, Math.floor(m.maxHp * 0.4))
          const isDead = m.takeDamage(damage, pos.x)
          this.showDamageNumber(`+${damage}`, m.x, m.y - 80, "#ffaa00")

          if (isDead) {
            player.monstersKilled++
            gameStore.stageMonstersAlive = Math.max(0, gameStore.stageMonstersAlive - 1)
            this.skillEffects.playDeathEffect(m.x, m.y)
            addXp(80)
            m.destroyMonster()
          }
        }
      }

      // Big AOE visual
      if (hitCount > 0) {
        this.skillEffects.playAoeUltimateEffect(pos.x, pos.y)
        this.cameras.main.shake(200, 0.02)
      }

      this.checkStageClear()
      this.selectNewTarget()
      return
    }

    // Regular skills: find nearest monster
    let nearest: Monster | null = null
    let nearestDist = Infinity
    for (const m of this.monsters) {
      if (!m.active || m.currentHp <= 0) continue
      const dx = m.x - pos.x, dy = m.y - pos.y
      const d = dx * dx + dy * dy
      if (d < nearestDist) { nearestDist = d; nearest = m }
    }
    if (!nearest) return

    // Skill 2 (groundSlam): destroy breakable obstacles in radius
    if (skillIndex === 2) {
      this.destroyBreakableObstacles(nearest.x, nearest.y, 120)
    }

    // Damage: skill does 30-40% of monster max HP
    const baseDamage = Math.max(20, Math.floor(nearest.maxHp * 0.35))
    const damage = baseDamage // no penalty for non-target with skill
    const isDead = nearest.takeDamage(damage, pos.x)
    this.skillEffects.playSkillEffect(skillIndex, pos.x, pos.y, nearest.x, nearest.y, player.combo)
    this.cameras.main.shake(100, 0.005)

    this.showDamageNumber(`+${damage}`, nearest.x, nearest.y - 80, "#ffaa00")

    if (isDead) {
      player.monstersKilled++
      gameStore.stageMonstersAlive = Math.max(0, gameStore.stageMonstersAlive - 1)
      this.skillEffects.playDeathEffect(nearest.x, nearest.y)
      addXp(80)
      nearest.destroyMonster()
      this.checkStageClear()
    }

    this.selectNewTarget()
  }

  // ─── Monster Melee Damage ───

  private checkMonsterMelee() {
    if (this.stageCleared || this.gameOverShown || gameStore.isPaused) return
    const pos = this.playerEntity.getPosition()

    for (const m of this.monsters) {
      if (!m.active || m.currentHp <= 0) continue
      const attacked = m.updateAI(this.game.loop.delta, pos.x, pos.y)
      if (attacked) {
        if (this.invulnerableTimer <= 0) {
          takeDamage(m.meleeDamage)
          this.cameras.main.shake(80, 0.005)
          // Flash red
          this.cameras.main.flash(100, 255, 0, 0)
          // Knockback player away from monster
          const dx = pos.x - m.x, dy = pos.y - m.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          this.playerEntity.physicsSprite.setVelocity(dx / dist * 200, dy / dist * 200)
        }
      }
    }
  }

  // ─── Stage Progression ───

  private checkStageClear() {
    const alive = this.monsters.filter(m => m.active && m.currentHp > 0)
    if (alive.length > 0) return

    this.stageCleared = true
    gameStore.stageMonstersAlive = 0
    gameStore.showStageClear = true

    if (gameStore.remainingTime > 0) addScore(gameStore.remainingTime * 5)
    if (this.timerEvent) this.timerEvent.remove()

    saveProgress(gameStore.currentWorld, gameStore.currentStage)

    // Record all stage words as studied (deduplicated)
    const recorded = new Set<number>()
    for (const m of this.monsters) {
      if (m.active && m.wordData && !recorded.has(m.wordData.id)) {
        recorded.add(m.wordData.id)
        recordAnswer(m.wordData.id, m.wordData.word, m.wordData.meaning, true)
      }
    }

    setTimeout(() => {
      gameStore.showStageClear = false
      this.shutdown()
      gameStore.screen = "wordSummary"
    }, 2500)
  }

  private onStageTimeout = () => this.onGameOver()
  private onGameOver() {
    if (this.gameOverShown) return
    this.gameOverShown = true
    gameStore.showGameOver = true
    if (this.timerEvent) this.timerEvent.remove()
    setTimeout(() => {
      this.shutdown()
      gameStore.showGameOver = false
      gameStore.screen = "stageMap"
    }, 2500)
  }

  private goBackToMap = () => {
    gameStore.screen = "stageMap"
    gameStore.showStageClear = false
    gameStore.showGameOver = false
    gameStore.isPaused = false
    this.scene.stop()
  }

  // ─── Update Loop ───

  update() {
    if (this.stageCleared || this.gameOverShown || gameStore.isPaused) return

    // Update invulnerability timer
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= this.game.loop.delta
      // Player blinks via container alpha
      this.playerEntity.container.setAlpha(Math.sin(this.time.now * 0.02) > 0 ? 1 : 0.4)
    } else {
      this.playerEntity.container.setAlpha(1)
    }

    this.playerEntity.update()
    this.playerEntity.syncVisual()
    this.checkMonsterMelee()

    // Update monster labels and sync visuals
    for (const m of this.monsters) {
      if (m.active) {
        m.updateLabels()
        m.syncVisual()
      }
    }

    // Skill key presses (1-5): select skill (selection mode)
    for (let i = 0; i < this.skillKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.skillKeys[i])) {
        const skill = SKILLS[i]
        if (!skill || !skill.unlocked || skill.cooldown > 0) continue
        // Toggle: press same key to deselect, otherwise select
        gameStore.selectedSkill = gameStore.selectedSkill === i ? -1 : i
      }
    }
  }

  // ─── Cleanup ───

  private shutdown() {
    eventBus.off(GameEvents.PLAYER_ATTACK, this.onPlayerAttack)
    eventBus.off(GameEvents.BACK_TO_MAP, this.goBackToMap)

    this.monsters.forEach(m => { if (m.active) m.destroyMonster() })
    this.monsters = []

    if (this.monsterGroup) this.monsterGroup.clear(true, true)
    if (this.obstacles) this.obstacles.clear(true, true)
    if (this.walls) this.walls.clear(true, true)

    this.currentTarget = null
  }
}

import Phaser from "phaser"
import { MapBuilder } from "../world/MapBuilder"
import { Player } from "../entities/Player"
import { MonsterFactory } from "../entities/MonsterFactory"
import { Monster } from "../entities/Monster"
import { VirtualJoystick } from "../entities/VirtualJoystick"
import { setupCamera, cameraZoomEffect } from "../world/Camera"
import eventBus, { GameEvents } from "./EventBus"
import { player, addXp, addScore, addCombo, resetCombo, takeDamage } from "../../stores/playerStore"
import { gameStore, SKILLS, startCooldown } from "../../stores/gameStore"
import { playBruceLeeShout, getSkillPitch } from "../../utils/audio"
import { SkillEffects } from "../skills/SkillEffects"

export class GameScene extends Phaser.Scene {
  private mapBuilder!: MapBuilder
  private playerEntity!: Player
  private monsterFactory!: MonsterFactory
  private joystick!: VirtualJoystick | null
  private skillEffects!: SkillEffects
  private skillKeys: Phaser.Input.Keyboard.Key[] = []
  private camera!: Phaser.Cameras.Scene2D.Camera
  private isTouchingMonster = false
  private currentMonster: Monster | null = null

  constructor() {
    super({ key: "GameScene" })
  }

  create() {
    gameStore.showQuestion = false
    gameStore.showSkillSelect = false

    // Build map
    this.mapBuilder = new MapBuilder(this)
    this.mapBuilder.build()
    const bounds = this.mapBuilder.getWorldBounds()

    // Player
    this.playerEntity = new Player(this, bounds.width / 2, bounds.height / 2)

    // Setup camera
    this.camera = setupCamera(this, this.playerEntity.sprite, bounds.width, bounds.height)

    // Collisions
    if (this.mapBuilder.walls) {
      this.physics.add.collider(this.playerEntity.sprite, this.mapBuilder.walls)
    }
    if (this.mapBuilder.trees) {
      this.physics.add.collider(this.playerEntity.sprite, this.mapBuilder.trees)
    }

    // Monster factory
    this.monsterFactory = new MonsterFactory(this)
    this.monsterFactory.spawnMonsters()

    // Collisions with monsters
    this.physics.add.overlap(
      this.playerEntity.sprite,
      this.monsterFactory.getMonsterGroup(),
      this.onMonsterOverlap as any,
      undefined,
      this
    )

    // Skill effects
    this.skillEffects = new SkillEffects(this)

    // Virtual joystick (mobile)
    this.joystick = new VirtualJoystick(this)

    // Keyboard skill keys (1-5)
    if (this.input.keyboard) {
      for (let i = 0; i < 5; i++) {
        this.skillKeys.push(this.input.keyboard.addKey(48 + i + 1))
      }
    }

    // Click/tap on monster (mobile)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x > this.scale.width / 2) return
      const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y)
      const monster = this.monsterFactory.findMonsterAt(worldPoint.x, worldPoint.y)
      if (monster) {
        this.triggerQuestion(monster)
      }
    })

    // Listen for Vue → Phaser events
    eventBus.on(GameEvents.QUESTION_RESULT, this.onQuestionResult = this.onQuestionResult.bind(this))
    eventBus.on(GameEvents.CLOSE_QUESTION, this.onCloseQuestion = this.onCloseQuestion.bind(this))
    eventBus.on(GameEvents.SKILL_SELECT, this.onSkillSelect = this.onSkillSelect.bind(this))

    this.cameras.main.fadeIn(500)
  }

  update() {
    // Day/night cycle
    const dayPhase = (Math.sin(this.time.now / 60000) + 1) / 2
    const skyBrightness = 0.5 + dayPhase * 0.5
    const skyR = Math.floor(40 * skyBrightness)
    const skyG = Math.floor(60 * skyBrightness)
    const skyB = Math.floor(120 * skyBrightness)
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.GetColor(skyR, skyG, skyB))
    if (gameStore.showQuestion || gameStore.showSkillSelect) return

    // Player movement (keyboard)
    this.playerEntity.update()

    // Player movement (joystick)
    if (this.joystick && this.joystick.isActive()) {
      this.playerEntity.setVelocity(this.joystick.dx, this.joystick.dy)
    }

    // Update monsters
    const pos = this.playerEntity.getPosition()
    this.monsterFactory.update(pos.x, pos.y)
  }

  private onMonsterOverlap(_player: any, monster: Monster) {
    if (gameStore.showQuestion || gameStore.showSkillSelect || this.isTouchingMonster) return
    this.triggerQuestion(monster)
  }

  private triggerQuestion(monster: Monster) {
    if (!monster.active || monster.currentHp <= 0) return
    this.isTouchingMonster = true
    this.currentMonster = monster
    gameStore.currentMonsterId = monster.wordData.id
    gameStore.currentWord = monster.wordData

    // Freeze player
    this.playerEntity.setVelocity(0, 0)

    // Show skill select popup
    gameStore.showSkillSelect = true
    eventBus.emit(GameEvents.SHOW_SKILL_SELECT, {
      monsterId: monster.wordData.id,
      word: monster.wordData,
    })

    this.time.delayedCall(200, () => {
      this.isTouchingMonster = false
    })
  }

  private onSkillSelect() {
    // Called when Vue emits SKILL_SELECT — the question was shown by Vue
    gameStore.showSkillSelect = false
  }

  private onQuestionResult(data: { correct: boolean; skillIndex: number }) {
    if (data.correct) {
      addCombo()
      this.skillEffects.playComboPopup(player.combo)
      const skill = SKILLS[data.skillIndex]
      const result = addScore(100)
      const comboMul = result.multiplier
      const baseDamage = 20 + (skill?.level || 1) * 15

      // Add xp
      const leveledUp = addXp(30 + (skill?.level || 1) * 10)

      // Bruce Lee shout!
      const pitch = getSkillPitch(data.skillIndex)
      playBruceLeeShout(pitch)

      // Skill effects
      if (this.currentMonster && this.currentMonster.active) {
        this.skillEffects.playSkillEffect(data.skillIndex, this.currentMonster.x, this.currentMonster.y, comboMul)

        // Damage monster
        const damage = baseDamage + result.points
        const isDead = this.currentMonster.takeDamage(damage)

        if (isDead) {
          player.monstersKilled++
          addXp(50)

          this.skillEffects.playDeathEffect(this.currentMonster.x, this.currentMonster.y)
          this.monsterFactory.removeMonster(this.currentMonster)
          this.currentMonster = null
        }
      }

      if (leveledUp) {
        eventBus.emit(GameEvents.LEVEL_UP, { level: player.level })
      }
    } else {
      resetCombo()
      const isDead = takeDamage(15)
      playBruceLeeShout(0.5)

      if (isDead) {
        eventBus.emit(GameEvents.GAME_OVER)
      }
    }

    startCooldown(data.skillIndex)
    gameStore.showQuestion = false
    this.currentMonster = null
  }

  private onCloseQuestion() {
    gameStore.showQuestion = false
    this.currentMonster = null
  }

  shutdown() {
    eventBus.off(GameEvents.QUESTION_RESULT, this.onQuestionResult)
    eventBus.off(GameEvents.CLOSE_QUESTION, this.onCloseQuestion)
    eventBus.off(GameEvents.SKILL_SELECT, this.onSkillSelect)
  }
}

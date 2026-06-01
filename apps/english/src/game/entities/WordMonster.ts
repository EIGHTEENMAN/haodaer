import Phaser from "phaser"
import type { WordData } from "../../stores/gameStore"

// Procedural cute creature generation for word-monsters
// Each creature is drawn based on its word properties: difficulty, theme, word length, meaning

const BODY_COLORS: Record<string, number[]> = {
  "动物 Animals": [0xf5a623, 0x8bc34a, 0x4caf50, 0xff9800, 0x795548],
  "食物 Food": [0xff5722, 0xff9800, 0xffeb3b, 0xf44336, 0xe91e63],
  "颜色形状 Colors&Shapes": [0x2196f3, 0x9c27b0, 0x00bcd4, 0xff4081, 0x76ff03],
  "身体 Body": [0xff8a80, 0xf48fb1, 0xce93d8, 0xef9a9a, 0xffccbc],
  "衣服 Clothes": [0x7c4dff, 0x448aff, 0x18ffff, 0xff6d00, 0xaa00ff],
  "自然天气 Nature&Weather": [0x4fc3f7, 0x81c784, 0x4db6ac, 0xb39ddb, 0xfff176],
  "日常 Daily Life": [0xffcc80, 0xa5d6a7, 0x90a4ae, 0xbcaaa4, 0xefebe9],
  "数字时间 Numbers&Time": [0x7e57c2, 0x5c6bc0, 0x42a5f5, 0x26a69a, 0xffee58],
  "家庭学校 Family&School": [0xef5350, 0x66bb6a, 0x42a5f5, 0xffa726, 0xab47bc],
  "动作 Actions": [0xff3d00, 0xff9100, 0xffea00, 0x00e676, 0xd500f9],
}

const THEME_BG_COLORS: Record<string, number> = {
  "动物 Animals": 0x4caf50,
  "食物 Food": 0xff8a65,
  "颜色形状 Colors&Shapes": 0xce93d8,
  "身体 Body": 0xf48fb1,
  "衣服 Clothes": 0x7e57c2,
  "自然天气 Nature&Weather": 0x4fc3f7,
  "日常 Daily Life": 0xffcc80,
  "数字时间 Numbers&Time": 0x7c4dc2,
  "家庭学校 Family&School": 0xef5350,
  "动作 Actions": 0xff6f00,
}

// Accessory mapping: Chinese keyword → accessory type
const ACCESSORY_RULES: { keywords: string[]; type: string }[] = [
  { keywords: ['猫', '狗', '兔', '鸟', '鱼', '象', '虎', '狮', '熊', '龙', '马', '羊', '猴', '鸡', '鸭', '鹅', '猪', '鼠', '牛', '蛇'], type: 'ears' },
  { keywords: ['苹果', '香蕉', '草莓', '橙', '葡萄', '西瓜', '桃', '梨', '芒果', '柠檬', '樱桃', '果'], type: 'fruit-hat' },
  { keywords: ['太阳', '月亮', '星', '云', '雨', '雪', '虹', '晴', '阴', '风', '雷', '闪'], type: 'weather' },
  { keywords: ['红', '黄', '蓝', '绿', '紫', '粉', '白', '黑', '橙', '灰', '棕', '金色', '银色'], type: 'color-aura' },
  { keywords: ['跑', '跳', '飞', '走', '游', '追', '爬', '滚', '踢', '扔', '接'], type: 'motion' },
  { keywords: ['书', '本', '笔', '画', '读', '写', '字', '词', '纸', '信'], type: 'book' },
  { keywords: ['衣', '帽', '鞋', '裤', '袜', '裙', '戴', '围', '穿'], type: 'bow' },
  { keywords: ['花', '草', '树', '叶', '木', '竹', '莓', '玫瑰', '荷'], type: 'flower' },
  { keywords: ['笑', '哭', '喜', '怒', '惊', '怕', '爱', '乐', '饿', '渴', '累'], type: 'emotion' },
  { keywords: ['桌', '椅', '床', '灯', '碗', '杯', '盘', '锅', '盆', '桶', '箱'], type: 'item' },
]

function getAccessoryType(meaning: string): string {
  for (const rule of ACCESSORY_RULES) {
    if (rule.keywords.some(kw => meaning.includes(kw))) return rule.type
  }
  return 'none'
}

// === Drawing helpers ===

function drawEyes(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number) {
  // Bigger white circles
  g.fillStyle(0xffffff)
  g.fillCircle(cx - s * 0.09, cy, s * 0.085)
  g.fillCircle(cx + s * 0.09, cy, s * 0.085)
  // Dark pupils
  g.fillStyle(0x333333)
  g.fillCircle(cx - s * 0.07, cy, s * 0.055)
  g.fillCircle(cx + s * 0.11, cy, s * 0.055)
  // Catchlights (white highlight dots)
  g.fillStyle(0xffffff)
  g.fillCircle(cx - s * 0.05, cy - s * 0.025, s * 0.028)
  g.fillCircle(cx + s * 0.13, cy - s * 0.025, s * 0.028)
}

function drawSmile(g: Phaser.GameObjects.Graphics, mx: number, my: number, s: number) {
  g.lineStyle(Math.max(1, s * 0.025), 0xcc6666, 0.8)
  g.beginPath()
  g.arc(mx, my, s * 0.07, 0.3, Math.PI - 0.3, false)
  g.strokePath()
}

function drawSmallSmile(g: Phaser.GameObjects.Graphics, mx: number, my: number, s: number) {
  g.lineStyle(Math.max(1, s * 0.02), 0xcc6666, 0.7)
  g.beginPath()
  g.arc(mx, my, s * 0.05, 0.3, Math.PI - 0.3, false)
  g.strokePath()
}

function drawCheeks(g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number) {
  g.fillStyle(0xff8a80, 0.5)
  g.fillCircle(cx - s * 0.18, cy, s * 0.045)
  g.fillCircle(cx + s * 0.18, cy, s * 0.045)
}

// === Accessory drawing ===

function drawAccessoryShape(g: Phaser.GameObjects.Graphics, type: string, ax: number, ay: number, s: number, main: number, accent: number) {
  switch (type) {
    case 'ears':
      g.fillStyle(accent)
      g.fillTriangle(ax - s * 0.13, ay - s * 0.35, ax - s * 0.07, ay - s * 0.55, ax - s * 0.01, ay - s * 0.35)
      g.fillTriangle(ax + s * 0.13, ay - s * 0.35, ax + s * 0.07, ay - s * 0.55, ax + s * 0.01, ay - s * 0.35)
      g.fillStyle(0xffcccc, 0.6)
      g.fillTriangle(ax - s * 0.11, ay - s * 0.38, ax - s * 0.07, ay - s * 0.48, ax - s * 0.03, ay - s * 0.38)
      g.fillTriangle(ax + s * 0.11, ay - s * 0.38, ax + s * 0.07, ay - s * 0.48, ax + s * 0.03, ay - s * 0.38)
      break

    case 'fruit-hat':
      g.fillStyle(main)
      g.fillCircle(ax, ay - s * 0.42, s * 0.07)
      g.fillStyle(0x44cc44)
      g.fillEllipse(ax + s * 0.05, ay - s * 0.48, s * 0.04, s * 0.08)
      break

    case 'weather':
      g.fillStyle(0xffffff, 0.6)
      g.fillCircle(ax + s * 0.2, ay - s * 0.3, s * 0.06)
      g.fillCircle(ax + s * 0.24, ay - s * 0.33, s * 0.04)
      g.fillCircle(ax + s * 0.17, ay - s * 0.34, s * 0.03)
      break

    case 'color-aura':
      g.lineStyle(s * 0.06, main, 0.2)
      g.strokeCircle(ax, ay, s * 0.45)
      break

    case 'motion':
      g.lineStyle(1, accent, 0.4)
      for (let i = 1; i <= 3; i++) {
        g.beginPath()
        const ox = ax - s * (0.35 + i * 0.05)
        const oy = ay - s * 0.05 * i
        g.arc(ox, oy, s * 0.1, -1.2, 1.2, false)
        g.strokePath()
      }
      break

    case 'book':
      g.fillStyle(0xffffff, 0.7)
      g.fillRoundedRect(ax + s * 0.15, ay + s * 0.1, s * 0.1, s * 0.12, 2)
      g.fillStyle(0xff4444, 0.6)
      g.fillRect(ax + s * 0.18, ay + s * 0.1, 1, s * 0.12)
      break

    case 'bow':
      g.fillStyle(accent)
      g.fillTriangle(ax + s * 0.25, ay - s * 0.28, ax + s * 0.32, ay - s * 0.22, ax + s * 0.25, ay - s * 0.18)
      g.fillTriangle(ax + s * 0.25, ay - s * 0.28, ax + s * 0.18, ay - s * 0.22, ax + s * 0.25, ay - s * 0.18)
      g.fillStyle(main, 0.8)
      g.fillCircle(ax + s * 0.25, ay - s * 0.22, s * 0.02)
      break

    case 'flower':
      g.fillStyle(0xff6688, 0.7)
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        g.fillCircle(ax + Math.cos(angle) * s * 0.06, ay - s * 0.46 + Math.sin(angle) * s * 0.04, s * 0.035)
      }
      g.fillStyle(0xffee44, 0.8)
      g.fillCircle(ax, ay - s * 0.46, s * 0.025)
      break

    case 'emotion':
      g.fillStyle(0xff4466, 0.5)
      g.fillCircle(ax + s * 0.25, ay - s * 0.15, s * 0.04)
      g.fillCircle(ax + s * 0.28, ay - s * 0.18, s * 0.04)
      break

    case 'item':
      g.fillStyle(accent, 0.5)
      g.fillCircle(ax + s * 0.25, ay + s * 0.05, s * 0.04)
      g.fillStyle(main, 0.4)
      g.fillCircle(ax + s * 0.25, ay + s * 0.05, s * 0.02)
      break
  }
}

// === Main class ===

export default class WordMonster extends Phaser.GameObjects.Container {
  public wordData: WordData
  public bodySprite: Phaser.GameObjects.Graphics
  private evolutionStage: number = 0
  private accessorySprite: Phaser.GameObjects.Graphics
  private evoEffectSprite: Phaser.GameObjects.Graphics
  private bodyType: number
  private accessoryType: string
  private creatureSize: number
  private wordLabel: Phaser.GameObjects.Text | null = null
  private starLabel: Phaser.GameObjects.Text | null = null

  constructor(scene: Phaser.Scene, x: number, y: number, wordData: WordData, stage: number = 0) {
    super(scene, x, y)
    this.wordData = wordData

    // More varied body type selection (word.length + difficulty + id, then spread across id)
    this.bodyType = (wordData.word.length + wordData.difficulty + wordData.id) % 10
    this.accessoryType = getAccessoryType(wordData.meaning)
    this.creatureSize = 40 + Math.min(wordData.difficulty, 5) * 4 + stage * 4

    this.bodySprite = scene.add.graphics()
    this.add(this.bodySprite)

    this.accessorySprite = scene.add.graphics()
    this.add(this.accessorySprite)

    this.evoEffectSprite = scene.add.graphics()
    this.add(this.evoEffectSprite)

    this.drawCreature()
    scene.add.existing(this)

    // Idle floating animation
    scene.tweens.add({
      targets: this,
      y: y - 5,
      duration: 1000 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    })
  }

  private drawCreature() {
    const g = this.bodySprite
    g.clear()
    this.accessorySprite.clear()
    this.evoEffectSprite.clear()

    // Clean up old labels
    if (this.wordLabel) { this.wordLabel.destroy(); this.wordLabel = null }
    if (this.starLabel) { this.starLabel.destroy(); this.starLabel = null }

    const themeColors = BODY_COLORS[this.wordData.theme] || [0x90a4ae, 0x78909c, 0x607d8b]
    const mainColor = themeColors[this.wordData.difficulty % themeColors.length]
    const accentColor = themeColors[(this.wordData.difficulty + 1) % themeColors.length]
    const s = this.creatureSize
    const cx = 0, cy = 0

    // Shadow
    g.fillStyle(0x000000, 0.15)
    g.fillEllipse(cx, cy + s * 0.6, s * 0.75, s * 0.18)

    switch (this.bodyType) {
      // === EXISTING TYPES (upgraded proportions) ===

      case 0: // Round blob — bigger head, smaller body, very cute
        g.fillStyle(mainColor)
        g.fillEllipse(cx, cy + s * 0.05, s * 0.55, s * 0.5)
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy - s * 0.3, s * 0.28)
        drawEyes(g, cx, cy - s * 0.3, s)
        drawCheeks(g, cx, cy - s * 0.2, s)
        drawSmile(g, cx, cy - s * 0.2, s)
        break

      case 1: // Tall body — cuter with bigger head
        g.fillStyle(mainColor)
        g.fillRoundedRect(cx - s * 0.25, cy - s * 0.3, s * 0.5, s * 0.75, s * 0.1)
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy - s * 0.35, s * 0.3)
        drawEyes(g, cx, cy - s * 0.35, s)
        drawSmile(g, cx, cy - s * 0.25, s)
        // Feet
        g.fillStyle(mainColor)
        g.fillEllipse(cx - s * 0.12, cy + s * 0.48, s * 0.18, s * 0.07)
        g.fillEllipse(cx + s * 0.12, cy + s * 0.48, s * 0.18, s * 0.07)
        break

      case 2: // Wide body — cute round loaf
        g.fillStyle(mainColor)
        g.fillEllipse(cx, cy + s * 0.05, s * 0.7, s * 0.45)
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy - s * 0.3, s * 0.3)
        drawEyes(g, cx, cy - s * 0.3, s)
        drawCheeks(g, cx, cy - s * 0.2, s)
        drawSmile(g, cx, cy - s * 0.2, s)
        // Arms
        g.fillStyle(accentColor)
        g.fillEllipse(cx - s * 0.38, cy + s * 0.05, s * 0.1, s * 0.2)
        g.fillEllipse(cx + s * 0.38, cy + s * 0.05, s * 0.1, s * 0.2)
        break

      case 3: // Diamond body
        g.fillStyle(mainColor)
        g.beginPath()
        g.moveTo(cx, cy - s * 0.42)
        g.lineTo(cx + s * 0.32, cy + s * 0.02)
        g.lineTo(cx, cy + s * 0.42)
        g.lineTo(cx - s * 0.32, cy + s * 0.02)
        g.closePath()
        g.fillPath()
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy - s * 0.2, s * 0.26)
        drawEyes(g, cx, cy - s * 0.2, s)
        drawSmile(g, cx, cy - s * 0.1, s)
        break

      case 4: // Teardrop / seed body
        g.fillStyle(mainColor)
        g.beginPath()
        g.moveTo(cx, cy - s * 0.48)
        g.lineTo(cx + s * 0.28, cy + s * 0.1)
        g.lineTo(cx + s * 0.15, cy + s * 0.4)
        g.lineTo(cx - s * 0.15, cy + s * 0.4)
        g.lineTo(cx - s * 0.28, cy + s * 0.1)
        g.closePath()
        g.fillPath()
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy - s * 0.2, s * 0.25)
        drawEyes(g, cx, cy - s * 0.2, s)
        drawSmile(g, cx, cy - s * 0.1, s)
        break

      // === NEW BODY TYPES ===

      case 5: // Cute cube — rounded square body, big blocky head
        g.fillStyle(mainColor)
        g.fillRoundedRect(cx - s * 0.32, cy - s * 0.28, s * 0.64, s * 0.56, s * 0.08)
        g.fillStyle(accentColor)
        g.fillRoundedRect(cx - s * 0.32, cy - s * 0.6, s * 0.64, s * 0.35, s * 0.08)
        drawEyes(g, cx, cy - s * 0.42, s)
        drawSmile(g, cx, cy - s * 0.32, s)
        break

      case 6: // Mushroom — umbrella cap + small stalk
        g.fillStyle(accentColor)
        g.fillEllipse(cx, cy - s * 0.1, s * 0.7, s * 0.35)
        g.fillStyle(mainColor)
        g.fillRoundedRect(cx - s * 0.1, cy + s * 0.05, s * 0.2, s * 0.3, 3)
        // Mushroom spots
        g.fillStyle(0xffffff, 0.3)
        g.fillCircle(cx - s * 0.15, cy - s * 0.12, s * 0.04)
        g.fillCircle(cx + s * 0.1, cy - s * 0.18, s * 0.03)
        g.fillCircle(cx + s * 0.2, cy - s * 0.05, s * 0.035)
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy - s * 0.3, s * 0.2)
        drawEyes(g, cx, cy - s * 0.3, s)
        drawSmallSmile(g, cx, cy - s * 0.22, s)
        break

      case 7: // Jellyfish — domed head + wavy tentacles
        g.fillStyle(mainColor)
        g.beginPath()
        g.arc(cx, cy - s * 0.15, s * 0.4, Math.PI, 0)
        g.lineTo(cx + s * 0.4, cy)
        g.lineTo(cx - s * 0.4, cy)
        g.closePath()
        g.fillPath()
        // Tentacles
        g.lineStyle(2, mainColor, 0.5)
        for (let i = 0; i < 5; i++) {
          const tx = cx - s * 0.3 + i * s * 0.15
          g.beginPath()
          g.moveTo(tx, cy + s * 0.02)
          g.lineTo(tx + s * 0.02, cy + s * 0.2 + Math.sin(i * 1.2) * s * 0.05)
          g.lineTo(tx - s * 0.01, cy + s * 0.35 + Math.sin(i * 1.5) * s * 0.05)
          g.lineTo(tx + s * 0.02, cy + s * 0.5)
          g.strokePath()
        }
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy - s * 0.2, s * 0.28)
        drawEyes(g, cx, cy - s * 0.2, s)
        drawSmile(g, cx, cy - s * 0.1, s)
        break

      case 8: // Flame — teardrop fire shape
        g.fillStyle(mainColor)
        g.beginPath()
        g.moveTo(cx, cy - s * 0.4)
        g.lineTo(cx + s * 0.3, cy + s * 0.05)
        g.arc(cx, cy + s * 0.15, s * 0.3, 0.3, Math.PI - 0.3)
        g.lineTo(cx - s * 0.3, cy + s * 0.05)
        g.closePath()
        g.fillPath()
        // Inner flame glow
        g.fillStyle(accentColor, 0.6)
        g.beginPath()
        g.moveTo(cx, cy - s * 0.25)
        g.lineTo(cx + s * 0.15, cy + s * 0.02)
        g.arc(cx, cy + s * 0.08, s * 0.15, 0.5, Math.PI - 0.5)
        g.lineTo(cx - s * 0.15, cy + s * 0.02)
        g.closePath()
        g.fillPath()
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy - s * 0.15, s * 0.2)
        drawEyes(g, cx, cy - s * 0.15, s)
        drawSmallSmile(g, cx, cy - s * 0.07, s)
        break

      case 9: // Star-flower — 5-petal flower body
        g.fillStyle(mainColor)
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
          g.fillEllipse(
            cx + Math.cos(angle) * s * 0.22,
            cy + Math.sin(angle) * s * 0.2,
            s * 0.2,
            s * 0.16
          )
        }
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy, s * 0.15)
        g.fillStyle(0xffee44, 0.6)
        g.fillCircle(cx, cy, s * 0.07)
        g.fillStyle(accentColor)
        g.fillCircle(cx, cy - s * 0.3, s * 0.24)
        drawEyes(g, cx, cy - s * 0.3, s)
        drawSmile(g, cx, cy - s * 0.2, s)
        break
    }

    // Draw word-based accessory
    if (this.accessoryType !== 'none') {
      drawAccessoryShape(this.accessorySprite, this.accessoryType, cx, cy, s, mainColor, accentColor)
    }

    // Evolution effects
    if (this.evolutionStage >= 1) {
      const evo = this.evoEffectSprite
      if (this.evolutionStage === 1) {
        // Small star above head
        evo.fillStyle(0xffd700)
        drawSmallStar(evo, cx, cy - s * 0.55, s * 0.08)
      } else {
        // Crown
        drawCrown(evo, cx, cy - s * 0.55, s * 0.15)
        // Glowing aura pulse (tween opacity)
        evo.lineStyle(s * 0.04, 0xffd700, 0.4)
        evo.strokeCircle(cx, cy + s * 0.05, s * 0.5)
        this.scene.tweens.add({
          targets: evo,
          alpha: { from: 1, to: 0.5 },
          duration: 800,
          yoyo: true,
          repeat: -1,
        })
      }
    }

    // Word label below body
    this.wordLabel = this.scene.add.text(cx, cy + s * 0.55, this.wordData.word.toUpperCase(), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: `${Math.max(10, 16 - this.wordData.word.length)}px`,
      color: "#ffffff",
      stroke: "#333333",
      strokeThickness: 3,
      align: "center",
    }).setOrigin(0.5, 0)
    this.add(this.wordLabel)

    // Evolution stars
    if (this.evolutionStage > 0) {
      const stars = "⭐".repeat(this.evolutionStage + 1)
      this.starLabel = this.scene.add.text(cx, cy - s * 0.72, stars, {
        fontSize: "12px",
      }).setOrigin(0.5, 0.5)
      this.add(this.starLabel)
    }
  }

  evolve() {
    this.evolutionStage = Math.min(2, this.evolutionStage + 1)
    this.creatureSize = 40 + Math.min(this.wordData.difficulty, 5) * 4 + this.evolutionStage * 6
    this.bodySprite.clear()
    this.accessorySprite.clear()
    this.evoEffectSprite.clear()
    this.drawCreature()
  }

  getEvoStage() { return this.evolutionStage }

  // === Animations ===

  playHitAnimation() {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.85,
      scaleY: 1.2,
      duration: 80,
      yoyo: true,
      ease: "Quad.easeOut",
    })
    // Flash effect for Graphics (no setTint in Phaser 4)
    if (this.bodySprite && this.scene) {
      this.scene.tweens.add({
        targets: this.bodySprite,
        alpha: 0.3,
        duration: 60,
        yoyo: true,
        ease: "Quad.easeOut",
      })
    }
  }

  playAttackAnimation() {
    this.scene.tweens.add({
      targets: this,
      x: this.x + 20,
      angle: -10,
      duration: 120,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          x: this.x - 20,
          angle: 0,
          duration: 100,
          ease: "Quad.easeIn",
        })
      },
    })
  }

  playHappyAnimation() {
    this.scene.tweens.add({
      targets: this,
      y: this.y - 25,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      ease: "Back.easeOut",
      yoyo: true,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          angle: { from: -15, to: 15 },
          duration: 150,
          yoyo: true,
          repeat: 1,
        })
      },
    })
  }

  playCaptureAnimation(onComplete: () => void) {
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 400,
      ease: "Back.easeIn",
      onComplete,
    })
  }

  playShakeAnimation() {
    this.scene.tweens.add({
      targets: this,
      x: this.x - 6,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: "Quad.easeInOut",
    })
  }
}

// === Small shape helpers ===

function drawSmallStar(g: Phaser.GameObjects.Graphics, sx: number, sy: number, r: number) {
  g.beginPath()
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2
    const innerAngle = outerAngle + Math.PI / 5
    const ox = sx + Math.cos(outerAngle) * r
    const oy = sy + Math.sin(outerAngle) * r
    const ix = sx + Math.cos(innerAngle) * r * 0.4
    const iy = sy + Math.sin(innerAngle) * r * 0.4
    if (i === 0) g.moveTo(ox, oy)
    else g.lineTo(ox, oy)
    g.lineTo(ix, iy)
  }
  g.closePath()
  g.fillPath()
}

function drawCrown(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number) {
  g.fillStyle(0xffd700)
  g.fillRect(cx - r, cy - r * 0.3, r * 2, r * 0.5)
  // Three points
  g.fillTriangle(cx - r, cy - r * 0.3, cx - r * 0.7, cy - r, cx - r * 0.4, cy - r * 0.3)
  g.fillTriangle(cx - r * 0.3, cy - r * 0.3, cx, cy - r * 0.85, cx + r * 0.3, cy - r * 0.3)
  g.fillTriangle(cx + r * 0.4, cy - r * 0.3, cx + r * 0.7, cy - r, cx + r, cy - r * 0.3)
  // Jewels
  g.fillStyle(0xff4444)
  g.fillCircle(cx - r * 0.7, cy - r * 0.1, r * 0.08)
  g.fillCircle(cx, cy - r * 0.15, r * 0.08)
  g.fillCircle(cx + r * 0.7, cy - r * 0.1, r * 0.08)
}

// === Exported utilities ===

export function getMonstersForTheme(words: any[], theme: string): any[] {
  return words.filter(w => w.theme === theme)
}

export function pickRandomEncounter(words: any[], theme: string, playerLevel: number, difficultyRange?: [number, number]): any | null {
  let themeWords = words.filter(w => w.theme === theme)
  if (themeWords.length === 0) return null

  if (difficultyRange) {
    themeWords = themeWords.filter(w => w.difficulty >= difficultyRange[0] && w.difficulty <= difficultyRange[1])
    if (themeWords.length === 0) {
      themeWords = words.filter(w => w.theme === theme)
    }
  }

  const weighted = themeWords.map(w => {
    const diff = Math.abs(w.difficulty - Math.min(playerLevel, 5))
    const weight = Math.max(1, 5 - diff)
    return { word: w, weight }
  })

  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0)
  let r = Math.random() * totalWeight
  for (const w of weighted) {
    r -= w.weight
    if (r <= 0) return w.word
  }
  return weighted[0].word
}

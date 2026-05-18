import Phaser from "phaser"
import { Monster } from "./Monster"
import { words } from "../../data/words"
import { player } from "../../stores/playerStore"
import { WordData } from "../../stores/gameStore"

export class MonsterFactory {
  private scene: Phaser.Scene
  private monstersGroup: Phaser.Physics.Arcade.Group
  private spawnTimer = 0
  private readonly MAX_MONSTERS = 5

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.monstersGroup = scene.physics.add.group({ runChildUpdate: false })
  }

  spawnMonsters() {
    while (this.monstersGroup.getLength() < this.MAX_MONSTERS) {
      this.spawnOne()
    }
  }

  private spawnOne() {
    const difficulty = Math.min(10, Math.max(1, Math.ceil(player.level / 2)))
    const pool = words.filter(w => w.difficulty === difficulty)
    if (pool.length === 0) return

    const wordData = pool[Math.floor(Math.random() * pool.length)]

    // Random position away from player
    const mx = Phaser.Math.Between(2, 48) * 80 + 40
    const my = Phaser.Math.Between(2, 28) * 80 + 40

    const monster = new Monster(this.scene, mx, my, wordData)
    this.monstersGroup.add(monster)
  }

  removeMonster(monster: Monster) {
    if (monster.active) {
      this.monstersGroup.remove(monster)
      monster.destroyMonster()
    }
  }

  getAllMonsters(): Monster[] {
    return this.monstersGroup.getChildren() as Monster[]
  }

  getMonsterCount(): number {
    return this.monstersGroup.getLength()
  }

  update(playerX: number, playerY: number) {
    const monsters = this.getAllMonsters()
    monsters.forEach(m => m.update(playerX, playerY))

    // Spawn new monsters periodically
    if (monsters.length < this.MAX_MONSTERS) {
      this.spawnTimer++
      if (this.spawnTimer > 120) { // ~2 seconds at 60fps
        this.spawnTimer = 0
        this.spawnOne()
      }
    }
  }

  findMonsterAt(x: number, y: number): Monster | null {
    const touchRange = 40
    for (const m of this.getAllMonsters()) {
      const dx = m.x - x, dy = m.y - y
      if (Math.sqrt(dx * dx + dy * dy) < touchRange) return m
    }
    return null
  }

  getMonsterGroup(): Phaser.Physics.Arcade.Group {
    return this.monstersGroup
  }

  destroy() {
    this.getAllMonsters().forEach(m => m.destroyMonster())
    this.monstersGroup.clear(true, true)
  }
}

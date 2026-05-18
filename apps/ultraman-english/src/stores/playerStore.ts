import { reactive } from "vue"

export interface PlayerState {
  hp: number
  maxHp: number
  xp: number
  xpToNext: number
  level: number
  score: number
  combo: number
  maxCombo: number
  monstersKilled: number
  correctCount: number
  wrongCount: number
}

export const player = reactive<PlayerState>({
  hp: 100,
  maxHp: 100,
  xp: 0,
  xpToNext: 500,
  level: 1,
  score: 0,
  combo: 0,
  maxCombo: 0,
  monstersKilled: 0,
  correctCount: 0,
  wrongCount: 0,
})

export function addXp(amount: number) {
  player.xp += amount
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext
    player.level++
    player.xpToNext = player.level * 500
    player.maxHp = 100 + (player.level - 1) * 10
    player.hp = player.maxHp
    return true // leveled up
  }
  return false
}

export function addScore(base: number) {
  const multiplier = player.combo >= 20 ? 10 : player.combo >= 10 ? 5 : player.combo >= 5 ? 3 : player.combo >= 3 ? 2 : 1
  const points = base * multiplier
  player.score += points
  return { points, multiplier }
}

export function addCombo() {
  player.combo++
  if (player.combo > player.maxCombo) player.maxCombo = player.combo
}

export function resetCombo() {
  player.combo = 0
}

export function takeDamage(amount: number) {
  player.hp = Math.max(0, player.hp - amount)
  return player.hp <= 0
}

import { reactive } from "vue"
import type { WordData } from "./gameStore"
import type { MonsterEntry } from "./pokedexStore"

export interface BattleMonster {
  id: number
  wordData: WordData
  maxHp: number
  hp: number
  level: number
  isWild: boolean
  isAlive: boolean
  evolutionStage: number
}

export type BattleAction = "FIGHT" | "FOCUS" | "BAG" | "SWITCH" | "FLEE" | "CAPTURE"

export const battleStore = reactive({
  // Battle state
  active: false,
  playerMonster: null as BattleMonster | null,
  wildMonster: null as BattleMonster | null,
  turnPhase: "idle" as "idle" | "playerTurn" | "enemyTurn" | "won" | "lost" | "captured" | "fled" | "switching",
  message: "",
  showFocus: false,
  focusOptions: [] as string[],
  focusCorrectAnswer: "",
  focusSelected: false,
  focusResult: null as boolean | null,

  // Player's team (captured monsters used in battle)
  team: [] as BattleMonster[],
  currentTeamIndex: 0,
  maxTeamSize: 6,
})

export function createBattleMonster(wordData: WordData, isWild: boolean, stage: number = 0, evolutionStage: number = 0): BattleMonster {
  const baseHp = isWild ? 20 + wordData.difficulty * 5 : 30 + wordData.difficulty * 5
  const level = Math.max(1, Math.floor((wordData.difficulty + stage) / 2))
  return {
    id: wordData.id,
    wordData,
    maxHp: baseHp,
    hp: baseHp,
    level,
    isWild,
    isAlive: true,
    evolutionStage,
  }
}

/**
 * Build the player's team from captured monsters.
 * Call this at the start of every battle.
 */
export function buildTeam(words: WordData[], capturedEntries: MonsterEntry[]) {
  const team: BattleMonster[] = []

  // Sort captured monsters: highest evolution stage first, then recent
  const sorted = capturedEntries
    .filter(e => e.captured)
    .sort((a, b) => b.evolutionStage - a.evolutionStage || b.wordId - a.wordId)

  for (const entry of sorted.slice(0, battleStore.maxTeamSize)) {
    const wordData = words.find(w => w.id === entry.wordId)
    if (wordData) {
      team.push(createBattleMonster(wordData, false, 0, entry.evolutionStage))
    }
  }

  battleStore.team = team
  battleStore.currentTeamIndex = -1
}

/**
 * Set the first alive monster as the active player monster.
 */
export function setFirstAliveMonster(): boolean {
  for (let i = 0; i < battleStore.team.length; i++) {
    if (battleStore.team[i].hp > 0) {
      battleStore.currentTeamIndex = i
      battleStore.playerMonster = battleStore.team[i]
      return true
    }
  }
  return false
}

/**
 * Switch to a different team monster (player-initiated).
 * Returns true if switch succeeded, consumes the turn (enemyTurn).
 */
export function switchMonster(index: number): boolean {
  if (index < 0 || index >= battleStore.team.length) return false
  if (index === battleStore.currentTeamIndex) return false
  if (battleStore.team[index].hp <= 0) return false

  battleStore.currentTeamIndex = index
  battleStore.playerMonster = battleStore.team[index]
  battleStore.message = `Go! ${battleStore.team[index].wordData.word}!`
  battleStore.turnPhase = "enemyTurn"
  return true
}

/**
 * Find the next alive monster index (for auto-switch on faint).
 */
export function getNextAliveMonsterIndex(): number {
  for (let i = 0; i < battleStore.team.length; i++) {
    if (battleStore.team[i].hp > 0 && i !== battleStore.currentTeamIndex) {
      return i
    }
  }
  // Also try current index in case it's still alive
  if (battleStore.currentTeamIndex >= 0 &&
      battleStore.team[battleStore.currentTeamIndex] &&
      battleStore.team[battleStore.currentTeamIndex].hp > 0) {
    return battleStore.currentTeamIndex
  }
  // Any alive monster at all
  for (let i = 0; i < battleStore.team.length; i++) {
    if (battleStore.team[i].hp > 0) return i
  }
  return -1
}

/**
 * Auto-switch to the next alive monster when current faints.
 * Returns the new index, or -1 if no alive monsters remain.
 */
export function autoSwitchToNext(): number {
  const idx = getNextAliveMonsterIndex()
  if (idx < 0) return -1

  battleStore.currentTeamIndex = idx
  battleStore.playerMonster = battleStore.team[idx]
  return idx
}

/**
 * Revive all team monsters to full HP.
 */
export function reviveAll() {
  for (const m of battleStore.team) {
    m.hp = m.maxHp
    m.isAlive = true
  }
  if (battleStore.playerMonster) {
    battleStore.playerMonster.hp = battleStore.playerMonster.maxHp
    battleStore.playerMonster.isAlive = true
  }
}

export function calculateDamage(attacker: BattleMonster, focusBonus: boolean = false): number {
  let base = 5 + attacker.level * 2
  if (focusBonus) base *= 2
  return Math.max(1, base)
}

export function startWildBattle(wildMonster: BattleMonster) {
  battleStore.active = true
  battleStore.wildMonster = wildMonster
  battleStore.turnPhase = "playerTurn"
  battleStore.message = `野生的 ${wildMonster.wordData.word} 出现了！`
  battleStore.showFocus = false
}

export function playerAttack() {
  if (!battleStore.wildMonster || !battleStore.playerMonster) return
  const dmg = calculateDamage(battleStore.playerMonster)
  battleStore.wildMonster.hp = Math.max(0, battleStore.wildMonster.hp - dmg)
  battleStore.message = `${battleStore.playerMonster.wordData.word} 使用了攻击！`
  battleStore.turnPhase = "enemyTurn"
}

export function playerFocusAttack(correct: boolean) {
  if (!battleStore.wildMonster || !battleStore.playerMonster) return
  const dmg = calculateDamage(battleStore.playerMonster, correct)
  battleStore.wildMonster.hp = Math.max(0, battleStore.wildMonster.hp - dmg)
  battleStore.message = correct
    ? `正确！${battleStore.playerMonster.wordData.word} 造成 ${dmg} 点伤害！`
    : `没答对，普通攻击造成 ${dmg} 点伤害`
  battleStore.turnPhase = "enemyTurn"
}

export function enemyTurn() {
  if (!battleStore.playerMonster || !battleStore.wildMonster) return
  const dmg = calculateDamage(battleStore.wildMonster)
  battleStore.playerMonster.hp = Math.max(0, battleStore.playerMonster.hp - dmg)
  battleStore.message = `${battleStore.wildMonster.wordData.word} 反击，造成 ${dmg} 点伤害！`
  checkBattleEnd()
}

export function checkBattleEnd() {
  if (battleStore.wildMonster && battleStore.wildMonster.hp <= 0) {
    battleStore.turnPhase = "won"
    battleStore.message = `击败了 ${battleStore.wildMonster.wordData.word}！可以捕捉了！`
    return
  }

  if (battleStore.playerMonster && battleStore.playerMonster.hp <= 0) {
    battleStore.playerMonster.isAlive = false

    // Auto-switch to next alive team member (enemy already attacked this turn)
    const nextIdx = autoSwitchToNext()
    if (nextIdx >= 0) {
      battleStore.turnPhase = "playerTurn"
      battleStore.message = `${battleStore.team[nextIdx].wordData.word}，上场！`
    } else {
      battleStore.turnPhase = "lost"
      battleStore.message = "队伍全部倒下了..."
    }
    return
  }

  battleStore.turnPhase = "playerTurn"
}

export function attemptCapture(): boolean {
  if (!battleStore.wildMonster) return false
  const captureRate = 0.3 + (1 - battleStore.wildMonster.hp / battleStore.wildMonster.maxHp) * 0.5
  const success = Math.random() < captureRate
  if (success) {
    battleStore.turnPhase = "captured"
    battleStore.message = `成功捕捉 ${battleStore.wildMonster.wordData.word}！`
  } else {
    battleStore.message = `${battleStore.wildMonster.wordData.word} 挣脱了！`
  }
  return success
}

export function resetBattle() {
  battleStore.active = false
  battleStore.playerMonster = null
  battleStore.wildMonster = null
  battleStore.turnPhase = "idle"
  battleStore.message = ""
  battleStore.showFocus = false
  battleStore.focusSelected = false
  battleStore.focusResult = null
  battleStore.team = []
  battleStore.currentTeamIndex = 0
}

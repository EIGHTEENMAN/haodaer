import { reactive } from "vue"

export type GameScreen = "start" | "worldSelect" | "stageMap" | "playing" | "stageClear" | "gameover"

export interface SkillInfo {
  id: number
  name: string
  key: string
  level: number
  cooldown: number
  maxCooldown: number
  unlocked: boolean
  description: string
}

// PUNCH (see picture → pick word) - 5s CD, default
// KICK (listen → pick word) - 8s CD, default
// SPELL (type the word) - 12s CD, unlocks Stage 2+
// FLASH (flash memory) - 20s CD, unlocks Stage 3+
// SPECIAL (fill in blank) - 30s CD, unlocks Stage 4+
export const SKILLS: SkillInfo[] = [
  { id: 0, name: "PUNCH", key: "1", level: 1, cooldown: 0, maxCooldown: 5000, unlocked: true, description: "PICTURE → WORD" },
  { id: 1, name: "KICK", key: "2", level: 1, cooldown: 0, maxCooldown: 8000, unlocked: true, description: "LISTEN → WORD" },
  { id: 2, name: "SPELL", key: "3", level: 1, cooldown: 0, maxCooldown: 12000, unlocked: false, description: "SPELL THE WORD" },
  { id: 3, name: "FLASH", key: "4", level: 1, cooldown: 0, maxCooldown: 20000, unlocked: false, description: "FLASH MEMORY" },
  { id: 4, name: "SPECIAL", key: "5", level: 1, cooldown: 0, maxCooldown: 30000, unlocked: false, description: "FILL THE BLANK" },
]

export interface DamageNum {
  id: number; text: string; x: number; y: number; color: string
}

export interface WordData {
  id: number
  word: string
  meaning: string
  phonetic: string
  difficulty: number
  theme: string
  sentence: string
  sentenceCn: string
  audioFile?: string
}

export const gameStore = reactive({
  screen: "start" as GameScreen,
  selectedSkill: 0,
  isPaused: false,
  showQuestion: false,
  showSkillSelect: false,
  questionSkillIndex: 0,
  currentMonsterId: -1,
  currentWord: null as WordData | null,
  damageNumbers: [] as DamageNum[],

  // Stage/world progression
  currentWorld: "",
  currentStage: 1,
  remainingTime: 0,
  stageMonstersAlive: 0,
  stageMonstersTotal: 0,
  wordsLearnedInStage: 0,
  showStageClear: false,
  showGameOver: false,
})

let dnId = 0
export function addDamageNumber(text: string, x: number, y: number, color = "#ff0") {
  const id = ++dnId
  gameStore.damageNumbers.push({ id, text, x, y, color })
  setTimeout(() => {
    gameStore.damageNumbers = gameStore.damageNumbers.filter(d => d.id !== id)
  }, 1500)
}

export function selectSkill(index: number) {
  const skill = SKILLS[index]
  if (!skill || !skill.unlocked || skill.cooldown > 0) return false
  gameStore.selectedSkill = index
  return true
}

export function startCooldown(index: number) {
  const skill = SKILLS[index]
  if (!skill) return
  skill.cooldown = skill.maxCooldown
  const interval = setInterval(() => {
    skill.cooldown = Math.max(0, skill.cooldown - 100)
    if (skill.cooldown <= 0) clearInterval(interval)
  }, 100)
}

// Unlock skills based on current stage (1-indexed)
export function unlockSkillsForStage(stageNumber: number) {
  if (stageNumber >= 2) SKILLS[2].unlocked = true // SPELL at Stage 2
  if (stageNumber >= 3) SKILLS[3].unlocked = true // FLASH at Stage 3
  if (stageNumber >= 4) SKILLS[4].unlocked = true // SPECIAL at Stage 4
}

// Progress persistence: { "ANIMAL": [1,2,3,4,5,6], "FOOD": [1,2], ... }
export function saveProgress(worldId: string, stageNumber: number) {
  try {
    const raw = localStorage.getItem("ultraman_progress")
    const progress: Record<string, number[]> = raw ? JSON.parse(raw) : {}
    if (!progress[worldId]) progress[worldId] = []
    if (!progress[worldId].includes(stageNumber)) {
      progress[worldId].push(stageNumber)
    }
    localStorage.setItem("ultraman_progress", JSON.stringify(progress))
  } catch {}
}

export function getProgress(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem("ultraman_progress")
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

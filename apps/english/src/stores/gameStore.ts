import { reactive } from "vue"
import { WORLDS } from "../data/stages"

export type GameScreen = "start" | "worldSelect" | "stageMap" | "wordPreview" | "playing" | "stageClear" | "gameover" | "wordSummary"

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
  selectedSkill: -1,
  isPaused: false,
  showQuestion: false,
  showSkillSelect: false,
  showStageClear: false,
  showGameOver: false,

  // World progression
  currentWorld: "",
  currentStage: 1,
  stageWords: [] as WordData[],

  // Stage state
  stageMonstersAlive: 0,
  stageMonstersTotal: 0,
  wordsLearnedInStage: 0,
  remainingTime: 0,
})

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

// Progress persistence: { completedStages: { "ANIMAL": [1,2,3,4,5,6] }, unlockedWorlds: ["ANIMAL", "FOOD"] }
export function saveProgress(worldId: string, stageNumber: number) {
  try {
    const raw = localStorage.getItem("ultraman_progress")
    let progress: { unlockedWorlds: string[]; completedStages: Record<string, number[]> }
    if (raw) {
      progress = JSON.parse(raw)
      // Normalize old flat format
      if (!progress.completedStages) {
        const flat = progress as unknown as Record<string, number[]>
        progress = { unlockedWorlds: ["ANIMAL"], completedStages: {} }
        for (const key of Object.keys(flat)) {
          if (Array.isArray(flat[key])) {
            progress.completedStages[key] = flat[key]
          }
        }
      }
    } else {
      progress = { unlockedWorlds: ["ANIMAL"], completedStages: {} }
    }
    if (!progress.completedStages[worldId]) progress.completedStages[worldId] = []
    if (!progress.completedStages[worldId].includes(stageNumber)) {
      progress.completedStages[worldId].push(stageNumber)
    }
    // Unlock next world when all 6 stages are completed
    if (progress.completedStages[worldId].length >= 6) {
      const idx = WORLDS.findIndex(w => w.id === worldId)
      if (idx >= 0 && idx < WORLDS.length - 1) {
        const next = WORLDS[idx + 1].id
        if (!progress.unlockedWorlds.includes(next)) {
          progress.unlockedWorlds.push(next)
        }
      }
    }
    localStorage.setItem("ultraman_progress", JSON.stringify(progress))
  } catch {}
}

export function getProgress() {
  try {
    const raw = localStorage.getItem("ultraman_progress")
    if (!raw) return { unlockedWorlds: ["ANIMAL"], completedStages: {} as Record<string, number[]> }
    const data = JSON.parse(raw)
    if (!data.completedStages) {
      const completedStages: Record<string, number[]> = {}
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) completedStages[key] = data[key]
      }
      return { unlockedWorlds: ["ANIMAL"], completedStages }
    }
    return data
  } catch { return { unlockedWorlds: ["ANIMAL"], completedStages: {} as Record<string, number[]> } }
}

import { reactive } from "vue"

export type GameScreen = "start" | "playing" | "review" | "gameover"

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

export const SKILLS: SkillInfo[] = [
  { id: 1, name: "拳击", key: "1", level: 1, cooldown: 0, maxCooldown: 3000, unlocked: true, description: "看释义选词" },
  { id: 2, name: "飞踢", key: "2", level: 1, cooldown: 0, maxCooldown: 4000, unlocked: true, description: "听音拼写" },
  { id: 3, name: "过肩摔", key: "3", level: 1, cooldown: 0, maxCooldown: 5000, unlocked: true, description: "补全单词" },
  { id: 4, name: "旋风腿", key: "4", level: 1, cooldown: 0, maxCooldown: 6000, unlocked: false, description: "语音读词" },
  { id: 5, name: "必杀技", key: "5", level: 1, cooldown: 0, maxCooldown: 8000, unlocked: false, description: "完形选择" },
]

export interface DamageNum {
  id: number; text: string; x: number; y: number; color: string
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
})

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

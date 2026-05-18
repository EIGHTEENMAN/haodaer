// 10 worlds × 6 stages configuration
// Each world maps to a word theme from words.ts

export interface StageConfig {
  stage: number // 1-5 normal, 6 = BOSS
  monsterCount: number
  timeLimit: number // seconds, 0 = no limit
  bulletSpeed: number // 0-4: none, slow, medium, fast, extreme, boss
  hasScatter: boolean
  wordDifficulty: number // 1-10, filters words by difficulty
}

export interface WorldConfig {
  id: string
  name: string // English display name
  nameCn: string
  theme: string // matches words.ts theme field
  visual: string
  stages: StageConfig[]
}

export const WORLDS: WorldConfig[] = [
  {
    id: 'ANIMAL',
    name: 'ANIMAL',
    nameCn: '动物世界',
    theme: '动物 Animals',
    visual: '🌿',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 2 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 4 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 6 },
    ],
  },
  {
    id: 'FOOD',
    name: 'FOOD',
    nameCn: '美食世界',
    theme: '食物 Food',
    visual: '🍳',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 2 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 4 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 6 },
    ],
  },
  {
    id: 'COLOR',
    name: 'COLOR',
    nameCn: '彩色世界',
    theme: '颜色形状 Colors&Shapes',
    visual: '🌈',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 2 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 4 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 6 },
    ],
  },
  {
    id: 'BODY',
    name: 'BODY',
    nameCn: '人体世界',
    theme: '身体 Body',
    visual: '🫀',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 2 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 3 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 4 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 5 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 6 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 7 },
    ],
  },
  {
    id: 'CLOTHES',
    name: 'CLOTHES',
    nameCn: '衣帽世界',
    theme: '衣服 Clothes',
    visual: '👗',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 3 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 4 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 5 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 6 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 7 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 8 },
    ],
  },
  {
    id: 'NATURE',
    name: 'NATURE',
    nameCn: '自然世界',
    theme: '自然天气 Nature&Weather',
    visual: '🌤️',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 3 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 4 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 5 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 6 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 7 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 8 },
    ],
  },
  {
    id: 'DAILY',
    name: 'DAILY',
    nameCn: '日常世界',
    theme: '日常 Daily Life',
    visual: '🏠',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 4 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 5 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 6 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 7 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 8 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 9 },
    ],
  },
  {
    id: 'NUMBER',
    name: 'NUMBER',
    nameCn: '数字世界',
    theme: '数字时间 Numbers&Time',
    visual: '🔢',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 5 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 6 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 7 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 8 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 9 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 10 },
    ],
  },
  {
    id: 'FAMILY',
    name: 'FAMILY',
    nameCn: '家庭学校',
    theme: '家庭学校 Family&School',
    visual: '🏫',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 5 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 6 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 7 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 8 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 9 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 10 },
    ],
  },
  {
    id: 'ACTION',
    name: 'ACTION',
    nameCn: '动作世界',
    theme: '动作 Actions',
    visual: '⚡',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 6 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 7 },
      { stage: 3, monsterCount: 5,  timeLimit: 60, bulletSpeed: 2, hasScatter: false, wordDifficulty: 8 },
      { stage: 4, monsterCount: 8,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 9 },
      { stage: 5, monsterCount: 8,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 10 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 10 },
    ],
  },
]

export const BOSS_NAMES: Record<string, string> = {
  ANIMAL: 'KING WOLF',
  FOOD: 'CHEF PIGGY',
  COLOR: 'RAINBOW KING',
  BODY: 'CLOWN BOSS',
  CLOTHES: 'QUEEN ROBE',
  NATURE: 'SKY DRAGON',
  DAILY: 'ROBOT HOUSE',
  NUMBER: 'DIGIT MONSTER',
  FAMILY: 'TEACHER OWL',
  ACTION: 'SHADOW NINJA',
}

export const WORLD_BG_COLORS: Record<string, number> = {
  ANIMAL: 0x2d5a27,
  FOOD: 0x5a3d2b,
  COLOR: 0x3a2b5a,
  BODY: 0x5a2b3d,
  CLOTHES: 0x3d2b5a,
  NATURE: 0x2b4a5a,
  DAILY: 0x3a3a2b,
  NUMBER: 0x1a2a3a,
  FAMILY: 0x3a2a2a,
  ACTION: 0x2a1a3a,
}

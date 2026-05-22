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
  // ═══ GRADE 1 - 初级 ═══
  {
    id: 'ANIMAL', name: 'ANIMAL', nameCn: '动物世界',
    theme: '动物 Animals', visual: '🌿',
    stages: [
      { stage: 1, monsterCount: 2,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 2, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 3, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 4, monsterCount: 4,  timeLimit: 60, bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 5, monsterCount: 4,  timeLimit: 50, bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 2 },
    ],
  },
  {
    id: 'FOOD', name: 'FOOD', nameCn: '美食世界',
    theme: '食物 Food', visual: '🍳',
    stages: [
      { stage: 1, monsterCount: 2,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 2, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 3, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 4, monsterCount: 4,  timeLimit: 55, bulletSpeed: 1, hasScatter: false, wordDifficulty: 1 },
      { stage: 5, monsterCount: 5,  timeLimit: 45, bulletSpeed: 1, hasScatter: false, wordDifficulty: 2 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 2 },
    ],
  },

  // ═══ GRADE 2 - 基础 ═══
  {
    id: 'COLOR', name: 'COLOR', nameCn: '彩色世界',
    theme: '颜色形状 Colors&Shapes', visual: '🌈',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 2 },
      { stage: 2, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 2 },
      { stage: 3, monsterCount: 4,  timeLimit: 60, bulletSpeed: 1, hasScatter: false, wordDifficulty: 2 },
      { stage: 4, monsterCount: 5,  timeLimit: 55, bulletSpeed: 2, hasScatter: false, wordDifficulty: 2 },
      { stage: 5, monsterCount: 5,  timeLimit: 50, bulletSpeed: 2, hasScatter: true,  wordDifficulty: 3 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 3 },
    ],
  },
  {
    id: 'BODY', name: 'BODY', nameCn: '人体世界',
    theme: '身体 Body', visual: '🫀',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 1, hasScatter: false, wordDifficulty: 2 },
      { stage: 2, monsterCount: 4,  timeLimit: 0,  bulletSpeed: 2, hasScatter: false, wordDifficulty: 2 },
      { stage: 3, monsterCount: 4,  timeLimit: 55, bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 4, monsterCount: 5,  timeLimit: 50, bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 5, monsterCount: 6,  timeLimit: 45, bulletSpeed: 2, hasScatter: true,  wordDifficulty: 3 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 3 },
    ],
  },

  // ═══ GRADE 3 - 中级 ═══
  {
    id: 'CLOTHES', name: 'CLOTHES', nameCn: '衣帽世界',
    theme: '衣服 Clothes', visual: '👗',
    stages: [
      { stage: 1, monsterCount: 3,  timeLimit: 0,  bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 2, monsterCount: 4,  timeLimit: 0,  bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 3, monsterCount: 4,  timeLimit: 55, bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 4, monsterCount: 5,  timeLimit: 50, bulletSpeed: 2, hasScatter: false, wordDifficulty: 4 },
      { stage: 5, monsterCount: 6,  timeLimit: 45, bulletSpeed: 2, hasScatter: true,  wordDifficulty: 4 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 2, hasScatter: true,  wordDifficulty: 4 },
    ],
  },
  {
    id: 'NATURE', name: 'NATURE', nameCn: '自然世界',
    theme: '自然天气 Nature&Weather', visual: '🌤️',
    stages: [
      { stage: 1, monsterCount: 4,  timeLimit: 0,  bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 2, monsterCount: 4,  timeLimit: 0,  bulletSpeed: 2, hasScatter: false, wordDifficulty: 3 },
      { stage: 3, monsterCount: 5,  timeLimit: 50, bulletSpeed: 2, hasScatter: false, wordDifficulty: 4 },
      { stage: 4, monsterCount: 6,  timeLimit: 45, bulletSpeed: 2, hasScatter: false, wordDifficulty: 4 },
      { stage: 5, monsterCount: 6,  timeLimit: 40, bulletSpeed: 3, hasScatter: true,  wordDifficulty: 4 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 3, hasScatter: true,  wordDifficulty: 4 },
    ],
  },

  // ═══ GRADE 4 - 中高级 ═══
  {
    id: 'DAILY', name: 'DAILY', nameCn: '日常世界',
    theme: '日常 Daily Life', visual: '🏠',
    stages: [
      { stage: 1, monsterCount: 4,  timeLimit: 0,  bulletSpeed: 2, hasScatter: false, wordDifficulty: 4 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 2, hasScatter: false, wordDifficulty: 4 },
      { stage: 3, monsterCount: 5,  timeLimit: 50, bulletSpeed: 2, hasScatter: false, wordDifficulty: 4 },
      { stage: 4, monsterCount: 6,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 5, monsterCount: 6,  timeLimit: 40, bulletSpeed: 3, hasScatter: true,  wordDifficulty: 5 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 3, hasScatter: true,  wordDifficulty: 5 },
    ],
  },
  {
    id: 'NUMBER', name: 'NUMBER', nameCn: '数字世界',
    theme: '数字时间 Numbers&Time', visual: '🔢',
    stages: [
      { stage: 1, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 2, hasScatter: false, wordDifficulty: 4 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 3, monsterCount: 6,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 4, monsterCount: 6,  timeLimit: 40, bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 5, monsterCount: 7,  timeLimit: 35, bulletSpeed: 3, hasScatter: true,  wordDifficulty: 5 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 3, hasScatter: true,  wordDifficulty: 5 },
    ],
  },

  // ═══ GRADE 5 - 高级 ═══
  {
    id: 'FAMILY', name: 'FAMILY', nameCn: '家庭学校',
    theme: '家庭学校 Family&School', visual: '🏫',
    stages: [
      { stage: 1, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 2, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 3, monsterCount: 6,  timeLimit: 45, bulletSpeed: 3, hasScatter: false, wordDifficulty: 6 },
      { stage: 4, monsterCount: 7,  timeLimit: 40, bulletSpeed: 3, hasScatter: false, wordDifficulty: 6 },
      { stage: 5, monsterCount: 7,  timeLimit: 35, bulletSpeed: 3, hasScatter: true,  wordDifficulty: 6 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 6 },
    ],
  },
  {
    id: 'ACTION', name: 'ACTION', nameCn: '动作世界',
    theme: '动作 Actions', visual: '⚡',
    stages: [
      { stage: 1, monsterCount: 5,  timeLimit: 0,  bulletSpeed: 3, hasScatter: false, wordDifficulty: 5 },
      { stage: 2, monsterCount: 6,  timeLimit: 0,  bulletSpeed: 3, hasScatter: false, wordDifficulty: 6 },
      { stage: 3, monsterCount: 6,  timeLimit: 40, bulletSpeed: 3, hasScatter: false, wordDifficulty: 6 },
      { stage: 4, monsterCount: 7,  timeLimit: 35, bulletSpeed: 4, hasScatter: false, wordDifficulty: 6 },
      { stage: 5, monsterCount: 8,  timeLimit: 30, bulletSpeed: 4, hasScatter: true,  wordDifficulty: 6 },
      { stage: 6, monsterCount: 1,  timeLimit: 0,  bulletSpeed: 4, hasScatter: true,  wordDifficulty: 6 },
    ],
  },
]

// Grade system — groups worlds into difficulty tiers
export interface GradeConfig {
  id: number
  name: string
  nameCn: string
  worldIds: string[]
}

export const GRADES: GradeConfig[] = [
  { id: 1, name: 'BEGINNER', nameCn: '初级', worldIds: ['ANIMAL', 'FOOD'] },
  { id: 2, name: 'ELEMENTARY', nameCn: '基础', worldIds: ['COLOR', 'BODY'] },
  { id: 3, name: 'INTERMEDIATE', nameCn: '中级', worldIds: ['CLOTHES', 'NATURE'] },
  { id: 4, name: 'UPPER INTERMEDIATE', nameCn: '中高级', worldIds: ['DAILY', 'NUMBER'] },
  { id: 5, name: 'ADVANCED', nameCn: '高级', worldIds: ['FAMILY', 'ACTION'] },
]

export function getGradeForWorld(worldId: string): GradeConfig | undefined {
  return GRADES.find(g => g.worldIds.includes(worldId))
}

export function getGradeProgress(completedStages: Record<string, number[]>): Record<number, { completed: number; total: number }> {
  const result: Record<number, { completed: number; total: number }> = {}
  for (const grade of GRADES) {
    let completed = 0
    const total = grade.worldIds.length * 6
    for (const wid of grade.worldIds) {
      completed += (completedStages[wid] || []).length
    }
    result[grade.id] = { completed, total }
  }
  return result
}

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

export const WORLD_OBSTACLE_COLORS: Record<string, number> = {
  ANIMAL: 0x4a8c3f,   // tree trunks / bushes
  FOOD: 0x8b6b4a,     // wooden furniture
  COLOR: 0x6a4a8c,    // colored pillars
  BODY: 0x8c4a5a,     // pinkish obstacles
  CLOTHES: 0x5a4a8c,  // purple fabric rolls
  NATURE: 0x4a6b8c,   // stone pillars
  DAILY: 0x6b5a3a,    // brown furniture
  NUMBER: 0x3a4a6b,   // metal columns
  FAMILY: 0x5a3a3a,   // brick walls
  ACTION: 0x4a3a6b,   // concrete barriers
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

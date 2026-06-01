// 10 worlds × 6 stages configuration
// Each world maps to a word theme from words.ts
// Difficulty scales within each world: stage 1 = easy, stage 6 = BOSS

export interface StageConfig {
  stage: number // 1-5 normal, 6 = BOSS
  wordDifficulty: [number, number] // min-max difficulty range for encounters
  boss: boolean // is this a boss stage?
  // Legacy arena game fields (optional, used by GameScene)
  monsterCount?: number
  timeLimit?: number // seconds, 0 = no limit
  bulletSpeed?: number // 0-4
  hasScatter?: boolean
}

export interface WorldConfig {
  id: string
  name: string // English display name
  nameCn: string
  theme: string // matches words.ts theme field
  visual: string
  description: string // theme-appropriate description
  stages: StageConfig[]
}

export const WORLDS: WorldConfig[] = [
  // ═══ GRADE 1 - 初级 ═══
  {
    id: 'ANIMAL', name: 'ANIMAL', nameCn: '动物世界',
    theme: '动物 Animals', visual: '🌿',
    description: '在绿草如茵的草原上，到处是可爱的动物单词兽',
    stages: [
      { stage: 1, wordDifficulty: [1, 1], boss: false },
      { stage: 2, wordDifficulty: [1, 2], boss: false },
      { stage: 3, wordDifficulty: [2, 2], boss: false },
      { stage: 4, wordDifficulty: [2, 3], boss: false },
      { stage: 5, wordDifficulty: [3, 3], boss: false },
      { stage: 6, wordDifficulty: [3, 4], boss: true },
    ],
  },
  {
    id: 'FOOD', name: 'FOOD', nameCn: '美食世界',
    theme: '食物 Food', visual: '🍳',
    description: '暖色调的厨房里，飘着美食单词的香气',
    stages: [
      { stage: 1, wordDifficulty: [1, 1], boss: false },
      { stage: 2, wordDifficulty: [1, 2], boss: false },
      { stage: 3, wordDifficulty: [2, 2], boss: false },
      { stage: 4, wordDifficulty: [2, 3], boss: false },
      { stage: 5, wordDifficulty: [3, 3], boss: false },
      { stage: 6, wordDifficulty: [3, 4], boss: true },
    ],
  },

  // ═══ GRADE 2 - 基础 ═══
  {
    id: 'COLOR', name: 'COLOR', nameCn: '彩色世界',
    theme: '颜色形状 Colors&Shapes', visual: '🌈',
    description: '彩虹色的世界里，颜色和形状单词在跳跃',
    stages: [
      { stage: 1, wordDifficulty: [2, 2], boss: false },
      { stage: 2, wordDifficulty: [2, 3], boss: false },
      { stage: 3, wordDifficulty: [3, 3], boss: false },
      { stage: 4, wordDifficulty: [3, 4], boss: false },
      { stage: 5, wordDifficulty: [4, 4], boss: false },
      { stage: 6, wordDifficulty: [4, 5], boss: true },
    ],
  },
  {
    id: 'BODY', name: 'BODY', nameCn: '人体世界',
    theme: '身体 Body', visual: '🫀',
    description: '探索人体的奥秘，认识身体各部位的单词',
    stages: [
      { stage: 1, wordDifficulty: [2, 2], boss: false },
      { stage: 2, wordDifficulty: [2, 3], boss: false },
      { stage: 3, wordDifficulty: [3, 3], boss: false },
      { stage: 4, wordDifficulty: [3, 4], boss: false },
      { stage: 5, wordDifficulty: [4, 4], boss: false },
      { stage: 6, wordDifficulty: [4, 5], boss: true },
    ],
  },

  // ═══ GRADE 3 - 中级 ═══
  {
    id: 'CLOTHES', name: 'CLOTHES', nameCn: '衣帽世界',
    theme: '衣服 Clothes', visual: '👗',
    description: '时尚的衣橱里，藏着各种衣物单词',
    stages: [
      { stage: 1, wordDifficulty: [3, 3], boss: false },
      { stage: 2, wordDifficulty: [3, 4], boss: false },
      { stage: 3, wordDifficulty: [4, 4], boss: false },
      { stage: 4, wordDifficulty: [4, 5], boss: false },
      { stage: 5, wordDifficulty: [5, 5], boss: false },
      { stage: 6, wordDifficulty: [5, 6], boss: true },
    ],
  },
  {
    id: 'NATURE', name: 'NATURE', nameCn: '自然世界',
    theme: '自然天气 Nature&Weather', visual: '🌤️',
    description: '在自然天地间，感受天气和自然单词',
    stages: [
      { stage: 1, wordDifficulty: [3, 3], boss: false },
      { stage: 2, wordDifficulty: [3, 4], boss: false },
      { stage: 3, wordDifficulty: [4, 4], boss: false },
      { stage: 4, wordDifficulty: [4, 5], boss: false },
      { stage: 5, wordDifficulty: [5, 5], boss: false },
      { stage: 6, wordDifficulty: [5, 6], boss: true },
    ],
  },

  // ═══ GRADE 4 - 中高级 ═══
  {
    id: 'DAILY', name: 'DAILY', nameCn: '日常世界',
    theme: '日常 Daily Life', visual: '🏠',
    description: '温馨的日常生活场景，学习日常用语',
    stages: [
      { stage: 1, wordDifficulty: [4, 4], boss: false },
      { stage: 2, wordDifficulty: [4, 5], boss: false },
      { stage: 3, wordDifficulty: [5, 5], boss: false },
      { stage: 4, wordDifficulty: [5, 6], boss: false },
      { stage: 5, wordDifficulty: [6, 6], boss: false },
      { stage: 6, wordDifficulty: [6, 7], boss: true },
    ],
  },
  {
    id: 'NUMBER', name: 'NUMBER', nameCn: '数字世界',
    theme: '数字时间 Numbers&Time', visual: '🔢',
    description: '数字和时间的王国，和数字单词交朋友',
    stages: [
      { stage: 1, wordDifficulty: [4, 4], boss: false },
      { stage: 2, wordDifficulty: [4, 5], boss: false },
      { stage: 3, wordDifficulty: [5, 5], boss: false },
      { stage: 4, wordDifficulty: [5, 6], boss: false },
      { stage: 5, wordDifficulty: [6, 6], boss: false },
      { stage: 6, wordDifficulty: [6, 7], boss: true },
    ],
  },

  // ═══ GRADE 5 - 高级 ═══
  {
    id: 'FAMILY', name: 'FAMILY', nameCn: '家庭学校',
    theme: '家庭学校 Family&School', visual: '🏫',
    description: '在家庭和学校里，学习最实用的单词',
    stages: [
      { stage: 1, wordDifficulty: [5, 5], boss: false },
      { stage: 2, wordDifficulty: [5, 6], boss: false },
      { stage: 3, wordDifficulty: [6, 6], boss: false },
      { stage: 4, wordDifficulty: [6, 7], boss: false },
      { stage: 5, wordDifficulty: [7, 7], boss: false },
      { stage: 6, wordDifficulty: [7, 8], boss: true },
    ],
  },
  {
    id: 'ACTION', name: 'ACTION', nameCn: '动作世界',
    theme: '动作 Actions', visual: '⚡',
    description: '动感十足的动作世界，动词在这里等你',
    stages: [
      { stage: 1, wordDifficulty: [5, 5], boss: false },
      { stage: 2, wordDifficulty: [5, 6], boss: false },
      { stage: 3, wordDifficulty: [6, 6], boss: false },
      { stage: 4, wordDifficulty: [6, 7], boss: false },
      { stage: 5, wordDifficulty: [7, 7], boss: false },
      { stage: 6, wordDifficulty: [7, 8], boss: true },
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

// Calculate which "stage" the player is on based on captured count in a world
export function getStageForCapturedCount(count: number): number {
  if (count <= 0) return 1
  if (count < 5) return 2
  if (count < 10) return 3
  if (count < 20) return 4
  if (count < 30) return 5
  return 6
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

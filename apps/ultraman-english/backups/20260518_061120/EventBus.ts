import Phaser from "phaser"

// Event names for Phaser ↔ Vue communication
export const GameEvents = {
  MONSTER_HIT: "monster:hit",         // Vue → Phaser: skill hit monster {monsterId, skillName, damage, combo}
  PLAYER_DAMAGED: "player:damaged",   // Vue → Phaser: wrong answer {damage}
  QUESTION_START: "question:start",   // Phaser → Vue: show question {monsterId, word, skillName}
  QUESTION_RESULT: "question:result", // Vue → Phaser: answer result {correct, skillName}
  MONSTER_DIED: "monster:died",       // Phaser → Vue: monster killed {xp, word}
  GAME_OVER: "game:over",            // Phaser → Vue: player died
  LEVEL_UP: "level:up",             // Phaser → Vue: player leveled up
  CLOSE_QUESTION: "question:close",  // Phaser → Vue: close question modal
  SKILL_SELECT: "skill:select",  SHOW_SKILL_SELECT: "show:skillSelect",
} as const

const eventBus = new Phaser.Events.EventEmitter()
export default eventBus

import Phaser from "phaser"

// Event names for Phaser ↔ Vue communication
export const GameEvents = {
  MONSTER_DIED: "monster:died",       // Phaser → Vue: monster killed {xp, word}
  GAME_OVER: "game:over",            // Phaser → Vue: player died
  LEVEL_UP: "level:up",             // Phaser → Vue: player leveled up
  PLAYER_ATTACK: "player:attack",   // Player.ts → GameScene: space pressed
  ADVANCE_STAGE: "stage:advance",   // GameScene → App.vue: advance to next stage
  BACK_TO_MAP: "back:to:map",       // GameScene → App.vue: return to map
  HINT_UPDATE: "hint:update",       // GameScene → StageHUD: new target hint {word, hintType}
  SKILL_ACTIVATE: "skill:activate",  // StageHUD → GameScene: skill button clicked {skillIndex}
} as const

const eventBus = new Phaser.Events.EventEmitter()
export default eventBus

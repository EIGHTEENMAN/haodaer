import Phaser from "phaser"

// Event names for Phaser ↔ Vue communication
export const GameEvents = {
  BACK_TO_MAP: "back:to:map",
  BATTLE_START: "battle:start",
  BATTLE_END: "battle:end",
  CAPTURE_SUCCESS: "capture:success",
  HINT_UPDATE: "hint:update",
  PLAYER_ATTACK: "player:attack",
} as const

const eventBus = new Phaser.Events.EventEmitter()
export default eventBus

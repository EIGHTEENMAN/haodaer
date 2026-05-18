import Phaser from "phaser"
import { BootScene } from "./scenes/BootScene"
import { GameScene } from "./scenes/GameScene"

export const gameRef = { current: null as Phaser.Game | null }
let phaserGame: Phaser.Game | null = null

export function createGame() {
  if (phaserGame) return phaserGame
  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "phaser-container",
    width: 800,
    height: 600,
    backgroundColor: "#3a7d44",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [BootScene, GameScene],
  })
  gameRef.current = phaserGame
  return phaserGame
}

export function restartGameScene() {
  if (!phaserGame) return
  try {
    const scene = phaserGame.scene.getScene("GameScene")
    if (scene) {
      scene.scene.restart()
    }
  } catch {
    // Fallback: stop and start
    phaserGame.scene.stop("GameScene")
    phaserGame.scene.start("GameScene")
  }
}

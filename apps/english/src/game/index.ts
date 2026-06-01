import Phaser from "phaser"
import { BootScene } from "./scenes/BootScene"
import { OverworldScene } from "./scenes/OverworldScene"
import { BattleScene } from "./scenes/BattleScene"
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
    backgroundColor: "#1a1a2e",
    preserveDrawingBuffer: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [BootScene, OverworldScene, BattleScene, GameScene],
  })
  gameRef.current = phaserGame
  // Expose for E2E testing
  if (typeof window !== 'undefined') (window as any).__PHASER_GAME__ = phaserGame
  return phaserGame
}

export function startArenaGame() {
  if (!phaserGame) return
  try {
    if (phaserGame.scene.isActive('OverworldScene')) phaserGame.scene.stop('OverworldScene')
    if (phaserGame.scene.isActive('BattleScene')) phaserGame.scene.stop('BattleScene')
    if (phaserGame.scene.isActive('BootScene')) phaserGame.scene.stop('BootScene')
    phaserGame.scene.start('GameScene')
  } catch {
    phaserGame.scene.start('GameScene')
  }
}

export function startOverworld(worldId: string) {
  if (!phaserGame) return
  try {
    if (phaserGame.scene.isActive('BattleScene')) {
      phaserGame.scene.stop('BattleScene')
    }
    if (phaserGame.scene.isActive('BootScene')) {
      phaserGame.scene.stop('BootScene')
    }
    if (phaserGame.scene.isActive('OverworldScene')) {
      phaserGame.scene.stop('OverworldScene')
    }
    phaserGame.scene.start('OverworldScene', { worldId })
  } catch {
    phaserGame.scene.start('OverworldScene', { worldId })
  }
}

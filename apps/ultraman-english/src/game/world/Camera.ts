import Phaser from "phaser"

export function setupCamera(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite, worldW = 4000, worldH = 2400) {
  const cam = scene.cameras.main
  cam.startFollow(target, true, 0.1, 0.1)
  cam.setBounds(0, 0, worldW, worldH)
  return cam
}

export function cameraZoomEffect(cam: Phaser.Cameras.Scene2D.Camera, zoom = 1.3, duration = 500) {
  cam.zoomTo(zoom, duration, "Sine.easeInOut")
  cam.scene.time.delayedCall(duration + 200, () => {
    cam.zoomTo(1, 400, "Sine.easeInOut")
  })
}

import { createApp, ref } from "vue"
import App from "./App.vue"
import { createGame, gameRef } from "./game/index"

const app = createApp(App)
app.mount("#app")

// Provide game ref so Vue components can emit events to Phaser
app.provide("gameRef", gameRef)

// Start Phaser after Vue mounts
createGame()

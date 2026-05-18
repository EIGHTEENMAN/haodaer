<template>
  <div class="game-container">
    <StartScreen v-if="gameStore.screen === 'start'" @start="startGame" />
    <GameHud v-if="gameStore.screen === 'playing'" />
    <SkillSelectPopup />
    <QuestionModal v-if="gameStore.showQuestion && gameStore.currentWord" />
    <ReviewPage v-if="gameStore.screen === 'review'" @back="gameStore.screen = 'playing'" />
    <AchievementCard
      v-if="gameStore.screen === 'gameover'"
      :show="true"
      :show-share="true"
      nickname="小勇士"
      :level="player.level"
      :score="player.score"
      :words="sessionWords"
      :accuracy="sessionAccuracy"
      :combo="player.maxCombo"
      :monsters="player.monstersKilled"
    />
    <div v-if="gameStore.screen === 'gameover'" class="gameover-btns">
      <button class="btn" @click="restartGame">再来一次</button>
      <button class="btn secondary" @click="gameStore.screen = 'review'">查看单词</button>
    </div>
    <div v-for="dn in gameStore.damageNumbers" :key="dn.id"
      class="damage-number" :style="{ left: dn.x + 'px', top: dn.y + 'px', color: dn.color }">
      {{ dn.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from "vue"
import StartScreen from "./components/StartScreen.vue"
import GameHud from "./components/GameHud.vue"
import SkillSelectPopup from "./components/SkillSelectPopup.vue"
import QuestionModal from "./components/QuestionModal.vue"
import ReviewPage from "./components/ReviewPage.vue"
import AchievementCard from "./components/AchievementCard.vue"
import { gameStore } from "./stores/gameStore"
import { player } from "./stores/playerStore"
import eventBus, { GameEvents } from "./game/scenes/EventBus"
import { loadFromStorage, saveToStorage } from "./utils/storage"
import { registerWordAudio } from "./utils/audio"
import { words } from "./data/words"
import { getCorrectCount, getWrongCount } from "./stores/wordStore"

const totalCorrect = computed(() => getCorrectCount())
const totalWrong = computed(() => getWrongCount())
const sessionAccuracy = computed(() => {
  const total = totalCorrect.value + totalWrong.value
  return total > 0 ? Math.round((totalCorrect.value / total) * 100) : 100
})
const sessionWords = computed(() => totalCorrect.value)

function startGame() {
  gameStore.screen = "playing"
}

function restartGame() {
  player.hp = player.maxHp
  player.xp = 0
  player.score = 0
  player.combo = 0
  player.maxCombo = 0
  player.monstersKilled = 0
  gameStore.screen = "start"
  location.reload()
}

onMounted(() => {
  loadFromStorage()
  // Preload word audio files
  const uniqueWords = new Set<string>()
  for (const w of words) {
    if (w.word && /^[a-zA-Z ]+$/.test(w.word)) {
      uniqueWords.add(w.word.toLowerCase())
    }
  }
  for (const word of uniqueWords) {
    registerWordAudio(word, "/audio/" + encodeURIComponent(word) + ".mp3")
  }
  setInterval(saveToStorage, 30000)

  eventBus.on(GameEvents.GAME_OVER, () => {
    gameStore.screen = "gameover"
    saveToStorage()
  })
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  background: #1a1a2e;
  font-family: 'Press Start 2P', monospace;
  user-select: none;
  -webkit-user-select: none;
}
.game-container {
  width: 100%;
  height: 100%;
  position: relative;
}
#phaser-container canvas { display: block; }

.gameover-btns {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 1101;
}
.btn {
  padding: 12px 28px;
  border: 3px solid #ffd700;
  background: #ffaa00;
  color: #1a1a2e;
  font-size: 16px;
  font-family: "Press Start 2P", monospace;
  cursor: pointer;
  font-weight: bold;
}
.btn:hover { filter: brightness(1.1); }
.btn.secondary {
  background: transparent;
  color: #ffd700;
}
.damage-number {
  position: fixed;
  font-family: 'Press Start 2P', monospace;
  font-size: 24px;
  font-weight: bold;
  pointer-events: none;
  z-index: 999;
  text-shadow: 0 0 5px rgba(0,0,0,0.8);
}
</style>

<template>
  <div class="game-container">
    <!-- Non-playing screens (Phaser hidden behind) -->
    <StartScreen v-if="screen === 'start'" @start="screen = 'worldSelect'" @words="showReview = true" @profile="showProfile = true" />
    <WorldSelect v-else-if="screen === 'worldSelect'" @select="onSelectWorld" @back="screen = 'start'" />
    <StageMap v-else-if="screen === 'stageMap'" :world-id="currentWorld" @start="onStartStage" @back="screen = 'worldSelect'" />

    <!-- Playing screen (Phaser visible + overlays) -->
    <StageHUD
      v-if="screen === 'playing'"
      :world-index="worldIndex"
      :stage-number="gameStore.currentStage"
      :time-limit="timeLimit"
      :remaining-time="gameStore.remainingTime"
      :alive-count="gameStore.stageMonstersAlive"
      :total-count="gameStore.stageMonstersTotal"
      :words-learned="gameStore.wordsLearnedInStage"
      :show-stage-clear="gameStore.showStageClear"
      :show-game-over="gameStore.showGameOver"
    />

    <!-- Overlays shown during gameplay -->
    <SkillSelectPopup />
    <QuestionModal v-if="gameStore.showQuestion && gameStore.currentWord" />

    <!-- Overlay screens -->
    <ReviewPage v-if="showReview" @back="showReview = false" />
    <PersonalCenter v-if="showProfile" @back="showProfile = false" />

    <!-- Damage numbers floating over game -->
    <div v-for="dn in gameStore.damageNumbers" :key="dn.id"
      class="damage-number" :style="{ left: dn.x + 'px', top: dn.y + 'px', color: dn.color }">
      {{ dn.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue"
import StartScreen from "./components/StartScreen.vue"
import WorldSelect from "./components/WorldSelect.vue"
import StageMap from "./components/StageMap.vue"
import StageHUD from "./components/StageHUD.vue"
import SkillSelectPopup from "./components/SkillSelectPopup.vue"
import QuestionModal from "./components/QuestionModal.vue"
import ReviewPage from "./components/ReviewPage.vue"
import PersonalCenter from "./components/PersonalCenter.vue"
import { gameStore, getProgress } from "./stores/gameStore"
import { player } from "./stores/playerStore"
import { restartGameScene } from "./game/index"
import { WORLDS } from "./data/stages"
import eventBus, { GameEvents } from "./game/scenes/EventBus"
import { loadFromStorage, saveToStorage } from "./utils/storage"
import { registerWordAudio } from "./utils/audio"
import { words as wordData } from "./data/words"

const screen = computed({
  get: () => gameStore.screen as string,
  set: (v: string) => { gameStore.screen = v as any },
})

const currentWorld = computed(() => gameStore.currentWorld)

const worldIndex = computed(() => {
  const idx = WORLDS.findIndex(w => w.id === gameStore.currentWorld)
  return idx >= 0 ? idx + 1 : 1
})

const timeLimit = computed(() => {
  const world = WORLDS.find(w => w.id === gameStore.currentWorld)
  if (!world) return 0
  const stage = world.stages.find(s => s.stage === gameStore.currentStage)
  return stage?.timeLimit || 0
})

const showReview = ref(false)
const showProfile = ref(false)

function onSelectWorld(worldId: string) {
  gameStore.currentWorld = worldId
  screen.value = "stageMap"
}

function onStartStage(stageNumber: number) {
  player.hp = player.maxHp
  player.score = 0
  player.combo = 0
  player.maxCombo = 0
  player.monstersKilled = 0
  player.correctCount = 0
  player.wrongCount = 0
  gameStore.currentStage = stageNumber
  gameStore.selectedSkill = 0
  restartGameScene()
  screen.value = "playing"
}

function advanceStage() {
  gameStore.currentStage++
  player.hp = player.maxHp
  player.combo = 0
  restartGameScene()
}

onMounted(() => {
  loadFromStorage()
  const uniqueWords = new Set<string>()
  for (const w of wordData) {
    if (w.word && /^[a-zA-Z ]+$/.test(w.word)) {
      uniqueWords.add(w.word.toLowerCase())
    }
  }
  for (const word of uniqueWords) {
    registerWordAudio(word, "/audio/" + encodeURIComponent(word) + ".mp3")
  }
  setInterval(saveToStorage, 30000)
  eventBus.on(GameEvents.ADVANCE_STAGE, advanceStage)
})

onUnmounted(() => {
  eventBus.off(GameEvents.ADVANCE_STAGE, advanceStage)
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

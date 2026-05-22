<template>
  <YouthModeGate>
  <div class="game-container">
    <!-- Non-playing screens -->
    <StartScreen v-if="screen === 'start'" @start="screen = 'worldSelect'" @words="showReview = true" @profile="showProfile = true" />
    <WorldSelect v-else-if="screen === 'worldSelect'" @select="onSelectWorld" @back="screen = 'start'" />
    <StageMap v-else-if="screen === 'stageMap'" :world-id="currentWorld" @start="onStartStage" @back="screen = 'worldSelect'" />

    <!-- Word preview before battle -->
    <WordPreview v-if="screen === 'wordPreview'" @start="startBattle" />

    <!-- Word summary after stage clear -->
    <WordSummary v-if="screen === 'wordSummary'" @next="onWordSummaryNext" />

    <!-- Playing screen -->
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

    <!-- Copyright -->
    <div class="game-copyright">英语单词学习内容仅供教学参考。<a href="https://grandand.com/legal#complaint" target="_blank" style="color:#94a3b8;">侵权投诉</a></div>

    <!-- Overlay screens -->
    <ReviewPage v-if="showReview" @back="showReview = false" />
    <PersonalCenter v-if="showProfile" @back="showProfile = false" />

    <!-- Damage numbers are now rendered as Phaser text in GameScene -->
  </div>
  </YouthModeGate>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue"
import YouthModeGate from '@shared/components/YouthModeGate.vue'
import StartScreen from "./components/StartScreen.vue"
import WorldSelect from "./components/WorldSelect.vue"
import StageMap from "./components/StageMap.vue"
import StageHUD from "./components/StageHUD.vue"
import WordPreview from "./components/WordPreview.vue"
import WordSummary from "./components/WordSummary.vue"
import ReviewPage from "./components/ReviewPage.vue"
import PersonalCenter from "./components/PersonalCenter.vue"
import { gameStore } from "./stores/gameStore"
import { player } from "./stores/playerStore"
import { wordStore } from "./stores/wordStore"
import { restartGameScene, gameRef } from "./game/index"
import { WORLDS } from "./data/stages"
import eventBus, { GameEvents } from "./game/scenes/EventBus"
import { loadFromStorage, saveToStorage } from "./utils/storage"
import { syncGameData } from "./utils/sync"
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
  gameStore.currentStage = stageNumber
  // Go to word preview first
  screen.value = "wordPreview"
}

function startBattle() {
  player.hp = player.maxHp
  player.score = 0
  player.combo = 0
  player.maxCombo = 0
  player.monstersKilled = 0
  player.correctCount = 0
  player.wrongCount = 0
  gameStore.selectedSkill = 0
  restartGameScene()
  screen.value = "playing"
}

function advanceStage() {
  syncGameData(player.level, player.score)
  gameStore.currentStage++
  player.hp = player.maxHp
  player.combo = 0
  // Stop current game scene
  const game = gameRef.current
  if (game && game.scene.isActive('GameScene')) {
    game.scene.stop('GameScene')
  }
  screen.value = "wordPreview"
}

function onWordSummaryNext() {
  if (gameStore.currentStage < 6) {
    // Advance to next stage's word preview
    advanceStage()
  } else {
    // Stage 6 complete, back to map
    goBackToMap()
  }
}

function goBackToMap() {
  syncGameData(player.level, player.score)
  gameStore.screen = "stageMap"
  gameStore.showQuestion = false
  gameStore.showSkillSelect = false
  gameStore.showStageClear = false
  gameStore.showGameOver = false
  gameStore.isPaused = false
  const game = gameRef.current
  if (game && game.scene.isActive('GameScene')) {
    game.scene.stop('GameScene')
  }
}

onMounted(() => {
  loadFromStorage()

  // Clear stale word records from testing/dev
  if (wordStore.records.size > 0 && wordStore.lastStudyDate !== new Date().toDateString()) {
    wordStore.records = new Map()
    wordStore.todayStudyTime = 0
    localStorage.removeItem('ultraman_english_data')
  }

  // Cross-domain auth sync
  if (!sessionStorage.getItem('haodaer_user')) {
    const match = document.cookie.match(new RegExp('(^| )haodaer_token=([^;]+)'))
    if (match) {
      const cookieToken = decodeURIComponent(match[2])
      sessionStorage.setItem('haodaer_token', cookieToken)
      fetch('https://grandand.com/api/auth/me', {
        headers: { Authorization: 'Bearer ' + cookieToken }
      })
      .then(r => r.json())
      .then(d => {
        if (d.code === 'OK') sessionStorage.setItem('haodaer_user', JSON.stringify(d.data))
      })
      .catch(() => {})
    }
  }

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
  eventBus.on(GameEvents.BACK_TO_MAP, goBackToMap)
})

onUnmounted(() => {
  eventBus.off(GameEvents.ADVANCE_STAGE, advanceStage)
  eventBus.off(GameEvents.BACK_TO_MAP, goBackToMap)
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
.game-copyright {
  position: fixed; bottom: 0; left: 0; right: 0;
  text-align: center; padding: 4px 16px;
  font-size: 10px; color: #94a3b8;
  font-family: -apple-system, 'Noto Sans SC', sans-serif;
  background: rgba(26, 26, 46, 0.8);
  z-index: 1000;
}
</style>

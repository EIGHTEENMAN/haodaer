<template>
  <YouthModeGate>
  <div class="game-container" :class="{ 'game-playing': screen === 'playing' }">
    <!-- Non-playing screens -->
    <StartScreen v-if="screen === 'start'" @quest="startQuestMode" @arena="startArenaMode" @words="showReview = true" @profile="showProfile = true" />
    <WorldSelect v-else-if="screen === 'worldSelect'" @select="onSelectWorld" @back="screen = 'start'" />
    <StageMap v-else-if="screen === 'stageSelect'" :world-id="selectedWorld" @start="onStartStage" @back="screen = 'worldSelect'" />

    <!-- Playing screen — Phaser scenes handle all UI -->
    <div v-show="screen === 'playing'">
      <!-- Quest mode overlay -->
      <div v-if="gameMode === 'quest'" class="phaser-overlay">
        <div class="overlay-controls">
          <span class="back-btn" @click="goToWorldSelect">← WORLDS</span>
          <span class="collection-btn" @click="showPokedex = true">📖</span>
        </div>
      </div>

      <!-- Arena mode overlays -->
      <div v-if="gameMode === 'arena'">
        <StageHUD v-if="!gameStore.showQuestion && !gameStore.showSkillSelect && !gameStore.showStageClear && !gameStore.showGameOver" />
        <WordPreview v-if="gameStore.showQuestion" @answer="onWordAnswer" />
        <SkillBar v-if="gameStore.showSkillSelect" @select="onSkillSelect" />
        <div v-if="gameStore.showStageClear || gameStore.showGameOver" class="arena-overlay-bg">
          <!-- empty backdrop while modal shows -->
        </div>
        <!-- Arena quit button -->
        <div class="arena-quit-btn" @click="goToWorldSelect" v-if="!gameStore.showQuestion && !gameStore.showStageClear && !gameStore.showGameOver">
          ← EXIT
        </div>
      </div>
    </div>

    <!-- WordSummary (arena game completion) -->
    <WordSummary v-if="screen === 'wordSummary'" @back="screen = 'stageSelect'" />

    <!-- Pokedex overlay -->
    <Pokedex v-if="showPokedex" @back="showPokedex = false" />

    <!-- Copyright -->
    <div class="game-copyright">英语单词学习内容仅供教学参考。<a href="https://grandand.com/legal#complaint" target="_blank" style="color:#94a3b8;">侵权投诉</a></div>

    <!-- Overlay screens -->
    <ReviewPage v-if="showReview" @back="showReview = false" />
    <PersonalCenter v-if="showProfile" @back="showProfile = false" />
  </div>
  </YouthModeGate>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from "vue"
import YouthModeGate from '@shared/components/YouthModeGate.vue'
import StartScreen from "./components/StartScreen.vue"
import WorldSelect from "./components/WorldSelect.vue"
import StageMap from "./components/StageMap.vue"
import StageHUD from "./components/StageHUD.vue"
import WordPreview from "./components/WordPreview.vue"
import SkillBar from "./components/SkillBar.vue"
import WordSummary from "./components/WordSummary.vue"
import ReviewPage from "./components/ReviewPage.vue"
import PersonalCenter from "./components/PersonalCenter.vue"
import Pokedex from "./components/Pokedex.vue"
import { gameStore } from "./stores/gameStore"
import { wordStore } from "./stores/wordStore"
import { startOverworld, startArenaGame, gameRef } from "./game/index"
import { loadPokedex } from "./stores/pokedexStore"
import eventBus, { GameEvents } from "./game/scenes/EventBus"
import { loadFromStorage, saveToStorage } from "./utils/storage"
import { registerWordAudio } from "./utils/audio"
import { words as wordData } from "./data/words"

const screen = computed({
  get: () => gameStore.screen as string,
  set: (v: string) => { gameStore.screen = v as any },
})

const showReview = ref(false)
const showProfile = ref(false)
const showPokedex = ref(false)
const gameMode = ref<'quest' | 'arena'>('quest')
const selectedWorld = ref('')

// Allow clicks through to Phaser canvas when playing (Vue #app sits above canvas in z-order)
watch(screen, (val) => {
  const app = document.getElementById('app')
  if (app) {
    if (val === 'playing') {
      app.style.pointerEvents = 'none'
    } else {
      app.style.pointerEvents = ''
    }
  }
}, { immediate: true })

function startQuestMode() {
  gameMode.value = 'quest'
  screen.value = "worldSelect"
}

function startArenaMode() {
  gameMode.value = 'arena'
  screen.value = "worldSelect"
}

function onSelectWorld(worldId: string) {
  gameStore.currentWorld = worldId
  if (gameMode.value === 'arena') {
    selectedWorld.value = worldId
    screen.value = "stageSelect"
  } else {
    screen.value = "playing"
    startOverworld(worldId)
  }
}

function onStartStage(stageNumber: number) {
  const game = gameRef.current
  if (!game) return
  gameStore.currentStage = stageNumber
  screen.value = "playing"
  // Stop any running Phaser scenes
  if (game.scene.isActive('OverworldScene')) game.scene.stop('OverworldScene')
  if (game.scene.isActive('BattleScene')) game.scene.stop('BattleScene')
  if (game.scene.isActive('GameScene')) game.scene.stop('GameScene')
  if (game.scene.isActive('BootScene')) game.scene.stop('BootScene')
  startArenaGame()
}

function onWordAnswer(correct: boolean) {
  eventBus.emit(GameEvents.PLAYER_ATTACK, correct)
  gameStore.showQuestion = false
}

function onSkillSelect(skillIndex: number) {
  gameStore.selectedSkill = skillIndex
  gameStore.showSkillSelect = false
}

function goToWorldSelect() {
  screen.value = "worldSelect"
  // Stop Phaser scenes
  const game = gameRef.current
  if (game) {
    if (game.scene.isActive('OverworldScene')) game.scene.stop('OverworldScene')
    if (game.scene.isActive('BattleScene')) game.scene.stop('BattleScene')
    if (game.scene.isActive('GameScene')) game.scene.stop('GameScene')
    if (game.scene.isActive('BootScene')) game.scene.stop('BootScene')
  }
}

onMounted(() => {
  loadFromStorage()
  loadPokedex()

  // Listen for Phaser scene events
  eventBus.on(GameEvents.BACK_TO_MAP, goToWorldSelect)
  eventBus.on(GameEvents.BATTLE_END, () => {
    requestAnimationFrame(() => {
      const game = gameRef.current
      if (!game) return
      if (game.scene.isActive('BattleScene')) game.scene.stop('BattleScene')
      // Wake overworld if it was sleeping / resume movement
      const ow = game.scene.getScene('OverworldScene')
      if (ow) {
        if (ow.scene.isSleeping()) game.scene.wake('OverworldScene')
        if (typeof (ow as any).resumeExploration === 'function') {
          (ow as any).resumeExploration()
        }
      }
    })
  })

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
})

onUnmounted(() => {
  eventBus.off(GameEvents.BACK_TO_MAP, goToWorldSelect)
  eventBus.off(GameEvents.BATTLE_END)
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
/* When Phaser is active:
   - #app (z-index:1) set to pointer-events:none by JS so clicks fall through to the canvas
   - Only Vue overlay controls have pointer-events:auto
*/
.game-playing .phaser-overlay { pointer-events: auto; }
.game-playing .pokedex-overlay,
.game-playing .review-page,
.game-playing .profile-screen { pointer-events: auto; }
.game-playing .game-copyright { pointer-events: none; }
.game-copyright {
  position: fixed; bottom: 0; left: 0; right: 0;
  text-align: center; padding: 4px 16px;
  font-size: 10px; color: #94a3b8;
  font-family: -apple-system, 'Noto Sans SC', sans-serif;
  background: rgba(26, 26, 46, 0.8);
  z-index: 1000;
}
.phaser-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  pointer-events: none;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
}
.overlay-controls {
  pointer-events: auto;
  display: flex;
  gap: 8px;
}
.back-btn {
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  color: #ffffff;
  background: rgba(0,0,0,0.5);
  padding: 6px 10px;
  cursor: pointer;
  display: inline-block;
}
.back-btn:hover { background: rgba(0,0,0,0.7); }
.collection-btn {
  font-size: 20px;
  background: rgba(0,0,0,0.5);
  padding: 4px 10px;
  cursor: pointer;
  display: inline-block;
  line-height: 1;
}
.collection-btn:hover { background: rgba(0,0,0,0.7); }
</style>

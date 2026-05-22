<template>
  <div class="word-summary">
    <div class="summary-title">STAGE CLEAR!</div>
    <div class="summary-sub">
      STAGE {{ worldIndex }}-{{ stageNumber }} · {{ words.length }} words
    </div>

    <div class="word-cards">
      <div v-for="(item, i) in words" :key="i" class="word-card">
        <div class="card-emoji">{{ item.emoji || '📖' }}</div>
        <div class="card-word">{{ item.word }}</div>
        <div class="card-meaning">{{ item.meaning }}</div>
        <div v-if="isValidPhonetic(item.phonetic)" class="card-phonetic">{{ item.phonetic }}</div>
        <button class="play-btn" @click="playWord(item.word)" title="Play pronunciation">🔊</button>
      </div>
    </div>

    <div class="next-section">
      <button class="next-btn" @click="goNext">
        {{ isLastStage ? 'BACK TO MAP' : 'NEXT STAGE →' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { gameStore } from "../stores/gameStore"
import { WORLDS } from "../data/stages"
import { playWordAudio } from "../utils/audio"

const emit = defineEmits<{
  next: []
}>()

const words = computed(() => gameStore.stageWords)

const worldIndex = computed(() => WORLDS.findIndex(w => w.id === gameStore.currentWorld) + 1)
const stageNumber = computed(() => gameStore.currentStage)
const isLastStage = computed(() => gameStore.currentStage >= 6)

function playWord(word: string) {
  playWordAudio(word)
}

function goNext() {
  emit('next')
}

function isValidPhonetic(p: string): boolean {
  if (!p || p.length < 6) return false
  return /[ˈˌɑɛɪɔʊʌθðʃʒŋɡɒəɜː]/.test(p) || p.length > 8
}
</script>

<style scoped>
.word-summary {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 400;
  font-family: "Press Start 2P", monospace;
  padding: 24px;
  overflow-y: auto;
}
.summary-title {
  font-size: 28px;
  color: #44cc44;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(68,204,68,0.4);
  margin-bottom: 4px;
}
.summary-sub {
  font-size: 12px;
  color: #88ccff;
  margin-bottom: 24px;
}

/* Word Cards Grid */
.word-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 700px;
  margin-bottom: 24px;
}
.word-card {
  width: 150px;
  padding: 16px 12px 12px;
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.1);
  text-align: center;
  position: relative;
}
.card-emoji { font-size: 40px; margin-bottom: 8px; }
.card-word { color: #ffd700; font-size: 14px; font-weight: bold; margin-bottom: 4px; }
.card-meaning { color: #fff; font-size: 12px; margin-bottom: 4px; }
.card-phonetic { color: #888; font-size: 9px; margin-bottom: 8px; }

.play-btn {
  background: rgba(68,136,255,0.2);
  border: 2px solid #4488ff;
  color: #88bbff;
  font-size: 16px;
  padding: 6px 14px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: "Press Start 2P", monospace;
}
.play-btn:hover { background: rgba(68,136,255,0.35); }

/* Next Section */
.next-section {
  text-align: center;
}
.next-btn {
  background: linear-gradient(135deg, #ffd700, #ffaa00);
  border: none;
  color: #1a1a2e;
  font-family: "Press Start 2P", monospace;
  font-size: 16px;
  font-weight: bold;
  padding: 16px 48px;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 0 20px rgba(255,215,0,0.3);
}
.next-btn:hover { transform: scale(1.05); box-shadow: 0 0 30px rgba(255,215,0,0.5); }
</style>

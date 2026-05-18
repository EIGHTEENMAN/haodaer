<template>
  <div class="achievement-card" :class="{ visible: show }">
    <div class="card-inner" ref="cardRef">
      <div class="card-header">
        🏆 学英语战绩
      </div>
      <div class="card-body">
        <div class="player-row">
          <div class="player-icon">👦</div>
          <div>
            <div class="player-name">{{ nickname }}</div>
            <div class="player-level">Lv.{{ level }}</div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ score.toLocaleString() }}</div>
            <div class="stat-label">得分</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ words }}</div>
            <div class="stat-label">单词</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ accuracy }}%</div>
            <div class="stat-label">正确率</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ combo }}🔥</div>
            <div class="stat-label">连击</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ monsters }}</div>
            <div class="stat-label">击杀</div>
          </div>
        </div>
        <div class="card-footer">
          {{ shareUrl }}
        </div>
      </div>
    </div>
    <button v-if="showShare" class="share-btn" @click="onShare">📤 分享战绩</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { generateShareUrl, shareToSystem } from "../utils/achievement"
import { player } from "../stores/playerStore"

const props = withDefaults(defineProps<{
  show?: boolean
  showShare?: boolean
  nickname?: string
  level?: number
  score?: number
  words?: number
  accuracy?: number
  combo?: number
  monsters?: number
}>(), {
  show: true,
  showShare: false,
  nickname: "小勇士",
  level: 1,
  score: 0,
  words: 0,
  accuracy: 100,
  combo: 0,
  monsters: 0,
})

const emit = defineEmits<{ shared: [] }>()

const shareUrl = generateShareUrl({
  player: { nickname: props.nickname, level: props.level },
  session: {
    score: props.score,
    duration: 0,
    monstersKilled: props.monsters,
    wordsLearned: props.words,
    correctCount: 0,
    wrongCount: 0,
    maxCombo: props.combo,
    accuracy: props.accuracy,
  },
  total: {
    wordsLearned: 0,
    wordsMastered: 0,
    totalScore: 0,
    studyDays: 0,
  },
  timestamp: Date.now(),
})

async function onShare() {
  const summary = {
    player: { nickname: props.nickname, level: props.level },
    session: {
      score: props.score,
      duration: 0,
      monstersKilled: props.monsters,
      wordsLearned: props.words,
      correctCount: 0,
      wrongCount: 0,
      maxCombo: props.combo,
      accuracy: props.accuracy,
    },
    total: { wordsLearned: 0, wordsMastered: 0, totalScore: 0, studyDays: 0 },
    timestamp: Date.now(),
  }
  const ok = await shareToSystem(summary)
  if (ok) {
    emit("shared")
  }
}
</script>

<style scoped>
.achievement-card {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 1100;
  background: rgba(0,0,0,0.85);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.achievement-card.visible {
  opacity: 1;
  pointer-events: auto;
}
.card-inner {
  background: #1a1a2e;
  border: 3px solid #ffd700;
  padding: 24px;
  min-width: 280px;
  max-width: 360px;
  text-align: center;
}
.card-header {
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 16px;
  font-family: 'Press Start 2P', monospace;
}
.card-body { color: #fff; }
.player-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}
.player-icon { font-size: 48px; }
.player-name { color: #ffd700; font-size: 14px; font-family: 'Press Start 2P', monospace; }
.player-level { color: #88ccff; font-size: 12px; margin-top: 4px; font-family: 'Press Start 2P', monospace; }
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.stat-item { text-align: center; }
.stat-value { color: #ffd700; font-size: 20px; font-weight: bold; font-family: 'Press Start 2P', monospace; }
.stat-label { color: #888; font-size: 9px; margin-top: 2px; font-family: 'Press Start 2P', monospace; }
.card-footer {
  color: #555;
  font-size: 9px;
  word-break: break-all;
  font-family: 'Press Start 2P', monospace;
}
.share-btn {
  padding: 12px 32px;
  background: #d4a017;
  border: 3px solid #ffd700;
  color: #000;
  font-size: 14px;
  cursor: pointer;
  font-family: 'Press Start 2P', monospace;
  font-weight: bold;
}
.share-btn:hover { filter: brightness(1.1); }
</style>

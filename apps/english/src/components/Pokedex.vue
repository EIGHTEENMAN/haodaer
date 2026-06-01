<template>
  <div class="pokedex-overlay">
    <div class="pokedex-panel" v-if="!selectedWord">
      <div class="pokedex-header">
        <h2>📖 WORDDEX</h2>
        <p class="pokedex-sub">{{ capturedCount }} / {{ totalCount }} CAPTURED</p>
      </div>

      <div class="search-bar">
        <input v-model="search" placeholder="Search word..." />
      </div>

      <div class="monster-grid">
        <div
          v-for="entry in filteredEntries"
          :key="entry.wordId"
          class="monster-card"
          :class="{ captured: entry.captured }"
          @click="entry.captured && showDetail(entry)"
        >
          <div class="monster-icon">{{ entry.captured ? getMonsterEmoji(entry) : '❓' }}</div>
          <div class="monster-info">
            <div class="monster-word">{{ entry.captured ? entry.word : '???' }}</div>
            <div class="monster-meaning" v-if="entry.captured">{{ entry.meaning }}</div>
            <div class="monster-stars" v-if="entry.captured && entry.evolutionStage > 0">
              {{ '⭐'.repeat(entry.evolutionStage + 1) }}
            </div>
          </div>
          <div class="monster-status" v-if="entry.captured">✓</div>
        </div>
      </div>

      <div v-if="filteredEntries.length === 0" class="empty-state">
        <p>No monsters found...</p>
      </div>

      <div class="pokedex-footer">
        <span class="close-btn" @click="$emit('back')">← BACK</span>
      </div>
    </div>

    <!-- Detail view -->
    <div class="detail-panel" v-if="selectedWord">
      <div class="detail-close" @click="selectedWord = null">✕</div>

      <div class="detail-creature">
        <div class="detail-emoji">{{ monsterEmoji }}</div>
      </div>

      <div class="detail-word">{{ selectedWord.word.toUpperCase() }}</div>
      <div class="detail-meaning">{{ selectedWord.meaning }}</div>
      <div class="detail-phonetic" v-if="selectedWord.phonetic">
        {{ selectedWord.phonetic }}
        <span class="speaker-btn" @click.stop="playAudio">🔊</span>
      </div>

      <div class="detail-stars">
        {{ '⭐'.repeat(selectedWord.evolutionStage + 1) }}
        <span class="evo-label">
          {{ ['BASE', 'EVOLVED', 'ULTIMATE'][Math.min(selectedWord.evolutionStage, 2)] }}
        </span>
      </div>

      <div class="detail-stats">
        <div class="stat">
          <span class="stat-label">FOCUS 正确</span>
          <span class="stat-value">{{ selectedWord.focusCorrect }} / 15</span>
        </div>
        <div class="stat">
          <span class="stat-label">战斗次数</span>
          <span class="stat-value">{{ selectedWord.totalBattles }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">捕获时间</span>
          <span class="stat-value">{{ formatDate(selectedWord.capturedAt) }}</span>
        </div>
      </div>

      <div class="detail-sentence" v-if="wordInfo">
        <p class="sentence-en">{{ wordInfo.sentence }}</p>
        <p class="sentence-cn">{{ wordInfo.sentenceCn }}</p>
      </div>

      <div class="pokedex-footer">
        <span class="close-btn" @click="selectedWord = null">← BACK</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { pokedexStore } from "../stores/pokedexStore"
import type { MonsterEntry } from "../stores/pokedexStore"
import { words as allWords } from "../data/words"
import { playWordAudio } from "../utils/audio"

const emit = defineEmits<{ back: [] }>()
const search = ref("")
const selectedWord = ref<(MonsterEntry & { phonetic?: string }) | null>(null)

const entries = computed(() => Array.from(pokedexStore.entries.values()))

const capturedCount = computed(() => entries.value.filter(e => e.captured).length)
const totalCount = computed(() => entries.value.length)

const filteredEntries = computed(() => {
  let list = entries.value
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(e => e.word.toLowerCase().includes(q) || e.meaning.includes(q))
  }
  return list.sort((a, b) => {
    if (a.captured !== b.captured) return a.captured ? -1 : 1
    return a.wordId - b.wordId
  })
})

const wordInfo = computed(() => {
  if (!selectedWord.value) return null
  return allWords.find(w => w.id === selectedWord.value!.wordId) || null
})

const monsterEmoji = computed(() => {
  if (!selectedWord.value) return '🔵'
  const emojis = ['🔵', '🟣', '🔴']
  return emojis[Math.min(selectedWord.value.evolutionStage, 2)]
})

function getMonsterEmoji(entry: MonsterEntry): string {
  const emojis = ['🔵', '🟣', '🔴']
  return emojis[Math.min(entry.evolutionStage, 2)]
}

function showDetail(entry: MonsterEntry) {
  // Find phonetic from words data
  const word = allWords.find(w => w.id === entry.wordId)
  selectedWord.value = { ...entry, phonetic: word?.phonetic || '' }
}

function playAudio() {
  if (selectedWord.value) {
    playWordAudio(selectedWord.value.word)
  }
}

function formatDate(ts: number): string {
  if (!ts) return '--'
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<style scoped>
.pokedex-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 800;
  font-family: 'Press Start 2P', monospace;
  pointer-events: auto;
}
.pokedex-panel {
  background: #1a1a2e;
  border: 3px solid #ffd700;
  width: 700px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 20px;
}
.detail-panel {
  background: #1a1a2e;
  border: 3px solid #ffd700;
  width: 500px;
  padding: 30px;
  text-align: center;
  position: relative;
}
.detail-close {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 18px;
  color: #888;
  cursor: pointer;
}
.detail-close:hover { color: #fff; }
.detail-creature {
  margin-bottom: 12px;
}
.detail-emoji {
  font-size: 64px;
  line-height: 1;
}
.detail-word {
  font-size: 20px;
  color: #ffd700;
  margin-bottom: 4px;
  letter-spacing: 2px;
}
.detail-meaning {
  font-size: 14px;
  color: #ccc;
  margin-bottom: 4px;
}
.detail-phonetic {
  font-size: 11px;
  color: #888;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.speaker-btn {
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.1s;
}
.speaker-btn:hover {
  transform: scale(1.3);
}
.detail-stars {
  font-size: 14px;
  margin-bottom: 16px;
}
.evo-label {
  font-size: 9px;
  color: #88ccff;
  display: block;
  margin-top: 4px;
}
.detail-stats {
  background: rgba(255,255,255,0.04);
  padding: 12px;
  margin-bottom: 12px;
}
.stat {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 10px;
}
.stat-label { color: #888; }
.stat-value { color: #ffd700; }
.detail-sentence {
  background: rgba(255,255,255,0.03);
  padding: 12px;
  margin-bottom: 16px;
}
.sentence-en {
  font-size: 11px;
  color: #aaddff;
  margin-bottom: 4px;
}
.sentence-cn {
  font-size: 10px;
  color: #888;
}
.pokedex-header {
  text-align: center;
  margin-bottom: 12px;
}
.pokedex-header h2 {
  color: #ffd700;
  font-size: 16px;
  margin-bottom: 4px;
}
.pokedex-sub {
  color: #88ccff;
  font-size: 10px;
}
.search-bar {
  margin-bottom: 12px;
}
.search-bar input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255,255,255,0.08);
  border: 2px solid rgba(255,255,255,0.2);
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 10px;
  outline: none;
}
.search-bar input:focus { border-color: #ffd700; }
.monster-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.monster-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  position: relative;
}
.monster-card.captured {
  border-color: rgba(255,215,0,0.3);
  cursor: pointer;
}
.monster-card.captured:hover {
  background: rgba(255,215,0,0.08);
  border-color: rgba(255,215,0,0.6);
}
.monster-icon {
  font-size: 24px;
  width: 36px;
  text-align: center;
}
.monster-info {
  flex: 1;
  min-width: 0;
}
.monster-word {
  color: #fff;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.monster-meaning {
  color: #aaa;
  font-size: 9px;
  margin-top: 2px;
}
.monster-stars {
  font-size: 8px;
  margin-top: 2px;
}
.monster-status {
  color: #44cc44;
  font-size: 14px;
}
.empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 11px;
}
.pokedex-footer {
  margin-top: 12px;
  text-align: center;
}
.close-btn {
  color: #88ccff;
  font-size: 12px;
  cursor: pointer;
}
.close-btn:hover { color: #aaddff; }
</style>

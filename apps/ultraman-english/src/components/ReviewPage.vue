<template>
  <div class="review-page">
    <div class="review-header">
      <h2>单词复习</h2>
      <button class="close-btn" @click="$emit('back')">✕</button>
    </div>

    <div class="review-stats">
      <span>已学 {{ stats.total }} 词</span>
      <span>掌握 {{ stats.mastered }} 词</span>
      <span>正确率 {{ stats.accuracy }}%</span>
    </div>

    <div class="review-filters">
      <select v-model="filterDifficulty">
        <option value="0">全部难度</option>
        <option v-for="d in 10" :key="d" :value="d">难度 {{ d }}</option>
      </select>
      <select v-model="filterMastery">
        <option value="all">全部状态</option>
        <option value="mastered">已掌握</option>
        <option value="learning">学习中</option>
        <option value="new">未学过</option>
      </select>
      <input v-model="searchQuery" placeholder="搜索单词..." class="search-input" />
    </div>

    <div class="word-grid">
      <div v-for="rec in filteredWords" :key="rec.wordId"
        class="word-card"
        :class="{ mastered: rec.mastered }"
        @click="showDetail(rec)"
      >
        <div class="word-text">{{ rec.word }}</div>
        <div class="word-meaning">{{ rec.meaning }}</div>
        <div class="word-progress">
          <div class="progress-dots">
            <span v-for="i in 5" :key="i" class="dot"
              :class="{ filled: i <= Math.ceil((rec.correct / Math.max(rec.total, 1)) * 5) }">
            </span>
          </div>
          <span class="ratio">{{ rec.correct }}/{{ rec.total }}</span>
        </div>
      </div>
    </div>

    <div v-if="!filteredWords.length" class="empty">没有匹配的单词</div>

    <!-- Detail modal -->
    <div v-if="detail" class="detail-overlay" @click="detail = null">
      <div class="detail-box" @click.stop>
        <div class="detail-word">{{ detail.word }}</div>
        <div class="detail-meaning">{{ detail.meaning }}</div>
        <div class="detail-stats">
          <p>答对: {{ detail.correct }} / 总: {{ detail.total }}</p>
          <p>掌握度: {{ detail.total > 0 ? Math.round(detail.correct / detail.total * 100) : 0 }}%</p>
        </div>
        <button class="close-btn" @click="detail = null">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { wordStore, getMasteredCount, getAccuracy } from "../stores/wordStore"

defineEmits<{ back: [] }>()

const filterDifficulty = ref("0")
const filterMastery = ref("all")
const searchQuery = ref("")
const detail = ref<any>(null)

const stats = computed(() => ({
  total: wordStore.records.size,
  mastered: getMasteredCount(),
  accuracy: getAccuracy(),
}))

const filteredWords = computed(() => {
  let list = Array.from(wordStore.records.values())
  if (filterDifficulty.value !== "0") {
    // Filter words by difficulty would need access to words data
  }
  if (filterMastery.value === "mastered") {
    list = list.filter(w => w.mastered)
  } else if (filterMastery.value === "learning") {
    list = list.filter(w => !w.mastered && w.total > 0)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(w => w.word.toLowerCase().includes(q) || w.meaning.includes(q))
  }
  return list.sort((a, b) => a.correct / Math.max(a.total, 1) - b.correct / Math.max(b.total, 1))
})

function showDetail(rec: any) {
  detail.value = rec
}
</script>

<style scoped>
.review-page {
  position: fixed;
  inset: 0;
  background: #1a1a2e;
  z-index: 800;
  display: flex;
  flex-direction: column;
  padding: 20px;
  color: #fff;
}
.review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.review-header h2 { color: #ffd700; font-size: 24px; }
.close-btn {
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  
  color: #fff;
  cursor: pointer;
  font-size: 16px;
}
.review-stats { display: flex; gap: 20px; margin-bottom: 16px; color: #88ccff; font-size: 14px; }
.review-filters { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.review-filters select, .search-input {
  padding: 8px 12px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.2);
  
  color: #fff;
  font-size: 13px;
  font-family: 'Press Start 2P', monospace;
}
.search-input { flex: 1; min-width: 150px; }
.word-grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.word-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.word-card:hover { border-color: #ffd700; }
.word-card.mastered { border-color: #44cc44; }
.word-text { color: #ffd700; font-size: 16px; font-weight: bold; }
.word-meaning { color: #aaa; font-size: 12px; margin-top: 4px; }
.word-progress { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.progress-dots { display: flex; gap: 3px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.1); }
.dot.filled { background: #44cc44; }
.ratio { color: #666; font-size: 11px; }
.empty { flex: 1; display: flex; align-items: center; justify-content: center; color: #666; }

.detail-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 900;
}
.detail-box {
  background: #2a1a4e; border: 2px solid #ffd700; 
  padding: 32px; text-align: center; min-width: 250px;
}
.detail-word { font-size: 28px; color: #ffd700; font-weight: bold; }
.detail-meaning { color: #aaa; font-size: 14px; margin: 8px 0; }
.detail-stats { color: #ccc; font-size: 14px; margin: 16px 0; }
</style>

<template>
  <div class="emoji-match">
    <div class="emoji-display" :class="{ bounce: showResult }">{{ displayEmoji }}</div>
    <div class="hint">选对应的英文单词</div>
    <div class="options">
      <button v-for="(opt, i) in shuffledOptions" :key="i"
        class="option-btn" :class="{ correct: showResult && opt.word === word, wrong: selected === i && opt.word !== word }"
        :disabled="showResult" @click="select(i)">
        {{ opt.word }}
        <span class="key-hint">[{{ i + 1 }}]</span>
      </button>
    </div>
    <div v-if="showResult" class="result-hint" :class="wasCorrect ? 'correct' : 'wrong'">
      {{ wasCorrect ? '✅ 正确!' : '❌ 答案是: ' + word }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { words } from "../data/words"

const props = defineProps<{ word: string; meaning: string }>()
const emit = defineEmits<{ correct: []; wrong: [] }>()

const wordEntry = computed(() => words.find(w => w.word === props.word))
const displayEmoji = computed(() => (wordEntry.value as any)?.emoji || "📖")
interface OptionItem { word: string; meaning: string }
const shuffledOptions = ref<OptionItem[]>([])
const selected = ref(-1)
const showResult = ref(false)
const wasCorrect = ref(false)

onMounted(() => {
  const wrong = words
    .filter(w => w.word !== props.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => ({ word: w.word, meaning: w.meaning }))
  shuffledOptions.value = [{ word: props.word, meaning: props.meaning }, ...wrong].sort(() => Math.random() - 0.5)
  window.addEventListener("keydown", onKey)
})
onUnmounted(() => { window.removeEventListener("keydown", onKey) })

function onKey(e: KeyboardEvent) {
  const idx = parseInt(e.key) - 1
  if (idx >= 0 && idx < shuffledOptions.value.length && !showResult.value) {
    select(idx)
  }
}

function select(i: number) {
  if (showResult.value) return
  showResult.value = true
  selected.value = i
  wasCorrect.value = shuffledOptions.value[i].word === props.word
  if (wasCorrect.value) setTimeout(() => emit("correct"), 500)
  else setTimeout(() => emit("wrong"), 1500)
}
</script>

<style scoped>
.emoji-match { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.emoji-display { font-size: 72px; line-height: 1; margin-bottom: 4px; transition: transform 0.15s; }
.emoji-display.bounce { animation: emojiBounce 0.3s; }
@keyframes emojiBounce { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
.hint { color: #aaa; font-size: 12px; font-family: "Press Start 2P", monospace; }
.options { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.option-btn {
  padding: 14px 24px;
  background: rgba(255,255,255,0.08);
  border: 3px solid rgba(255,255,255,0.2);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: "Press Start 2P", monospace;
}
.option-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); border-color: #ffd700; }
.option-btn.correct { background: rgba(68,204,68,0.3); border-color: #44cc44; }
.option-btn.wrong { background: rgba(204,68,68,0.3); border-color: #cc4444; }
.option-btn:disabled { cursor: default; }
.key-hint { color: #666; font-size: 10px; margin-left: 6px; }
.result-hint { padding: 8px 16px; font-size: 14px; font-weight: bold; animation: fadeIn 0.3s; font-family: "Press Start 2P", monospace; }
.result-hint.correct { color: #44cc44; }
.result-hint.wrong { color: #cc4444; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

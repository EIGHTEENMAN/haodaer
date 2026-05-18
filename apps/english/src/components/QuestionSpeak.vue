<template>
  <div class="speed-match">
    <div v-if="flashPhase" class="flash-word">{{ word }}</div>
    <div v-else-if="!answered" class="timer-section">
      <div class="timer-bar"><div class="timer-fill" :style="{ width: timerPct + '%' }"></div></div>
      <div class="timer-text">{{ Math.ceil(timeLeft / 1000) }}</div>
      <div class="hint">选你刚才看到的词</div>
      <div class="options">
        <button v-for="(opt, i) in options" :key="i"
          class="option-btn" :class="{ correct: answered && opt.word === word, wrong: selected === i && opt.word !== word }"
          :disabled="answered" @click="select(i)">
          {{ opt.word }}
          <span class="key-hint">[{{ i + 1 }}]</span>
        </button>
      </div>
    </div>
    <div v-if="answered" class="result-text" :class="wasCorrect ? 'correct' : 'wrong'">
      {{ wasCorrect ? '✅ 正确!' : '❌ 答案是: ' + word }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onBeforeUnmount } from "vue"
import { words } from "../data/words"

const props = defineProps<{ word: string }>()
const emit = defineEmits<{ correct: []; wrong: [] }>()

const flashPhase = ref(true)
const answered = ref(false)
const wasCorrect = ref(false)
const selected = ref(-1)
const timeLeft = ref(5000)
const timerPct = ref(100)
const options = ref<{ word: string }[]>([])
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  const wrong = words.filter(w => w.word !== props.word).sort(() => Math.random() - 0.5).slice(0, 3)
  options.value = [{ word: props.word }, ...wrong.map(w => ({ word: w.word }))].sort(() => Math.random() - 0.5)
  window.addEventListener("keydown", onKey)
  // Flash word for 600ms then show options
  setTimeout(() => {
    flashPhase.value = false
    startTimer()
  }, 600)
})
onUnmounted(() => { window.removeEventListener("keydown", onKey) })

function startTimer() {
  timeLeft.value = 5000
  timer = setInterval(() => {
    timeLeft.value -= 100
    timerPct.value = (timeLeft.value / 5000) * 100
    if (timeLeft.value <= 0) {
      if (timer) clearInterval(timer)
      if (!answered.value) autoWrong()
    }
  }, 100)
}

function autoWrong() {
  answered.value = true
  wasCorrect.value = false
  setTimeout(() => emit("wrong"), 500)
}

function onKey(e: KeyboardEvent) {
  if (flashPhase.value || answered.value) return
  const idx = parseInt(e.key) - 1
  if (idx >= 0 && idx < options.value.length) {
    select(idx)
  }
}

function select(i: number) {
  if (answered.value || flashPhase.value) return
  if (timer) clearInterval(timer)
  answered.value = true
  selected.value = i
  wasCorrect.value = options.value[i].word === props.word
  if (wasCorrect.value) setTimeout(() => emit("correct"), 500)
  else setTimeout(() => emit("wrong"), 500)
}
</script>

<style scoped>
.speed-match { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.flash-word { font-size: 48px; color: #ffd700; font-weight: bold; letter-spacing: 4px; animation: flashIn 0.3s; font-family: "Press Start 2P", monospace; }
@keyframes flashIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.timer-section { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.timer-bar { width: 200px; height: 8px; background: #333; border: 2px solid #555; }
.timer-fill { height: 100%; background: #ff4444; transition: width 0.1s linear; }
.timer-text { color: #ff4444; font-size: 20px; font-weight: bold; font-family: "Press Start 2P", monospace; }
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
.option-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); border-color: #ff6644; }
.option-btn.correct { background: rgba(68,204,68,0.3); border-color: #44cc44; }
.option-btn.wrong { background: rgba(204,68,68,0.3); border-color: #cc4444; }
.option-btn:disabled { cursor: default; }
.key-hint { color: #666; font-size: 10px; margin-left: 6px; }
.result-text { font-size: 14px; font-weight: bold; font-family: "Press Start 2P", monospace; animation: fadeIn 0.3s; }
.result-text.correct { color: #44cc44; }
.result-text.wrong { color: #cc4444; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

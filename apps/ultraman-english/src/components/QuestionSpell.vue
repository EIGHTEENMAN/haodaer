<template>
  <div class="letter-sort">
    <div class="emoji-hint">{{ displayEmoji }}</div>
    <div class="built-word">
      <span v-for="(ch, i) in builtLetters" :key="'b' + i"
        class="built-char" @click="removeLetter(i)">{{ ch }}</span>
      <span v-if="builtLetters.length === 0" class="empty-hint">点击或按字母键拼出单词</span>
    </div>
    <div class="scrambled-letters">
      <button v-for="(ch, i) in shuffledLetters" :key="'s' + i"
        class="letter-btn" @click="addLetter(i)" :disabled="ch === null">{{ ch }}</button>
    </div>
    <button class="submit-btn" @click="submit" :disabled="builtLetters.length !== props.word.length || answered">
      确认 [Enter]
    </button>
    <div v-if="showResult" class="result-text" :class="isCorrect ? 'correct' : 'wrong'">
      {{ isCorrect ? '✅ 正确!' : '❌ 正确拼写: ' + props.word }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { words } from "../data/words"

const props = defineProps<{ word: string }>()
const emit = defineEmits<{ correct: []; wrong: [] }>()

const wordEntry = computed(() => words.find(w => w.word === props.word))
const displayEmoji = computed(() => (wordEntry.value as any)?.emoji || "📖")

const shuffledLetters = ref<(string | null)[]>([])
const builtLetters = ref<string[]>([])
const answered = ref(false)
const showResult = ref(false)
const isCorrect = ref(false)

onMounted(() => {
  const letters = props.word.toLowerCase().split("").sort(() => Math.random() - 0.5)
  shuffledLetters.value = letters
  builtLetters.value = []
  window.addEventListener("keydown", onKey)
})
onUnmounted(() => { window.removeEventListener("keydown", onKey) })

function onKey(e: KeyboardEvent) {
  if (answered.value) return
  if (e.key === "Enter" || e.key === "Return") {
    submit()
    return
  }
  if (e.key === "Backspace") {
    removeLetter(builtLetters.value.length - 1)
    return
  }
  // Letter key — find first matching available letter
  const key = e.key.toLowerCase()
  if (key.length === 1 && key >= "a" && key <= "z") {
    const idx = shuffledLetters.value.findIndex(ch => ch === key)
    if (idx >= 0) {
      addLetter(idx)
    }
  }
}

function addLetter(i: number) {
  if (answered.value) return
  const ch = shuffledLetters.value[i]
  if (ch === null) return
  builtLetters.value.push(ch)
  shuffledLetters.value[i] = null
}

function removeLetter(i: number) {
  if (answered.value || builtLetters.value.length === 0 || i < 0) return
  const ch = builtLetters.value[i]
  builtLetters.value.splice(i, 1)
  const nullIdx = shuffledLetters.value.indexOf(null)
  if (nullIdx >= 0) {
    shuffledLetters.value[nullIdx] = ch
  }
}

function submit() {
  if (answered.value || builtLetters.value.length !== props.word.length) return
  answered.value = true
  isCorrect.value = builtLetters.value.join("") === props.word.toLowerCase()
  showResult.value = true
  if (isCorrect.value) setTimeout(() => emit("correct"), 600)
  else setTimeout(() => emit("wrong"), 1000)
}
</script>

<style scoped>
.letter-sort { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.emoji-hint { font-size: 48px; line-height: 1; }
.built-word {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  min-width: 200px;
  border: 2px dashed rgba(255,215,0,0.3);
  padding: 8px 12px;
  background: rgba(255,215,0,0.05);
}
.built-char {
  font-size: 28px;
  color: #ffd700;
  font-weight: bold;
  cursor: pointer;
  padding: 4px 6px;
  background: rgba(255,215,0,0.1);
  border: 2px solid rgba(255,215,0,0.3);
  font-family: "Press Start 2P", monospace;
  transition: all 0.1s;
}
.built-char:hover { background: rgba(255,215,0,0.2); border-color: #ffd700; }
.empty-hint { color: #666; font-size: 12px; font-family: "Press Start 2P", monospace; }
.scrambled-letters { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 280px; }
.letter-btn {
  width: 40px;
  height: 40px;
  font-size: 18px;
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.25);
  color: #fff;
  cursor: pointer;
  font-family: "Press Start 2P", monospace;
  transition: all 0.1s;
}
.letter-btn:hover:not(:disabled) { background: rgba(255,255,255,0.2); border-color: #ffd700; }
.letter-btn:disabled { opacity: 0.2; cursor: default; }
.submit-btn {
  padding: 10px 32px;
  background: rgba(170,68,255,0.2);
  border: 3px solid #aa44ff;
  color: #cc88ff;
  font-size: 14px;
  cursor: pointer;
  font-family: "Press Start 2P", monospace;
}
.submit-btn:disabled { opacity: 0.4; cursor: default; }
.submit-btn:hover:not(:disabled) { background: rgba(170,68,255,0.3); }
.result-text {
  font-size: 14px;
  font-weight: bold;
  font-family: "Press Start 2P", monospace;
  animation: fadeIn 0.3s;
}
.result-text.correct { color: #44cc44; }
.result-text.wrong { color: #cc4444; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

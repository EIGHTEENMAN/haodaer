<template>
  <div class="hear-pick">
    <button class="play-btn" @click="playAudio" :disabled="isPlaying || answered">
      {{ isPlaying ? '🔊 ...' : answered ? (wasCorrect ? '✅' : '❌') : '🔊 点击听发音' }}
    </button>
    <div class="play-count">播放 {{ playCount }}/2 次<span class="kb-hint"> [Space]</span></div>
    <div class="options">
      <button
        v-for="(opt, i) in options"
        :key="i"
        class="option-btn"
        :class="{
          correct: answered && opt.word === word,
          wrong: selected === i && opt.word !== word,
        }"
        :disabled="answered || isPlaying"
        @click="select(i)"
      >
        {{ opt.word }}
        <span class="key-hint">[{{ i + 1 }}]</span>
      </button>
    </div>
    <div v-if="answered && !wasCorrect" class="retry-hint" @click="retry">
      🔊 再听一次 (慢速) [R]
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { words } from "../data/words"
import { playWordAudio } from "../utils/audio"

const props = defineProps<{ word: string }>()
const emit = defineEmits<{ correct: []; wrong: [] }>()

interface OptionItem { word: string; meaning: string }
const options = ref<OptionItem[]>([])
const selected = ref(-1)
const answered = ref(false)
const wasCorrect = ref(false)
const isPlaying = ref(false)
const playCount = ref(0)

onMounted(() => {
  const wrong = words
    .filter(w => w.word !== props.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => ({ word: w.word, meaning: w.meaning }))
  options.value = [{ word: props.word, meaning: "" }, ...wrong].sort(() => Math.random() - 0.5)
  window.addEventListener("keydown", onKey)
  setTimeout(() => playAudio(), 500)
})
onUnmounted(() => { window.removeEventListener("keydown", onKey) })

function onKey(e: KeyboardEvent) {
  if (e.key === " " || e.key === "Space") {
    e.preventDefault()
    if (!answered) playAudio()
  }
  if (e.key === "r" || e.key === "R") {
    if (answered && !wasCorrect) retry()
  }
  const idx = parseInt(e.key) - 1
  if (idx >= 0 && idx < options.value.length && !answered && !isPlaying) {
    select(idx)
  }
}

function playAudio() {
  if (isPlaying.value || answered.value) return
  isPlaying.value = true
  playCount.value++
  playWordAudio(props.word, () => { isPlaying.value = false })
}

function select(i: number) {
  if (answered.value || isPlaying.value) return
  answered.value = true
  selected.value = i
  wasCorrect.value = options.value[i].word === props.word
  if (wasCorrect.value) setTimeout(() => emit("correct"), 500)
  else setTimeout(() => emit("wrong"), 1500)
}

function retry() {
  answered.value = false
  selected.value = -1
  wasCorrect.value = false
  playCount.value = 0
  setTimeout(() => playAudio(), 300)
}
</script>

<style scoped>
.hear-pick { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.play-btn {
  padding: 16px 40px;
  background: rgba(68,136,255,0.2);
  border: 3px solid #4488ff;
  color: #88bbff;
  font-size: 18px;
  cursor: pointer;
  font-family: "Press Start 2P", monospace;
  transition: all 0.15s;
}
.play-btn:hover:not(:disabled) { background: rgba(68,136,255,0.3); }
.play-btn:disabled { opacity: 0.6; }
.play-count { color: #666; font-size: 10px; font-family: "Press Start 2P", monospace; }
.kb-hint { color: #444; font-size: 9px; }
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
.option-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); border-color: #4488ff; }
.option-btn.correct { background: rgba(68,204,68,0.3); border-color: #44cc44; }
.option-btn.wrong { background: rgba(204,68,68,0.3); border-color: #cc4444; }
.option-btn:disabled { cursor: default; }
.key-hint { color: #666; font-size: 10px; margin-left: 6px; }
.retry-hint {
  color: #88bbff;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  font-family: "Press Start 2P", monospace;
  animation: fadeIn 0.3s;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>

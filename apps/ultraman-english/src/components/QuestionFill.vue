<template>
  <div class="sentence-pro">
    <div class="sentence">
      <span v-for="(part, i) in sentenceParts" :key="i">
        <span v-if="part.type === 'text'">{{ part.value }}</span>
        <span v-else-if="part.type === 'blank'" class="blank">?</span>
        <span v-else-if="part.type === 'emoji'" class="sentence-emoji">{{ part.value }}</span>
      </span>
    </div>
    <div class="sentence-hint">{{ sentenceCn }}</div>
    <div class="options">
      <button v-for="(opt, i) in options" :key="i"
        class="option-btn" :class="{
          correct: answered && opt.word === correctAnswer,
          wrong: selected === i && opt.word !== correctAnswer
        }"
        :disabled="answered" @click="select(i)">
        {{ opt.word }}
        <span class="key-hint">[{{ i + 1 }}]</span>
      </button>
    </div>
    <div v-if="answered" class="full-sentence">
      <div class="full-text">{{ sentence }}</div>
      <div class="emoji-row">{{ displayEmoji }} {{ correctAnswer }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue"
import { words } from "../data/words"

const props = defineProps<{ word: string; sentence: string; sentenceCn: string }>()
const emit = defineEmits<{ correct: []; wrong: [] }>()

const wordEntry = computed(() => words.find(w => w.word === props.word))
const displayEmoji = computed(() => (wordEntry.value as any)?.emoji || "📖")
const correctAnswer = computed(() => props.word)

const answered = ref(false)
const selected = ref(-1)
const wasCorrect = ref(false)
const options = ref<{ word: string }[]>([])

interface SentencePart { type: "text" | "blank" | "emoji"; value: string }
const sentenceParts = computed<SentencePart[]>(() => {
  const parts: SentencePart[] = []
  const s = props.sentence
  let remaining = s

  // Find the word in the sentence and split around it
  const idx = remaining.toLowerCase().indexOf(props.word.toLowerCase())
  if (idx >= 0) {
    const before = s.substring(0, idx)
    const after = s.substring(idx + props.word.length)
    parts.push({ type: "text", value: before })
    if (displayEmoji.value) {
      parts.push({ type: "emoji", value: displayEmoji.value })
    }
    parts.push({ type: "blank", value: "" })
    parts.push({ type: "text", value: after })
  } else {
    parts.push({ type: "text", value: s })
    parts.push({ type: "blank", value: "" })
  }
  return parts
})

onMounted(() => {
  const wrong = words.filter(w => w.word !== props.word).sort(() => Math.random() - 0.5).slice(0, 3)
  options.value = [{ word: props.word }, ...wrong.map(w => ({ word: w.word }))].sort(() => Math.random() - 0.5)
  window.addEventListener("keydown", onKey)
})
onUnmounted(() => { window.removeEventListener("keydown", onKey) })

function onKey(e: KeyboardEvent) {
  if (answered.value) return
  const idx = parseInt(e.key) - 1
  if (idx >= 0 && idx < options.value.length) {
    select(idx)
  }
}

function select(i: number) {
  if (answered.value) return
  answered.value = true
  selected.value = i
  wasCorrect.value = options.value[i].word === props.word
  if (wasCorrect.value) setTimeout(() => emit("correct"), 800)
  else setTimeout(() => emit("wrong"), 1000)
}
</script>

<style scoped>
.sentence-pro { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.sentence { font-size: 16px; color: #fff; line-height: 1.8; text-align: center; padding: 0 8px; font-family: "Press Start 2P", monospace; }
.blank { color: #ffd700; font-weight: bold; border-bottom: 3px solid #ffd700; padding: 0 6px; }
.sentence-emoji { font-size: 20px; vertical-align: middle; }
.sentence-hint { color: #888; font-size: 11px; font-family: "Press Start 2P", monospace; }
.options { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.option-btn {
  padding: 12px 20px;
  background: rgba(255,255,255,0.08);
  border: 3px solid rgba(255,255,255,0.2);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: "Press Start 2P", monospace;
}
.option-btn:hover:not(:disabled) { background: rgba(255,255,255,0.15); border-color: #ffd700; }
.option-btn.correct { background: rgba(68,204,68,0.3); border-color: #44cc44; }
.option-btn.wrong { background: rgba(204,68,68,0.3); border-color: #cc4444; }
.option-btn:disabled { cursor: default; }
.key-hint { color: #666; font-size: 10px; margin-left: 6px; }
.full-sentence { margin-top: 8px; text-align: center; animation: fadeIn 0.3s; }
.full-text { color: #88ccff; font-size: 13px; font-family: "Press Start 2P", monospace; }
.emoji-row { color: #ffd700; font-size: 14px; margin-top: 4px; font-family: "Press Start 2P", monospace; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>

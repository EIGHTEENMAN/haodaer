<template>
  <!-- Learning Mode: one word at a time -->
  <div v-if="!showSummary" class="word-preview">
    <div class="preview-title">LEARN THE WORDS</div>
    <div class="preview-sub">STAGE {{ worldIndex }}-{{ stageNumber }} · {{ currentIndex + 1 }} / {{ wordList.length }}</div>

    <div class="learn-card">
      <div class="learn-emoji">{{ currentWord.emoji || '📖' }}</div>
      <div class="learn-word">{{ currentWord.word }}</div>
      <div class="learn-meaning">{{ currentWord.meaning }}</div>
      <div v-if="validPhonetic" class="learn-phonetic">{{ currentWord.phonetic }}</div>

      <!-- Play Pronunciation -->
      <button class="play-btn" @click="playCurrent">🔊 PLAY</button>

      <!-- Spelling Input -->
      <div class="spell-section">
        <input
          ref="spellInputRef"
          v-model="spellInput"
          class="spell-input"
          :class="{ correct: spellResult === 'correct', wrong: spellResult === 'wrong' }"
          placeholder="Type the word..."
          @keyup.enter="checkSpelling"
          @input="spellResult = ''"
        />
        <button class="check-btn" @click="checkSpelling" :disabled="!spellInput.trim()">
          {{ spellResult === 'correct' ? '✓' : spellResult === 'wrong' ? '✗' : 'CHECK' }}
        </button>
      </div>
      <div v-if="spellResult === 'correct'" class="spell-feedback correct-feedback">
        ✓ Correct!
      </div>
      <div v-else-if="spellResult === 'wrong'" class="spell-feedback wrong-feedback">
        ✗ Try again: <strong>{{ currentWord.word }}</strong>
      </div>

      <!-- Recording with Speech Validation -->
      <div class="record-section">
        <button
          class="record-btn"
          :class="recordBtnClass"
          @click="doRecord"
          :disabled="recordState === 'passed'"
        >
          {{ recordBtnText }}
        </button>
        <button
          v-if="recordedBlob"
          class="play-recording-btn"
          @click="playRecording"
        >
          ▶ PLAY
        </button>
      </div>
      <div v-if="recordState === 'listening'" class="spell-feedback listening-feedback">
        🎤 Say the word...
      </div>
      <div v-else-if="recordState === 'passed'" class="spell-feedback correct-feedback">
        ✓ Pronunciation correct!
      </div>
      <div v-else-if="recordState === 'failed'" class="spell-feedback wrong-feedback">
        ✗ Not recognized. Try again!
      </div>
    </div>

    <div class="learn-nav">
      <div v-if="!canProgress" class="nav-hint">
        {{ !spellPassed ? '✎ Spell the word' : '🎤 Record pronunciation' }}
      </div>
      <button
        v-if="currentIndex < wordList.length - 1"
        class="nav-btn next-btn"
        :disabled="!canProgress"
        @click="goNext"
      >
        NEXT →
      </button>
      <button
        v-else
        class="nav-btn finish-btn"
        :disabled="!canProgress"
        @click="showSummary = true"
      >
        ✓ REVIEW ALL
      </button>
    </div>
  </div>

  <!-- Summary Mode: all words grid (current layout) -->
  <div v-else class="word-preview">
    <div class="preview-title">WORDS REVIEW</div>
    <div class="preview-sub">STAGE {{ worldIndex }}-{{ stageNumber }} · {{ wordList.length }} words</div>

    <div class="word-cards">
      <div
        v-for="(item, i) in wordList"
        :key="i"
        class="word-card"
      >
        <div class="card-emoji">{{ item.emoji || '📖' }}</div>
        <div class="card-word">{{ item.word }}</div>
        <div class="card-meaning">{{ item.meaning }}</div>
        <div v-if="isValidPhonetic(item.phonetic)" class="card-phonetic">{{ item.phonetic }}</div>
      </div>
    </div>

    <div class="start-section">
      <button class="start-btn" @click="startBattle">⚔ START BATTLE</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue"
import { gameStore, WordData } from "../stores/gameStore"
import { WORLDS } from "../data/stages"
import { words as allWords } from "../data/words"
import { playWordAudio } from "../utils/audio"
import { startListening, isSpeechSupported, stopListening } from "../utils/speech"

const emit = defineEmits<{ start: [] }>()

const currentIndex = ref(0)
const showSummary = ref(false)
const spellInput = ref("")
const spellResult = ref<'' | 'correct' | 'wrong'>("")
const spellInputRef = ref<HTMLInputElement | null>(null)

// Recording state
const isRecording = ref(false)
const recordedBlob = ref<Blob | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const recordedChunks = ref<Blob[]>([])

// Mandatory validation state
const spellPassed = ref(false)
const recordPassed = ref(false)
const recordState = ref<'idle' | 'listening' | 'passed' | 'failed'>('idle')
const speechSupported = isSpeechSupported()
let recordingIteration = 0

const world = computed(() => WORLDS.find(w => w.id === gameStore.currentWorld)!)
const stageConfig = computed(() => world.value.stages.find(s => s.stage === gameStore.currentStage)!)

const wordList = computed(() => {
  let pool = allWords.filter(w =>
    w.theme === world.value.theme && w.difficulty === stageConfig.value.wordDifficulty
  )
  if (pool.length === 0) {
    pool = allWords.filter(w => w.difficulty === stageConfig.value.wordDifficulty)
  }
  // Offset each stage's slice so consecutive stages don't repeat words
  let offset = 0
  for (const s of world.value.stages) {
    if (s.stage >= stageConfig.value.stage) break
    if (s.wordDifficulty === stageConfig.value.wordDifficulty) offset += s.monsterCount
  }
  offset = offset % pool.length
  const count = stageConfig.value.monsterCount
  const result: typeof pool = []
  for (let i = 0; i < count; i++) {
    result.push(pool[(offset + i) % pool.length])
  }
  return result
})

const currentWord = computed(() => wordList.value[currentIndex.value] || wordList.value[0])

const worldIndex = computed(() => WORLDS.findIndex(w => w.id === gameStore.currentWorld) + 1)
const stageNumber = computed(() => gameStore.currentStage)

// Only show phonetics if they look valid (have IPA symbols or are long enough)
function isValidPhonetic(p: string): boolean {
  if (!p || p.length < 6) return false
  // Contains stress marks or special IPA characters
  return /[ˈˌɑɛɪɔʊʌθðʃʒŋɡɒəɜː]/.test(p) || p.length > 8
}

const validPhonetic = computed(() => isValidPhonetic(currentWord.value.phonetic))

function checkSpelling() {
  const typed = spellInput.value.trim().toLowerCase()
  const correct = currentWord.value.word.toLowerCase()
  const correctBool = typed === correct
  spellResult.value = correctBool ? 'correct' : 'wrong'
  spellPassed.value = correctBool
  if (correctBool && spellInputRef.value) {
    spellInputRef.value.blur()
  }
}

function playCurrent() {
  playWordAudio(currentWord.value.word)
  if (spellResult.value !== 'correct') {
    // Reset spelling on replay so they can try again
    spellResult.value = ''
  }
}

const canProgress = computed(() =>
  spellPassed.value && (recordPassed.value || !speechSupported)
)

function goNext() {
  if (currentIndex.value < wordList.value.length - 1) {
    currentIndex.value++
    spellInput.value = ""
    spellResult.value = ""
    spellPassed.value = false
    recordPassed.value = false
    recordState.value = 'idle'
    recordedBlob.value = null
    recordedChunks.value = []
    nextTick(() => playCurrent())
  }
}

// --- Recording with Speech Validation ---

async function doRecord() {
  if (recordState.value === 'listening') {
    stopListening(true)
    return
  }

  if (speechSupported) {
    const iter = ++recordingIteration
    recordState.value = 'listening'
    const passed = await startListening(currentWord.value.word)
    if (iter !== recordingIteration) return // stale response from re-started session
    if (passed) {
      recordState.value = 'passed'
      recordPassed.value = true
      capturePlaybackClip()
    } else {
      recordState.value = 'failed'
      recordPassed.value = false
    }
  } else {
    // Fallback: pre-existing recording flow
    toggleRecording()
  }
}

async function capturePlaybackClip() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      recordedBlob.value = new Blob(chunks, { type: 'audio/webm' })
      stream.getTracks().forEach(t => t.stop())
    }
    recorder.start()
    setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop() }, 2000)
  } catch {}
}

async function toggleRecording() {
  if (isRecording.value) {
    stopRecording()
    return
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
    mediaRecorder.value = recorder
    recordedChunks.value = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.value.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(recordedChunks.value, { type: 'audio/webm' })
      recordedBlob.value = blob
      stream.getTracks().forEach(t => t.stop())
    }

    recorder.start()
    isRecording.value = true
  } catch {
    isRecording.value = false
  }
}

function stopRecording() {
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
  isRecording.value = false
}

const recordBtnText = computed(() => {
  switch (recordState.value) {
    case 'listening': return '⏹ STOP'
    case 'passed': return '✓ OK!'
    case 'failed': return '✗ RETRY'
    default: return speechSupported ? '🎤 SAY IT' : '🎤 RECORD'
  }
})

const recordBtnClass = computed(() => ({
  recording: recordState.value === 'listening',
  passed: recordState.value === 'passed',
  failed: recordState.value === 'failed',
}))

function playRecording() {
  if (!recordedBlob.value) return
  const url = URL.createObjectURL(recordedBlob.value)
  const audio = new Audio(url)
  audio.onended = () => URL.revokeObjectURL(url)
  audio.play().catch(() => {})
}

function startBattle() {
  emit('start')
}

onUnmounted(() => {
  stopListening()
  if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
    mediaRecorder.value.stop()
  }
})

onMounted(() => {
  nextTick(() => playCurrent())
})
</script>

<style scoped>
.word-preview {
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
.preview-title {
  font-size: 28px;
  color: #ffd700;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(255,215,0,0.4);
  margin-bottom: 4px;
}
.preview-sub {
  font-size: 12px;
  color: #88ccff;
  margin-bottom: 20px;
}

/* Learning Card */
.learn-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 40px;
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,215,0,0.3);
  max-width: 420px;
  width: 100%;
}
.learn-emoji {
  font-size: 72px;
  line-height: 1;
  margin-bottom: 4px;
}
.learn-word {
  font-size: 24px;
  color: #ffd700;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255,215,0,0.3);
}
.learn-meaning {
  font-size: 16px;
  color: #fff;
}
.learn-phonetic {
  font-size: 11px;
  color: #888;
}

/* Play Button */
.play-btn {
  background: rgba(68,136,255,0.2);
  border: 2px solid #4488ff;
  color: #88bbff;
  font-family: "Press Start 2P", monospace;
  font-size: 18px;
  padding: 10px 28px;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: 4px;
}
.play-btn:hover { background: rgba(68,136,255,0.35); }

/* Spelling Section */
.spell-section {
  display: flex;
  gap: 8px;
  width: 100%;
  margin-top: 4px;
}
.spell-input {
  flex: 1;
  padding: 10px 14px;
  background: rgba(0,0,0,0.3);
  border: 2px solid rgba(255,255,255,0.2);
  color: #fff;
  font-family: "Press Start 2P", monospace;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}
.spell-input:focus { border-color: #88ccff; }
.spell-input.correct { border-color: #44cc44; }
.spell-input.wrong { border-color: #ff4444; }
.check-btn {
  padding: 8px 16px;
  background: rgba(68,136,255,0.2);
  border: 2px solid #4488ff;
  color: #88bbff;
  font-family: "Press Start 2P", monospace;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.check-btn:hover:not(:disabled) { background: rgba(68,136,255,0.35); }
.check-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.spell-feedback {
  font-size: 11px;
  margin-top: 2px;
}
.correct-feedback { color: #44cc44; }
.wrong-feedback { color: #ff4444; }
.listening-feedback {
  color: #88ccff;
  animation: listening-pulse 0.6s infinite;
}
@keyframes listening-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Recording Section */
.record-section {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.record-btn {
  padding: 8px 20px;
  background: rgba(255,68,68,0.15);
  border: 2px solid #ff4444;
  color: #ff6666;
  font-family: "Press Start 2P", monospace;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.record-btn:hover:not(:disabled) { background: rgba(255,68,68,0.3); }
.record-btn:disabled { opacity: 0.5; cursor: default; }
.record-btn.recording {
  animation: record-pulse 0.8s infinite;
}
.record-btn.passed {
  border-color: #44cc44;
  color: #66cc66;
  background: rgba(68,204,68,0.15);
}
.record-btn.failed {
  animation: record-shake 0.4s;
}
@keyframes record-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,68,68,0.4); }
  50% { box-shadow: 0 0 12px 4px rgba(255,68,68,0.2); }
}
@keyframes record-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
.play-recording-btn {
  padding: 8px 16px;
  background: rgba(68,204,68,0.15);
  border: 2px solid #44cc44;
  color: #66cc66;
  font-family: "Press Start 2P", monospace;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.play-recording-btn:hover { background: rgba(68,204,68,0.3); }

/* Navigation */
.learn-nav {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.nav-hint {
  font-size: 9px;
  color: #ff8844;
  animation: hint-pulse 1s ease-in-out infinite;
}
@keyframes hint-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
.nav-btn {
  padding: 12px 32px;
  font-family: "Press Start 2P", monospace;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.nav-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}
.next-btn {
  background: rgba(255,215,0,0.15);
  border: 2px solid #ffd700;
  color: #ffd700;
}
.next-btn:hover:not(:disabled) { background: rgba(255,215,0,0.3); }
.finish-btn {
  background: rgba(68,204,68,0.15);
  border: 2px solid #44cc44;
  color: #44cc44;
}
.finish-btn:hover:not(:disabled) { background: rgba(68,204,68,0.3); }

/* Summary Grid */
.word-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 700px;
  margin-bottom: 20px;
}
.word-card {
  width: 150px;
  padding: 16px 12px;
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.1);
  text-align: center;
  position: relative;
}
.card-emoji { font-size: 40px; margin-bottom: 8px; }
.card-word { color: #ffd700; font-size: 14px; font-weight: bold; margin-bottom: 4px; }
.card-meaning { color: #fff; font-size: 12px; margin-bottom: 4px; }
.card-phonetic { color: #888; font-size: 9px; }

/* Start Battle */
.start-section {
  text-align: center;
}
.start-btn {
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
.start-btn:hover { transform: scale(1.05); box-shadow: 0 0 30px rgba(255,215,0,0.5); }
</style>

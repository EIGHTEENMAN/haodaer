<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { words } from '../../data/words'
import { wordStore } from '../../stores/wordStore'
import { studyStore } from '../../stores/studyStore'
import { playWordAudio, speakSentence } from '../../utils/audio'

const props = defineProps<{
  themeId: string
  stage: number
}>()

const STAGES = 6
const WORDS_PER_STAGE = 8

const themeWords = computed(() => words.filter(w => w.theme === props.themeId))

const sessionWords = computed(() => {
  const start = (props.stage - 1) * WORDS_PER_STAGE
  return themeWords.value.slice(start, start + WORDS_PER_STAGE)
})

const currentIndex = ref(0)
const spellInput = ref('')
const correctCount = ref(0)
const showResult = ref<'correct' | 'wrong' | null>(null)

const currentWord = computed(() => sessionWords.value[currentIndex.value])

const progress = computed(() => {
  if (sessionWords.value.length === 0) return 0
  return (currentIndex.value / sessionWords.value.length) * 100
})

const isComplete = computed(() => currentIndex.value >= sessionWords.value.length)

onMounted(() => {
  studyStore.startSession(
    props.themeId,
    themeWords.value[0]?.theme || props.themeId,
    props.stage,
    sessionWords.value.map(w => w.id)
  )
})

onUnmounted(() => {
  if (!isComplete.value) studyStore.cancelSession()
})

function playAudio() {
  if (currentWord.value) {
    playWordAudio(currentWord.value.word.toLowerCase())
  }
}

function playSentence() {
  if (currentWord.value) {
    speakSentence(currentWord.value.sentence)
  }
}

function checkSpell() {
  const input = spellInput.value.trim().toLowerCase()
  const target = currentWord.value.word.toLowerCase()
  if (input === target) {
    showResult.value = 'correct'
    wordStore.recordAnswer(currentWord.value.id, currentWord.value.word, currentWord.value.meaning, true)
    studyStore.recordAnswer(true)
    correctCount.value++
    setTimeout(() => next(), 700)
  } else {
    showResult.value = 'wrong'
    wordStore.recordAnswer(currentWord.value.id, currentWord.value.word, currentWord.value.meaning, false)
    studyStore.recordAnswer(false)
    setTimeout(() => {
      showResult.value = null
      spellInput.value = ''
    }, 1100)
  }
}

function next() {
  showResult.value = null
  spellInput.value = ''
  currentIndex.value++
  if (currentIndex.value >= sessionWords.value.length) {
    studyStore.completeSession(
      sessionWords.value.map(w => ({ word: w.word, meaning: w.meaning })),
      correctCount.value
    )
    window.location.hash = '#/study/__read__'
  }
}

function back() {
  window.location.hash = `#/study/${props.themeId}`
}

function prev() {
  if (currentIndex.value <= 0) return
  // 上一张不计入成绩（浏览模式）
  showResult.value = null
  spellInput.value = ''
  currentIndex.value--
}

function nextManual() {
  // 手动下一张：不检查拼写，直接跳过（不算成绩）
  showResult.value = null
  spellInput.value = ''
  currentIndex.value++
  if (currentIndex.value >= sessionWords.value.length) {
    studyStore.completeSession(
      sessionWords.value.map(w => ({ word: w.word, meaning: w.meaning })),
      correctCount.value
    )
    window.location.hash = '#/study/__read__'
  }
}
</script>

<template>
  <div class="flash-page">
    <!-- 顶栏：返回 + 进度 -->
    <header class="top-bar">
      <button class="back-btn" @click="back">← 退出</button>
      <div class="progress-text">{{ currentIndex + 1 }} / {{ sessionWords.length }}</div>
      <div class="top-spacer"></div>
    </header>
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- 主区：单词卡（单屏内含例句） -->
    <main class="content" v-if="currentWord">
      <div class="word-card">
        <div class="word-emoji">{{ currentWord.emoji || '📘' }}</div>
        <div class="word-row">
          <h1 class="word-main">{{ currentWord.word }}</h1>
          <button class="audio-btn" @click="playAudio" title="听发音">🔊</button>
        </div>
        <div class="word-phonetic">{{ currentWord.phonetic }}</div>
        <div class="word-meaning">{{ currentWord.meaning }}</div>

        <div class="divider"></div>

        <div class="example">
          <div class="example-head">
            <span class="example-label">例句</span>
            <button
              class="example-audio-btn"
              @click="playSentence"
              title="听例句"
            >🔊 听</button>
          </div>
          <div class="example-en">{{ currentWord.sentence }}</div>
          <div class="example-cn">{{ currentWord.sentenceCn }}</div>
        </div>
      </div>
    </main>

    <!-- 底部：拼写输入 -->
    <footer class="bottom-bar">
      <div class="nav-row">
        <button
          class="nav-btn nav-btn--prev"
          :disabled="currentIndex === 0"
          @click="prev"
        >
          ← 上一张
        </button>
        <button
          class="nav-btn nav-btn--next"
          :disabled="currentIndex >= sessionWords.length - 1"
          @click="nextManual"
        >
          下一张 →
        </button>
      </div>
      <div class="spell-wrap">
        <p class="spell-hint">拼写单词</p>
        <div class="spell-row">
          <input
            v-model="spellInput"
            @keyup.enter="checkSpell"
            type="text"
            class="spell-input"
            :class="{
              'spell-input--wrong': showResult === 'wrong',
              'spell-input--correct': showResult === 'correct'
            }"
            :placeholder="`首字母: ${currentWord?.word[0] || ''}`"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
          />
          <button class="spell-btn" @click="checkSpell">检查</button>
        </div>
        <p v-if="showResult === 'correct'" class="result-text result-text--correct">太棒了！</p>
        <p v-else-if="showResult === 'wrong'" class="result-text result-text--wrong">
          正确: <strong>{{ currentWord?.word }}</strong>
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 单屏布局：100vh 减去 header 61 + bottomnav 80，flex 三段 */
.flash-page {
  height: calc(100vh - 61px - 80px);
  display: flex;
  flex-direction: column;
  max-width: 480px;
  margin: 0 auto;
  padding: 0 var(--gap-md);
}

/* 顶栏 */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--gap-sm) 0;
}

.back-btn {
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: var(--color-card);
  color: var(--color-text-sub);
  font-size: var(--text-small);
  font-weight: 600;
  border: 1px solid var(--color-border);
}

.top-spacer { width: 64px; }

.progress-text {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-primary);
  font-size: var(--text-body);
}

.progress-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
  margin-bottom: var(--gap-md);
}

.progress-fill {
  height: 100%;
  background: var(--color-secondary);
  transition: width 0.3s ease;
}

/* 主区：单词卡 */
.content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.word-card {
  width: 100%;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--color-primary);
  padding: var(--gap-md) var(--gap-lg);
  text-align: center;
}

.word-emoji {
  font-size: 36px;
  line-height: 1;
  margin-bottom: var(--gap-xs);
}

.word-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--gap-sm);
  margin-bottom: 2px;
}

.word-main {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text);
  text-transform: lowercase;
  letter-spacing: 0.5px;
  word-break: break-word;
}

.audio-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-secondary);
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-card);
}

.audio-btn:active {
  transform: translateY(1px);
}

.word-phonetic {
  font-size: var(--text-small);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-xs);
}

.word-meaning {
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--color-tertiary);
}

.divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--gap-sm) 0;
}

.example {
  text-align: left;
}

.example-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.example-label {
  font-size: var(--text-tiny);
  color: var(--color-text-sub);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
}

.example-audio-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-tertiary-light);
  color: var(--color-tertiary);
  font-size: var(--text-tiny);
  font-weight: 700;
  font-family: var(--font-display);
  transition: all 0.15s;
}

.example-audio-btn:active {
  transform: scale(0.95);
}

.example-en {
  font-size: var(--text-body);
  color: var(--color-text);
  font-style: italic;
  line-height: 1.4;
  margin-bottom: 2px;
}

.example-cn {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

/* 底部：拼写 */
.bottom-bar {
  padding: var(--gap-sm) 0 var(--gap-md);
}

.nav-row {
  display: flex;
  gap: var(--gap-sm);
  margin-bottom: var(--gap-sm);
}

.nav-btn {
  flex: 1;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: var(--text-body);
  font-weight: 700;
  box-shadow: var(--shadow-card);
  transition: all 0.15s;
}

.nav-btn--prev {
  background: var(--color-card);
  color: var(--color-text);
  border: 2px solid var(--color-border);
}

.nav-btn--next {
  background: var(--color-secondary);
  color: white;
  border: 2px solid var(--color-secondary);
}

.nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
}

.nav-btn:not(:disabled):active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.spell-wrap {
  width: 100%;
}

.spell-hint {
  text-align: center;
  font-size: var(--text-small);
  color: var(--color-text-sub);
  margin-bottom: 6px;
  font-weight: 600;
}

.spell-row {
  display: flex;
  gap: var(--gap-sm);
}

.spell-input {
  flex: 1;
  padding: 12px 14px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 600;
  text-align: center;
  background: var(--color-card);
  transition: all 0.15s;
}

.spell-input:focus {
  border-color: var(--color-primary);
  outline: none;
}

.spell-input--wrong {
  border-color: var(--color-secondary);
  animation: shake 0.3s;
}

.spell-input--correct {
  border-color: var(--color-tertiary);
  background: var(--color-tertiary-light);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.spell-btn {
  padding: 0 22px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: white;
  font-size: var(--text-h3);
  font-weight: 700;
  box-shadow: var(--shadow-card);
  font-family: var(--font-display);
}

.spell-btn:active {
  transform: translateY(1px);
}

.result-text {
  text-align: center;
  margin-top: 6px;
  font-size: var(--text-small);
  font-weight: 600;
}

.result-text--correct { color: var(--color-tertiary); }
.result-text--wrong { color: var(--color-secondary); }
</style>

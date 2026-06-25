<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { words } from '../../data/words'
import { wordStore } from '../../stores/wordStore'
import { studyStore } from '../../stores/studyStore'
import { playWordAudio } from '../../utils/audio'
import { router } from '../../router'

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
const flipped = ref(false)
const spellInput = ref('')
const correctCount = ref(0)
const showResult = ref<'correct' | 'wrong' | null>(null)

const currentWord = computed(() => sessionWords.value[currentIndex.value])

// 进度
const progress = computed(() => {
  if (sessionWords.value.length === 0) return 0
  return (currentIndex.value / sessionWords.value.length) * 100
})

const isComplete = computed(() => currentIndex.value >= sessionWords.value.length)

onMounted(() => {
  // 记录开始
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

function flip() {
  flipped.value = !flipped.value
}

function playAudio() {
  if (currentWord.value) {
    playWordAudio(currentWord.value.word.toLowerCase())
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
    setTimeout(() => next(), 800)
  } else {
    showResult.value = 'wrong'
    wordStore.recordAnswer(currentWord.value.id, currentWord.value.word, currentWord.value.meaning, false)
    studyStore.recordAnswer(false)
    setTimeout(() => {
      showResult.value = null
      spellInput.value = ''
    }, 1200)
  }
}

function next() {
  showResult.value = null
  spellInput.value = ''
  flipped.value = false
  currentIndex.value++
  // 完成 → 进入 ReadAlong
  if (currentIndex.value >= sessionWords.value.length) {
    studyStore.completeSession(
      sessionWords.value.map(w => ({ word: w.word, meaning: w.meaning })),
      correctCount.value
    )
    window.location.hash = '#/study/__read__'
  }
}

function back() {
  router.navigate('study')
}
</script>

<template>
  <div class="flash-card-page">
    <!-- 进度条 -->
    <div class="progress-wrap">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <div class="progress-text">
        {{ currentIndex + 1 }} / {{ sessionWords.length }}
      </div>
    </div>

    <!-- 主卡片 -->
    <div v-if="currentWord" class="card-wrap" :class="{ flipped }">
      <div class="card" @click="flip">
        <!-- 正面 -->
        <div class="card-face card-face--front">
          <div class="word-main">{{ currentWord.word }}</div>
          <div class="word-phonetic">{{ currentWord.phonetic }}</div>
          <button class="audio-btn" @click.stop="playAudio">听发音</button>
        </div>
        <!-- 反面 -->
        <div class="card-face card-face--back">
          <div class="word-main">{{ currentWord.meaning }}</div>
          <div class="word-sentence">{{ currentWord.sentence }}</div>
          <div class="word-sentence-cn">{{ currentWord.sentenceCn }}</div>
        </div>
      </div>
    </div>

    <!-- 拼写输入 -->
    <div class="spell-section" v-if="!flipped">
      <p class="spell-hint">拼写单词</p>
      <div class="spell-row">
        <input
          v-model="spellInput"
          @keyup.enter="checkSpell"
          type="text"
          class="spell-input"
          :class="{ 'spell-input--wrong': showResult === 'wrong', 'spell-input--correct': showResult === 'correct' }"
          :placeholder="`第一个字母: ${currentWord?.word[0] || ''}`"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
        />
        <button class="spell-btn" @click="checkSpell">检查</button>
      </div>
      <p v-if="showResult === 'correct'" class="result-text result-text--correct">太棒了！</p>
      <p v-else-if="showResult === 'wrong'" class="result-text result-text--wrong">
        再试一次，正确拼写是 <strong>{{ currentWord?.word }}</strong>
      </p>
    </div>

    <!-- 翻面后显示下一张按钮 -->
    <button v-if="flipped" class="next-btn" @click="next">下一张 →</button>

    <!-- 返回按钮 -->
    <button class="back-btn" @click="back">← 退出</button>
  </div>
</template>

<style scoped>
.flash-card-page {
  padding: var(--gap-md) 0 var(--gap-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 进度条 */
.progress-wrap {
  width: 100%;
  margin-bottom: var(--gap-lg);
}

.progress-bar {
  height: 12px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
  margin-bottom: var(--gap-xs);
}

.progress-fill {
  height: 100%;
  background: var(--color-secondary);
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--color-text-sub);
  font-size: var(--text-body);
}

/* 主卡片 */
.card-wrap {
  width: 100%;
  max-width: 400px;
  perspective: 1000px;
  margin-bottom: var(--gap-lg);
}

.card {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--color-primary);
  transition: transform 0.5s;
  transform-style: preserve-3d;
  cursor: pointer;
}

.card-wrap.flipped .card {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--gap-lg);
  text-align: center;
  backface-visibility: hidden;
}

.card-face--back {
  transform: rotateY(180deg);
  background: var(--color-primary-light);
}

.word-main {
  font-family: var(--font-display);
  font-size: var(--text-word-l);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--gap-sm);
  word-break: break-word;
  text-transform: lowercase;
}

.word-phonetic {
  font-size: var(--text-h3);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-md);
}

.word-sentence {
  font-size: var(--text-body);
  color: var(--color-text);
  margin-bottom: var(--gap-xs);
  font-style: italic;
}

.word-sentence-cn {
  font-size: var(--text-small);
  color: var(--color-text-sub);
}

.audio-btn {
  padding: 12px 24px;
  border-radius: var(--radius-pill);
  background: var(--color-secondary);
  color: white;
  font-size: var(--text-body);
  font-weight: 600;
  box-shadow: var(--shadow-card);
}

.audio-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

/* 拼写 */
.spell-section {
  width: 100%;
  max-width: 400px;
}

.spell-hint {
  text-align: center;
  font-size: var(--text-body);
  color: var(--color-text-sub);
  margin-bottom: var(--gap-sm);
}

.spell-row {
  display: flex;
  gap: var(--gap-sm);
}

.spell-input {
  flex: 1;
  padding: 14px 16px;
  border: 3px solid var(--color-border);
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
  padding: 14px 24px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: white;
  font-size: var(--text-h3);
  font-weight: 700;
  box-shadow: var(--shadow-card);
}

.spell-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.result-text {
  text-align: center;
  margin-top: var(--gap-sm);
  font-size: var(--text-body);
  font-weight: 600;
}

.result-text--correct {
  color: var(--color-tertiary);
}

.result-text--wrong {
  color: var(--color-secondary);
}

/* 下一张 */
.next-btn {
  width: 100%;
  max-width: 400px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-tertiary);
  color: white;
  font-size: var(--text-h3);
  font-weight: 700;
  box-shadow: var(--shadow-card);
  margin-bottom: var(--gap-md);
}

.next-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-card-active);
}

.back-btn {
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  background: var(--color-card);
  color: var(--color-text-sub);
  font-size: var(--text-small);
  font-weight: 600;
}
</style>
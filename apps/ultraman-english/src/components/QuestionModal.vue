<template>
  <div class="question-overlay" @click.self="() => {}">
    <div class="question-box">
      <div class="word-display">
        <div class="word">{{ currentWord.word }}</div>
        <div class="phonetic" v-if="currentWord.phonetic">[{{ currentWord.phonetic }}]</div>
        <div class="meaning-hint" v-if="skillIndex === 0">Choose the correct meaning</div>
        <div class="meaning-hint" v-else-if="skillIndex === 1">Type what you hear</div>
        <div class="meaning-hint" v-else-if="skillIndex === 2">Complete the word</div>
        <div class="meaning-hint" v-else-if="skillIndex === 3">Read the word quickly</div>
        <div class="meaning-hint" v-else>Fill in the blank</div>
      </div>

      <!-- Question type component -->
      <QuestionView v-if="skillIndex === 0" :word="currentWord.word" :meaning="currentWord.meaning" @correct="onCorrect" @wrong="onWrong" />
      <QuestionListen v-else-if="skillIndex === 1" :word="currentWord.word" @correct="onCorrect" @wrong="onWrong" />
      <QuestionSpell v-else-if="skillIndex === 2" :word="currentWord.word" @correct="onCorrect" @wrong="onWrong" />
      <QuestionSpeak v-else-if="skillIndex === 3" :word="currentWord.word" @correct="onCorrect" @wrong="onWrong" />
      <QuestionFill v-else-if="skillIndex === 4" :word="currentWord.word" :sentence="currentWord.sentence" :sentenceCn="currentWord.sentenceCn" @correct="onCorrect" @wrong="onWrong" />

      <div class="feedback" v-if="feedback" :class="feedback.type">
        {{ feedback.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { gameStore, SKILLS } from "../stores/gameStore"
import eventBus from "../game/scenes/EventBus"
import { recordAnswer } from "../stores/wordStore"
import QuestionView from "./QuestionView.vue"
import QuestionListen from "./QuestionListen.vue"
import QuestionSpell from "./QuestionSpell.vue"
import QuestionSpeak from "./QuestionSpeak.vue"
import QuestionFill from "./QuestionFill.vue"

const currentWord = computed(() => gameStore.currentWord!)
const skillIndex = computed(() => gameStore.questionSkillIndex)
const skillName = computed(() => SKILLS[skillIndex.value]?.name || "")

const feedback = ref<{ type: string; text: string } | null>(null)
let canAnswer = ref(true)

function onCorrect() {
  if (!canAnswer.value) return
  canAnswer.value = false
  const word = currentWord.value
  recordAnswer(word.id, word.word, word.meaning, true)

  feedback.value = { type: "correct", text: "CORRECT!" }

  eventBus.emit("question:result", { correct: true, skillIndex: skillIndex.value })

  setTimeout(() => {
    feedback.value = null
    canAnswer.value = true
    gameStore.showQuestion = false
  }, 800)
}

function onWrong() {
  if (!canAnswer.value) return
  canAnswer.value = false
  const word = currentWord.value
  recordAnswer(word.id, word.word, word.meaning, false)

  feedback.value = { type: "wrong", text: "TRY AGAIN!" }

  eventBus.emit("question:result", { correct: false, skillIndex: skillIndex.value })

  setTimeout(() => {
    feedback.value = null
    canAnswer.value = true
    gameStore.showQuestion = false
  }, 1200)
}
</script>

<style scoped>
.question-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
}
.question-box {
  background: #1e1e3f;
  border: 3px solid #ffd700;
  
  padding: 32px;
  min-width: 320px;
  max-width: 90vw;
  text-align: center;
  box-shadow: 0 0 20px rgba(255,215,0,0.3);
}
.word-display { margin-bottom: 24px; }
.word { font-size: 36px; color: #ffd700; font-weight: bold; letter-spacing: 2px; }
.phonetic { color: #888; font-size: 14px; margin-top: 4px; }
.meaning-hint { color: #aaa; font-size: 13px; margin-top: 8px; }
.feedback {
  margin-top: 16px;
  padding: 12px;
  
  font-size: 18px;
  font-weight: bold;
  animation: fadeInOut 1.5s;
}
.feedback.correct { background: rgba(68, 204, 68, 0.2); color: #44cc44; border: 2px solid #44cc44; }
.feedback.wrong { background: rgba(204, 68, 68, 0.2); color: #cc4444; border: 2px solid #cc4444; }
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(10px); }
  20% { opacity: 1; transform: translateY(0); }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
@media (max-width: 500px) {
  .question-box { padding: 24px 16px; min-width: auto; width: 92vw; }
  .word { font-size: 28px; }
}
</style>

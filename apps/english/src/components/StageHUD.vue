<template>
  <div class="stage-hud">
    <!-- Top Bar -->
    <div class="hud-top">
      <div class="hud-left">
        <button class="hud-btn back-btn" @click="goBack">← BACK</button>
        <div class="stage-label">STAGE {{ worldIndex }}-{{ stageNumber }}</div>
        <div class="hp-section">
          <span class="hp-label">HP</span>
          <div class="hp-hearts">
            <span v-for="i in maxHearts" :key="i" class="heart" :class="{ lost: i > currentHeart }">❤</span>
          </div>
        </div>
      </div>

      <div class="hud-center">
        <div class="score-display">SCORE: {{ player.score.toLocaleString() }}</div>
        <div v-if="player.combo >= 2" class="combo-display">
          COMBO <span class="combo-num">x{{ player.combo }}</span>
        </div>
      </div>

      <div class="hud-right">
        <div class="timer" v-if="timeLimit > 0" :class="{ urgent: remainingTime <= 10 }">
          {{ formatTime(remainingTime) }}
        </div>
        <div class="monster-count">
          MONSTERS: <span class="monster-num">{{ aliveCount }}/{{ totalCount }}</span>
        </div>
        <div class="hud-actions">
          <button class="hud-btn fullscreen-btn" @click="toggleFullscreen">⛶</button>
          <button class="hud-btn pause-btn" @click="togglePause">{{ isPaused ? '▶' : '⏸' }}</button>
        </div>
      </div>
    </div>

    <!-- Target Hint -->
    <div v-if="currentHint" class="hint-bar" @click="playHintAudio">
      <div class="hint-icon">
        <span v-if="currentHint.hintType === 'audio'">🔊</span>
        <span v-else-if="currentHint.hintType === 'chinese'">📝</span>
        <span v-else>🎨</span>
      </div>
      <div class="hint-content">
        <div v-if="currentHint.hintType === 'audio'" class="hint-text">
          Listen! <span class="hint-tap">(tap to replay)</span>
        </div>
        <div v-else-if="currentHint.hintType === 'chinese'" class="hint-text">
          Find: <span class="hint-word">{{ currentHint.word.meaning }}</span>
        </div>
        <div v-else class="hint-text">
          Find: <span class="hint-emoji">{{ currentHint.word.emoji }}</span>
        </div>
      </div>
    </div>

    <!-- Combo Border Glow -->
    <div v-if="comboGlowClass" :class="comboGlowClass"></div>

    <!-- Pause Overlay -->
    <div v-if="isPaused" class="pause-overlay">
      <div class="pause-text">PAUSED</div>
      <button class="resume-btn" @click="togglePause">▶ RESUME</button>
    </div>

    <!-- Stage Clear Overlay -->
    <div v-if="showStageClear" class="stage-clear-overlay">
      <div class="stage-clear-text">STAGE CLEAR!</div>
      <div class="stage-clear-sub">WORDS LEARNED: {{ wordsLearned }}</div>
    </div>

    <!-- Game Over Overlay -->
    <div v-if="showGameOver" class="gameover-overlay">
      <div class="gameover-text">GAME OVER</div>
      <div class="gameover-sub">SCORE: {{ player.score }}</div>
    </div>

    <!-- Skill Bar (Bottom) — Selection Mode -->
    <div class="skill-bar">
      <div
        v-for="(skill, i) in skillList"
        :key="i"
        class="skill-btn"
        :class="{
          cooldown: skill.cooldown > 0,
          locked: !skill.unlocked,
          selected: gameStore.selectedSkill === i
        }"
        @click="toggleSkill(i)"
      >
        <div class="skill-icon">{{ skillIcons[i] }}</div>
        <div class="skill-name">{{ skill.name }}</div>
        <div class="skill-key">{{ skillKeys[i] }}</div>
        <div v-if="skill.cooldown > 0" class="skill-cd-overlay">
          <div class="skill-cd-text">{{ Math.ceil(skill.cooldown / 1000) }}s</div>
        </div>
        <div v-if="!skill.unlocked" class="skill-lock-overlay">🔒</div>
        <div v-if="gameStore.selectedSkill === i && skill.cooldown <= 0 && skill.unlocked" class="skill-selected-glow"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue"
import { player } from "../stores/playerStore"
import { SKILLS, gameStore, WordData } from "../stores/gameStore"
import eventBus, { GameEvents } from "../game/scenes/EventBus"
import { playWordAudio } from "../utils/audio"

const props = defineProps<{
  worldIndex: number
  stageNumber: number
  timeLimit: number
  remainingTime: number
  aliveCount: number
  totalCount: number
  wordsLearned: number
  showStageClear: boolean
  showGameOver: boolean
}>()

interface HintInfo {
  word: WordData
  hintType: 'audio' | 'chinese' | 'emoji'
}

const currentHint = ref<HintInfo | null>(null)
const maxHearts = computed(() => Math.ceil(player.maxHp / 20))
const currentHeart = computed(() => Math.ceil(player.hp / 20))

const skillList = SKILLS
const skillIcons = ["👊", "🦶", "💪", "🌀", "🌟"]
const skillKeys = ["1", "2", "3", "4", "5"]

const isPaused = computed(() => gameStore.isPaused)
const isFullscreen = ref(false)

const comboGlowClass = computed(() => {
  const c = player.combo
  if (c >= 20) return 'combo-glow gold-glow flash-glow'
  if (c >= 10) return 'combo-glow purple-glow'
  if (c >= 5) return 'combo-glow blue-glow'
  return ''
})

function goBack() {
  gameStore.isPaused = false
  eventBus.emit(GameEvents.BACK_TO_MAP)
}

function togglePause() {
  gameStore.isPaused = !gameStore.isPaused
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

function onFsChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && gameStore.isPaused) {
    gameStore.isPaused = false
  }
}

function playHintAudio() {
  if (currentHint.value?.hintType === 'audio') {
    playWordAudio(currentHint.value.word.word)
  }
}

function toggleSkill(index: number) {
  const skill = skillList[index]
  if (!skill || !skill.unlocked || skill.cooldown > 0) return
  // Toggle: click selected → deselect; click unselected → select
  gameStore.selectedSkill = gameStore.selectedSkill === index ? -1 : index
}

onMounted(() => {
  document.addEventListener("fullscreenchange", onFsChange)
  window.addEventListener("keydown", onKey)

  eventBus.on(GameEvents.HINT_UPDATE, (data: HintInfo) => {
    currentHint.value = data
  })
})

onUnmounted(() => {
  document.removeEventListener("fullscreenchange", onFsChange)
  window.removeEventListener("keydown", onKey)
  eventBus.off(GameEvents.HINT_UPDATE)
})

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}
</script>

<style scoped>
.stage-hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  font-family: "Press Start 2P", monospace;
}

/* Top Bar */
.hud-top {
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  gap: 12px;
}
.hud-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stage-label {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  text-shadow: 0 0 5px rgba(255,215,0,0.4);
}
.hp-section {
  display: flex;
  align-items: center;
  gap: 6px;
}
.hp-label { color: #ff4444; font-size: 12px; font-weight: bold; }
.hp-hearts { display: flex; gap: 2px; }
.heart { color: #ff4444; font-size: 14px; text-shadow: 0 0 3px rgba(255,68,68,0.5); }
.heart.lost { color: #333; text-shadow: none; }
.hud-center { flex: 2; text-align: center; }
.score-display {
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255,215,0,0.5);
}
.combo-display { margin-top: 4px; color: #ff88ff; font-size: 14px; }
.combo-num { color: #ff44ff; font-size: 16px; }
.hud-right {
  flex: 1;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}
.timer {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  background: rgba(0,0,0,0.5);
  padding: 4px 10px;
  border: 2px solid #4488cc;
}
.timer.urgent { color: #ff4444; border-color: #ff4444; animation: timer-flash 0.5s infinite; }
@keyframes timer-flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.monster-count { color: #88ccff; font-size: 11px; }
.monster-num { color: #fff; }
.hud-actions { display: flex; gap: 6px; margin-top: 2px; }
.hud-btn {
  pointer-events: auto;
  background: rgba(0,0,0,0.5);
  border: 2px solid rgba(255,255,255,0.25);
  color: #ccc;
  font-family: "Press Start 2P", monospace;
  font-size: 9px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}
.hud-btn:hover { border-color: #88ccff; color: #fff; }
.back-btn { font-size: 10px; margin-bottom: 4px; }
.pause-btn { font-size: 12px; padding: 4px 6px; }
.fullscreen-btn { font-size: 12px; padding: 4px 6px; }

/* Target Hint Bar */
.hint-bar {
  position: absolute;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  background: rgba(0,0,0,0.7);
  border: 2px solid #ffd700;
  pointer-events: auto;
  cursor: pointer;
  animation: hint-pop 0.3s ease-out;
  white-space: nowrap;
  z-index: 150;
}
@keyframes hint-pop {
  0% { transform: translateX(-50%) scale(0.8); opacity: 0; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}
.hint-icon { font-size: 28px; }
.hint-content { }
.hint-text { color: #fff; font-size: 16px; }
.hint-word { color: #ffd700; font-size: 18px; font-weight: bold; }
.hint-emoji { font-size: 32px; }
.hint-tap { color: #888; font-size: 9px; }

/* Stage Clear */
.stage-clear-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}
.stage-clear-text {
  font-size: 48px;
  color: #ffd700;
  font-weight: bold;
  text-shadow: 0 0 30px rgba(255,215,0,0.6);
  animation: clear-pop 0.5s ease-out;
}
@keyframes clear-pop {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
.stage-clear-sub { font-size: 14px; color: #88ccff; margin-top: 12px; }

/* Pause Overlay */
.pause-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}
.pause-text {
  font-size: 48px;
  color: #88ccff;
  font-weight: bold;
  text-shadow: 0 0 30px rgba(136,204,255,0.5);
  animation: pause-pulse 1.5s ease-in-out infinite;
}
@keyframes pause-pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
.resume-btn {
  margin-top: 24px;
  padding: 14px 40px;
  background: rgba(68,136,255,0.2);
  border: 3px solid #4488ff;
  color: #88bbff;
  font-family: "Press Start 2P", monospace;
  font-size: 16px;
  cursor: pointer;
  pointer-events: auto;
  transition: all 0.15s;
}
.resume-btn:hover { background: rgba(68,136,255,0.35); }

/* Game Over */
.gameover-overlay {
  position: fixed;
  inset: 0;
  background: rgba(80,0,0,0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}
.gameover-text {
  font-size: 48px;
  color: #ff0000;
  font-weight: bold;
  text-shadow: 0 0 30px rgba(255,0,0,0.6);
  animation: gameover-flash 0.8s infinite;
}
@keyframes gameover-flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.gameover-sub { font-size: 16px; color: #fff; margin-top: 12px; }

/* Skill Bar */
.skill-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
  pointer-events: auto;
}
.skill-btn {
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,215,0,0.4);
  background: rgba(0,0,0,0.6);
  cursor: pointer;
  position: relative;
  transition: all 0.1s;
}
.skill-btn:hover:not(.locked):not(.cooldown) { border-color: #ffd700; background: rgba(255,215,0,0.15); }
.skill-btn.cooldown { opacity: 0.5; cursor: not-allowed; }
.skill-btn.locked { opacity: 0.25; cursor: not-allowed; }
.skill-btn.selected {
  border-color: #ffd700;
  background: rgba(255,215,0,0.2);
  box-shadow: 0 0 15px rgba(255,215,0,0.4), inset 0 0 15px rgba(255,215,0,0.1);
  animation: skill-selected-pulse 0.8s ease-in-out infinite;
}
@keyframes skill-selected-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(255,215,0,0.3), inset 0 0 10px rgba(255,215,0,0.05); }
  50% { box-shadow: 0 0 20px rgba(255,215,0,0.6), inset 0 0 20px rgba(255,215,0,0.15); }
}
.skill-btn.selected .skill-name { color: #fff; }
.skill-selected-glow {
  position: absolute;
  inset: -3px;
  border: 3px solid transparent;
  border-radius: 2px;
  pointer-events: none;
}
.skill-icon { font-size: 22px; margin-bottom: 2px; }
.skill-name { color: #ffd700; font-size: 7px; text-align: center; line-height: 1.2; }
.skill-key { color: #666; font-size: 8px; margin-top: 2px; }
.skill-cd-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.skill-cd-text { color: #ff6644; font-size: 16px; font-weight: bold; }
.skill-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

/* Combo Border Glow */
.combo-glow {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  border: 6px solid transparent;
}
.blue-glow {
  border-color: rgba(68, 136, 255, 0.3);
  box-shadow: inset 0 0 60px rgba(68, 136, 255, 0.1);
}
.purple-glow {
  border-color: rgba(170, 68, 255, 0.4);
  box-shadow: inset 0 0 80px rgba(170, 68, 255, 0.15);
  animation: glow-pulse 1s ease-in-out infinite;
}
.gold-glow {
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: inset 0 0 100px rgba(255, 215, 0, 0.2);
}
.flash-glow {
  animation: glow-flash 0.4s ease-in-out infinite;
}
@keyframes glow-pulse {
  0%, 100% { border-color: rgba(170, 68, 255, 0.4); }
  50% { border-color: rgba(170, 68, 255, 0.7); }
}
@keyframes glow-flash {
  0%, 100% { border-color: rgba(255, 215, 0, 0.5); }
  50% { border-color: rgba(255, 215, 0, 0.9); box-shadow: inset 0 0 120px rgba(255, 215, 0, 0.3); }
}
</style>

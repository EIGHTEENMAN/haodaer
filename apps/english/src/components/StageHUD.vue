<template>
  <div class="stage-hud">
    <!-- Top Bar -->
    <div class="hud-top">
      <div class="hud-left">
        <div class="stage-label">STAGE {{ worldIndex }}-{{ stageNumber }}</div>
        <div class="hp-section">
          <span class="hp-label">HP</span>
          <div class="hp-hearts">
            <span v-for="i in maxHearts" :key="i" class="heart" :class="{ lost: i > currentHeart }">
              ❤
            </span>
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
      </div>
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

    <!-- Skill Bar (Bottom) -->
    <div class="skill-bar">
      <div
        v-for="(skill, i) in skillList"
        :key="i"
        class="skill-btn"
        :class="{
          cooldown: skill.cooldown > 0,
          locked: !skill.unlocked,
        }"
        @click="useSkill(i)"
      >
        <div class="skill-icon">{{ skillIcons[i] }}</div>
        <div class="skill-name">{{ skill.name }}</div>
        <div class="skill-key">{{ skillKeys[i] }}</div>
        <div v-if="skill.cooldown > 0" class="skill-cd-overlay">
          <div class="skill-cd-text">{{ Math.ceil(skill.cooldown / 1000) }}s</div>
        </div>
        <div v-if="!skill.unlocked" class="skill-lock-overlay">🔒</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { player } from "../stores/playerStore"
import { SKILLS } from "../stores/gameStore"
import eventBus, { GameEvents } from "../game/scenes/EventBus"

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

const maxHearts = computed(() => Math.ceil(player.maxHp / 20))
const currentHeart = computed(() => Math.ceil(player.hp / 20))

const skillList = SKILLS

const skillIcons = ["👊", "🦶", "💪", "🌀", "🌟"]
const skillKeys = ["1", "2", "3", "4", "5"]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function useSkill(index: number) {
  const skill = skillList[index]
  if (!skill || !skill.unlocked || skill.cooldown > 0) return
  eventBus.emit(GameEvents.SKILL_SELECT, { skillIndex: index })
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
.hp-label {
  color: #ff4444;
  font-size: 12px;
  font-weight: bold;
}
.hp-hearts {
  display: flex;
  gap: 2px;
}
.heart {
  color: #ff4444;
  font-size: 14px;
  text-shadow: 0 0 3px rgba(255,68,68,0.5);
}
.heart.lost {
  color: #333;
  text-shadow: none;
}
.hud-center {
  flex: 2;
  text-align: center;
}
.score-display {
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255,215,0,0.5);
}
.combo-display {
  margin-top: 4px;
  color: #ff88ff;
  font-size: 14px;
}
.combo-num {
  color: #ff44ff;
  font-size: 16px;
}
.hud-right {
  flex: 1;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}
.timer {
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  background: rgba(0,0,0,0.5);
  padding: 4px 10px;
  border: 2px solid #4488cc;
}
.timer.urgent {
  color: #ff4444;
  border-color: #ff4444;
  animation: timer-flash 0.5s infinite;
}
@keyframes timer-flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.monster-count {
  color: #88ccff;
  font-size: 11px;
}
.monster-num {
  color: #ffffff;
}

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
.stage-clear-sub {
  font-size: 14px;
  color: #88ccff;
  margin-top: 12px;
}

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
@keyframes gameover-flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.gameover-sub {
  font-size: 16px;
  color: #ffffff;
  margin-top: 12px;
}

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
.skill-btn:hover:not(.locked):not(.cooldown) {
  border-color: #ffd700;
  background: rgba(255,215,0,0.15);
}
.skill-btn.cooldown {
  opacity: 0.5;
  cursor: not-allowed;
}
.skill-btn.locked {
  opacity: 0.25;
  cursor: not-allowed;
}
.skill-icon {
  font-size: 22px;
  margin-bottom: 2px;
}
.skill-name {
  color: #ffd700;
  font-size: 7px;
  text-align: center;
  line-height: 1.2;
}
.skill-key {
  color: #666;
  font-size: 8px;
  margin-top: 2px;
}
.skill-cd-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.skill-cd-text {
  color: #ff6644;
  font-size: 16px;
  font-weight: bold;
}
.skill-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
</style>

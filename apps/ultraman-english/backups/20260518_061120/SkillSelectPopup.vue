<template>
  <div class="skill-select-overlay" v-if="gameStore.showSkillSelect">
    <div class="skill-select-box">
      <div class="select-title">选择技能攻击！</div>
      <div
        v-for="(skill, i) in SKILLS"
        :key="skill.id"
        class="skill-option"
        :class="{
          unlocked: skill.unlocked && skill.cooldown <= 0,
          locked: !skill.unlocked,
          cooldown: skill.cooldown > 0,
        }"
        @click="select(i)"
      >
        <div class="skill-key-hint">{{ skill.key }}</div>
        <div class="skill-icon">{{ icons[i] }}</div>
        <div class="skill-info">
          <div class="skill-name">{{ skill.name }}</div>
          <div class="skill-desc">{{ skill.description }}</div>
        </div>
        <div v-if="skill.cooldown > 0" class="skill-cd">冷却 {{ Math.ceil(skill.cooldown / 1000) }}s</div>
        <div v-if="!skill.unlocked" class="skill-locked">🔒 未解锁</div>
      </div>
      <div class="select-hint">按键盘 1-5 或点击选择技能</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import { gameStore, SKILLS, selectSkill } from "../stores/gameStore"
import eventBus, { GameEvents } from "../game/scenes/EventBus"

const icons = ["👊", "🦶", "💪", "🌀", "🌟"]

function doSelect(idx: number) {
  if (!gameStore.showSkillSelect) return
  const skill = SKILLS[idx]
  if (!skill || !skill.unlocked || skill.cooldown > 0) return
  selectSkill(idx)
  gameStore.questionSkillIndex = idx
  gameStore.showSkillSelect = false
  gameStore.showQuestion = true
  eventBus.emit(GameEvents.QUESTION_START, {
    monsterId: gameStore.currentMonsterId,
    word: gameStore.currentWord,
    skillIndex: idx,
  })
}

function select(i: number) {
  doSelect(i)
}

function onKeyDown(e: KeyboardEvent) {
  if (!gameStore.showSkillSelect) return
  const idx = parseInt(e.key) - 1
  if (idx >= 0 && idx < SKILLS.length) {
    doSelect(idx)
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener("keydown", onKeyDown)
})
</script>

<style scoped>
.skill-select-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 600;
}
.skill-select-box {
  background: #1e1e3f;
  border: 3px solid #ffd700;
  padding: 28px;
  min-width: 340px;
  max-width: 90vw;
  text-align: center;
  box-shadow: 0 0 20px rgba(255,215,0,0.3);
}
.select-title {
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
  font-family: "Press Start 2P", monospace;
}
.skill-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border: 2px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05);
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.skill-option.unlocked {
  border-color: rgba(255,215,0,0.4);
}
.skill-option.unlocked:hover {
  background: rgba(255,215,0,0.15);
}
.skill-option.locked { opacity: 0.4; cursor: not-allowed; }
.skill-option.cooldown { opacity: 0.6; cursor: not-allowed; }
.skill-key-hint {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffd700;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: bold;
  font-family: "Press Start 2P", monospace;
  border: 2px solid #ffaa00;
  flex-shrink: 0;
}
.skill-icon { font-size: 28px; flex-shrink: 0; }
.skill-info { flex: 1; min-width: 0; }
.skill-name {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  font-family: "Press Start 2P", monospace;
}
.skill-desc { color: #aaa; font-size: 12px; margin-top: 2px; font-family: "Press Start 2P", monospace; }
.skill-cd { color: #ff6644; font-size: 11px; font-family: "Press Start 2P", monospace; white-space: nowrap; }
.skill-locked { color: #888; font-size: 11px; font-family: "Press Start 2P", monospace; white-space: nowrap; }
.select-hint {
  color: #666;
  font-size: 11px;
  margin-top: 16px;
  font-family: "Press Start 2P", monospace;
}
</style>

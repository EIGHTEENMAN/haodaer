<template>
  <div class="skill-bar" :class="{ mobile: isMobile }">
    <div
      v-for="(skill, i) in SKILLS"
      :key="skill.id"
      class="skill-item"
      :class="{
        selected: gameStore.selectedSkill === i,
        locked: !skill.unlocked,
        cooldown: skill.cooldown > 0,
      }"
      @click="selectSkill(i)"
    >
      <div class="skill-icon">{{ icons[i] }}</div>
      <div class="skill-name">{{ skill.name }}</div>
      <div class="skill-key">{{ isMobile ? "" : skill.key }}</div>
      <div v-if="skill.cooldown > 0" class="cooldown-overlay">
        <span>{{ Math.ceil(skill.cooldown / 1000) }}</span>
      </div>
      <div v-if="!skill.unlocked" class="lock-overlay">🔒</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { gameStore, SKILLS, selectSkill } from "../stores/gameStore"

const icons = ["👊", "🦶", "💪", "🌀", "🌟"]
const isMobile = ref(false)

onMounted(() => {
  isMobile.value = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || ("ontouchstart" in window && window.innerWidth < 1024)
})
</script>

<style scoped>
.skill-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 100;
  pointer-events: none;
}
.skill-bar.mobile { bottom: 40px; }
.skill-item {
  pointer-events: auto;
  width: 64px;
  height: 72px;
  border: 3px solid #555;
  
  background: #3c3c3c;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
}
.skill-item:hover { border-color: #ffd700; outline: 2px solid #ffd700; outline-offset: -1px; }
.skill-item.selected {
  border-color: #ffd700; outline: 2px solid #ffd700; outline-offset: -1px;
  background: rgba(255,215,0,0.25);
  box-shadow: 0 0 10px rgba(255,215,0,0.4);
}
.skill-item.locked { opacity: 0.4; }
.skill-item.cooldown { opacity: 0.5; }
.skill-icon { font-size: 24px; }
.skill-name { color: #fff; font-size: 10px; }
.skill-key { color: #888; font-size: 10px; }
.cooldown-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.7);
  
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff6644;
  font-size: 24px;
  font-weight: bold;
}
.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
@media (max-width: 500px) {
  .skill-item { width: 52px; height: 60px; }
  .skill-icon { font-size: 20px; }
  .skill-name { font-size: 9px; }
}
</style>

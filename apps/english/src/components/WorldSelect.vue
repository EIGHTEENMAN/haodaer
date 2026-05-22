<template>
  <div class="world-select">
    <div class="ws-header">
      <h1 class="ws-title">SELECT WORLD</h1>
      <p class="ws-sub">Choose a world to enter</p>
    </div>

    <div class="world-grid">
      <div
        v-for="world in WORLDS"
        :key="world.id"
        class="world-card"
        :class="{ locked: !isUnlocked(world.id) }"
        @click="selectWorld(world.id)"
      >
        <div class="grade-badge">{{ getGradeLabel(world.id) }}</div>
        <div class="world-visual">{{ world.visual }}</div>
        <div class="world-name">{{ world.id }}</div>
        <div class="world-stars" v-if="completedCount(world.id) > 0">
          <span v-for="s in completedCount(world.id)" :key="s">★</span>
        </div>
        <div class="world-lock" v-if="!isUnlocked(world.id)">🔒</div>
      </div>
    </div>

    <div class="ws-footer">
      <span class="back-btn" @click="$emit('back')">← BACK</span>
      <span class="progress-info">COMPLETED: {{ totalCompleted }} / 60</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { WORLDS, GRADES, getGradeForWorld } from "../data/stages"
import { getProgress } from "../stores/gameStore"

const emit = defineEmits<{
  select: [worldId: string]
  back: []
}>()

function isUnlocked(worldId: string): boolean {
  const p = getProgress()
  // First world always unlocked, or world whose previous world is fully completed
  if (worldId === "ANIMAL") return true
  const idx = WORLDS.findIndex(w => w.id === worldId)
  if (idx <= 0) return false
  const prev = WORLDS[idx - 1].id
  return p.unlockedWorlds.includes(worldId) || stagesCompleted(prev) >= 6
}

function stagesCompleted(worldId: string): number {
  return (getProgress().completedStages[worldId] || []).length
}

function completedCount(worldId: string): number {
  return stagesCompleted(worldId)
}

function getGradeLabel(worldId: string): string {
  const g = getGradeForWorld(worldId)
  return g ? `G${g.id} ${g.nameCn}` : ''
}

function selectWorld(worldId: string) {
  if (!isUnlocked(worldId)) return
  emit("select", worldId)
}

const totalCompleted = computed(() => {
  const p = getProgress()
  let count = 0
  for (const stages of Object.values(p.completedStages)) {
    count += stages.length
  }
  return count
})
</script>

<style scoped>
.world-select {
  position: fixed;
  inset: 0;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 900;
  padding: 20px;
  overflow-y: auto;
}
.ws-header {
  text-align: center;
  margin-bottom: 24px;
}
.ws-title {
  font-family: "Press Start 2P", monospace;
  font-size: 32px;
  color: #ffd700;
  text-shadow: 0 0 15px rgba(255,215,0,0.4);
  margin-bottom: 6px;
}
.ws-sub {
  font-family: "Press Start 2P", monospace;
  font-size: 12px;
  color: #88ccff;
}
.world-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  max-width: 900px;
  width: 100%;
}
.world-card {
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,215,0,0.3);
  padding: 20px 12px;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  font-family: "Press Start 2P", monospace;
}
.world-card:hover:not(.locked) {
  transform: translateY(-4px);
  box-shadow: 0 4px 20px rgba(255,215,0,0.2);
  border-color: #ffd700;
}
.world-card.locked {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: rgba(255,255,255,0.1);
}
.grade-badge {
  font-size: 10px;
  color: #88ccff;
  background: rgba(136,204,255,0.12);
  border: 1px solid rgba(136,204,255,0.25);
  padding: 2px 8px;
  display: inline-block;
  margin-bottom: 6px;
  font-family: "Press Start 2P", monospace;
}
.world-visual {
  font-size: 40px;
  margin-bottom: 8px;
}
.world-name {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
}
.world-stars {
  color: #ffd700;
  font-size: 10px;
}
.world-lock {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  opacity: 0.8;
}
.ws-footer {
  margin-top: 24px;
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 900px;
  font-family: "Press Start 2P", monospace;
}
.back-btn {
  color: #88ccff;
  font-size: 12px;
  cursor: pointer;
}
.back-btn:hover {
  color: #aaddff;
}
.progress-info {
  color: #666;
  font-size: 11px;
}
</style>

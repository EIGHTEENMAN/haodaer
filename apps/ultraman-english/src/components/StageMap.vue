<template>
  <div class="stage-map">
    <div class="sm-header">
      <h1 class="sm-world-name">{{ currentWorld.id }}</h1>
      <p class="sm-world-theme">{{ themeEnglish }}</p>
    </div>

    <div class="stage-path">
      <div class="stage-path-bg"></div>
      <div
        v-for="(stage, i) in currentWorld.stages"
        :key="stage.stage"
        class="stage-node"
        :class="{
          completed: isCompleted(stage.stage),
          unlocked: isUnlocked(stage.stage) && !isCompleted(stage.stage),
          locked: !isUnlocked(stage.stage),
          boss: isBoss(stage),
        }"
        :style="nodePosition(i)"
        @click="selectStage(stage.stage)"
      >
        <div class="node-icon">
          <span v-if="isCompleted(stage.stage)">✓</span>
          <span v-else-if="isBoss(stage)">👑</span>
          <span v-else>{{ stage.stage }}</span>
        </div>
        <div class="node-label">
          {{ isBoss(stage) ? "BOSS" : "STAGE " + currentWorldIndex + "-" + stage.stage }}
        </div>
        <div v-if="isLocked(stage.stage)" class="node-lock">🔒</div>
      </div>
    </div>

    <div class="sm-footer">
      <span class="back-btn" @click="$emit('back')">← WORLDS</span>
      <span class="boss-name" v-if="currentWorld.id">BOSS: {{ bossName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { WORLDS, BOSS_NAMES, StageConfig } from "../data/stages"

const props = defineProps<{
  worldId: string
}>()

const emit = defineEmits<{
  start: [stageNumber: number]
  back: []
}>()

const currentWorldIndex = computed(() => WORLDS.findIndex(w => w.id === props.worldId) + 1)
const currentWorld = computed(() => WORLDS.find(w => w.id === props.worldId)!)
const bossName = computed(() => BOSS_NAMES[props.worldId] || "???")
const themeEnglish = computed(() => {
  const t = currentWorld.value?.theme || ""
  const spaceIdx = t.indexOf(" ")
  return spaceIdx > 0 ? t.substring(spaceIdx + 1) : t
})

interface ProgressData {
  unlockedWorlds: string[]
  completedStages: Record<string, number[]>
}

function getProgress(): ProgressData {
  try {
    const raw = localStorage.getItem("ultraman_progress")
    if (raw) return JSON.parse(raw)
  } catch {}
  return { unlockedWorlds: ["ANIMAL"], completedStages: {} }
}

function completedStages(): number[] {
  return getProgress().completedStages[props.worldId] || []
}

function isCompleted(stage: number): boolean {
  return completedStages().includes(stage)
}

function isUnlocked(stage: number): boolean {
  if (stage === 1) return true
  return completedStages().includes(stage - 1)
}

function isBoss(stage: StageConfig): boolean {
  return stage.stage === 6
}

function isLocked(stage: number): boolean {
  return !isUnlocked(stage)
}

function selectStage(stage: number) {
  if (!isUnlocked(stage)) return
  emit("start", stage)
}

function nodePosition(i: number): Record<string, string> {
  const total = 6
  const angle = (i / (total - 1)) * Math.PI
  const rx = 40
  const ry = 30
  const x = 50 + rx * Math.cos(angle - Math.PI)
  const y = 10 + ry * Math.sin(angle - Math.PI) + 10
  return {
    left: x + "%",
    top: y + "%",
    transform: "translate(-50%, -50%)",
  }
}
</script>

<style scoped>
.stage-map {
  position: fixed;
  inset: 0;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 900;
  padding: 20px;
}
.sm-header {
  text-align: center;
  margin-bottom: 20px;
}
.sm-world-name {
  font-family: "Press Start 2P", monospace;
  font-size: 28px;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255,215,0,0.4);
  margin-bottom: 4px;
}
.sm-world-theme {
  font-family: "Press Start 2P", monospace;
  font-size: 11px;
  color: #88ccff;
}
.stage-path {
  position: relative;
  width: 100%;
  max-width: 700px;
  height: 350px;
  flex: 1;
}
.stage-path-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(255,215,0,0.03) 0%, transparent 70%);
}
.stage-node {
  position: absolute;
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  font-family: "Press Start 2P", monospace;
}
.stage-node:hover:not(.locked) {
  transform: translate(-50%, -50%) scale(1.15);
}
.stage-node.locked {
  opacity: 0.35;
  cursor: not-allowed;
}
.stage-node.completed {
  opacity: 0.7;
}
.node-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 3px solid #ffd700;
  color: #ffd700;
  background: rgba(255,215,0,0.1);
}
.stage-node.completed .node-icon {
  background: rgba(68,204,68,0.2);
  border-color: #44cc44;
  color: #44cc44;
}
.stage-node.unlocked .node-icon {
  border-color: #ffd700;
  color: #ffd700;
  animation: pulse-node 2s infinite;
}
.stage-node.boss .node-icon {
  width: 60px;
  height: 60px;
  font-size: 24px;
  border-color: #ff4444;
  color: #ff4444;
  background: rgba(255,68,68,0.15);
}
.stage-node.boss.completed .node-icon {
  border-color: #44cc44;
  color: #44cc44;
  background: rgba(68,204,68,0.2);
}
@keyframes pulse-node {
  0%, 100% { box-shadow: 0 0 5px rgba(255,215,0,0.3); }
  50% { box-shadow: 0 0 20px rgba(255,215,0,0.6); }
}
.node-label {
  color: #ccc;
  font-size: 9px;
  margin-top: 4px;
  text-align: center;
}
.node-lock {
  font-size: 24px;
  position: absolute;
}
.sm-footer {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  width: 100%;
  max-width: 700px;
  font-family: "Press Start 2P", monospace;
}
.back-btn {
  color: #88ccff;
  font-size: 12px;
  cursor: pointer;
}
.back-btn:hover { color: #aaddff; }
.boss-name {
  color: #ff4444;
  font-size: 12px;
}
</style>

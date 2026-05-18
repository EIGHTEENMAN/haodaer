<template>
  <div class="hud">
    <div class="hud-left">
      <div class="hp-bar">
        <div class="hp-fill" :style="{ width: hpPercent + '%' }"></div>
        <span class="hp-text">{{ player.hp }}/{{ player.maxHp }}</span>
      </div>
      <div class="xp-bar">
        <div class="xp-fill" :style="{ width: xpPercent + '%' }"></div>
        <span class="xp-text">Lv.{{ player.level }}</span>
      </div>
    </div>
    <div class="hud-center">
      <div class="combo" v-if="player.combo >= 3">
        <span class="combo-text">COMBO x{{ player.combo }}!</span>
        <span class="combo-mult">×{{ multiplier }}</span>
      </div>
    </div>
    <div class="hud-right">
      <div class="score">{{ player.score.toLocaleString() }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { player } from "../stores/playerStore"

const hpPercent = computed(() => Math.max(0, (player.hp / player.maxHp) * 100))
const xpPercent = computed(() => Math.min(100, (player.xp / player.xpToNext) * 100))
const multiplier = computed(() => {
  if (player.combo >= 20) return 10
  if (player.combo >= 10) return 5
  if (player.combo >= 5) return 3
  return 2
})
</script>

<style scoped>
.hud {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  padding: 8px 12px;
  pointer-events: none;
  z-index: 100;
  gap: 12px;
}
.hud-left { display: flex; flex-direction: column; gap: 4px; flex: 1; max-width: 200px; }
.hp-bar, .xp-bar {
  height: 18px;
  
  position: relative;
  overflow: hidden;
}
.hp-bar { background: rgba(100,0,0,0.6); border: 2px solid #cc4444; }
.hp-fill { height: 100%; background: #44cc44; transition: width 0.3s; }
.hp-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: bold; text-shadow: 0 0 3px #000; }
.xp-bar { background: rgba(0,0,100,0.6); border: 2px solid #4488cc; height: 14px; }
.xp-fill { height: 100%; background: #4488cc; transition: width 0.3s; }
.xp-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; font-weight: bold; text-shadow: 0 0 3px #000; }
.hud-center { flex: 2; text-align: center; }
.combo { animation: comboIn 0.3s; }
.combo-text { color: #ffd700; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px rgba(255,215,0,0.5); }
.combo-mult { color: #ff6644; font-size: 16px; margin-left: 8px; }
@keyframes comboIn { from { transform: scale(1.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.hud-right { flex: 1; text-align: right; }
.score { color: #ffd700; font-size: 22px; font-weight: bold; text-shadow: 0 0 10px rgba(255,215,0,0.5); }
</style>

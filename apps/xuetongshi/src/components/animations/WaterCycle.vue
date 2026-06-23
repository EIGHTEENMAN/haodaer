<script setup lang="ts">
/**
 * WaterCycle — 水循环
 *
 * TODO: 实现细节
 *  - 海洋蒸发 → 云层凝结 → 降雨 → 径流回海
 *  - 太阳驱动粒子动画
 *  - 节点点击看阶段说明
 */
</script>

<template>
  <div class="placeholder">
    <div class="ph-icon">💧☁️☀️</div>
    <div class="ph-title">水循环</div>
    <div class="ph-hint">TODO: 第 1 周实现</div>
  </div>
</template>

<style scoped>
.placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(180deg, #0369a1 0%, #0c4a6e 50%, #052e3a 100%);
  color: #bae6fd;
  font-family: -apple-system, sans-serif;
  gap: 8px;
}
.ph-icon { font-size: 48px; }
.ph-title { font-size: 18px; font-weight: 700; }
.ph-hint { font-size: 12px; color: #7dd3fc; opacity: 0.7; }
</style>

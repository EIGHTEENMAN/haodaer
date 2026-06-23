<script setup lang="ts">
/**
 * VolcanoEarthquake — 火山与地震
 *
 * TODO: 实现细节
 *  - 板块挤压 → 岩浆上升 → 喷发动画
 *  - 地震波纹横向 + 纵向传播
 *  - 里氏震级滑块
 */
</script>

<template>
  <div class="placeholder">
    <div class="ph-icon">🌋</div>
    <div class="ph-title">火山与地震</div>
    <div class="ph-hint">TODO: 第 1 周实现</div>
  </div>
</template>

<style scoped>
.placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #7c2d12 0%, #431407 100%);
  color: #fed7aa;
  font-family: -apple-system, sans-serif;
  gap: 8px;
}
.ph-icon { font-size: 48px; }
.ph-title { font-size: 18px; font-weight: 700; }
.ph-hint { font-size: 12px; color: #fdba74; opacity: 0.7; }
</style>

<script setup lang="ts">
/**
 * Aerospace — 航空航天（火箭发射/卫星轨道/空间站）
 *
 * TODO: 实现细节
 *  - 火箭分级动画 + 文字解说
 *  - 卫星绕地球 + 空间站对接
 */
</script>

<template>
  <div class="placeholder">
    <div class="ph-icon">🚀</div>
    <div class="ph-title">航空航天</div>
    <div class="ph-hint">TODO: 第 1 周实现</div>
  </div>
</template>

<style scoped>
.placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #0c1a4a 100%);
  color: #dbeafe;
  font-family: -apple-system, sans-serif;
  gap: 8px;
}
.ph-icon { font-size: 48px; }
.ph-title { font-size: 18px; font-weight: 700; }
.ph-hint { font-size: 12px; color: #93c5fd; opacity: 0.7; }
</style>

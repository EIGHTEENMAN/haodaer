<script setup lang="ts">
/**
 * ForceMotion — 力与运动（抛物线/重力/自由落体）
 *
 * TODO: 实现细节
 *  - 可调高度的抛物线
 *  - 重力加速度滑块
 *  - 自由落体与同时落地演示
 */
</script>

<template>
  <div class="placeholder">
    <div class="ph-icon">🎯</div>
    <div class="ph-title">力与运动</div>
    <div class="ph-hint">TODO: 第 1 周实现</div>
  </div>
</template>

<style scoped>
.placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
  color: #94a3b8;
  font-family: -apple-system, sans-serif;
  gap: 8px;
}
.ph-icon { font-size: 48px; }
.ph-title { font-size: 18px; font-weight: 700; color: #6ee7b7; }
.ph-hint { font-size: 12px; color: #64748b; }
</style>

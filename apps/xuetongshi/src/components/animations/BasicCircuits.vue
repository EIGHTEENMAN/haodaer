<script setup lang="ts">
/**
 * BasicCircuits — 电路基础
 *
 * TODO: 实现细节
 *  - 电池/灯泡/开关可拖拽连线
 *  - 电流方向粒子实时流动
 *  - 短路/开路/通路状态
 */
</script>

<template>
  <div class="placeholder">
    <div class="ph-icon">⚡</div>
    <div class="ph-title">电路基础</div>
    <div class="ph-hint">TODO: 第 1 周实现</div>
  </div>
</template>

<style scoped>
.placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #422006 0%, #1c0a02 100%);
  color: #fef3c7;
  font-family: -apple-system, sans-serif;
  gap: 8px;
}
.ph-icon { font-size: 48px; }
.ph-title { font-size: 18px; font-weight: 700; }
.ph-hint { font-size: 12px; color: #fde68a; opacity: 0.7; }
</style>

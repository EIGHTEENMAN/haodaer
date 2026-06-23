<script setup lang="ts">
/**
 * Dinosaurs — 恐龙世界
 *
 * TODO: 实现细节
 *  - 霸王龙/三角龙/翼龙 SVG sprite 动画
 *  - 走跑觅食 + 叫声提示
 *  - 点击切换恐龙
 */
</script>

<template>
  <div class="placeholder">
    <div class="ph-icon">🦖</div>
    <div class="ph-title">恐龙世界</div>
    <div class="ph-hint">TODO: 第 1 周实现</div>
  </div>
</template>

<style scoped>
.placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #14532d 0%, #052e16 100%);
  color: #bbf7d0;
  font-family: -apple-system, sans-serif;
  gap: 8px;
}
.ph-icon { font-size: 48px; }
.ph-title { font-size: 18px; font-weight: 700; }
.ph-hint { font-size: 12px; color: #86efac; opacity: 0.7; }
</style>

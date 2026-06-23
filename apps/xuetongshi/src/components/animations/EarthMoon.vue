<script setup lang="ts">
/**
 * EarthMoon — 地月公转 + 月相变化
 *
 * TODO: 实现细节
 *  - 地球绕日倾斜 23.5°
 *  - 月球绕地球 360° + 5 种相位（新/上弦/满/下弦/残）
 *  - 点击月相查看名字
 */
</script>

<template>
  <div class="placeholder">
    <div class="ph-icon">🌍🌙</div>
    <div class="ph-title">地月系统</div>
    <div class="ph-hint">TODO: 第 1 周实现</div>
  </div>
</template>

<style scoped>
.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0c0a4a 0%, #1e1b4b 100%);
  color: #94a3b8;
  font-family: -apple-system, sans-serif;
  gap: 8px;
}
.ph-icon { font-size: 48px; }
.ph-title { font-size: 18px; font-weight: 700; color: #cbd5e1; }
.ph-hint { font-size: 12px; color: #64748b; }
</style>

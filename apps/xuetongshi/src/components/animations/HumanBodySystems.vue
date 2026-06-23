<script setup lang="ts">
/**
 * HumanBodySystems — 人体循环/呼吸/消化
 *
 * TODO: 实现细节（按 sectionId 区分）
 *  - hb3 循环：心脏跳动 + 红细胞流动
 *  - hb4 呼吸：膈肌收缩 + 肺扩张
 *  - hb5 消化：食物从嘴→胃→小肠→大肠
 */
const props = defineProps<{ topicId?: string; parentTopicId?: string }>()

function getSystemName(id?: string): string {
  if (id === 'hb3') return '🫀 血液循环'
  if (id === 'hb4') return '🫁 呼吸系统'
  if (id === 'hb5') return '🥩 消化系统'
  return '🧍 人体奥秘'
}
</script>

<template>
  <div class="placeholder">
    <div class="ph-icon">🫀</div>
    <div class="ph-title">{{ getSystemName(props.topicId) }}</div>
    <div class="ph-hint">TODO: 第 1 周实现</div>
  </div>
</template>

<style scoped>
.placeholder {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #831843 0%, #500724 100%);
  color: #fce7f3;
  font-family: -apple-system, sans-serif;
  gap: 8px;
}
.ph-icon { font-size: 48px; }
.ph-title { font-size: 18px; font-weight: 700; }
.ph-hint { font-size: 12px; color: #fbcfe8; opacity: 0.7; }
</style>

<script setup lang="ts">
/**
 * AnimationSlot — 学通识配图/动画统一入口
 *
 * 4 级回退链（按优先级）：
 *   1. 组件动画（Canvas/SVG）  ← 来自 animations/ 注册表
 *   2. .jpg AI 真图           ← /images/{knowledge|sections}/<id>.jpg
 *   3. .svg 水墨占位          ← /images/{knowledge|sections}/<id>.svg
 *   4. 文字占位               ← KnowledgeIllustration 内的 ki-fallback
 *
 * 设计：与原 KnowledgeIllustration 行为完全兼容，未匹配动画时透传原图片回退链。
 * 性能：动态 import 懒加载，不进首屏 bundle。
 */
import { ref, computed, shallowRef, watch } from 'vue'
import { findAnimation, createAnimationComponent } from './animations'
import KnowledgeIllustration from './KnowledgeIllustration.vue'

const props = defineProps<{
  topicId: string
  topicTitle: string
  category: string
  color?: string
  parentTopicId?: string
}>()

type FallbackStage = 'jpg' | 'svg' | 'none'
const fallbackStage = ref<FallbackStage>('jpg')
const showAnimation = ref(true)
const imgStatus = ref<'loading' | 'loaded' | 'error'>('loading')

// 计算 section id（用于精确匹配动画）
const sectionId = computed(() => {
  // 章节场景：topicId 实际是 section.id，parentTopicId 是父 topic
  return props.parentTopicId ? props.topicId : undefined
})

// 计算父 topic id（用于查找动画）
const lookupTopicId = computed(() => {
  return props.parentTopicId || props.topicId
})

// 查找匹配的动画
const animDef = computed(() => findAnimation(lookupTopicId.value, sectionId.value))
const AnimationComp = shallowRef<ReturnType<typeof createAnimationComponent> | null>(null)

watch(
  animDef,
  (def) => {
    if (def) {
      AnimationComp.value = createAnimationComponent(def)
    } else {
      AnimationComp.value = null
    }
  },
  { immediate: true }
)

// 计算图片 URL（动画关闭 或 无动画定义时使用）
const mediaUrl = computed(() => {
  if (showAnimation.value && animDef.value) return null
  const base = props.parentTopicId
    ? `/images/sections/${props.parentTopicId}-${props.topicId}`
    : `/images/knowledge/${props.topicId}`
  if (fallbackStage.value === 'none') return null
  return `${base}.${fallbackStage.value}`
})

function handleImgLoad() {
  imgStatus.value = 'loaded'
}

function handleImgError() {
  if (fallbackStage.value === 'jpg') {
    fallbackStage.value = 'svg'
  } else {
    fallbackStage.value = 'none'
  }
}

// 暴露给父组件：手动关闭动画
defineExpose({
  disableAnimation: () => {
    showAnimation.value = false
  },
})
</script>

<template>
  <div class="as-banner" :style="{ backgroundColor: (color || '#94a3b8') + '15' }">
    <!-- 第 1 级：动画组件 -->
    <div v-if="showAnimation && AnimationComp" class="as-animation">
      <component :is="AnimationComp" :topic-id="topicId" :parent-topic-id="parentTopicId" />
    </div>

    <!-- 第 2/3 级：jpg / svg 回退 -->
    <template v-else-if="mediaUrl">
      <img
        :src="mediaUrl"
        :alt="topicTitle"
        class="as-img"
        :class="{ 'as-img-loaded': imgStatus === 'loaded' }"
        @load="handleImgLoad"
        @error="handleImgError"
      />
    </template>

    <!-- 第 4 级：文字占位（完全无图） -->
    <div v-else class="as-fallback">
      <div class="as-fallback-char">{{ topicTitle.slice(0, 1) }}</div>
      <div class="as-fallback-title">{{ topicTitle }}</div>
    </div>

    <!-- 类别徽章 -->
    <div class="as-badge" :style="{ backgroundColor: color || '#94a3b8' }">
      {{ category }}
    </div>

    <!-- 动画开关：右上角小按钮（让用户切回静态图） -->
    <button
      v-if="animDef"
      class="as-toggle"
      :title="showAnimation ? '切换为静态图' : '切换为动画'"
      @click="showAnimation = !showAnimation"
    >
      {{ showAnimation ? '⏸' : '▶' }}
    </button>
  </div>
</template>

<style scoped>
.as-banner {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.as-animation {
  width: 100%;
  height: 100%;
}

.as-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.4s ease;
  cursor: zoom-in;
}
.as-img-loaded {
  opacity: 1;
}

.as-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.as-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.85);
  color: #475569;
  font-size: 14px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.as-toggle:hover {
  background: rgba(255, 255, 255, 1);
}

.as-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #94a3b8;
}
.as-fallback-char {
  font-size: 120px;
  font-weight: 900;
  font-family: serif;
  opacity: 0.4;
  line-height: 1;
}
.as-fallback-title {
  margin-top: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
}
</style>

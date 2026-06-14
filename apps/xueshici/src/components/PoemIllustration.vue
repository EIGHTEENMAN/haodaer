<script setup lang="ts">
/**
 * PoemIllustration — 诗配画展示组件
 *
 * 在诗词阅读器中展示 AI 生成的水墨风格配图。
 * 状态覆盖：加载中、成功、失败、无图、全屏查看
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  poemId: number
  poemTitle: string
  poemAuthor: string
  poemDynasty: string
  color?: string
}>()

// ===== 状态 =====
const imgStatus = ref<'loading' | 'loaded' | 'error' | 'empty'>('loading')
const showFullscreen = ref(false)
const imgNaturalSize = ref({ w: 0, h: 0 })

// ===== 图片 URL（优先 .jpg → 回退 .svg） =====
// 2026-06-14 简化：去掉 .webp 这一层（之前 .webp 是 mock 占位被错改扩展名，内容是 SVG）
// 现在 .jpg 才是真图（MiniMax 生成），.svg 是 mock 占位兜底
type FallbackStage = 'jpg' | 'svg'
const fallbackStage = ref<FallbackStage>('jpg')

const imageUrl = computed(() => {
  return `/images/poems/${props.poemId}.${fallbackStage.value}`
})

// ===== 朝代颜色（备用） =====
const dynastyColorMap: Record<string, string> = {
  '春秋战国': '#d97706',
  '汉': '#dc2626',
  '三国': '#f97316',
  '魏晋南北朝': '#8b5cf6',
  '唐': '#f59e0b',
  '宋': '#06b6d4',
  '元': '#ec4899',
  '明': '#ef4444',
  '清': '#1d4ed8',
  '近现代': '#64748b',
}
const accentColor = computed(() => props.color || dynastyColorMap[props.poemDynasty] || '#94a3b8')

// ===== 加载处理 =====
function handleImgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  imgNaturalSize.value = { w: img.naturalWidth, h: img.naturalHeight }
  imgStatus.value = 'loaded'
}

function handleImgError() {
  if (fallbackStage.value === 'jpg') {
    // .jpg 失败（这首诗没生成真图），回退尝试 .svg（Mock 模式占位图）
    fallbackStage.value = 'svg'
    imgStatus.value = 'loading'
    reloadImage()
  } else {
    // .svg 也失败，显示空状态
    imgStatus.value = 'empty'
  }
}

function reloadImage() {
  const img = new Image()
  img.onload = (e) => handleImgLoad(e)
  img.onerror = () => handleImgError()
  img.src = imageUrl.value
}

// ===== 检查图片是否存在（预加载） =====
onMounted(() => {
  reloadImage()
  // 超时保护（首次 jpg 加载超时）
  const timer = setTimeout(() => {
    if (imgStatus.value === 'loading') handleImgError()
  }, 8000)
  onUnmounted(() => clearTimeout(timer))
})

// ===== 全屏预览 =====
function toggleFullscreen() {
  if (imgStatus.value === 'loaded') showFullscreen.value = !showFullscreen.value
}

function closeFullscreen() {
  showFullscreen.value = false
}

// ESC 关闭全屏
onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') showFullscreen.value = false
  })
})
</script>

<template>
  <div class="pi-wrapper" :style="{ '--pi-accent': accentColor }">
    <!-- ===== 加载状态：水墨风格骨架屏 ===== -->
    <div v-if="imgStatus === 'loading'" class="pi-skeleton">
      <div class="pi-skeleton-ink">
        <div class="pi-skeleton-mountain"></div>
        <div class="pi-skeleton-mountain pi-skeleton-mountain-2"></div>
        <div class="pi-skeleton-bird"></div>
      </div>
      <div class="pi-skeleton-text">
        <div class="pi-skeleton-line"></div>
        <div class="pi-skeleton-line pi-skeleton-line-short"></div>
      </div>
    </div>

    <!-- ===== 已加载 ===== -->
    <div
      v-if="imgStatus === 'loaded'"
      class="pi-image-wrap"
      @click="toggleFullscreen"
      role="button"
      :aria-label="`查看《${poemTitle}》配图大图`"
      tabindex="0"
      @keydown.enter="toggleFullscreen"
    >
      <img
        :src="imageUrl"
        :alt="`《${poemTitle}》${poemAuthor} · ${poemDynasty} 配图`"
        class="pi-image"
        @load="handleImgLoad"
        @error="handleImgError"
        loading="lazy"
      />
      <!-- 悬浮信息 -->
      <div class="pi-overlay">
        <span class="pi-expand-hint">🔍 点击查看大图</span>
      </div>
      <!-- 诗词角标 -->
      <div class="pi-badge">
        <span class="pi-badge-dynasty">{{ poemDynasty }}</span>
        <span class="pi-badge-author">{{ poemAuthor }}</span>
      </div>
    </div>

    <!-- ===== 空状态（无配图）：诗意水墨占位 ===== -->
    <div v-if="imgStatus === 'empty'" class="pi-placeholder">
      <svg class="pi-placeholder-svg" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
        <!-- 远山 -->
        <path d="M0 160 Q60 100 120 130 Q160 110 200 100 Q240 90 280 115 Q320 95 400 130 L400 200 L0 200 Z"
          :fill="accentColor" opacity="0.08" />
        <path d="M0 175 Q80 130 160 155 Q220 135 280 150 Q340 130 400 155 L400 200 L0 200 Z"
          :fill="accentColor" opacity="0.12" />
        <!-- 圆月 -->
        <circle cx="320" cy="60" r="20" :fill="accentColor" opacity="0.1"/>
        <!-- 飞鸟 -->
        <path d="M80 70 Q90 60 100 70" :stroke="accentColor" stroke-width="1.5" fill="none" opacity="0.15"/>
        <path d="M110 65 Q120 55 130 65" :stroke="accentColor" stroke-width="1.5" fill="none" opacity="0.15"/>
        <!-- 标题装饰 -->
        <text x="200" y="55" text-anchor="middle" font-family="serif" font-size="22"
          :fill="accentColor" opacity="0.15">{{ poemTitle.charAt(0) }}</text>
        <text x="200" y="190" text-anchor="middle" font-family="sans-serif" font-size="10"
          :fill="accentColor" opacity="0.2">{{ poemTitle }} · {{ poemAuthor }}</text>
      </svg>
      <p class="pi-placeholder-text">配图生成中...</p>
    </div>

    <!-- ===== 全屏预览遮罩 ===== -->
    <Teleport to="body" v-if="showFullscreen">
      <div class="pi-fullscreen-overlay" @click.self="closeFullscreen">
        <button class="pi-fullscreen-close" @click="closeFullscreen" aria-label="关闭全屏">✕</button>
        <div class="pi-fullscreen-content">
          <img :src="imageUrl" :alt="`《${poemTitle}》配图`" class="pi-fullscreen-img" />
          <p class="pi-fullscreen-caption">
            《{{ poemTitle }}》 · {{ poemAuthor }}（{{ poemDynasty }}）
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ===== 容器 ===== */
.pi-wrapper {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #fafaf9;
  border: 1px solid #e7e5e4;
  transition: box-shadow 0.3s;
}

/* ===== 加载骨架 ===== */
.pi-skeleton {
  position: relative;
  width: 100%;
  height: 220px;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f5f4 0%, #fafaf9 100%);
}

.pi-skeleton-ink {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.pi-skeleton-mountain {
  position: absolute;
  bottom: 0;
  left: -10%;
  width: 120%;
  height: 60%;
  background: conic-gradient(from 180deg at 50% 100%, transparent 0%, rgba(148, 163, 184, 0.04) 40%, transparent 80%);
  border-radius: 50% 50% 0 0;
  animation: pi-shimmer 2.5s ease-in-out infinite;
}

.pi-skeleton-mountain-2 {
  height: 45%;
  bottom: 0;
  animation-delay: 1s;
}

.pi-skeleton-bird {
  position: absolute;
  top: 30%;
  left: 60%;
  width: 40px;
  height: 20px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.06);
  animation: pi-shimmer 3s ease-in-out infinite 0.5s;
}

.pi-skeleton-text {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 60%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pi-skeleton-line {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.08), transparent);
  animation: pi-shimmer 2s ease-in-out infinite;
}

.pi-skeleton-line-short {
  width: 60%;
}

@keyframes pi-shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ===== 图片容器 ===== */
.pi-image-wrap {
  position: relative;
  width: 100%;
  max-height: 320px;
  overflow: hidden;
  cursor: pointer;
  background: #fafaf9;
}

.pi-image {
  display: block;
  width: 100%;
  height: auto;
  max-height: 320px;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.pi-image-wrap:hover .pi-image {
  transform: scale(1.03);
}

.pi-image-wrap:hover .pi-overlay {
  opacity: 1;
}

/* ===== 悬浮遮罩 ===== */
.pi-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.pi-expand-hint {
  font-size: 13px;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  padding: 6px 16px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  font-weight: 500;
}

/* ===== 角标 ===== */
.pi-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
}

.pi-badge-dynasty,
.pi-badge-author {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.85);
  color: #44403c;
  backdrop-filter: blur(4px);
  letter-spacing: 0.5px;
}

.pi-badge-dynasty {
  background: var(--pi-accent, #94a3b8);
  color: white;
}

/* ===== 空状态占位 ===== */
.pi-placeholder {
  position: relative;
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pi-placeholder-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.pi-placeholder-text {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: var(--pi-accent, #94a3b8);
  opacity: 0.4;
  letter-spacing: 2px;
}

/* ===== 全屏遮罩 ===== */
.pi-fullscreen-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  animation: pi-fadeIn 0.3s ease;
}

.pi-fullscreen-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.pi-fullscreen-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.pi-fullscreen-content {
  max-width: 90vw;
  max-height: 90vh;
  text-align: center;
}

.pi-fullscreen-img {
  max-width: 100%;
  max-height: 80vh;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.pi-fullscreen-caption {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-top: 12px;
  letter-spacing: 1px;
}

@keyframes pi-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .pi-image-wrap {
    max-height: 220px;
  }
  .pi-image {
    max-height: 220px;
  }
  .pi-skeleton {
    height: 160px;
  }
  .pi-placeholder {
    height: 150px;
  }
}
</style>

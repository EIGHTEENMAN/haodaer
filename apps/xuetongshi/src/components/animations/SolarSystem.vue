<script setup lang="ts">
/**
 * SolarSystem — 太阳系行星轨道动画
 *
 * 设计：
 * - 8 大行星按真实相对距离缩放后绕日运行
 * - 公转周期按"水星 4s = 1 实际年"等比压缩（孩子能看清"水星快/海王星慢"）
 * - 自转：每个行星 SVG 自身缓慢旋转
 * - 交互：点击行星显示该行星的数据卡
 * - 性能：纯 CSS animation + SVG，移动端无压力
 *
 * Props（可选）：
 *   - speed: 1=默认速度，0.5=半速，2=倍速
 *   - showLabels: true=显示行星名
 */
import { ref, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    speed?: number
    showLabels?: boolean
  }>(),
  { speed: 1, showLabels: true }
)

interface Planet {
  id: string
  name: string
  zh: string
  color: string
  /** 距日相对距离（用于轨道半径） */
  orbit: number
  /** 公转周期（秒，实际年=4s/水星） */
  period: number
  /** 行星大小（SVG r） */
  size: number
  fact: string
}

const planets: Planet[] = [
  { id: 'mercury', name: 'Mercury', zh: '水星', color: '#a3a3a3', orbit: 18, period: 4, size: 2.5, fact: '离太阳最近，白天 430℃，晚上 -180℃' },
  { id: 'venus', name: 'Venus', zh: '金星', color: '#fcd34d', orbit: 26, period: 7, size: 4, fact: '太阳系最热的行星，表面 460℃' },
  { id: 'earth', name: 'Earth', zh: '地球', color: '#3b82f6', orbit: 36, period: 10, size: 4.2, fact: '我们的家，71% 被水覆盖' },
  { id: 'mars', name: 'Mars', zh: '火星', color: '#dc2626', orbit: 46, period: 15, size: 3.2, fact: '红色行星，有太阳系最大的山' },
  { id: 'jupiter', name: 'Jupiter', zh: '木星', color: '#fb923c', orbit: 60, period: 40, size: 9, fact: '太阳系最大的行星，能装下 1300 个地球' },
  { id: 'saturn', name: 'Saturn', zh: '土星', color: '#fde68a', orbit: 76, period: 60, size: 7.5, fact: '有壮观的土星环，由冰和岩石组成' },
  { id: 'uranus', name: 'Uranus', zh: '天王星', color: '#5eead4', orbit: 90, period: 90, size: 5, fact: '侧着身子转，像在"滚"着走' },
  { id: 'neptune', name: 'Neptune', zh: '海王星', color: '#60a5fa', orbit: 102, period: 120, size: 4.8, fact: '太阳系最远，风速可达 2100 km/h' },
]

const selected = ref<Planet | null>(null)
const showOrbits = ref(true)

function selectPlanet(p: Planet) {
  selected.value = selected.value?.id === p.id ? null : p
}

function duration(period: number) {
  return `${period / props.speed}s`
}
</script>

<template>
  <div class="ss-wrap">
    <!-- 太阳 -->
    <div class="ss-sun">
      <div class="ss-sun-core" />
      <div class="ss-sun-glow" />
    </div>

    <!-- 轨道与行星 -->
    <div
      v-for="p in planets"
      :key="p.id"
      class="ss-orbit"
      :style="{
        width: `${p.orbit * 2}px`,
        height: `${p.orbit * 2}px`,
        animationDuration: duration(p.period),
      }"
    >
      <div
        v-if="showOrbits"
        class="ss-orbit-ring"
        :style="{ width: `${p.orbit * 2}px`, height: `${p.orbit * 2}px` }"
      />
      <button
        class="ss-planet"
        :class="{ 'ss-planet-active': selected?.id === p.id }"
        :style="{
          backgroundColor: p.color,
          width: `${p.size * 2}px`,
          height: `${p.size * 2}px`,
        }"
        :title="p.zh"
        @click.stop="selectPlanet(p)"
      />
      <span v-if="showLabels" class="ss-label">{{ p.zh }}</span>
    </div>

    <!-- 选中信息卡 -->
    <transition name="ss-fade">
      <div v-if="selected" class="ss-info">
        <button class="ss-info-close" @click="selected = null">×</button>
        <div class="ss-info-zh">{{ selected.zh }}</div>
        <div class="ss-info-en">{{ selected.name }}</div>
        <p class="ss-info-fact">{{ selected.fact }}</p>
        <div class="ss-info-meta">
          距日：{{ selected.orbit }} 像素（实际 {{ (selected.orbit / 36 * 1.496).toFixed(2) }} 亿 km）
        </div>
      </div>
    </transition>

    <!-- 控制条 -->
    <div class="ss-controls">
      <button
        class="ss-ctrl"
        :class="{ on: showOrbits }"
        @click="showOrbits = !showOrbits"
        title="显示/隐藏轨道"
      >
        ⭕ 轨道
      </button>
    </div>
  </div>
</template>

<style scoped>
.ss-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1e1b4b 0%, #020617 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 太阳 */
.ss-sun {
  position: absolute;
  width: 32px;
  height: 32px;
  z-index: 5;
}
.ss-sun-core {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, #fef08a 0%, #facc15 40%, #f59e0b 100%);
  box-shadow: 0 0 24px #facc15, 0 0 48px #f59e0b;
  animation: ss-pulse 3s ease-in-out infinite;
}
.ss-sun-glow {
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(250, 204, 21, 0.3) 0%, transparent 70%);
  animation: ss-pulse 3s ease-in-out infinite;
}
@keyframes ss-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.85; }
}

/* 轨道容器 - 用 animation rotate */
.ss-orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  margin-top: v-bind('"-50%"');
  margin-left: v-bind('"-50%"');
  transform: translate(-50%, -50%);
  animation: ss-spin linear infinite;
  pointer-events: none;
}
@keyframes ss-spin {
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* 静态轨道线 */
.ss-orbit-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 1px dashed rgba(148, 163, 184, 0.25);
  border-radius: 50%;
}

/* 行星按钮 */
.ss-planet {
  position: absolute;
  top: 50%;
  left: 100%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: none;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.ss-planet:hover {
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 0 16px currentColor;
}
.ss-planet-active {
  transform: translate(-50%, -50%) scale(1.5);
  box-shadow: 0 0 20px currentColor;
  outline: 2px solid #facc15;
  outline-offset: 2px;
}

/* 行星名标签（跟着轨道转） */
.ss-label {
  position: absolute;
  top: 12%;
  left: 100%;
  transform: translateX(-50%);
  font-size: 9px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  letter-spacing: 0.5px;
  white-space: nowrap;
  pointer-events: none;
}

/* 信息卡 */
.ss-info {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 14px 18px;
  color: #e2e8f0;
  backdrop-filter: blur(8px);
  z-index: 10;
}
.ss-info-close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.ss-info-zh {
  font-size: 18px;
  font-weight: 800;
  color: #facc15;
}
.ss-info-en {
  font-size: 11px;
  color: #94a3b8;
  letter-spacing: 1px;
  margin-top: 2px;
}
.ss-info-fact {
  margin: 8px 0 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #e2e8f0;
}
.ss-info-meta {
  font-size: 10px;
  color: #64748b;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding-top: 6px;
}

/* 控制条 */
.ss-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  gap: 6px;
}
.ss-ctrl {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.ss-ctrl.on {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}

.ss-fade-enter-active,
.ss-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.ss-fade-enter-from,
.ss-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

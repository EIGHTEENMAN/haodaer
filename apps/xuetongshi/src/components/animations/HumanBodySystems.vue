<script setup lang="ts">
/**
 * HumanBodySystems — 人体循环/呼吸/消化
 *
 * 按 sectionId 自动选择动画：
 *   - hb3 → 血液循环
 *   - hb4 → 呼吸系统
 *   - hb5 → 消化系统
 *
 * SVG animateTransform 模式（同 SolarSystem）
 */
import { ref, computed } from 'vue'

const props = defineProps<{ topicId?: string; parentTopicId?: string }>()

type Mode = 'circulatory' | 'respiratory' | 'digestive'
const mode = computed<Mode>(() => {
  if (props.topicId === 'hb3') return 'circulatory'
  if (props.topicId === 'hb4') return 'respiratory'
  if (props.topicId === 'hb5') return 'digestive'
  return 'circulatory'
})

const selected = ref<string | null>(null)
const facts: Record<Mode, string> = {
  circulatory: '心脏每天跳动约 100,000 次，泵出 7,600 升血液。',
  respiratory: '成人每分钟呼吸 12-20 次，每天约 22,000 次。',
  digestive: '食物从嘴到排出需要约 24-72 小时。',
}
</script>

<template>
  <div class="hbs-wrap" @click.stop>
    <!-- 血液循环 -->
    <svg v-if="mode === 'circulatory'" class="hbs-svg" viewBox="-110 -110 220 220">
      <defs>
        <radialGradient id="heartGrad">
          <stop offset="0%" stop-color="#fb7185" />
          <stop offset="100%" stop-color="#be123c" />
        </radialGradient>
      </defs>

      <!-- 心脏（中央，搏动） -->
      <g>
        <circle r="14" fill="#fecdd3" opacity="0.4">
          <animate attributeName="r" values="14;18;14" dur="0.9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.15;0.4" dur="0.9s" repeatCount="indefinite" />
        </circle>
        <g>
          <animateTransform attributeName="transform" type="scale" values="1;1.15;1" dur="0.9s" repeatCount="indefinite" additive="sum" />
          <!-- 简化的心形：两个圆+一个三角 -->
          <path d="M 0 -3 C -8 -10 -16 -3 0 10 C 16 -3 8 -10 0 -3 Z" fill="url(#heartGrad)" stroke="#9f1239" stroke-width="0.5" />
        </g>
        <text y="22" text-anchor="middle" font-size="5" fill="#e2e8f0" font-weight="700">心脏</text>
      </g>

      <!-- 4 个循环：左肺/右肺/上身/下身 -->
      <g v-for="(loop, i) in [
        { x: -50, y: -50, label: '肺部', color: '#60a5fa' },
        { x: 50, y: -50, label: '头部', color: '#34d399' },
        { x: -50, y: 50, label: '下肢', color: '#fbbf24' },
        { x: 50, y: 50, label: '腹腔', color: '#a78bfa' },
      ]" :key="i" :transform="`translate(${loop.x} ${loop.y})`">
        <circle r="14" :fill="loop.color" opacity="0.25" />
        <text text-anchor="middle" dominant-baseline="central" font-size="5" fill="#f1f5f9" font-weight="700">{{ loop.label }}</text>
      </g>

      <!-- 流动的红细胞粒子 -->
      <g>
        <circle r="3" fill="#dc2626" cx="20" cy="0">
          <animateMotion dur="3s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
        <circle r="2.5" fill="#dc2626" cx="0" cy="0" opacity="0.7">
          <animateMotion dur="3s" begin="0.5s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
        <circle r="2.5" fill="#dc2626" cx="0" cy="0" opacity="0.7">
          <animateMotion dur="3s" begin="1s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
        <circle r="2.5" fill="#60a5fa" cx="0" cy="0" opacity="0.6">
          <animateMotion dur="3s" begin="0.25s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
        <circle r="2.5" fill="#60a5fa" cx="0" cy="0" opacity="0.6">
          <animateMotion dur="3s" begin="1.5s" repeatCount="indefinite"
            path="M 0 0 Q 50 -50 50 -50 Q 0 -100 -50 -50 Q -50 0 -50 50 Q 0 100 50 50 Q 0 0 0 0 Z"
            rotate="auto" />
        </circle>
      </g>

      <!-- 标题 -->
      <text x="-100" y="-95" font-size="6" fill="#fca5a5" font-weight="700">🔴 含氧血液</text>
      <text x="60" y="-95" font-size="6" fill="#93c5fd" font-weight="700">🔵 缺氧血液</text>
    </svg>

    <!-- 呼吸系统 -->
    <svg v-else-if="mode === 'respiratory'" class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 膈肌（底部，伸缩） -->
      <g>
        <path d="M -90 60 Q 0 80 90 60 L 90 80 L -90 80 Z" fill="#fda4af" stroke="#9f1239" stroke-width="0.6">
          <animate attributeName="d" dur="4s" repeatCount="indefinite"
            values="M -90 60 Q 0 80 90 60 L 90 80 L -90 80 Z;
                    M -90 50 Q 0 70 90 50 L 90 70 L -90 70 Z;
                    M -90 60 Q 0 80 90 60 L 90 80 L -90 80 Z" />
        </path>
        <text y="92" text-anchor="middle" font-size="5" fill="#fecdd3" font-weight="700">膈肌</text>
      </g>

      <!-- 双肺（左右，扩张收缩） -->
      <g>
        <animateTransform attributeName="transform" type="scale" values="1;1.12;1" dur="4s" repeatCount="indefinite" additive="sum" />
        <!-- 左肺 -->
        <ellipse cx="-30" cy="-10" rx="22" ry="35" fill="#fca5a5" opacity="0.8" stroke="#dc2626" stroke-width="0.8" />
        <ellipse cx="-30" cy="-10" rx="14" ry="25" fill="#fecaca" opacity="0.6" />
        <!-- 右肺 -->
        <ellipse cx="30" cy="-10" rx="22" ry="35" fill="#fca5a5" opacity="0.8" stroke="#dc2626" stroke-width="0.8" />
        <ellipse cx="30" cy="-10" rx="14" ry="25" fill="#fecaca" opacity="0.6" />
        <!-- 气管 -->
        <rect x="-3" y="-50" width="6" height="35" fill="#94a3b8" />
        <text y="-58" text-anchor="middle" font-size="5" fill="#cbd5e1" font-weight="700">气管</text>
        <text x="-30" y="35" text-anchor="middle" font-size="5" fill="#7f1d1d" font-weight="700">左肺</text>
        <text x="30" y="35" text-anchor="middle" font-size="5" fill="#7f1d1d" font-weight="700">右肺</text>
      </g>

      <!-- 进出气体粒子 -->
      <g>
        <circle r="2" fill="#60a5fa" cx="0" cy="-100" opacity="0.6">
          <animate attributeName="cy" values="-100;-50" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle r="2" fill="#60a5fa" cx="-3" cy="-100" opacity="0.5">
          <animate attributeName="cy" values="-100;-50" dur="4s" begin="0.4s" repeatCount="indefinite" />
        </circle>
        <circle r="2" fill="#f1f5f9" cx="0" cy="-50" opacity="0.5">
          <animate attributeName="cy" values="-50;-100" dur="4s" begin="2s" repeatCount="indefinite" />
        </circle>
        <circle r="2" fill="#f1f5f9" cx="3" cy="-50" opacity="0.5">
          <animate attributeName="cy" values="-50;-100" dur="4s" begin="2.4s" repeatCount="indefinite" />
        </circle>
      </g>

      <text x="-100" y="-95" font-size="6" fill="#e2e8f0" font-weight="700">💨 呼吸系统</text>
    </svg>

    <!-- 消化系统 -->
    <svg v-else class="hbs-svg" viewBox="-110 -110 220 220">
      <!-- 嘴 → 食道 → 胃 → 小肠 → 大肠 -->
      <g>
        <!-- 嘴 -->
        <ellipse cx="0" cy="-95" rx="8" ry="3" fill="#dc2626" />
        <text y="-103" text-anchor="middle" font-size="4" fill="#fecaca" font-weight="700">嘴</text>
        <!-- 食道 -->
        <rect x="-2.5" y="-90" width="5" height="25" fill="#fda4af" />
        <!-- 胃（左侧） -->
        <path d="M -25 -65 Q -45 -55 -35 -30 Q -10 -25 -5 -45 Z" fill="#fb7185" stroke="#9f1239" stroke-width="0.6" />
        <text x="-25" y="-50" text-anchor="middle" font-size="4" fill="#fff" font-weight="700">胃</text>
        <!-- 小肠（盘曲） -->
        <g>
          <path d="M -25 -10 Q -50 0 -40 20 Q -10 30 -20 50 Q 0 60 10 40 Q 25 25 5 5"
            stroke="#fb923c" stroke-width="6" fill="none" stroke-linecap="round" />
          <text x="-25" y="20" text-anchor="middle" font-size="4" fill="#7c2d12" font-weight="700">小肠</text>
        </g>
        <!-- 大肠（外框） -->
        <path d="M -70 -10 Q -85 30 -50 70 Q 30 90 70 70 Q 85 30 70 -10 Q 50 0 50 30 Q 30 50 0 50 Q -30 50 -50 30 Q -50 0 -70 -10"
          stroke="#fcd34d" stroke-width="8" fill="none" stroke-linecap="round" />
        <text x="65" y="60" text-anchor="middle" font-size="4" fill="#78350f" font-weight="700">大肠</text>
      </g>

      <!-- 食物颗粒沿食道→胃→小肠移动 -->
      <circle r="3" fill="#a16207">
        <animateMotion dur="6s" repeatCount="indefinite"
          path="M 0 -95 L 0 -65 Q -25 -50 -25 -30 Q -40 0 -20 30 Q 0 50 30 60" />
      </circle>
      <circle r="2.5" fill="#a16207">
        <animateMotion dur="6s" begin="1s" repeatCount="indefinite"
          path="M 0 -95 L 0 -65 Q -25 -50 -25 -30 Q -40 0 -20 30 Q 0 50 30 60" />
      </circle>
      <circle r="2.5" fill="#a16207">
        <animateMotion dur="6s" begin="2.5s" repeatCount="indefinite"
          path="M 0 -95 L 0 -65 Q -25 -50 -25 -30 Q -40 0 -20 30 Q 0 50 30 60" />
      </circle>

      <text x="-100" y="-95" font-size="6" fill="#fbbf24" font-weight="700">🍎 消化系统</text>
    </svg>

    <!-- 信息卡 -->
    <transition name="hbs-fade">
      <div v-if="selected" class="hbs-info">
        <button class="hbs-info-close" @click="selected = null">×</button>
        <p class="hbs-info-fact">{{ facts[mode] }}</p>
      </div>
    </transition>

    <!-- 控制条 -->
    <div class="hbs-controls">
      <button
        class="hbs-ctrl"
        @click="selected = 'fact'"
        title="查看小知识"
      >
        💡 知识
      </button>
    </div>
  </div>
</template>

<style scoped>
.hbs-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #4c0519 0%, #1c0707 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hbs-svg {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}

.hbs-info {
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
.hbs-info-close {
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
.hbs-info-fact {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #e2e8f0;
}

.hbs-controls {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 10;
}
.hbs-ctrl {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #cbd5e1;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.hbs-ctrl:hover {
  background: rgba(250, 204, 21, 0.2);
  border-color: #facc15;
  color: #facc15;
}

.hbs-fade-enter-active,
.hbs-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.hbs-fade-enter-from,
.hbs-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>

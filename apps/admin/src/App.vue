<script setup lang="ts">
import { ref, onMounted } from 'vue'

const services = ref<any[]>([])
const system = ref<any>({})
const stats = ref<any>({})
const health = ref<any>({})
const moderation = ref<any>({ pendingCount: 0, pendingList: [] })
const analytics = ref<any>({ totalViews: 0, todayViews: 0, uniquePages: 0, eventCount: 0 })
const loading = ref(true)
const error = ref('')
const autoRefresh = ref(true)

async function fetchData() {
  try {
    const [s, sy, st, h, m, a] = await Promise.all([
      fetch('/api/services').then(r => r.json()),
      fetch('/api/system').then(r => r.json()),
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/health').then(r => r.json()),
      fetch('/api/moderation').then(r => r.json()),
      fetch('/api/analytics').then(r => r.json()),
    ])
    services.value = s
    system.value = sy
    stats.value = st
    health.value = h
    moderation.value = m
    analytics.value = a
    error.value = ''
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
  if (autoRefresh.value) setInterval(fetchData, 30000)
})

function formatTime(ts: number) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}分钟前`
  const h = Math.floor(m / 60)
  return `${h}小时${m % 60}分钟前`
}

function memoryFormat(bytes: number) {
  if (!bytes) return 'N/A'
  const mb = bytes / 1024 / 1024
  return mb > 1024 ? `${(mb / 1024).toFixed(1)}GB` : `${mb.toFixed(0)}MB`
}

function contentTypeLabel(ct: string) {
  const map: Record<string, string> = {
    comment: '评论', kid_say: '童言', checkin_note: '签到', gallery_caption: '画廊',
  }
  return map[ct] || ct
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-gray-100">
    <header class="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">好大儿 管理后台</h1>
        <p class="text-sm text-gray-400 mt-1">只读监控仪表盘</p>
      </div>
      <div class="flex items-center gap-4">
        <span v-if="health.time" class="text-xs text-gray-500">更新于 {{ health.time?.slice(11, 19) }}</span>
        <button @click="fetchData" class="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
          刷新
        </button>
      </div>
    </header>

    <div v-if="error" class="mx-6 mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-sm text-red-300">
      {{ error }}
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20 text-gray-500">加载中...</div>

    <template v-if="!loading">
      <!-- Stats Cards -->
      <section class="px-6 py-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide">用户</p>
          <p class="text-2xl font-bold mt-1 text-blue-400">{{ stats.users ?? '-' }}</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide">攻略</p>
          <p class="text-2xl font-bold mt-1 text-emerald-400">{{ stats.guides ?? '-' }}</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide">段落</p>
          <p class="text-2xl font-bold mt-1 text-violet-400">{{ stats.sections ?? '-' }}</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide">评分</p>
          <p class="text-2xl font-bold mt-1 text-yellow-400">{{ stats.ratings ?? '-' }}</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide">评论</p>
          <p class="text-2xl font-bold mt-1 text-pink-400">{{ stats.comments ?? '-' }}</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide">点赞</p>
          <p class="text-2xl font-bold mt-1 text-orange-400">{{ stats.likes ?? '-' }}</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide">收藏</p>
          <p class="text-2xl font-bold mt-1 text-rose-400">{{ stats.favorites ?? '-' }}</p>
        </div>
      </section>

      <!-- Content Moderation Panel -->
      <section class="px-6 pb-6">
        <div class="bg-gray-800 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-gray-300 flex items-center gap-2">
              内容审核
              <span v-if="moderation.pendingCount > 0"
                class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {{ moderation.pendingCount }} 待审
              </span>
            </h2>
            <span class="text-xs text-gray-500">自上次构建后</span>
          </div>

          <div v-if="moderation.pendingList?.length > 0" class="space-y-2">
            <div v-for="item in moderation.pendingList" :key="item.id"
              class="bg-gray-700/40 rounded-lg p-3 text-sm">
              <div class="flex items-start justify-between mb-1">
                <span class="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">
                  {{ contentTypeLabel(item.contentType) }}
                </span>
                <span class="text-xs text-gray-500">{{ item.createdAt?.slice(11, 19) || '' }}</span>
              </div>
              <p class="text-gray-300 text-xs leading-relaxed">{{ item.content }}</p>
              <p v-if="item.reason" class="text-red-400 text-xs mt-1">⚠ {{ item.reason }}</p>
            </div>
          </div>
          <div v-else class="text-gray-500 text-sm py-2 text-center">
            暂无待审核内容
          </div>
        </div>
      </section>

      <!-- Analytics Panel -->
      <section class="px-6 pb-6">
        <div class="bg-gray-800 rounded-xl p-5">
          <h2 class="text-sm font-semibold text-gray-300 mb-4">流量分析</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p class="text-xs text-gray-500">总浏览量</p>
              <p class="text-xl font-bold text-blue-400">{{ analytics.totalViews }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">今日访问</p>
              <p class="text-xl font-bold text-emerald-400">{{ analytics.todayViews }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">独立页面</p>
              <p class="text-xl font-bold text-violet-400">{{ analytics.uniquePages }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">总事件数</p>
              <p class="text-xl font-bold text-yellow-400">{{ analytics.eventCount }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- System + Services -->
      <div class="px-6 grid md:grid-cols-2 gap-6 pb-8">
        <div class="bg-gray-800 rounded-xl p-5">
          <h2 class="text-sm font-semibold text-gray-300 mb-4">系统状态</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-gray-500">主机</span><span>{{ system.hostname }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">Node.js</span><span>{{ system.node }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">磁盘</span><span>{{ system.disk }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">内存</span><span>{{ system.memory }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">负载</span><span>{{ system.load }}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">API 状态</span>
              <span :class="health.status === 'ok' ? 'text-emerald-400' : 'text-red-400'">
                {{ health.status ?? '-' }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-gray-800 rounded-xl p-5">
          <h2 class="text-sm font-semibold text-gray-300 mb-4">服务状态</h2>
          <div class="space-y-2">
            <div v-for="s in services" :key="s.id"
              class="flex items-center justify-between py-2 px-3 rounded-lg text-sm"
              :class="s.status === 'online' ? 'bg-gray-700/50' : 'bg-red-900/20'">
              <div class="flex items-center gap-3">
                <span class="w-2 h-2 rounded-full"
                  :class="s.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'"></span>
                <span class="font-medium">{{ s.name }}</span>
                <span class="text-gray-500 text-xs">:{{ s.port }}</span>
              </div>
              <div class="flex items-center gap-4 text-xs text-gray-400">
                <span>{{ memoryFormat(s.memory) }}</span>
                <span>{{ s.cpu }}%</span>
              </div>
            </div>
            <p v-if="services.length === 0" class="text-gray-500 text-sm py-2">无运行中服务</p>
          </div>
        </div>
      </div>

      <div class="px-6 pb-8">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">快捷入口</h2>
        <div class="flex flex-wrap gap-3 text-sm">
          <a v-for="link in [
            { name: '主站', url: 'https://grandand.com' },
            { name: '走天下', url: 'https://travel.grandand.com' },
            { name: '认证服务', url: 'https://auth.grandand.com/health' },
          ]" :key="link.name" :href="link.url" target="_blank"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            {{ link.name }} ↗
          </a>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>
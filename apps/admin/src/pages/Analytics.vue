<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'

const startDate = ref(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
const endDate = ref(new Date().toISOString().slice(0, 10))
const loading = ref(false)

const data = ref<any>({ users: {}, quiz: {} })

// Chart instances
let userChart: any = null
let categoryChart: any = null
let difficultyChart: any = null

async function fetchData() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('startDate', startDate.value)
    params.set('endDate', endDate.value)
    const r = await fetch('/api/admin/analytics/overview?' + params.toString())
    data.value = await r.json()
    await nextTick()
    renderCharts()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function initChart(elId: string) {
  const el = document.getElementById(elId)
  if (!el) return null
  const chart = echarts.init(el)
  return chart
}

function renderCharts() {
  // User growth line chart
  if (userChart) userChart.dispose()
  userChart = initChart('chart-user-growth')
  if (userChart) {
    const growth = data.value.users?.growth || []
    userChart.setOption({
      title: { text: '用户增长趋势', textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, bottom: 30, top: 40 },
      xAxis: { type: 'category', data: growth.map((g: any) => g.d), axisLabel: { fontSize: 11, color: '#94a3b8' } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11, color: '#94a3b8' } },
      series: [{
        type: 'line', smooth: true, data: growth.map((g: any) => g.cnt),
        lineStyle: { color: '#2563eb', width: 2 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(37,99,235,0.2)' }, { offset: 1, color: 'rgba(37,99,235,0)' }] } },
        itemStyle: { color: '#2563eb' },
      }],
    })
  }

  // Category pie chart
  if (categoryChart) categoryChart.dispose()
  categoryChart = initChart('chart-category')
  if (categoryChart) {
    const catData = data.value.quiz?.byCategory || []
    const catLabel: Record<string, string> = { chinese: '语文', science: '科学', english: '英语', general: '常识', math: '数学' }
    const colors = { chinese: '#f59e0b', science: '#06b6d4', english: '#ec4899', general: '#8b5cf6', math: '#ef4444' }
    categoryChart.setOption({
      title: { text: '题目分类分布', textStyle: { fontSize: 14, fontWeight: 600 }, left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie', radius: ['36%', '60%'], center: ['50%', '55%'],
        data: catData.map((c: any) => ({ name: catLabel[c.category] || c.category, value: c.cnt, itemStyle: { color: (colors as any)[c.category] || '#94a3b8' } })),
        label: { fontSize: 12, color: '#64748b' },
        emphasis: { label: { fontSize: 14, fontWeight: 'bold' } },
      }],
    })
  }

  // Difficulty bar chart
  if (difficultyChart) difficultyChart.dispose()
  difficultyChart = initChart('chart-difficulty')
  if (difficultyChart) {
    const diffData = data.value.quiz?.byDifficulty || []
    const diffLabel: Record<number, string> = { 1: '简单', 2: '中等', 3: '困难' }
    const diffColors = ['#16a34a', '#ca8a04', '#dc2626']
    difficultyChart.setOption({
      title: { text: '题目难度分布', textStyle: { fontSize: 14, fontWeight: 600 } },
      tooltip: { trigger: 'axis' },
      grid: { left: 50, right: 20, bottom: 30, top: 40 },
      xAxis: { type: 'category', data: diffData.map((d: any) => diffLabel[d.difficulty] || '未知'), axisLabel: { fontSize: 12 } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { fontSize: 11, color: '#94a3b8' } },
      series: [{
        type: 'bar', data: diffData.map((d: any, i: number) => ({ value: d.cnt, itemStyle: { color: diffColors[i] || '#94a3b8', borderRadius: [4, 4, 0, 0] } })),
        barWidth: '50%',
      }],
    })
  }
}

function handleResize() {
  userChart?.resize()
  categoryChart?.resize()
  difficultyChart?.resize()
}

function onPreset(days: number) {
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  startDate.value = start.toISOString().slice(0, 10)
  endDate.value = end.toISOString().slice(0, 10)
  fetchData()
}

onMounted(fetchData)

onUnmounted(() => {
  userChart?.dispose()
  categoryChart?.dispose()
  difficultyChart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <!-- Time Filters -->
  <div class="card" style="margin-bottom:16px">
    <div class="toolbar">
      <div class="filter-group">
        <span class="filter-label">开始</span>
        <input v-model="startDate" type="date" class="input" style="padding:6px 10px" />
      </div>
      <div class="filter-group">
        <span class="filter-label">结束</span>
        <input v-model="endDate" type="date" class="input" style="padding:6px 10px" />
      </div>
      <div class="filter-group" style="gap:4px">
        <button class="btn btn-sm btn-outline" @click="onPreset(7)">7天</button>
        <button class="btn btn-sm btn-outline" @click="onPreset(30)">30天</button>
        <button class="btn btn-sm btn-outline" @click="onPreset(90)">90天</button>
      </div>
      <button class="btn btn-primary" @click="fetchData">查询</button>
    </div>
  </div>

  <div v-if="loading" class="loading-state">加载中...</div>

  <template v-if="!loading">
    <!-- Overview Stats -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">总注册用户</div>
        <div class="stat-value" style="color:#2563eb">{{ data.users?.total ?? '-' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总题目数</div>
        <div class="stat-value" style="color:#16a34a">{{ data.quiz?.totalQuestions ?? '-' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">玩家总数</div>
        <div class="stat-value" style="color:#9333ea">{{ data.quiz?.totalPlayers ?? '-' }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总对局数</div>
        <div class="stat-value" style="color:#f97316">{{ data.quiz?.totalGames ?? '-' }}</div>
      </div>
    </div>

    <!-- Charts -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card" style="padding:16px">
        <div id="chart-user-growth" style="height:280px"></div>
      </div>
      <div class="card" style="padding:16px">
        <div id="chart-category" style="height:280px"></div>
      </div>
      <div class="card" style="padding:16px">
        <div id="chart-difficulty" style="height:280px"></div>
      </div>
      <div class="card" style="padding:16px;display:flex;flex-direction:column;justify-content:center;align-items:center">
        <div style="font-size:13px;color:#94a3b8;margin-bottom:4px">角色分布</div>
        <div v-if="data.users?.roleDist?.length" style="width:100%;display:flex;flex-direction:column;gap:12px;padding:20px">
          <div v-for="r in data.users.roleDist" :key="r.role" style="display:flex;align-items:center;gap:10px">
            <span style="font-size:13px;min-width:56px;font-weight:500;color:#64748b">
              {{ { user: '普通用户', admin: '管理员', moderator: '审核员' }[r.role] || r.role }}
            </span>
            <div style="flex:1;height:22px;background:#f1f5f9;border-radius:8px;overflow:hidden">
              <div
                :style="{
                  width: (r.cnt / Math.max(...data.users.roleDist.map((x: any) => x.cnt)) * 100) + '%',
                  height: '100%',
                  background: r.role === 'admin' ? '#dc2626' : r.role === 'moderator' ? '#ca8a04' : '#2563eb',
                  borderRadius: '8px',
                  transition: 'width 0.5s',
                }"
              ></div>
            </div>
            <span style="font-size:13px;font-weight:600;color:#0f172a;min-width:36px;text-align:right">{{ r.cnt }}</span>
          </div>
        </div>
        <div v-else class="empty-text" style="padding:20px">暂无数据</div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const users = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const downloading = ref(false)

const keyword = ref('')

async function search() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))

    const r = await fetch('/api/admin/users?' + params.toString())
    const d = await r.json()
    users.value = d.list
    total.value = d.total
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function downloadExcel() {
  downloading.value = true
  try {
    const params = new URLSearchParams()
    if (keyword.value.trim()) params.set('keyword', keyword.value.trim())

    const r = await fetch('/api/admin/users/download?' + params.toString())
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `好大儿用户-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error(e)
    alert('下载失败')
  } finally {
    downloading.value = false
  }
}

function onSearch() {
  page.value = 1
  search()
}

function goPage(p: number) {
  page.value = p
  search()
}

const totalPages = () => Math.ceil(total.value / pageSize.value)

function roleLabel(role: string) {
  const map: Record<string, string> = { user: '用户', admin: '管理员', moderator: '审核员' }
  return map[role] || role
}

function roleTag(role: string) {
  const map: Record<string, string> = { user: 'tag-blue', admin: 'tag-red', moderator: 'tag-yellow' }
  return map[role] || 'tag-gray'
}

onMounted(search)
</script>

<template>
  <div class="card" style="margin-bottom:16px">
    <div class="toolbar">
      <div class="search-box" style="max-width:300px">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px" @click="onSearch">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="keyword" placeholder="搜索用户名/昵称/手机号" @keyup.enter="onSearch" />
      </div>
      <div style="flex:1"></div>
      <button class="btn btn-primary" :disabled="downloading" @click="downloadExcel">
        {{ downloading ? '生成中...' : '📥 下载 Excel' }}
      </button>
    </div>
  </div>

  <div class="card">
    <div class="section-header">
      <h3 class="section-title">用户列表 <span style="font-weight:400;color:#94a3b8;font-size:13px">共 {{ total }} 人</span></h3>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else-if="users.length === 0" class="empty-state">
      <div class="empty-icon">👤</div>
      <div class="empty-text">暂无用户数据</div>
    </div>

    <template v-else>
      <table class="data-table">
        <thead>
          <tr>
            <th>用户ID</th>
            <th>用户名</th>
            <th>昵称</th>
            <th>手机号</th>
            <th>邮箱</th>
            <th>角色</th>
            <th>注册时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td style="font-size:11px;color:#94a3b8;max-width:160px;overflow:hidden;text-overflow:ellipsis">{{ u.id }}</td>
            <td style="font-weight:500">{{ u.username }}</td>
            <td>{{ u.nickname || '-' }}</td>
            <td>{{ u.phone || '-' }}</td>
            <td style="font-size:12px;color:#64748b">{{ u.email || '-' }}</td>
            <td><span :class="['tag', roleTag(u.role)]">{{ roleLabel(u.role) }}</span></td>
            <td style="color:#94a3b8;font-size:12px">{{ u.created_at?.slice(0, 19)?.replace('T', ' ') }}</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="totalPages() > 1">
        <button class="page-btn" :disabled="page <= 1" @click="goPage(page - 1)">‹</button>
        <template v-for="p in totalPages()" :key="p">
          <button v-if="Math.abs(p - page) <= 2 || p === 1 || p === totalPages()" :class="['page-btn', { active: p === page }]" @click="goPage(p)">{{ p }}</button>
          <span v-else-if="p === page - 3 || p === page + 3" class="page-info">...</span>
        </template>
        <button class="page-btn" :disabled="page >= totalPages()" @click="goPage(page + 1)">›</button>
      </div>
    </template>
  </div>
</template>

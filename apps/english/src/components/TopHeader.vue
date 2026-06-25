<script setup lang="ts">
import { ref, computed } from 'vue'
import { isLoggedIn, getUser, useAuth } from '@shared/composables/useAuth'

const localUser = ref<any>(null)
localUser.value = isLoggedIn() ? getUser() : null

const displayName = computed(() => {
  if (!localUser.value) return ''
  const u = localUser.value as any
  try {
    const profile = JSON.parse(localStorage.getItem('haodaer_active_profile') || '{}')
    return profile?.nickname || u.nickname || u.username || '用户'
  } catch {
    return u.nickname || u.username || '用户'
  }
})

function logout() {
  if (!confirm('确定要退出登录吗？')) return
  const auth = useAuth()
  auth.logout()
  localUser.value = null
  window.location.reload()
}
</script>

<template>
  <header class="top-header">
    <div class="top-inner">
      <div class="header-left">
        <a href="https://grandand.com" class="logo">好大儿</a>
        <span class="header-divider">/</span>
        <span class="header-sub">英语乐园</span>
      </div>
      <div class="header-right">
        <a href="https://english.grandand.com/#/study" class="header-link">学习</a>
        <a href="https://english.grandand.com/#/chat" class="header-link">对话</a>
        <a href="https://english.grandand.com/#/profile" class="header-link">我的</a>
        <template v-if="localUser">
          <span class="header-user">{{ displayName }}</span>
          <button class="header-logout" @click="logout">退出</button>
        </template>
        <a v-else href="https://grandand.com/?login=1" class="header-login">登录</a>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
}

.top-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.logo {
  font-size: 24px;
  font-weight: 800;
  color: #2563eb;
  text-decoration: none;
  line-height: 1;
  white-space: nowrap;
}

.header-divider {
  color: #cbd5e1;
  font-size: 16px;
  font-weight: 400;
}

.header-sub {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-link {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  text-decoration: none;
  transition: all 0.15s;
}

.header-link:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.header-user {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 8px;
  background: #f0f7ff;
}

.header-logout {
  padding: 4px 10px;
  background: transparent;
  color: #9ca3af;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s;
}

.header-logout:hover {
  color: #ef4444;
}

.header-login {
  padding: 6px 16px;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
}

.header-login:hover {
  background: #1d4ed8;
}

@media (max-width: 640px) {
  .header-right .header-link { padding: 6px 10px; font-size: 12px; }
  .header-sub { display: none; }
  .header-divider { display: none; }
  .logo { font-size: 22px; }
}
</style>
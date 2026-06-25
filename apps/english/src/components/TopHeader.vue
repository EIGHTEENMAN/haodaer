<script setup lang="ts">
import { ref, computed } from 'vue'
import { isLoggedIn, getUser } from '@shared/composables/useAuth'

const localUser = ref<any>(null)
localUser.value = isLoggedIn() ? getUser() : null
const displayName = computed(() => {
  if (!localUser.value) return ''
  const u = localUser.value as any
  if (u.children && u.children.length > 0) {
    try {
      const profile = JSON.parse(localStorage.getItem('haodaer_active_profile') || '{}')
      return profile?.nickname || u.children[0].nickname || '小朋友'
    } catch { return '小朋友' }
  }
  return u.nickname || u.username || '小朋友'
})
</script>

<template>
  <header class="top-header">
    <div class="top-inner">
      <a href="https://grandand.com" class="top-logo">好大儿</a>
      <span class="top-title">英语乐园</span>
      <span v-if="displayName" class="top-user">{{ displayName }}</span>
    </div>
  </header>
</template>

<style scoped>
.top-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 2px 0 rgba(15, 27, 61, 0.06);
}

.top-inner {
  max-width: 640px;
  margin: 0 auto;
  padding: 10px var(--gap-md);
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
}

.top-logo {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
  flex-shrink: 0;
}

.top-title {
  font-family: var(--font-display);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--color-text-sub);
  flex: 1;
  text-align: center;
}

.top-user {
  font-family: var(--font-display);
  font-size: var(--text-small);
  font-weight: 600;
  color: var(--color-primary);
  padding: 4px 12px;
  background: var(--color-primary-light);
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}
</style>
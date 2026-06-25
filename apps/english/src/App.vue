<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import YouthModeGate from '@shared/components/YouthModeGate.vue'
import TopHeader from './components/TopHeader.vue'
import BottomNav from './components/BottomNav.vue'
import LoginModal from './components/LoginModal.vue'
import { router, type Route } from './router'
import { syncAuthFromCookie } from '@shared/utils/authSync'
import { registerAllWordAudio } from './utils/wordAudio'
import { loadFromStorage } from './utils/storage'

// ─── 同步 import — Vite 自动 code-split，构建时分 chunk ───
import StudyHome from './pages/study/StudyHome.vue'
import StudyHub from './pages/study/StudyHub.vue'
import StudyStageList from './pages/study/StageList.vue'
import StudyFlashCard from './pages/study/FlashCard.vue'
import StudyReadAlong from './pages/study/ReadAlong.vue'
import StudyReview from './pages/study/ReviewPage.vue'
import ChatHome from './pages/chat/ChatHome.vue'
import ChatPanel from './pages/chat/ChatPanel.vue'
import ProfileScreen from './pages/profile/ProfileScreen.vue'
import SettingsPanel from './pages/profile/SettingsPanel.vue'

function parseStudyHash(): { themeId: string | null, stage: number | null } {
  const h = window.location.hash.replace(/^#\/?study\/?/, '')
  const parts = h.split('/')
  return {
    themeId: parts[0] || null,
    stage: parts[1] ? parseInt(parts[1], 10) : null
  }
}

function parseChatHash(): string | null {
  const h = window.location.hash.replace(/^#\/?chat\/?/, '')
  return h || null
}

function parseProfileHash(): string | null {
  const h = window.location.hash.replace(/^#\/?profile\/?/, '')
  return h || null
}

const studyPath = ref(parseStudyHash())
const chatPath = ref(parseChatHash())
const profilePath = ref(parseProfileHash())

// 当前路由用 ref 镜像 — 确保 template 响应式追踪
const currentRoute = ref<Route>(router.current)

function onHashChange() {
  // hash 任何变化都重新解析所有 path
  studyPath.value = parseStudyHash()
  chatPath.value = parseChatHash()
  profilePath.value = parseProfileHash()
  currentRoute.value = router.current
}

onMounted(() => {
  console.log('[App] mounted, hash=', window.location.hash, 'router=', router.current)
  try {
    syncAuthFromCookie()
    loadFromStorage()
    registerAllWordAudio()
    window.addEventListener('hashchange', onHashChange)
    console.log('[App] ready')
  } catch (e) {
    console.error('[App] init failed:', e)
  }
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
})

const showLogin = ref(false)
const showContent = ref(true)

// 显式暴露 router 给 template（保险起见）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _router = router
</script>

<template>
  <YouthModeGate>
    <div class="app-root">
      <TopHeader />
      <main class="app-main">
        <template v-if="currentRoute === 'study'">
          <StudyHub v-if="studyPath.themeId === '__hub__'" />
          <StudyReview v-else-if="studyPath.themeId === '__review__'" />
          <StudyFlashCard
            v-else-if="studyPath.themeId && studyPath.stage"
            :theme-id="studyPath.themeId"
            :stage="studyPath.stage"
          />
          <StudyReadAlong v-else-if="studyPath.themeId === '__read__'" />
          <StudyStageList v-else-if="studyPath.themeId" :theme-id="studyPath.themeId" />
          <StudyHome v-else />
        </template>

        <template v-else-if="currentRoute === 'chat'">
          <ChatPanel v-if="chatPath" :character-id="chatPath" />
          <ChatHome v-else />
        </template>

        <template v-else-if="currentRoute === 'profile'">
          <SettingsPanel v-if="profilePath === 'settings'" />
          <ProfileScreen v-else />
        </template>
      </main>

      <BottomNav v-if="!(currentRoute === 'study' && !studyPath.themeId)" />

      <LoginModal v-if="showLogin" @close="showLogin = false" />
    </div>
  </YouthModeGate>
</template>

<style>
.app-root {
  min-height: 100vh;
  background: var(--color-bg);
  padding-bottom: 80px;
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--gap-md) var(--gap-md);
}
</style>
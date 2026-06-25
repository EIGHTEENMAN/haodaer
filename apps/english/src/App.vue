<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import YouthModeGate from '@shared/components/YouthModeGate.vue'
import BottomNav from './components/BottomNav.vue'
import LoginModal from './components/LoginModal.vue'
import { router } from './router'
import { syncAuthFromCookie } from '@shared/utils/authSync'
import { registerAllWordAudio } from './utils/wordAudio'
import { loadFromStorage } from './utils/storage'

// ─── 路由懒加载 ───
const StudyHome = shallowRef(null as any)
const StudyStageList = shallowRef(null as any)
const StudyFlashCard = shallowRef(null as any)
const StudyReadAlong = shallowRef(null as any)
const StudyReview = shallowRef(null as any)
const ChatHome = shallowRef(null as any)
const ChatPanel = shallowRef(null as any)
const ProfileScreen = shallowRef(null as any)
const SettingsPanel = shallowRef(null as any)

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

function onHashChange() {
  if (router.current === 'study') {
    studyPath.value = parseStudyHash()
  } else if (router.current === 'chat') {
    chatPath.value = parseChatHash()
  } else if (router.current === 'profile') {
    profilePath.value = parseProfileHash()
  }
}

onMounted(async () => {
  syncAuthFromCookie()
  loadFromStorage()
  registerAllWordAudio()
  window.addEventListener('hashchange', onHashChange)

  StudyHome.value = (await import('./pages/study/StudyHome.vue')).default
  StudyStageList.value = (await import('./pages/study/StageList.vue')).default
  StudyFlashCard.value = (await import('./pages/study/FlashCard.vue')).default
  StudyReadAlong.value = (await import('./pages/study/ReadAlong.vue')).default
  StudyReview.value = (await import('./pages/study/ReviewPage.vue')).default
  ChatHome.value = (await import('./pages/chat/ChatHome.vue')).default
  ChatPanel.value = (await import('./pages/chat/ChatPanel.vue')).default
  ProfileScreen.value = (await import('./pages/profile/ProfileScreen.vue')).default
  SettingsPanel.value = (await import('./pages/profile/SettingsPanel.vue')).default
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
})

const showLogin = ref(false)
</script>

<template>
  <YouthModeGate>
    <div class="app-root">
      <main class="app-main">
        <template v-if="router.current === 'study'">
          <component :is="StudyReview" v-if="studyPath.themeId === '__review__'" />
          <component
            :is="StudyFlashCard"
            v-else-if="studyPath.themeId && studyPath.stage"
            :theme-id="studyPath.themeId"
            :stage="studyPath.stage"
          />
          <component :is="StudyReadAlong" v-else-if="studyPath.themeId === '__read__'" />
          <component :is="StudyStageList" v-else-if="studyPath.themeId" :theme-id="studyPath.themeId" />
          <component :is="StudyHome" v-else />
        </template>

        <template v-else-if="router.current === 'chat'">
          <component :is="ChatPanel" v-if="chatPath" :character-id="chatPath" />
          <component :is="ChatHome" v-else />
        </template>

        <template v-else-if="router.current === 'profile'">
          <component :is="SettingsPanel" v-if="profilePath === 'settings'" />
          <component :is="ProfileScreen" v-else />
        </template>
      </main>

      <BottomNav />

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
  max-width: 640px;
  margin: 0 auto;
  padding: 0 var(--gap-md);
}
</style>
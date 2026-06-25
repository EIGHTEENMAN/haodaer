<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import YouthModeGate from '@shared/components/YouthModeGate.vue'
import BottomNav from './components/BottomNav.vue'
import LoginModal from './components/LoginModal.vue'
import { router } from './router'
import { syncAuthFromCookie } from '@shared/utils/authSync'
import { registerAllWordAudio } from './utils/wordAudio'
import { loadFromStorage } from './utils/storage'

// ─── 路由懒加载（code-split） ───
const StudyHome = shallowRef(null as any)
const StudyStageList = shallowRef(null as any)
const StudyFlashCard = shallowRef(null as any)
const StudyReadAlong = shallowRef(null as any)
const StudyReview = shallowRef(null as any)
const ChatPlaceholder = shallowRef(null as any)
const ProfileScreen = shallowRef(null as any)
const SettingsPanel = shallowRef(null as any)

// 解析 #/study/<themeId>/<stage> 格式
function parseStudyHash(): { themeId: string | null, stage: number | null } {
  const h = window.location.hash.replace(/^#\/?study\/?/, '')
  const parts = h.split('/')
  return {
    themeId: parts[0] || null,
    stage: parts[1] ? parseInt(parts[1], 10) : null
  }
}

// 解析 #/profile/<sub>
function parseProfileHash(): string | null {
  const h = window.location.hash.replace(/^#\/?profile\/?/, '')
  return h || null
}

const studyPath = ref(parseStudyHash())
const profilePath = ref(parseProfileHash())

function onHashChange() {
  if (router.current === 'study') {
    studyPath.value = parseStudyHash()
  } else if (router.current === 'profile') {
    profilePath.value = parseProfileHash()
  }
}

onMounted(async () => {
  // 1. 跨域 auth 同步
  syncAuthFromCookie()
  // 2. 加载本地学习数据
  loadFromStorage()
  // 3. 注册单词音频（修复版）
  registerAllWordAudio()

  // 4. 监听 hashchange
  window.addEventListener('hashchange', onHashChange)

  // 5. 懒加载所有页面
  StudyHome.value = (await import('./pages/study/StudyHome.vue')).default
  StudyStageList.value = (await import('./pages/study/StageList.vue')).default
  StudyFlashCard.value = (await import('./pages/study/FlashCard.vue')).default
  StudyReadAlong.value = (await import('./pages/study/ReadAlong.vue')).default
  StudyReview.value = (await import('./pages/study/ReviewPage.vue')).default
  ChatPlaceholder.value = (await import('./pages/chat/ChatPlaceholder.vue')).default
  ProfileScreen.value = (await import('./pages/profile/ProfileScreen.vue')).default
  SettingsPanel.value = (await import('./pages/profile/SettingsPanel.vue')).default
})

onUnmounted(() => {
  window.removeEventListener('hashchange', onHashChange)
})

// 登录弹窗
const showLogin = ref(false)
</script>

<template>
  <YouthModeGate>
    <div class="app-root">
      <main class="app-main">
        <!-- 学习 Tab 子路由 -->
        <template v-if="router.current === 'study'">
          <component
            :is="StudyReview"
            v-if="studyPath.themeId === '__review__'"
          />
          <component
            :is="StudyFlashCard"
            v-else-if="studyPath.themeId && studyPath.stage"
            :theme-id="studyPath.themeId"
            :stage="studyPath.stage"
          />
          <component
            :is="StudyReadAlong"
            v-else-if="studyPath.themeId === '__read__'"
          />
          <component
            :is="StudyStageList"
            v-else-if="studyPath.themeId"
            :theme-id="studyPath.themeId"
          />
          <component :is="StudyHome" v-else />
        </template>

        <!-- AI 对话 Tab -->
        <component :is="ChatPlaceholder" v-else-if="router.current === 'chat'" />

        <!-- 我的 Tab（子路由：settings） -->
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
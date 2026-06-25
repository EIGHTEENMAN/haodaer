<script setup lang="ts">
import { onMounted } from 'vue'
import YouthModeGate from '@shared/components/YouthModeGate.vue'
import BottomNav from './components/BottomNav.vue'
import LoginModal from './components/LoginModal.vue'
import { router } from './router'
import { syncAuthFromCookie } from '@shared/utils/authSync'
import { registerAllWordAudio } from './utils/wordAudio'
import { loadFromStorage } from './utils/storage'
import { isLoggedIn } from '@shared/composables/useAuth'
import { ref, shallowRef } from 'vue'

// ─── 路由懒加载（code-split） ───
const StudyHome = shallowRef(null as any)
const StudyStageList = shallowRef(null as any)
const StudyFlashCard = shallowRef(null as any)
const StudyReadAlong = shallowRef(null as any)
const StudyReview = shallowRef(null as any)
const ChatPlaceholder = shallowRef(null as any)
const ProfilePlaceholder = shallowRef(null as any)

// 解析 #study/animals/1 格式
function parseStudyHash(): { themeId: string | null, stage: number | null } {
  const h = window.location.hash.replace(/^#\/?study\/?/, '')
  const parts = h.split('/')
  return {
    themeId: parts[0] || null,
    stage: parts[1] ? parseInt(parts[1], 10) : null
  }
}

const studyPath = ref(parseStudyHash())

// 监听 hash 变化更新 studyPath
window.addEventListener('hashchange', () => {
  if (router.current === 'study') {
    studyPath.value = parseStudyHash()
  }
})

onMounted(async () => {
  // 1. 跨域 auth 同步（从 cookie 恢复 sessionStorage）
  syncAuthFromCookie()

  // 2. 加载本地学习数据
  loadFromStorage()

  // 3. 注册单词音频（修复版）
  registerAllWordAudio()

  // 4. 懒加载学习 Tab 组件
  StudyHome.value = (await import('./pages/study/StudyHome.vue')).default
  StudyStageList.value = (await import('./pages/study/StageList.vue')).default
  StudyFlashCard.value = (await import('./pages/study/FlashCard.vue')).default
  StudyReadAlong.value = (await import('./pages/study/ReadAlong.vue')).default
  StudyReview.value = (await import('./pages/study/ReviewPage.vue')).default
  ChatPlaceholder.value = (await import('./pages/chat/ChatPlaceholder.vue')).default
  ProfilePlaceholder.value = (await import('./pages/profile/ProfilePlaceholder.vue')).default
})

// 登录弹窗（未登录时显示）
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

        <!-- 我的 Tab -->
        <component :is="ProfilePlaceholder" v-else-if="router.current === 'profile'" />
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
  /* 给底部导航留空间 */
  padding-bottom: 80px;
}

.app-main {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 var(--gap-md);
}
</style>
import { reactive } from 'vue'

/**
 * 轻量 hash 路由
 * - #/study             → 学习 Tab（默认）
 * - #/study/动物/1      → 学习子页（关卡）
 * - #/study/__review__  → 复习
 * - #/study/__read__    → 跟读
 * - #/chat              → AI 对话首页
 * - #/chat/foxie        → 角色对话
 * - #/profile           → 我的
 * - #/profile/settings  → 设置
 */

export type Route = 'study' | 'chat' | 'profile'

const VALID_ROUTES: Route[] = ['study', 'chat', 'profile']

/** 从 hash 中提取顶级路由名（处理子路由如 #/chat/foxie） */
export function parseRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '')
  const first = h.split('/')[0]
  return (VALID_ROUTES as string[]).includes(first) ? (first as Route) : 'study'
}

/**
 * 路由 store：使用 reactive 模块单例
 * Vue 3 <script setup> 模板会自动追踪 reactive 对象属性的依赖
 */
export const router = reactive({
  current: 'study' as Route,
  navigate(r: Route) {
    window.location.hash = '#/' + r
    // 直接同步改 current（避免 hashchange 异步触发空窗）
    router.current = r
  },
  back() {
    router.navigate('study')
  }
})

export function initRouter() {
  router.current = parseRoute()
  if (!window.location.hash) {
    window.location.hash = '#/study'
  }
  window.addEventListener('hashchange', () => {
    router.current = parseRoute()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}
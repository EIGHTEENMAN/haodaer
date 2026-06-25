import { reactive } from 'vue'

/**
 * 轻量 hash 路由（参考 xuetongshi 站点 #detail/topicId 模式）
 * - #/study → 学习 Tab
 * - #/chat → AI 对话 Tab
 * - #/profile → 我的 Tab
 * - 默认 study
 */

export type Route = 'study' | 'chat' | 'profile'

const VALID_ROUTES: Route[] = ['study', 'chat', 'profile']

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (VALID_ROUTES as string[]).includes(h) ? (h as Route) : 'study'
}

export const router = reactive({
  current: 'study' as Route,
  navigate(r: Route) {
    if (this.current === r) return
    window.location.hash = '#/' + r
    // 不在这里直接赋值 — 让 hashchange 事件统一处理避免双触发
  },
  back() {
    this.navigate('study')
  }
})

export function initRouter() {
  router.current = parseHash()
  // 修正无 hash 时默认路由
  if (!window.location.hash) {
    window.location.hash = '#/study'
  }
  window.addEventListener('hashchange', () => {
    router.current = parseHash()
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })
}
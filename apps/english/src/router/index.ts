import { reactive } from 'vue'

/**
 * 轻量 hash 路由（参考 xuetongshi 站点 #detail/topicId 模式）
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

export const router = reactive({
  current: 'study' as Route,
  navigate(r: Route) {
    if (this.current === r) return
    // 如果当前有子路由，切到顶级（清掉子路由）；否则保持
    const current = window.location.hash.replace(/^#\/?/, '')
    const hasSubroute = current.split('/').length > 1
    window.location.hash = '#/' + r
    // navigate 不直接改 current — 让 hashchange 统一处理
  },
  back() {
    this.navigate('study')
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
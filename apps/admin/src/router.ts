import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './pages/Dashboard.vue'
import QuizBank from './pages/QuizBank.vue'
import Users from './pages/Users.vue'
import Analytics from './pages/Analytics.vue'

const routes = [
  { path: '/', name: 'dashboard', component: Dashboard, meta: { title: '仪表盘' } },
  { path: '/questions', name: 'questions', component: QuizBank, meta: { title: '题库管理' } },
  { path: '/users', name: 'users', component: Users, meta: { title: '用户管理' } },
  { path: '/analytics', name: 'analytics', component: Analytics, meta: { title: '运营分析' } },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})

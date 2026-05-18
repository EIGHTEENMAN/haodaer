<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { isLoggedIn, getUser, getIsNewUser, fetchUser, setUser } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import AuthModal from '@/components/AuthModal.vue'
import ProfileSetup from '@/components/ProfileSetup.vue'
import PersonalCenter from '@/components/PersonalCenter.vue'
import SearchPage from '@/components/SearchPage.vue'
import DocPage from '@/components/DocPage.vue'

const auth = useAuthStore()
const localUser = ref<any>(getUser())
const showAuth = ref(false)
const showSetup = ref(false)
const showProfile = ref(false)
const searchQuery = ref('')
const isSearchPage = ref(false)
const isDocPage = ref(false)

function doSearch() {
  if (searchQuery.value.trim()) {
    window.location.href = '/search?q=' + encodeURIComponent(searchQuery.value.trim())
  }
}

function refreshUser() {
  localUser.value = isLoggedIn() ? getUser() : null
}

onMounted(() => {
  isSearchPage.value = window.location.pathname.startsWith('/search')
  isDocPage.value = window.location.pathname.startsWith('/doc')
  if (!isSearchPage.value) {
    refreshUser()
    window.addEventListener('storage', refreshUser)
  } else {
    const params = new URLSearchParams(window.location.search)
    const sq = params.get('q')
    if (sq) searchQuery.value = sq
  }
  // Check for new user setup
  if (isLoggedIn() && getIsNewUser()) {
    const u = getUser()
    if (!u?.nickname || u.nickname.startsWith('user_')) {
      showSetup.value = true
    }
  }
})

function handleLogin(user: any) {
  refreshUser()
  const isNew = getIsNewUser()
  if (isNew && (!user.nickname || user.nickname.startsWith('user_'))) {
    showSetup.value = true
  }
}

function handleLogout() {
  auth.logout()
  localUser.value = null
}

function openProfile() { showProfile.value = true }

async function handleSetupComplete() {
  showSetup.value = false
  const u = await fetchUser()
  if (u) {
    setUser(u)
    localUser.value = u
  }
}

const apps = [
  { name: '学国学', desc: '经典启蒙，明智修身', icon: '📚', href: 'https://xueguoxue.grandand.com', color: '#8b5cf6' },
  { name: '学诗词', desc: '唐诗宋词，古韵童声', icon: '📜', href: 'https://xueshici.grandand.com', color: '#f59e0b' },
  { name: '学通识', desc: '天文地理，万物百科', icon: '🔭', href: 'https://xuetongshi.grandand.com', color: '#06b6d4' },
  { name: '学英语', desc: '趣味单词，自然拼读', icon: '🔤', href: 'https://english.grandand.com', color: '#ec4899' },
  { name: '来挑战', desc: '答题对战，益智闯关', icon: '⚡', href: 'https://tiaozhan.grandand.com', color: '#ef4444' },
  { name: '走天下', desc: '亲子旅行攻略分享', icon: '✈️', href: 'https://travel.grandand.com', color: '#3b82f6' },
]

const stats = [
  { label: '国学经典', count: '100+', unit: '部', icon: '📚', color: '#8b5cf6' },
  { label: '唐诗宋词', count: '1000', unit: '首', icon: '📜', color: '#f59e0b' },
  { label: '通识百科', count: '2000', unit: '篇', icon: '🔭', color: '#06b6d4' },
  { label: '英语单词', count: '3000', unit: '词', icon: '🔤', color: '#ec4899' },
  { label: '益智题目', count: '5000', unit: '道', icon: '⚡', color: '#ef4444' },
  { label: '亲子攻略', count: '1000+', unit: '篇', icon: '✈️', color: '#3b82f6' },
]
</script>

<template>
  <div class="page" v-if="!isSearchPage && !isDocPage">
    <!-- Header Nav -->
    <header class="header">
      <div class="header-inner">
        <div class="header-left">
          <a href="https://grandand.com" class="logo">好大儿</a>
          <form class="header-search" @submit.prevent="doSearch">
            <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" @click="doSearch">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              placeholder="搜索"
              class="search-input"
            />
          </form>
        </div>
        <div class="header-right">
          <div class="header-links">
            <a href="https://forum.grandand.com" class="header-link">💬 论坛</a>
            <a href="https://store.grandand.com" class="header-link">🎁 商城</a>
            <a href="/faq" class="header-link">❓ 帮助</a>
          </div>
          <div class="header-auth">
            <template v-if="localUser">
              <span class="header-user" @click="openProfile" style="cursor:pointer">
                <span v-if="localUser.avatar" class="header-avatar">{{ localUser.avatar }}</span>
                <span>{{ localUser.nickname || localUser.username }}</span>
              </span>
              <button class="header-profile-btn" @click="openProfile">个人中心</button>
              <button class="header-logout" @click="handleLogout">退出</button>
            </template>
            <button v-else class="header-login" @click="showAuth = true">登录 / 注册</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Banner -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-text animate-fadeInUp">
          <p class="hero-subtitle">读万卷书 行万里路</p>
          <p class="hero-desc">好大儿是一个专为儿童和父母打造的成长陪伴平台。以"寓教于乐"为核心理念，为孩子们提供丰富的人文启蒙和学习资源，为年轻父母提供真实可靠的亲子旅行指南。</p>
          <p class="hero-desc-sub">从国学经典学立身，到通识百科长见识，再到走向广阔天地——陪伴孩子们读万卷书，行万里路。</p>
          <div class="hero-cta">
            <a href="#apps" class="cta-btn cta-primary">开始学习</a>
            <a href="https://travel.grandand.com" target="_self" class="cta-btn cta-secondary">看看世界 →</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats / Data Board -->
    <section class="stats">
      <div class="stats-inner">
        <div v-for="(s, i) in stats" :key="s.label" class="stat-item animate-fadeInUp" :style="{ animationDelay: (i * 100) + 'ms' }">
          <div class="stat-icon" :style="{ backgroundColor: s.color + '12' }">{{ s.icon }}</div>
          <span class="stat-count" :style="{ color: s.color }">{{ s.count }}<span class="stat-unit">{{ s.unit }}</span></span>
          <span class="stat-label">{{ s.label }}</span>
        </div>
      </div>
    </section>

    <!-- App Grid -->
    <main id="apps" class="main-section">
      <h2 class="section-title">全部应用</h2>
      <div class="app-grid">
        <a
          v-for="app in apps"
          :key="app.name"
          :href="app.href"
          target="_self"
          rel="noopener noreferrer"
          class="app-card"
        >
          <div class="app-icon" :style="{ backgroundColor: app.color + '18' }">
            <span class="app-emoji">{{ app.icon }}</span>
          </div>
          <h3 class="app-name">{{ app.name }}</h3>
          <p class="app-desc">{{ app.desc }}</p>
        </a>
      </div>

    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-links">
        <a href="/faq">常见问题</a>
        <a href="/legal">服务条款</a>
        <a href="/legal">隐私政策</a>
      </div>
      <p>&copy; 2026 好大儿 &mdash; 儿童益智乐园</p>
    </footer>

    <!-- Auth Modal -->
    <AuthModal
      :open="showAuth"
      @close="showAuth = false"
      @login="handleLogin"
    />

    <!-- Profile Setup -->
    <ProfileSetup
      :open="showSetup"
      @complete="handleSetupComplete"
    />

    <!-- Personal Center -->
    <PersonalCenter
      :open="showProfile"
      @close="showProfile = false"
      @logout="handleLogout"
    />
  </div>

  <!-- Search Page (shown when path is /search) -->
  <SearchPage v-if="isSearchPage" />

  <!-- Doc Page (shown when path is /doc) -->
  <DocPage v-if="isDocPage" />
</template>

<style>
/* Animations */
@keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.animate-fadeInUp { animation: fadeInUp 0.6s ease-out both; }
.animate-fadeIn { animation: fadeIn 0.5s ease-out both; }

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', sans-serif;
  background: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased;
}

/* Header */
.header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
  border-bottom: 1px solid #e2e8f0;
}
.header-inner {
  max-width: 1200px; margin: 0 auto; padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.header-right {
  display: flex; align-items: center; gap: 16px;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.logo { font-size: 32px; font-weight: 800; color: #2563eb; text-decoration: none; line-height: 1; }
.header-links { display: flex; gap: 8px; }
.header-link {
  padding: 8px 18px; border-radius: 10px; font-size: 14px; font-weight: 500;
  text-decoration: none; color: #64748b; transition: all 0.2s;
}
.header-link:hover { background: #f1f5f9; color: #0f172a; }
.header-search {
  display: flex; align-items: center; gap: 6px;
  background: #f1f5f9; border-radius: 10px;
  padding: 6px 12px; transition: all 0.2s;
  border: 1px solid transparent;
}
.header-search:focus-within {
  background: #fff;
  border-color: #bfdbfe;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.search-icon {
  width: 16px; height: 16px; color: #94a3b8; flex-shrink: 0;
}
.search-input {
  border: none; background: transparent; outline: none;
  font-size: 13px; width: 160px; color: #334155;
}
.search-input::placeholder { color: #94a3b8; }

.header-auth { display: flex; align-items: center; gap: 12px; }
.header-user {
  display: flex; align-items: center; gap: 6px;
  font-size: 14px; color: #374151; font-weight: 500;
}
.header-avatar { font-size: 18px; }
.header-login {
  padding: 8px 20px; background: #2563eb; color: white; border: none;
  border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer;
  transition: background 0.2s;
}
.header-login:hover { background: #1d4ed8; }
.header-logout {
  padding: 6px 12px; background: transparent; color: #9ca3af; border: none;
  border-radius: 8px; font-size: 13px; cursor: pointer; transition: color 0.2s;
}
.header-profile-btn {
  padding: 6px 14px; background: #f0f9ff; color: #2563eb; border: 1px solid #bfdbfe;
  border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s;
}
.header-profile-btn:hover { background: #2563eb; color: #fff; }
.header-logout:hover { color: #ef4444; }

/* Hero */
.hero {
  background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%);
  padding: 48px 0 40px;
  border-bottom: 1px solid #e0f2fe;
}
.hero-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 24px;
}
.hero-text { text-align: left; }
.hero-title { font-size: 48px; font-weight: 800; color: #0f172a; margin-bottom: 4px; letter-spacing: 1px; line-height: 1.2; }
.hero-subtitle { font-size: 72px; font-weight: 800; color: #0f172a; margin-bottom: 16px; letter-spacing: 2px; }
.hero-desc { font-size: 15px; color: #64748b; line-height: 1.8; margin-bottom: 10px; }
.hero-desc-sub { font-size: 14px; color: #94a3b8; line-height: 1.7; margin-bottom: 16px; }
.hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }
.cta-btn {
  padding: 14px 32px; border-radius: 14px; font-size: 16px; font-weight: 600;
  text-decoration: none; transition: all 0.25s; display: inline-block;
}
.cta-primary { background: #2563eb; color: white; }
.cta-primary:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(37,99,235,0.3); }
.cta-secondary { background: white; color: #2563eb; border: 2px solid #e2e8f0; }
.cta-secondary:hover { border-color: #2563eb; transform: translateY(-2px); }

/* Stats */
.stats {
  background: #f8fafc; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;
  padding: 56px 0;
}
.stats-inner {
  max-width: 1200px; margin: 0 auto; padding: 0 24px;
  display: flex; justify-content: space-between; gap: 16px;
}
.stat-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  flex: 1; max-width: 160px;
}
.stat-icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; margin-bottom: 2px;
}
.stat-count { font-size: 26px; font-weight: 800; }
.stat-unit { font-size: 14px; color: #94a3b8; margin-left: 2px; font-weight: 400; }
.stat-label { font-size: 13px; color: #64748b; }

/* App Grid */
.main-section { max-width: 1200px; margin: 0 auto; scroll-margin-top: 70px; padding: 48px 24px 48px; }
.section-title { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #0f172a; }
.app-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.app-card {
  background: white; border-radius: 18px; padding: 32px 28px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  text-decoration: none; color: inherit; border: 1px solid #e2e8f0;
  transition: all 0.3s;
}
.app-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); transform: translateY(-3px); }
.app-icon {
  width: 80px; height: 80px; border-radius: 22px;
  display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
}
.app-emoji { font-size: 40px; }
.app-name { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.app-desc { font-size: 14px; color: #94a3b8; line-height: 1.5; }

.empty-search {
  grid-column: 1 / -1;
  text-align: center; padding: 60px 20px;
  color: #94a3b8; font-size: 14px;
}

/* Footer */
.footer { text-align: center; padding: 32px 24px; border-top: 1px solid #e2e8f0; }
.footer-links { display: flex; gap: 20px; justify-content: center; margin-bottom: 12px; }
.footer-links a { font-size: 13px; color: #94a3b8; text-decoration: none; }
.footer-links a:hover { color: #64748b; }
.footer p { font-size: 12px; color: #cbd5e1; }

@media (max-width: 768px) {
  .hero { padding: 40px 0; }
  .hero-title { font-size: 32px; }
  .logo { font-size: 32px; }
  .hero-subtitle { font-size: 36px; white-space: nowrap; }
  .stats-inner { display: grid; grid-template-columns: repeat(3, 1fr); justify-items: center; gap: 16px; }
  .stat-item { max-width: 140px; }
  .app-grid { grid-template-columns: 1fr; }
  .header-links { display: none; }
  .header-search { display: none; }
  .header-auth { margin-left: auto; }
}
</style>

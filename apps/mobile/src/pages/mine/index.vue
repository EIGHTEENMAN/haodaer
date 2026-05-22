<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { logout } from './auth'
import { getProgress, getAppRanking } from '@/stores/progress'

const isLoggedIn = ref(false)
const userInfo = ref<any>(null)

const progress = ref(getProgress())
const ranking = ref(getAppRanking())

onShow(() => {
  checkAuth()
  progress.value = getProgress()
  ranking.value = getAppRanking()
})

function checkAuth() {
  const token = uni.getStorageSync('haodaer_token')
  if (token) {
    isLoggedIn.value = true
    const stored = uni.getStorageSync('haodaer_user')
    if (stored) {
      try { userInfo.value = JSON.parse(stored) } catch {
        userInfo.value = { nickname: '用户' }
      }
    }
  } else {
    isLoggedIn.value = false
    userInfo.value = null
  }
}

function goLogin() {
  uni.navigateTo({ url: '/pages/mine/login' })
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        logout()
        isLoggedIn.value = false
        userInfo.value = null
      }
    }
  })
}

const totalAppCount = computed(() => progress.value.totalVisits)
const totalContentView = computed(() => progress.value.totalContentViewed)
const streakDays = computed(() => progress.value.dailyStreak)

function openWebView(label: string, url: string) {
  uni.navigateTo({
    url: `/pages/learning/webview?title=${encodeURIComponent(label)}&url=${encodeURIComponent(url)}`
  })
}
</script>

<template>
  <view class="page">
    <!-- Profile Card -->
    <view class="profile-card">
      <view v-if="isLoggedIn && userInfo" class="profile-info">
        <view class="profile-avatar">{{ userInfo.avatar || '👤' }}</view>
        <view class="profile-detail">
          <text class="profile-name">{{ userInfo.nickname || userInfo.username || '用户' }}</text>
          <view class="profile-meta">
            <text class="profile-badge">好大儿用户</text>
            <text v-if="streakDays > 0" class="profile-streak">🔥 {{ streakDays }}天连续</text>
          </view>
        </view>
      </view>
      <view v-else class="profile-login" @click="goLogin" hover-class="hover-opacity">
        <view class="profile-avatar">👤</view>
        <view class="profile-detail">
          <text class="profile-name">登录/注册</text>
          <text class="profile-badge">登录后享受完整功能</text>
        </view>
        <text class="profile-arrow">›</text>
      </view>
    </view>

    <!-- Learning Stats -->
    <view class="stats-card" v-if="isLoggedIn">
      <view class="stats-header">📊 学习统计</view>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-num">{{ totalAppCount }}</text>
          <text class="stat-label">总访问</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ Object.keys(progress.appOpens).length }}</text>
          <text class="stat-label">学过的应用</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ totalContentView }}</text>
          <text class="stat-label">浏览内容</text>
        </view>
        <view class="stat-item">
          <text class="stat-num">{{ streakDays }}</text>
          <text class="stat-label">连续天数</text>
        </view>
      </view>
      <!-- App ranking bars -->
      <view v-if="ranking.length > 0" class="ranking-section">
        <text class="ranking-title">应用使用排行</text>
        <view v-for="(r, i) in ranking.slice(0, 4)" :key="r.name" class="ranking-row">
          <text class="ranking-idx">{{ i + 1 }}</text>
          <text class="ranking-name">{{ r.name }}</text>
          <view class="ranking-bar-bg">
            <view
              class="ranking-bar"
              :style="{ width: (r.count / Math.max(...ranking.map(x => x.count)) * 100) + '%' }"
            ></view>
          </view>
          <text class="ranking-count">{{ r.count }}次</text>
        </view>
      </view>
    </view>

    <!-- Menu List -->
    <view class="menu-section">
      <view class="menu-item" @click="openWebView('商城', 'https://store.grandand.com')">
        <text class="menu-icon">🎒</text>
        <view class="menu-content">
          <text class="menu-label">积分商城</text>
          <text class="menu-desc">兑换好礼</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="openWebView('论坛', 'https://forum.grandand.com')">
        <text class="menu-icon">💬</text>
        <view class="menu-content">
          <text class="menu-label">社区论坛</text>
          <text class="menu-desc">交流分享</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="openWebView('常见问题', 'https://grandand.com/faq')">
        <text class="menu-icon">📖</text>
        <view class="menu-content">
          <text class="menu-label">常见问题</text>
          <text class="menu-desc">使用帮助</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="openWebView('法律条款', 'https://grandand.com/legal')">
        <text class="menu-icon">⚖️</text>
        <view class="menu-content">
          <text class="menu-label">法律条款</text>
          <text class="menu-desc">隐私与协议</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- Logout -->
    <view v-if="isLoggedIn" class="logout-section">
      <button class="logout-btn" @click="handleLogout" hover-class="hover-logout">退出登录</button>
    </view>

    <!-- Version -->
    <view class="version">
      <text>好大儿 v1.0.0</text>
    </view>
  </view>
</template>

<style scoped>
.page { padding-bottom: 40rpx; }

/* Profile */
.profile-card {
  margin: 24rpx; background: white; border-radius: 24rpx;
  padding: 32rpx; border: 1rpx solid #e2e8f0;
}
.profile-info, .profile-login { display: flex; align-items: center; }
.profile-avatar {
  font-size: 56rpx; width: 88rpx; height: 88rpx;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 22rpx; margin-right: 24rpx;
}
.profile-detail { flex: 1; display: flex; flex-direction: column; }
.profile-name { font-size: 34rpx; font-weight: 700; color: #0f172a; }
.profile-meta { display: flex; align-items: center; gap: 12rpx; margin-top: 6rpx; }
.profile-badge { font-size: 24rpx; color: #94a3b8; }
.profile-streak { font-size: 22rpx; color: #ea580c; font-weight: 500; }
.profile-arrow { font-size: 36rpx; color: #cbd5e1; font-weight: 300; }

/* Stats Card */
.stats-card {
  margin: 0 24rpx 24rpx; background: white; border-radius: 24rpx;
  padding: 28rpx; border: 1rpx solid #e2e8f0;
}
.stats-header { font-size: 28rpx; font-weight: 700; color: #0f172a; margin-bottom: 20rpx; }
.stats-grid { display: flex; gap: 8rpx; }
.stat-item {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  padding: 14rpx 4rpx; background: #f8fafc; border-radius: 16rpx;
}
.stat-num { font-size: 36rpx; font-weight: 800; color: #2563eb; }
.stat-label { font-size: 20rpx; color: #94a3b8; margin-top: 4rpx; }

/* Ranking */
.ranking-section { margin-top: 20rpx; padding-top: 20rpx; border-top: 1rpx solid #f1f5f9; }
.ranking-title { font-size: 24rpx; font-weight: 600; color: #64748b; display: block; margin-bottom: 12rpx; }
.ranking-row { display: flex; align-items: center; gap: 10rpx; margin-bottom: 10rpx; }
.ranking-idx { font-size: 22rpx; font-weight: 700; color: #94a3b8; width: 28rpx; text-align: center; }
.ranking-name { font-size: 24rpx; color: #334155; width: 80rpx; flex-shrink: 0; }
.ranking-bar-bg { flex: 1; height: 20rpx; background: #f1f5f9; border-radius: 10rpx; overflow: hidden; }
.ranking-bar { height: 100%; background: linear-gradient(90deg, #60a5fa, #3b82f6); border-radius: 10rpx; }
.ranking-count { font-size: 20rpx; color: #94a3b8; width: 56rpx; text-align: right; }

/* Menu */
.menu-section {
  margin: 0 24rpx; background: white; border-radius: 24rpx;
  border: 1rpx solid #e2e8f0; overflow: hidden;
}
.menu-item {
  display: flex; align-items: center; padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f1f5f9;
}
.menu-item:last-child { border-bottom: none; }
.menu-icon { font-size: 32rpx; margin-right: 20rpx; }
.menu-content { flex: 1; display: flex; flex-direction: column; }
.menu-label { font-size: 28rpx; color: #334155; }
.menu-desc { font-size: 22rpx; color: #94a3b8; margin-top: 4rpx; }
.menu-arrow { font-size: 32rpx; color: #cbd5e1; }

/* Logout */
.logout-section { margin: 40rpx 24rpx; }
.logout-btn {
  width: 100%; padding: 28rpx; background: white; color: #ef4444;
  border-radius: 20rpx; font-size: 28rpx; font-weight: 500;
  border: 1rpx solid #fecaca;
}

/* Version */
.version { text-align: center; padding: 40rpx; font-size: 22rpx; color: #cbd5e1; }

/* Hover */
.hover-opacity { opacity: 0.7; }
.hover-logout { background: #fef2f2; }
</style>

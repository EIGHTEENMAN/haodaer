<template>
  <div class="start-screen">
    <div class="start-box">
      <h1 class="title">ENGLISH<br>QUEST</h1>
      <div class="subtitle">Bullet Hell Word Game</div>

      <!-- Auth info -->
      <div class="auth-area">
        <div v-if="loggedIn" class="user-info">
          <span class="avatar">{{ userInitial }}</span>
          <div>
            <div class="username">{{ userName }}</div>
            <div class="display-name">{{ displayName }}</div>
          </div>
        </div>
        <div v-else class="login-hint">
          <div class="login-icon">🎮</div>
          <p>Login to save your progress</p>
          <button class="btn" @click="goLogin">LOGIN</button>
        </div>
      </div>

      <div class="stats-summary" v-if="hasRecords">
        <p>WORDS LEARNED: {{ wordCount }} · MASTERED: {{ masteredCount }}</p>
      </div>

      <button class="start-btn" @click="$emit('start')">
        PLAY
      </button>

      <div class="action-row">
        <button class="action-btn" @click="$emit('words')">WORDS</button>
        <button class="action-btn" @click="$emit('profile')">PROFILE</button>
      </div>

      <div class="controls-hint">
        <p>WASD Dodge · SPACE Attack</p>
      </div>
    </div>

    <LoginModal v-if="showLogin" @logged-in="onLoggedIn" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import LoginModal from "./LoginModal.vue"
import { wordStore, getMasteredCount } from "../stores/wordStore"

const emit = defineEmits<{ start: []; words: []; profile: [] }>()
const showLogin = ref(false)

const loggedIn = ref(false)
const userName = ref("")
const displayName = ref("")
const userInitial = ref("")

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[1]) : null
}

onMounted(async () => {
  // Cross-subdomain sync: check cookie if no localStorage token
  let token = sessionStorage.getItem("haodaer_token")
  if (!token) {
    token = getCookie('haodaer_token')
    if (token) {
      sessionStorage.setItem('haodaer_token', token)
      // Will need to fetch user data below
    }
  }
  if (token) {
    try {
      const userStr = sessionStorage.getItem("haodaer_user")
      let userData: any = null
      if (userStr) {
        userData = JSON.parse(userStr)
      } else {
        // Token from cookie but no user data yet — fetch it
        const r = await fetch('/api/auth/me', {
          headers: { Authorization: 'Bearer ' + token }
        })
        const d = await r.json()
        if (d.code === 'OK') {
          userData = d.data
          sessionStorage.setItem('haodaer_user', JSON.stringify(userData))
        }
      }
      if (userData) {
        userName.value = userData.nickname || userData.username || "Player"
        userInitial.value = userName.value.charAt(0)
        loggedIn.value = true
      }
      // Get display name from active profile
      const profile = localStorage.getItem("haodaer_active_profile")
      if (profile) {
        const p = JSON.parse(profile)
        displayName.value = p.nickname || userName.value
      } else {
        displayName.value = userName.value
      }
    } catch {}
  }
})

function goLogin() {
  showLogin.value = true
}

async function onLoggedIn() {
  showLogin.value = false
  // Reload user info after login
  const token = sessionStorage.getItem("haodaer_token")
  if (!token) return
  try {
    const userStr = sessionStorage.getItem("haodaer_user")
    let userData: any = null
    if (userStr) {
      userData = JSON.parse(userStr)
    } else {
      const r = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token }
      })
      const d = await r.json()
      if (d.code === 'OK') {
        userData = d.data
        sessionStorage.setItem('haodaer_user', JSON.stringify(userData))
      }
    }
    if (userData) {
      userName.value = userData.nickname || userData.username || "Player"
      userInitial.value = userName.value.charAt(0)
      loggedIn.value = true
      const profile = localStorage.getItem("haodaer_active_profile")
      if (profile) {
        const p = JSON.parse(profile)
        displayName.value = p.nickname || userName.value
      } else {
        displayName.value = userName.value
      }
    }
  } catch {}
}

const hasRecords = computed(() => wordStore.records.size > 0)
const wordCount = computed(() => wordStore.records.size)
const masteredCount = computed(() => getMasteredCount())
</script>

<style scoped>
.start-screen {
  position: fixed;
  inset: 0;
  background: #1a1a2e;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
}
.start-box {
  text-align: center;
  padding: 40px;
}
.title {
  font-size: 48px;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255,215,0,0.5), 3px 3px 0 #8b4513;
  margin-bottom: 6px;
  font-family: 'Press Start 2P', monospace;
  letter-spacing: 6px;
  line-height: 1.3;
}
.subtitle {
  color: #88ccff;
  font-size: 14px;
  margin-bottom: 28px;
  font-family: 'Press Start 2P', monospace;
}
.auth-area {
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.15);
  padding: 16px 24px;
  margin-bottom: 20px;
  min-width: 280px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 40px;
  height: 40px;
  background: #d4a017;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #1a1a2e;
  font-weight: bold;
  flex-shrink: 0;
}
.username {
  color: #fff;
  font-size: 14px;
  text-align: left;
}
.display-name {
  color: #88ccff;
  font-size: 11px;
  margin-top: 4px;
  text-align: left;
}
.login-hint {
  color: #888;
  font-size: 12px;
}
.login-hint p { margin-bottom: 8px; }
.login-icon { font-size: 24px; margin-bottom: 8px; }
.btn {
  padding: 8px 20px;
  border: 1px solid #ffd700;
  background: transparent;
  color: #ffd700;
  font-family: 'Press Start 2P', monospace;
  cursor: pointer;
  font-size: 13px;
}
.btn:hover { background: rgba(255,215,0,0.15); }
.stats-summary {
  color: #66cc66;
  font-size: 12px;
  margin-bottom: 20px;
}
.start-btn {
  display: block;
  margin: 0 auto 12px;
  padding: 16px 60px;
  border: 3px solid #ffd700;
  background: #d4a017;
  color: #1a1a2e;
  font-size: 22px;
  font-family: 'Press Start 2P', monospace;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.1s;
}
.start-btn:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}
.action-row {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}
.action-btn {
  padding: 10px 28px;
  border: 2px solid #88ccff;
  background: transparent;
  color: #88ccff;
  font-size: 14px;
  font-family: 'Press Start 2P', monospace;
  cursor: pointer;
  transition: all 0.1s;
}
.action-btn:hover {
  background: rgba(136,204,255,0.15);
  transform: scale(1.05);
}
.controls-hint {
  margin-top: 24px;
  color: #666;
  font-size: 11px;
}
</style>

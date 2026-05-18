<template>
  <div class="profile-screen">
    <div class="profile-box">
      <div class="profile-header">
        <h2>PROFILE</h2>
        <button class="close-btn" @click="$emit('back')">✕</button>
      </div>

      <div class="profile-body">
        <div class="avatar-section">
          <div class="avatar">{{ userInitial }}</div>
          <div class="nickname">{{ userName }}</div>
          <div class="game-nickname">{{ gameNickname || 'PLAYER' }}</div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-value">{{ wordCount }}</div>
            <div class="info-label">WORDS</div>
          </div>
          <div class="info-item">
            <div class="info-value">{{ masteredCount }}</div>
            <div class="info-label">MASTERED</div>
          </div>
          <div class="info-item">
            <div class="info-value">{{ accuracy }}%</div>
            <div class="info-label">ACCURACY</div>
          </div>
        </div>

        <div class="coming-soon">
          <p>More features coming soon...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { wordStore, getMasteredCount, getAccuracy } from "../stores/wordStore"

defineEmits<{ back: [] }>()

const userName = ref("")
const gameNickname = ref(localStorage.getItem("ultraman_nickname") || "")
const userInitial = ref("")

onMounted(() => {
  try {
    const userStr = localStorage.getItem("haodaer_user")
    if (userStr) {
      const user = JSON.parse(userStr)
      userName.value = user.nickname || user.username || "Player"
      userInitial.value = userName.value.charAt(0).toUpperCase()
    }
  } catch {}
})

const wordCount = computed(() => wordStore.records.size)
const masteredCount = computed(() => getMasteredCount())
const accuracy = computed(() => getAccuracy())
</script>

<style scoped>
.profile-screen {
  position: fixed;
  inset: 0;
  background: #1a1a2e;
  z-index: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #fff;
}
.profile-box {
  background: rgba(255,255,255,0.03);
  border: 2px solid rgba(255,255,255,0.1);
  padding: 32px;
  min-width: 300px;
  max-width: 400px;
  width: 100%;
}
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.profile-header h2 {
  color: #ffd700;
  font-size: 24px;
  font-family: 'Press Start 2P', monospace;
}
.close-btn {
  padding: 6px 12px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  cursor: pointer;
  font-size: 16px;
}
.avatar-section {
  text-align: center;
  margin-bottom: 24px;
}
.avatar {
  width: 64px;
  height: 64px;
  background: #d4a017;
  border: 3px solid #ffd700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #1a1a2e;
  font-weight: bold;
  margin: 0 auto 12px;
}
.nickname {
  color: #ffd700;
  font-size: 16px;
  font-family: 'Press Start 2P', monospace;
}
.game-nickname {
  color: #88ccff;
  font-size: 12px;
  margin-top: 6px;
  font-family: 'Press Start 2P', monospace;
}
.info-grid {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  justify-content: center;
}
.info-item {
  text-align: center;
  padding: 12px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  min-width: 80px;
}
.info-value {
  color: #ffd700;
  font-size: 20px;
  font-weight: bold;
  font-family: 'Press Start 2P', monospace;
}
.info-label {
  color: #888;
  font-size: 9px;
  margin-top: 4px;
  font-family: 'Press Start 2P', monospace;
}
.coming-soon {
  text-align: center;
  color: #666;
  font-size: 11px;
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.05);
  font-family: 'Press Start 2P', monospace;
}
</style>

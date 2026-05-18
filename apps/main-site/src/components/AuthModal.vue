<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  open: boolean
  force?: boolean
}>()

const emit = defineEmits<{
  close: []
  login: [user: any]
}>()

const auth = useAuthStore()

const phone = ref('')
const code = ref('')
const countdown = ref(0)
const loading = ref(false)
const error = ref('')
let timer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      if (timer) clearInterval(timer)
    }
  }, 1000)
}

async function sendCode() {
  if (!phone.value || phone.value.length < 11) {
    error.value = '请输入正确的手机号'
    return
  }
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.value, purpose: 'login' }),
    })
    const d = await res.json()
    if (d.code === 'OK') {
      startCountdown()
    } else {
      error.value = d.message || '发送失败'
    }
  } catch {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}

async function doLogin() {
  if (!phone.value || !code.value) {
    error.value = '请填写手机号和验证码'
    return
  }
  error.value = ''
  loading.value = true
  try {
    const d = await auth.phoneLogin(phone.value, code.value)
    if (d.code === 'OK') {
      emit('login', d.data.user)
    } else {
      error.value = d.message || '登录失败'
    }
  } catch {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}

function onBackdropClick() {
  if (!props.force) emit('close')
}
</script>

<template>
  <div v-if="open" class="am-overlay" @click.self="onBackdropClick">
    <div class="am-modal">
      <!-- Close -->
      <button v-if="!force" class="am-close" @click="emit('close')">✕</button>

      <div class="am-body">
        <!-- Left: QR -->
        <div class="am-left">
          <h2 class="am-title">扫码登录</h2>
          <div class="am-qr">
            <div class="am-qr-inner">
              <div class="am-qr-icon">📷</div>
              <p class="am-qr-text">扫码登录</p>
            </div>
          </div>
          <p class="am-qr-hint">打开 App 或微信扫一扫</p>
          <div class="am-methods">
            <div class="am-method" v-for="m in [
              { name: '好大儿 App', icon: '📱', desc: '打开好大儿 App 扫一扫' },
              { name: '走天下 App', icon: '🧳', desc: '打开好大儿走天下 App 扫一扫' },
              { name: '微信', icon: '💬', desc: '使用微信扫一扫' },
            ]" :key="m.name">
              <span class="am-method-icon">{{ m.icon }}</span>
              <div>
                <p class="am-method-name">{{ m.name }}</p>
                <p class="am-method-desc">{{ m.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Phone Login -->
        <div class="am-right">
          <h2 class="am-title am-title-dark">手机号登录</h2>
          <p class="am-subtitle">输入手机号，验证后自动注册/登录</p>

          <div v-if="error" class="am-error">{{ error }}</div>

          <div class="am-field">
            <label class="am-label">手机号</label>
            <input
              v-model="phone"
              type="tel"
              maxlength="11"
              placeholder="请输入手机号"
              class="am-input"
              @input="phone = phone.replace(/\D/g, '').slice(0, 11)"
            />
          </div>

          <div class="am-field">
            <label class="am-label">验证码</label>
            <div class="am-code-row">
              <input
                v-model="code"
                type="text"
                maxlength="6"
                placeholder="请输入验证码"
                class="am-input am-code-input"
                @input="code = code.replace(/\D/g, '').slice(0, 6)"
              />
              <button
                class="am-code-btn"
                :disabled="loading || countdown > 0"
                @click="sendCode"
              >
                {{ countdown > 0 ? countdown + 's' : loading ? '发送中...' : '获取验证码' }}
              </button>
            </div>
          </div>

          <button class="am-login-btn" :disabled="loading" @click="doLogin">
            {{ loading ? '处理中...' : '登录 / 注册' }}
          </button>

          <p class="am-terms">
            登录即代表同意
            <a href="/legal/terms" target="_blank" class="am-terms-link">《服务条款》</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.am-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.5);
}
.am-modal {
  background: white; border-radius: 16px;
  width: 100%; max-width: 672px; margin: 0 16px;
  overflow: hidden; position: relative;
  animation: fadeInUp 0.25s ease;
}
.am-close {
  position: absolute; top: 16px; right: 16px; z-index: 10;
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #f1f5f9; border: none; cursor: pointer;
  color: #64748b; font-size: 14px; transition: background 0.2s;
}
.am-close:hover { background: #e2e8f0; }
.am-body { display: flex; flex-direction: column; }
@media (min-width: 768px) { .am-body { flex-direction: row; } }

/* Left */
.am-left {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  padding: 40px 32px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: white;
}
@media (min-width: 768px) { .am-left { width: 50%; } }
.am-title { font-size: 20px; font-weight: 700; margin-bottom: 24px; }
.am-qr {
  width: 192px; height: 192px; background: white; border-radius: 12px;
  padding: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;
}
.am-qr-inner {
  width: 100%; height: 100%; border: 2px dashed #d1d5db; border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.am-qr-icon { font-size: 40px; margin-bottom: 4px; }
.am-qr-text { font-size: 12px; color: #9ca3af; }
.am-qr-hint { font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 24px; }
.am-methods { width: 100%; display: flex; flex-direction: column; gap: 12px; }
.am-method {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 16px;
}
.am-method-icon { font-size: 20px; }
.am-method-name { font-size: 14px; font-weight: 500; }
.am-method-desc { font-size: 12px; opacity: 0.6; }

/* Right */
.am-right {
  padding: 32px; display: flex; flex-direction: column; justify-content: center;
}
@media (min-width: 768px) { .am-right { width: 50%; } }
.am-title-dark { color: #0f172a; margin-bottom: 4px; }
.am-subtitle { font-size: 14px; color: #64748b; margin-bottom: 24px; }
.am-error {
  margin-bottom: 16px; padding: 12px; background: #fef2f2;
  color: #dc2626; font-size: 14px; border-radius: 8px;
}
.am-field { margin-bottom: 16px; }
.am-label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 4px; }
.am-input {
  width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.am-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.am-code-row { display: flex; gap: 8px; }
.am-code-input { flex: 1; }
.am-code-btn {
  padding: 10px 16px; background: #f1f5f9; color: #374151;
  border: none; border-radius: 8px; font-size: 14px; cursor: pointer;
  white-space: nowrap; transition: background 0.2s;
}
.am-code-btn:hover:not(:disabled) { background: #e2e8f0; }
.am-code-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.am-login-btn {
  width: 100%; padding: 12px; background: #2563eb; color: white;
  border: none; border-radius: 12px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: background 0.2s; margin-top: 8px;
}
.am-login-btn:hover:not(:disabled) { background: #1d4ed8; }
.am-login-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.am-terms {
  margin-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;
}
.am-terms-link { color: #2563eb; text-decoration: none; }
.am-terms-link:hover { text-decoration: underline; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

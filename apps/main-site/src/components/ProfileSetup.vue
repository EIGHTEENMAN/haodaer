<script setup lang="ts">
import { ref } from 'vue'
import { getToken, saveProfile, addChild, fetchUser, setUser } from '@/api/auth'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  complete: []
}>()

const step = ref(1)
const nickname = ref('')
const avatar = ref('')
const children = ref([{ nickname: '', gender: '', age: '' }])
const saving = ref(false)
const error = ref('')

const avatars = ['🦁', '🐯', '🐼', '🐨', '🐸', '🦊', '🐰', '🐙', '🦄', '🐲']

function updateChild(idx: number, field: string, value: string) {
  children.value[idx] = { ...children.value[idx], [field]: value }
}

function addChild() {
  children.value.push({ nickname: '', gender: '', age: '' })
}

function removeChild(idx: number) {
  children.value = children.value.filter((_, i) => i !== idx)
}

async function save() {
  if (!nickname.value.trim()) {
    error.value = '请输入昵称'
    return
  }
  error.value = ''
  saving.value = true
  try {
    await saveProfile({ nickname: nickname.value.trim(), avatar: avatar.value || undefined })

    for (const child of children.value) {
      if (child.nickname.trim()) {
        await addChild({
          nickname: child.nickname.trim(),
          gender: child.gender || undefined,
          age: child.age ? parseInt(child.age) : undefined,
        })
      }
    }

    localStorage.removeItem('haodaer_isNewUser')
    await fetchUser()
    emit('complete')
  } catch {
    error.value = '保存失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="open" class="ps-overlay">
    <div class="ps-modal">
      <!-- Steps -->
      <div class="ps-steps">
        <div :class="['ps-step', { active: step >= 1 }]" />
        <div :class="['ps-step', { active: step >= 2 }]" />
      </div>

      <!-- Step 1: Profile -->
      <div v-if="step === 1">
        <h2 class="ps-title">完善资料</h2>
        <p class="ps-desc">设置你的昵称和头像</p>

        <div class="ps-section">
          <label class="ps-label">选择头像</label>
          <div class="ps-avatars">
            <button
              v-for="a in avatars"
              :key="a"
              :class="['ps-avatar', { selected: avatar === a }]"
              @click="avatar = a"
            >{{ a }}</button>
          </div>
        </div>

        <div class="ps-section">
          <label class="ps-label">昵称 <span class="ps-req">*</span></label>
          <input
            v-model="nickname"
            maxlength="20"
            placeholder="给自己取个好听的名字"
            class="ps-input"
          />
        </div>

        <p v-if="error" class="ps-error">{{ error }}</p>

        <button
          class="ps-btn ps-btn-primary"
          @click="step = 2"
        >下一步</button>
      </div>

      <!-- Step 2: Children -->
      <div v-if="step === 2">
        <h2 class="ps-title">添加孩子信息</h2>
        <p class="ps-desc">填写孩子的昵称、性别和年龄（可跳过）</p>

        <div class="ps-children">
          <div v-for="(child, i) in children" :key="i" class="ps-child-card">
            <button
              v-if="children.length > 1"
              class="ps-remove"
              @click="removeChild(i)"
            >✕</button>
            <div class="ps-child-field">
              <label class="ps-label-sm">孩子昵称</label>
              <input
                v-model="child.nickname"
                placeholder="如：小明"
                class="ps-input"
              />
            </div>
            <div class="ps-child-row">
              <div class="ps-child-field">
                <label class="ps-label-sm">性别</label>
                <select v-model="child.gender" class="ps-select">
                  <option value="">保密</option>
                  <option value="boy">男孩</option>
                  <option value="girl">女孩</option>
                </select>
              </div>
              <div class="ps-child-field">
                <label class="ps-label-sm">年龄</label>
                <select v-model="child.age" class="ps-select">
                  <option value="">请选择</option>
                  <option v-for="n in 18" :key="n" :value="n">{{ n }}岁</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <button class="ps-btn ps-btn-dashed" @click="addChild">
          + 添加另一个孩子
        </button>

        <p v-if="error" class="ps-error">{{ error }}</p>

        <div class="ps-actions">
          <button class="ps-btn ps-btn-ghost" @click="step = 1">上一步</button>
          <button
            class="ps-btn ps-btn-primary"
            :disabled="saving"
            @click="save"
          >{{ saving ? '保存中...' : '完成' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ps-overlay {
  position: fixed; inset: 0; z-index: 1000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.5);
}
.ps-modal {
  background: white; border-radius: 16px;
  width: 100%; max-width: 448px; margin: 0 16px; padding: 32px;
  animation: fadeInUp 0.25s ease;
}
.ps-steps { display: flex; gap: 8px; margin-bottom: 24px; }
.ps-step {
  flex: 1; height: 8px; border-radius: 4px; background: #e5e7eb; transition: background 0.3s;
}
.ps-step.active { background: #3b82f6; }
.ps-title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 4px; }
.ps-desc { font-size: 14px; color: #6b7280; margin-bottom: 24px; }
.ps-section { margin-bottom: 24px; }
.ps-label { display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px; }
.ps-label-sm { display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px; }
.ps-req { color: #ef4444; }
.ps-avatars { display: flex; flex-wrap: wrap; gap: 8px; }
.ps-avatar {
  width: 48px; height: 48px; font-size: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px; border: 2px solid #e5e7eb;
  cursor: pointer; transition: all 0.2s;
}
.ps-avatar:hover { border-color: #9ca3af; }
.ps-avatar.selected { border-color: #3b82f6; background: #f0f9ff; transform: scale(1.1); }
.ps-input {
  width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box;
}
.ps-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.ps-select {
  width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 14px; outline: none; background: white;
}
.ps-error { color: #ef4444; font-size: 14px; margin-bottom: 16px; }
.ps-btn {
  width: 100%; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 500;
  border: none; cursor: pointer; transition: all 0.2s;
}
.ps-btn-primary { background: #2563eb; color: white; }
.ps-btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.ps-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.ps-btn-dashed {
  width: 100%; padding: 10px; margin-top: 12px;
  border: 2px dashed #d1d5db; border-radius: 12px; background: transparent;
  color: #6b7280; font-size: 14px; cursor: pointer;
}
.ps-btn-dashed:hover { border-color: #3b82f6; color: #3b82f6; }
.ps-btn-ghost { background: #f3f4f6; color: #374151; }
.ps-btn-ghost:hover { background: #e5e7eb; }
.ps-children { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.ps-child-card {
  background: #f9fafb; border-radius: 12px; padding: 16px; position: relative;
}
.ps-remove {
  position: absolute; top: 8px; right: 8px; width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: #9ca3af; cursor: pointer;
  font-size: 14px; border-radius: 50%;
}
.ps-remove:hover { background: #fef2f2; color: #ef4444; }
.ps-child-field { margin-bottom: 8px; flex: 1; }
.ps-child-row { display: flex; gap: 12px; }
.ps-actions { display: flex; gap: 12px; margin-top: 24px; }
.ps-actions .ps-btn { flex: 1; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

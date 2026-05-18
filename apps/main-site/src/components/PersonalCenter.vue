<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getToken, fetchUser, saveProfile, getChildren, addChild, updateChild, deleteChild, logout, getUser } from '@/api/auth'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; logout: [] }>()

const user = ref<any>(getUser())
const children = ref<any[]>([])
const points = ref(0)
const loading = ref(true)
const error = ref('')
const editing = ref(false)
const editNickname = ref('')
const editAvatar = ref('')
const saving = ref(false)
const addingChild = ref(false)
const childForm = ref({ nickname: '', gender: '', age: '' })
const editingChild = ref<string | null>(null)
const editChildForm = ref({ nickname: '', gender: '', age: '' })

const avatars = ['🦁', '🐯', '🐼', '🐨', '🐸', '🦊', '🐰', '🐙', '🦄', '🐲']

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const u = await fetchUser()
    if (u) user.value = u
    const c = await getChildren()
    if (c.code === 'OK') children.value = c.data
    const pRes = await fetch('/api/user/points', { headers: { Authorization: 'Bearer ' + getToken() } })
    const pData = await pRes.json()
    if (pData.code === 'OK') points.value = pData.data?.balance || 0
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => { if (props.open) loadData() })

function startEdit() {
  editNickname.value = user.value?.nickname || ''
  editAvatar.value = user.value?.avatar || ''
  editing.value = true
}

async function saveEdit() {
  if (!editNickname.value.trim()) return
  saving.value = true
  try {
    await saveProfile({ nickname: editNickname.value.trim(), avatar: editAvatar.value || undefined })
    await fetchUser()
    user.value = getUser()
    editing.value = false
  } catch {
    error.value = '保存失败'
  } finally {
    saving.value = false
  }
}

async function saveChild() {
  if (!childForm.value.nickname.trim()) return
  saving.value = true
  try {
    await addChild({
      nickname: childForm.value.nickname.trim(),
      gender: childForm.value.gender || undefined,
      age: childForm.value.age ? parseInt(childForm.value.age) : undefined,
    })
    addingChild.value = false
    childForm.value = { nickname: '', gender: '', age: '' }
    await loadData()
  } catch {
    error.value = '添加失败'
  } finally {
    saving.value = false
  }
}

function startEditChild(c: any) {
  editingChild.value = c.id
  editChildForm.value = { nickname: c.nickname, gender: c.gender || '', age: c.age ? String(c.age) : '' }
}

async function saveEditChild() {
  if (!editingChild.value || !editChildForm.value.nickname.trim()) return
  saving.value = true
  try {
    await updateChild(editingChild.value, {
      nickname: editChildForm.value.nickname.trim(),
      gender: editChildForm.value.gender || undefined,
      age: editChildForm.value.age ? parseInt(editChildForm.value.age) : undefined,
    })
    editingChild.value = null
    await loadData()
  } catch {
    error.value = '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeChild(id: string) {
  if (!confirm('确定删除这个孩子？')) return
  try {
    await deleteChild(id)
    await loadData()
  } catch {
    error.value = '删除失败'
  }
}

function handleLogout() {
  logout()
  emit('logout')
}

const genderLabel = (g: string) => g === 'male' ? '👦 男孩' : g === 'female' ? '👧 女孩' : '🤫 保密'
</script>

<template>
  <div v-if="open" class="profile-page">
    <div class="profile-header">
      <button class="profile-back" @click="emit('close')">← 返回</button>
      <h2>个人中心</h2>
      <div style="width:60px"></div>
    </div>

    <div class="profile-body" v-if="!loading">
      <section class="profile-card">
        <div class="profile-info" @click="startEdit">
          <span class="profile-avatar">{{ user?.avatar || '👤' }}</span>
          <div class="profile-meta">
            <span class="profile-name">{{ user?.nickname || user?.username }}</span>
            <span class="profile-phone">{{ user?.phone || '' }}</span>
          </div>
          <span class="profile-edit-hint">编辑</span>
        </div>
        <div class="profile-points">
          <span>⭐ 积分</span>
          <span class="points-value">{{ points }}</span>
        </div>
      </section>

      <section class="section-card">
        <div class="section-title-row">
          <h3>我的孩子</h3>
          <button class="btn-add" @click="addingChild = true">+ 添加</button>
        </div>
        <div v-if="children.length === 0" class="empty-state">还没有添加孩子信息</div>
        <div v-for="c in children" :key="c.id" class="child-item">
          <template v-if="editingChild === c.id">
            <input v-model="editChildForm.nickname" placeholder="昵称" class="input-sm" />
            <select v-model="editChildForm.gender" class="input-sm">
              <option value="">性别</option>
              <option value="male">男孩</option>
              <option value="female">女孩</option>
              <option value="secret">保密</option>
            </select>
            <select v-model="editChildForm.age" class="input-sm">
              <option value="">年龄</option>
              <option v-for="i in 14" :key="i" :value="i">{{ i }}岁</option>
            </select>
            <div class="child-actions">
              <button class="btn-save-sm" @click="saveEditChild" :disabled="saving">保存</button>
              <button class="btn-cancel-sm" @click="editingChild = null">取消</button>
            </div>
          </template>
          <template v-else>
            <span class="child-avatar">{{ c.gender === 'male' ? '👦' : c.gender === 'female' ? '👧' : '👶' }}</span>
            <div class="child-info">
              <span class="child-name">{{ c.nickname }}</span>
              <span class="child-detail">{{ c.gender ? genderLabel(c.gender) : '' }}{{ c.age ? ' · ' + c.age + '岁' : '' }}</span>
            </div>
            <div class="child-actions">
              <button class="btn-edit-sm" @click="startEditChild(c)">编辑</button>
              <button class="btn-del-sm" @click="removeChild(c.id)">删除</button>
            </div>
          </template>
        </div>

        <div v-if="addingChild" class="add-child-form">
          <input v-model="childForm.nickname" placeholder="孩子昵称" class="input-sm" />
          <select v-model="childForm.gender" class="input-sm">
            <option value="">选择性别</option>
            <option value="male">👦 男孩</option>
            <option value="female">👧 女孩</option>
            <option value="secret">🤫 保密</option>
          </select>
          <select v-model="childForm.age" class="input-sm">
            <option value="">选择年龄</option>
            <option v-for="i in 14" :key="i" :value="i">{{ i }}岁</option>
          </select>
          <div class="child-actions">
            <button class="btn-save-sm" @click="saveChild" :disabled="saving">添加</button>
            <button class="btn-cancel-sm" @click="addingChild = false">取消</button>
          </div>
        </div>
      </section>
    </div>

    <div class="profile-body" v-else>
      <p class="loading-text">加载中...</p>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <div v-if="editing" class="modal-overlay" @click.self="editing = false">
      <div class="modal-content">
        <h3>编辑资料</h3>
        <div class="avatar-select">
          <span v-for="a in avatars" :key="a" :class="['avatar-option', { active: editAvatar === a }]" @click="editAvatar = a">{{ a }}</span>
        </div>
        <input v-model="editNickname" placeholder="昵称" class="input-full" />
        <div class="modal-actions">
          <button class="btn-primary" @click="saveEdit" :disabled="saving">保存</button>
          <button class="btn-cancel" @click="editing = false">取消</button>
        </div>
      </div>
    </div>

    <div class="logout-section">
      <button class="btn-logout" @click="handleLogout">退出登录</button>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f8fafc;
}
.profile-header {
  position: sticky; top: 0; z-index: 10;
  background: #fff; border-bottom: 1px solid #e2e8f0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px;
}
.profile-header h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0; }
.profile-back { background: none; border: none; font-size: 15px; color: #2563eb; cursor: pointer; padding: 4px 0; }
.profile-body { max-width: 600px; margin: 0 auto; padding: 20px 16px 80px; }
.profile-card {
  background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}
.profile-info {
  display: flex; align-items: center; gap: 12px; cursor: pointer; padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}
.profile-avatar { font-size: 40px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; background: #f0f9ff; border-radius: 50%; }
.profile-meta { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.profile-name { font-size: 17px; font-weight: 600; color: #0f172a; }
.profile-phone { font-size: 13px; color: #94a3b8; }
.profile-edit-hint { font-size: 13px; color: #2563eb; }
.profile-points {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 14px; font-size: 14px; color: #64748b;
}
.points-value { font-size: 22px; font-weight: 700; color: #f59e0b; }
.section-card {
  background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}
.section-title-row {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
}
.section-title-row h3 { font-size: 16px; font-weight: 600; color: #0f172a; margin: 0; }
.empty-state { text-align: center; color: #94a3b8; font-size: 14px; padding: 20px; }
.child-item {
  display: flex; align-items: center; gap: 10px; padding: 12px 0;
  border-bottom: 1px solid #f8fafc; flex-wrap: wrap;
}
.child-item:last-child { border-bottom: none; }
.child-avatar { font-size: 28px; }
.child-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.child-name { font-size: 15px; font-weight: 500; color: #0f172a; }
.child-detail { font-size: 12px; color: #94a3b8; }
.child-actions { display: flex; gap: 6px; align-items: center; }
.btn-edit-sm { background: #f0f9ff; color: #2563eb; border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-del-sm { background: #fef2f2; color: #ef4444; border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-add { background: #2563eb; color: #fff; border: none; padding: 6px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.add-child-form { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; }
.input-sm { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; width: 100%; box-sizing: border-box; }
.input-full { padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 15px; width: 100%; box-sizing: border-box; margin: 8px 0; }
.btn-save-sm { background: #2563eb; color: #fff; border: none; padding: 6px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-cancel-sm { background: #f1f5f9; color: #64748b; border: none; padding: 6px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.btn-primary { background: #2563eb; color: #fff; border: none; padding: 10px 24px; border-radius: 10px; font-size: 15px; font-weight: 500; cursor: pointer; }
.btn-cancel { background: #f1f5f9; color: #64748b; border: none; padding: 10px 24px; border-radius: 10px; font-size: 15px; cursor: pointer; }
.logout-section { text-align: center; padding: 20px; }
.btn-logout { background: none; border: 1px solid #fecaca; color: #ef4444; padding: 10px 32px; border-radius: 10px; font-size: 14px; cursor: pointer; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-content { background: #fff; border-radius: 18px; padding: 24px; width: 100%; max-width: 380px; }
.modal-content h3 { font-size: 17px; font-weight: 600; margin-bottom: 16px; }
.modal-actions { display: flex; gap: 10px; margin-top: 12px; justify-content: flex-end; }
.avatar-select { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.avatar-option { font-size: 28px; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 2px solid transparent; cursor: pointer; }
.avatar-option.active { border-color: #2563eb; background: #f0f9ff; }
.loading-text { text-align: center; color: #94a3b8; font-size: 14px; padding: 40px; }
.error-text { text-align: center; color: #ef4444; font-size: 13px; padding: 10px; }
</style>

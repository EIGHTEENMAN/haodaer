import { reactive, watch } from 'vue'

/**
 * characterStore — AI 朋友自定义名字 + 历史会话
 *
 * - customNames: { [characterId]: 用户起的名字 }
 * - chatHistory: { [characterId]: Message[] } — 最多保留 50 条
 */

const STORAGE_KEY = 'english_character_data'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

interface PersistedState {
  customNames: Record<string, string>
  chatHistory: Record<string, ChatMessage[]>
  lastCharacterId: string | null
}

function load(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { customNames: {}, chatHistory: {}, lastCharacterId: null }
    const parsed = JSON.parse(raw)
    return {
      customNames: parsed.customNames || {},
      chatHistory: parsed.chatHistory || {},
      lastCharacterId: parsed.lastCharacterId || null
    }
  } catch {
    return { customNames: {}, chatHistory: {}, lastCharacterId: null }
  }
}

const initial = load()

export const characterStore = reactive({
  customNames: initial.customNames,
  chatHistory: initial.chatHistory,
  lastCharacterId: initial.lastCharacterId,

  /** 获取显示名（用户自定义名 → 角色默认名） */
  getDisplayName(characterId: string, defaultName: string): string {
    return this.customNames[characterId] || defaultName
  },

  setCustomName(characterId: string, name: string) {
    if (!name || !name.trim()) {
      delete this.customNames[characterId]
    } else {
      this.customNames[characterId] = name.trim().slice(0, 10)
    }
  },

  hasCustomName(characterId: string): boolean {
    return !!this.customNames[characterId]
  },

  getHistory(characterId: string): ChatMessage[] {
    return this.chatHistory[characterId] || []
  },

  addMessage(characterId: string, msg: ChatMessage) {
    if (!this.chatHistory[characterId]) this.chatHistory[characterId] = []
    this.chatHistory[characterId].push(msg)
    // 保留最近 50 条
    if (this.chatHistory[characterId].length > 50) {
      this.chatHistory[characterId] = this.chatHistory[characterId].slice(-50)
    }
    this.lastCharacterId = characterId
  },

  clearHistory(characterId: string) {
    delete this.chatHistory[characterId]
  },

  setLastCharacterId(id: string) {
    this.lastCharacterId = id
  }
})

// 自动持久化（5s 节流）
let saveTimer: number | null = null
watch(
  () => ({
    customNames: { ...characterStore.customNames },
    chatHistory: JSON.parse(JSON.stringify(characterStore.chatHistory)),
    lastCharacterId: characterStore.lastCharacterId
  }),
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        customNames: characterStore.customNames,
        chatHistory: characterStore.chatHistory,
        lastCharacterId: characterStore.lastCharacterId
      }))
    }, 5000)
  },
  { deep: true }
)
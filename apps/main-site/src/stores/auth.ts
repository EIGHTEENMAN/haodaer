import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getToken, setToken, getUser, setUser,
  removeToken, removeUser, isLoggedIn as checkLoggedIn,
  getIsNewUser, setIsNewUser, logout as authLogout,
  phoneLogin as apiPhoneLogin,
  fetchUser as apiFetchUser,
} from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(getUser())
  const token = ref<string | null>(getToken())

  const isLoggedIn = computed(() => !!token.value)
  const isNewUser = computed(() => getIsNewUser())

  function setAuth(t: string, u: any, isNew: boolean) {
    token.value = t
    user.value = u
    setToken(t)
    setUser(u)
    setIsNewUser(isNew)
  }

  async function phoneLogin(phone: string, code: string) {
    const d = await apiPhoneLogin(phone, code)
    if (d.code === 'OK') {
      setAuth(d.data.accessToken, d.data.user, d.data.isNewUser)
    }
    return d
  }

  async function refreshUser() {
    const u = await apiFetchUser()
    if (u) {
      user.value = u
      setUser(u)
    }
    return u
  }

  function logout() {
    token.value = null
    user.value = null
    authLogout()
  }

  return {
    user, token, isLoggedIn, isNewUser,
    setAuth, phoneLogin, refreshUser, logout,
  }
})

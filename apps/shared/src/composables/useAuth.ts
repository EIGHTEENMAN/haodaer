import { ref } from 'vue'
import { getCookie, setCookie, removeCookie } from './cookie'

interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
}

export function isLoggedIn(): boolean {
  return !!sessionStorage.getItem('haodaer_user')
}

export function getUser(): User | null {
  try {
    const d = sessionStorage.getItem('haodaer_user')
    return d ? JSON.parse(d) : null
  } catch {
    return null
  }
}

export function getIsNewUser(): boolean {
  return localStorage.getItem('haodaer_new_user') === 'true'
}

export function setUser(u: User) {
  sessionStorage.setItem('haodaer_user', JSON.stringify(u))
}

export function useAuth() {
  // Cross-subdomain sync: try cookie if localStorage is empty
  let storedToken = sessionStorage.getItem('haodaer_token')
  let storedUser = getUser()
  if (!storedToken) {
    const cookieToken = getCookie('haodaer_token')
    if (cookieToken) {
      storedToken = cookieToken
      sessionStorage.setItem('haodaer_token', cookieToken)
      // Async fetch user data from cookie-identified session
      fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + cookieToken }
      }).then(r => r.json()).then(d => {
        if (d.code === 'OK') {
          sessionStorage.setItem('haodaer_user', JSON.stringify(d.data))
          user.value = d.data
        }
      }).catch(() => {})
    }
  }

  const token = ref(storedToken || '')
  const user = ref<User | null>(storedUser)

  function login(t: string, u: User) {
    token.value = t
    user.value = u
    sessionStorage.setItem('haodaer_token', t)
    sessionStorage.setItem('haodaer_user', JSON.stringify(u))
    setCookie('haodaer_token', t)
  }

  function logout() {
    token.value = ''
    user.value = null
    sessionStorage.removeItem('haodaer_token')
    sessionStorage.removeItem('haodaer_user')
    removeCookie('haodaer_token')
  }

  return { token, user, login, logout }
}

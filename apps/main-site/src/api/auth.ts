const TOKEN_KEY = 'haodaer_token'
const USER_KEY = 'haodaer_user'
const NEW_USER_KEY = 'haodaer_isNewUser'
const AUTH_SERVICE = 'http://localhost:3007'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  document.cookie = 'haodaer_token=' + encodeURIComponent(token) + '; domain=.grandand.com; path=/; Secure; SameSite=Lax'
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
  document.cookie = 'haodaer_token=; domain=.grandand.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

export function getUser(): any | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setUser(user: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeUser() {
  localStorage.removeItem(USER_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export function getIsNewUser(): boolean {
  return localStorage.getItem(NEW_USER_KEY) === 'true'
}

export function setIsNewUser(val: boolean) {
  if (val) localStorage.setItem(NEW_USER_KEY, 'true')
  else localStorage.removeItem(NEW_USER_KEY)
}

export function logout() {
  removeToken()
  removeUser()
  setIsNewUser(false)
}

// API calls
export async function sendCode(phone: string) {
  const res = await fetch('/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, purpose: 'login' }),
  })
  return res.json()
}

export async function phoneLogin(phone: string, code: string) {
  const res = await fetch('/api/auth/phone-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  })
  return res.json()
}

export async function fetchUser() {
  const token = getToken()
  if (!token) return null
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const d = await res.json()
    if (d.code === 'OK') {
      setUser(d.data)
      return d.data
    }
    return null
  } catch {
    return null
  }
}

export async function saveProfile(data: { nickname: string; avatar?: string }) {
  const token = getToken()
  const res = await fetch('/api/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function addChild(data: { nickname: string; gender?: string; age?: number }) {
  const token = getToken()
  const res = await fetch('/api/user/children', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function getChildren() {
  const token = getToken()
  const res = await fetch('/api/user/children', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function deleteChild(id: string) {
  const token = getToken()
  const res = await fetch('/api/user/children/' + id, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function updateChild(id: string, data: { nickname: string; gender?: string; age?: number }) {
  const token = getToken()
  const res = await fetch('/api/user/children/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  return res.json()
}

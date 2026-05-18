'use client';

const TOKEN_KEY = 'haodaer_token';
const USER_KEY = 'haodaer_user';
const NEW_USER_KEY = 'haodaer_isNewUser';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = 'haodaer_token=' + encodeURIComponent(token) + '; domain=.grandand.com; path=/; Secure; SameSite=Lax';
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'haodaer_token=; domain=.grandand.com; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeUser() {
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function getIsNewUser(): boolean {
  return localStorage.getItem(NEW_USER_KEY) === 'true';
}

export function setIsNewUser(val: boolean) {
  if (val) localStorage.setItem(NEW_USER_KEY, 'true');
  else localStorage.removeItem(NEW_USER_KEY);
}

export async function fetchUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    if (d.code === 'OK') {
      setUser(d.data);
      return d.data;
    }
    return null;
  } catch {
    return null;
  }
}

export function logout() {
  removeToken();
  removeUser();
  setIsNewUser(false);
}

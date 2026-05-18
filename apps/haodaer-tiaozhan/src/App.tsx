import { useState, useEffect } from 'react'
import Home from './pages/Home'
import QuizBattle from './pages/QuizBattle'

type Page = 'home' | 'quiz'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [user, setUser] = useState<{ id: string; username: string; token: string } | null>(null)
  const [battleSettings, setBattleSettings] = useState<{ mode: 'solo' | 'online'; category: string; zone: string } | null>(null)

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) {
        setPage(event.state.page as Page)
      } else {
        setPage('home')
      }
    }
    window.addEventListener('popstate', handlePopState)
    history.replaceState({ page: 'home' }, '')
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (p: Page) => {
    setPage(p)
    history.pushState({ page: p }, '')
  }

  const handleLogin = async (username: string) => {
    const id = crypto.randomUUID()
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, username }),
      })
      const data = await res.json()
      setUser({ id, username, token: data.token })
    } catch {
      const token = btoa(id + ':' + username)
      setUser({ id, username, token })
    }
  }

  const startBattle = (mode: 'solo' | 'online', category: string, zone: string) => {
    setBattleSettings({ mode, category, zone })
    navigate('quiz')
  }

  return (
    <div className="app">
      {page === 'home' ? null : (
        <header className="header">
          <div className="header-inner">
            <div className="header-left">
              <a href="https://grandand.com" className="logo">好大儿</a>
              <form className="header-search" onSubmit={(e) => { e.preventDefault(); const inp = document.querySelector(".search-input") as HTMLInputElement; if(inp && inp.value) window.location.href = "https://grandand.com/search?q=" + encodeURIComponent(inp.value); }}>
                <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input placeholder="搜索" className="search-input" />
              </form>
            </div>
            <div className="header-right">
              <div className="header-links">
                <a href="https://forum.grandand.com" className="header-link">💬 论坛</a>
                <a href="https://store.grandand.com" className="header-link">🎁 商城</a>
                <a href="/faq" className="header-link">❓ 帮助</a>
              </div>
              <div className="header-auth">
                {user ? (
                  <span className="header-user" style={{cursor: 'pointer'}}>
                    <span>{user.username}</span>
                  </span>
                ) : (
                  <button className="header-login" onClick={() => window.location.href = 'https://grandand.com/login'}>登录 / 注册</button>
                )}
              </div>
            </div>
          </div>
        </header>
      )}
      {page === 'home' && (
        <Home user={user} onLogin={handleLogin} onStart={startBattle} />
      )}
      {page === 'quiz' && user && battleSettings && (
        <QuizBattle user={user} onBack={() => navigate('home')} initialMode={battleSettings.mode} initialCategory={battleSettings.category} />
      )}
    </div>
  )
}

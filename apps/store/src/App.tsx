import { useState, useEffect } from 'react'

interface Product { id: string; name: string; description: string; category: string; price: number; image: string; stock: number }
interface UserItem { product_id: string; quantity: number; name: string; category: string; image: string }
interface Order { id: string; product_id: string; product_name: string; image: string; quantity: number; points_spent: number; status: string; created_at: string }

function api(url: string, options?: RequestInit) {
  return fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers as any } })
}

function App() {
  const [user, setUser] = useState<{ id: string; username: string; token: string } | null>(null)
  const [points, setPoints] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<UserItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loginName, setLoginName] = useState('')
  const [tab, setTab] = useState<'shop' | 'inventory' | 'history'>('shop')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState('')

  useEffect(() => {
    api('/api/products').then(r => r.json()).then(setProducts).catch(() => {})
    history.replaceState({ tab: 'shop' }, '')
  }, [])

  // Browser navigation: popstate listener for tab switching
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setTab(event.state.tab)
      } else {
        setTab('shop')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const switchTab = (t: 'shop' | 'inventory' | 'history') => {
    history.pushState({ tab: t }, '')
    setTab(t)
  }

  const handleLogin = async () => {
    if (!loginName.trim()) return
    const id = crypto.randomUUID()
    const r = await api('/api/auth', { method: 'POST', body: JSON.stringify({ userId: id, username: loginName.trim() }) })
    const d = await r.json()
    setUser({ id, username: loginName.trim(), token: d.token })
    setPoints(d.points)
    setLoginName('')
  }

  const fetchUserData = async () => {
    if (!user) return
    const r = await api('/api/user', { headers: { 'Authorization': `Bearer ${user.token}` } })
    const d = await r.json()
    setPoints(d.user.points)
    setItems(d.items || [])
    setOrders(d.orders || [])
  }

  useEffect(() => { if (user) fetchUserData() }, [user])

  const handleRedeem = async (productId: string) => {
    if (!user || loading) return
    setLoading(productId)
    const r = await api('/api/redeem', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${user.token}` },
      body: JSON.stringify({ productId }),
    })
    const d = await r.json()
    if (d.error) { alert(d.error); setLoading(''); return }
    setPoints(d.points_left)
    await fetchUserData()
    setLoading('')
  }

  const categories = [...new Set(products.map(p => p.category))]
  const filtered = category ? products.filter(p => p.category === category) : products

  const owned = (productId: string) => items.some(i => i.product_id === productId)

  return (
    <div className="app">
      <nav className="nav">
        <h1 onClick={() => switchTab('shop')}>好大儿商城</h1>
        <div className="nav-right">
          {user && <span className="points-badge">⭐ {points} 积分</span>}
          {!user ? (
            <div className="login-form">
              <input className="input" style={{ width: 100, padding: '6px 10px', fontSize: 12 }}
                placeholder="昵称" value={loginName} onChange={e => setLoginName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <button className="btn btn-primary btn-sm" onClick={handleLogin}>登录</button>
            </div>
          ) : (
            <span className="username">{user.username}</span>
          )}
        </div>
      </nav>

      {user && (
        <div className="tabs">
          {(['shop', 'inventory', 'history'] as const).map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => switchTab(t)}>
              {t === 'shop' ? '🛒 商品' : t === 'inventory' ? '🎒 我的物品' : '📜 兑换记录'}
            </button>
          ))}
        </div>
      )}

      {tab === 'shop' && (
        <>
          <div className="categories">
            <button className={`cat-chip ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>全部</button>
            {categories.map(c => (
              <button key={c} className={`cat-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>

          <div className="product-grid">
            {filtered.map(p => (
              <div key={p.id} className="product-card">
                <div className="product-image">{p.image}</div>
                <div className="product-name">{p.name}</div>
                <div className="product-desc">{p.description}</div>
                <div className="product-footer">
                  <span className="product-price">⭐ {p.price}</span>
                  {user && (
                    owned(p.id) ? <span className="owned-badge">已拥有</span>
                    : <button className="btn btn-primary btn-sm" disabled={loading === p.id}
                      onClick={() => handleRedeem(p.id)}>
                      {loading === p.id ? '兑换中...' : '兑换'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!user && <p className="login-prompt">请登录后兑换商品</p>}
        </>
      )}

      {tab === 'inventory' && (
        <div>
          {items.length === 0 ? <p className="empty-state">还没有兑换过任何物品</p> : (
            <div className="product-grid">
              {items.map(i => (
                <div key={i.product_id} className="product-card">
                  <div className="product-image">{i.image}</div>
                  <div className="product-name">{i.name}</div>
                  <div className="product-desc">{i.category}</div>
                  <div className="product-footer">
                    <span className="product-price">×{i.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {orders.length === 0 ? <p className="empty-state">还没有兑换记录</p> : (
            <div className="order-list">
              {orders.map(o => (
                <div key={o.id} className="order-item">
                  <span className="order-image">{o.image}</span>
                  <div className="order-info">
                    <div className="order-name">{o.product_name}</div>
                    <div className="order-meta">×{o.quantity} · {o.created_at?.slice(0, 10)}</div>
                  </div>
                  <span className="order-price">-⭐{o.points_spent}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App

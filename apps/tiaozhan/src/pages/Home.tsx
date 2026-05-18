import { useState, useEffect } from 'react'

interface Props {
  user: { id: string; username: string; token: string } | null
  onLogin: (username: string) => void
  onStart: (mode: 'solo' | 'online', category: string, zone: string) => void
}

interface LeaderEntry {
  username: string
  score: number
  games_played: number
  games_won: number
}

interface SoloLeaderEntry {
  username: string
  total_questions: number
  total_correct: number
  accuracy: number
  games_played: number
}

const ZONES = ['海外', '港澳台', '华东', '华南', '华中', '华北', '西南', '西北', '东北']
const SUBJECTS = [
  { id: 'guoxue', name: '国学', icon: '📖' },
  { id: 'shici', name: '诗词', icon: '📜' },
  { id: 'tongshi', name: '通识', icon: '🌍' },
  { id: 'mixed', name: '混合', icon: '🔀' },
]
const LEADER_TABS = [
  { id: 'mixed', name: '综合榜' },
  { id: 'guoxue', name: '国学榜' },
  { id: 'shici', name: '诗词榜' },
  { id: 'tongshi', name: '通识榜' },
]
const LEADER_MODES = [
  { id: 'global', name: '🌐 全球对战' },
  { id: 'solo', name: '📖 单机挑战' },
]

export default function Home({ user, onLogin, onStart }: Props) {
  const [name, setName] = useState('')
  const [zone, setZone] = useState('华东')
  const [category, setCategory] = useState('mixed')
  const [gameMode, setGameMode] = useState<'solo' | 'online'>('solo')
  const [leaderMode, setLeaderMode] = useState<'global' | 'solo'>('global')
  const [leaderTab, setLeaderTab] = useState('mixed')
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [soloLeaders, setSoloLeaders] = useState<SoloLeaderEntry[]>([])
  const [loadingLeader, setLoadingLeader] = useState(false)

  // Fetch global leaderboard
  useEffect(() => {
    if (leaderMode !== 'global') return
    setLoadingLeader(true)
    const params = leaderTab !== 'mixed' ? `?category=${leaderTab}` : ''
    fetch(`/api/quiz/leaderboard${params}`)
      .then(r => r.json())
      .then(data => setLeaders(data))
      .catch(() => setLeaders([]))
      .finally(() => setLoadingLeader(false))
  }, [leaderTab, leaderMode])

  // Fetch solo leaderboard
  useEffect(() => {
    if (leaderMode !== 'solo') return
    setLoadingLeader(true)
    const params = leaderTab !== 'mixed' ? `?category=${leaderTab}` : ''
    fetch(`/api/quiz/leaderboard/solo${params}`)
      .then(r => r.json())
      .then(data => setSoloLeaders(data))
      .catch(() => setSoloLeaders([]))
      .finally(() => setLoadingLeader(false))
  }, [leaderMode, leaderTab])

  return (
    <div className="home-new">
      {/* Login bar */}
      {!user ? (
        <div className="home-login-bar">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="输入昵称开始挑战"
            maxLength={12}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onLogin(name.trim())}
          />
          <button
            className="btn-primary"
            disabled={!name.trim()}
            onClick={() => onLogin(name.trim())}
          >
            开始
          </button>
        </div>
      ) : (
        <div className="home-user-bar">
          <span className="home-user-avatar">👋</span>
          <span className="home-user-name">{user.username}</span>
        </div>
      )}

      {/* Leaderboard */}
      <div className="leaderboard-v2">
        {/* Top-level toggle: 单机挑战 / 全球对战 */}
        <div className="leader-mode-toggle">
          {LEADER_MODES.map(mode => (
            <button
              key={mode.id}
              className={`leader-mode-btn ${leaderMode === mode.id ? 'active' : ''}`}
              onClick={() => setLeaderMode(mode.id as 'global' | 'solo')}
            >
              {mode.name}
            </button>
          ))}
        </div>

        {/* Category tabs for both modes */}
        <div className="leader-tabs">
          {LEADER_TABS.map(tab => (
            <button
              key={tab.id}
              className={`leader-tab ${leaderTab === tab.id ? 'active' : ''}`}
              onClick={() => setLeaderTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Leader list */}
        <div className="leader-list">
          {loadingLeader ? (
            <div className="leader-loading">加载中...</div>
          ) : leaderMode === 'global' ? (
            leaders.length === 0 ? (
              <div className="leader-empty">暂无排行数据，快来挑战吧！</div>
            ) : (
              leaders.slice(0, 10).map((p, i) => (
                <div key={i} className="leader-row">
                  <span className={`leader-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                  <span className="leader-name">{p.username}</span>
                  <span className="leader-stat">{p.score}分</span>
                </div>
              ))
            )
          ) : (
            soloLeaders.length === 0 ? (
              <div className="leader-empty">暂无练习记录，开启单机挑战吧！</div>
            ) : (
              soloLeaders.slice(0, 10).map((p, i) => (
                <div key={i} className="leader-row">
                  <span className={`leader-rank ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                  <span className="leader-name">{p.username}</span>
                  <span className="leader-stat">
                    {p.total_questions}题 · {p.accuracy}%
                  </span>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Battle Setup */}
      <div className="battle-setup">
        <h2 className="battle-title">⚔️ 开始对战</h2>

        {/* Zone Selection */}
        <div className="setup-section">
          <label className="setup-label">战区</label>
          <div className="zone-grid">
            {ZONES.map(z => (
              <button
                key={z}
                className={`zone-btn ${zone === z ? 'active' : ''}`}
                onClick={() => setZone(z)}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Selection */}
        <div className="setup-section">
          <label className="setup-label">科目</label>
          <div className="subject-row">
            {SUBJECTS.map(s => (
              <button
                key={s.id}
                className={`subj-pill ${category === s.id ? 'active' : ''}`}
                onClick={() => setCategory(s.id)}
              >
                <span>{s.icon}</span>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Selection */}
        <div className="setup-section">
          <label className="setup-label">模式</label>
          <div className="mode-row">
            <button
              className={`mode-btn ${gameMode === 'solo' ? 'active' : ''}`}
              onClick={() => setGameMode('solo')}
            >
              <span className="mode-icon">📚</span>
              <span className="mode-name">单人练习</span>
            </button>
            <button
              className={`mode-btn ${gameMode === 'online' ? 'active' : ''}`}
              onClick={() => setGameMode('online')}
            >
              <span className="mode-icon">⚡</span>
              <span className="mode-name">在线匹配</span>
            </button>
          </div>
        </div>

        {/* Start Button */}
        <button
          className="btn-start"
          onClick={() => onStart(gameMode, category, zone)}
        >
          {gameMode === 'solo' ? '🚀 开始答题' : '⚡ 开始匹配'}
        </button>
      </div>
    </div>
  )
}

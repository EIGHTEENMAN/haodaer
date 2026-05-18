import { useState, useEffect, useRef, useCallback } from 'react'

interface Props {
  user: { id: string; username: string; token: string }
  onBack: () => void
  initialMode?: 'solo' | 'online'
  initialCategory?: string
}

interface Question {
  id: number
  question: string
  options: string
  category: string
  difficulty: number
  answer: number
}

interface Player {
  userId: string
  username: string
}

type Step = 'mode-select' | 'subject-select' | 'room-setup' | 'room-lobby' | 'queue' | 'playing' | 'result'

type Difficulty = { label: string; value: number }

const UI_CATEGORY_MAP: Record<string, string[]> = {
  guoxue: ['chinese'],
  shici: ['chinese'],
  tongshi: ['general', 'science', 'english', 'math'],
  mixed: [],
}

const SUBJECTS = [
  { id: 'chinese', name: '语文', icon: '📖' },
  { id: 'math', name: '数学', icon: '🔢' },
  { id: 'english', name: '英语', icon: '🔤' },
  { id: 'science', name: '科学', icon: '🔬' },
  { id: 'general', name: '常识', icon: '🌍' },
]

const DIFFICULTIES: Difficulty[] = [
  { label: '全部', value: 0 },
  { label: '简单', value: 1 },
  { label: '普通', value: 2 },
  { label: '困难', value: 3 },
]

const SUBJECT_LABELS: Record<string, string> = {
  chinese: '语文', math: '数学', english: '英语', science: '科学', general: '常识',
}

export default function QuizBattle({ user, onBack, initialMode, initialCategory }: Props) {
  const initialSubjects = initialCategory ? (UI_CATEGORY_MAP[initialCategory] || []) : []
  const [step, setStep] = useState<Step>(() => {
    if (initialMode === 'solo') return 'playing'
    if (initialMode === 'online') return 'room-setup'
    return 'mode-select'
  })
  const [gameMode, setGameMode] = useState<'solo' | 'online' | null>(initialMode || null)
  const [subjects, setSubjects] = useState<string[]>(initialSubjects)
  const [difficulty, setDifficulty] = useState(0)
  const [teamSize, setTeamSize] = useState(1)

  // Room state
  const [roomCode, setRoomCode] = useState('')
  const [roomPlayers, setRoomPlayers] = useState<Player[]>([])
  const [roomSlots, setRoomSlots] = useState(2)

  // WebSocket
  const [ws, setWs] = useState<WebSocket | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Battle state
  const [opponent, setOpponent] = useState('')
  const [question, setQuestion] = useState<Question | null>(null)
  const [qNumber, setQNumber] = useState(0)
  const [totalQ, setTotalQ] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ isWinner: boolean; isDraw: boolean; message: string; teamScore: number; opponentScore: number; opponents: string[]; teamMembers: string[] } | null>(null)
  const [timeLeft, setTimeLeft] = useState(15)

  // Solo state
  const [soloQuestions, setSoloQuestions] = useState<Question[]>([])
  const [soloIndex, setSoloIndex] = useState(0)
  const [soloDone, setSoloDone] = useState(false)
  const [soloCorrect, setSoloCorrect] = useState(0)
  const [soloAnswers, setSoloAnswers] = useState<Record<number, number>>({})
  const [soloLoading, setSoloLoading] = useState(false)

  // Auto-start solo when coming from home page
  const autoStarted = useRef(false)

  useEffect(() => {
    if (initialMode === 'solo' && !autoStarted.current) {
      autoStarted.current = true
      setSoloLoading(true)
      startSolo()
    }
  }, [])

  // Record solo score when done
  useEffect(() => {
    if (soloDone && soloQuestions.length > 0 && user.token) {
      const cat = initialCategory || 'mixed'
      fetch('/api/quiz/solo/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          totalQuestions: soloQuestions.length,
          totalCorrect: soloCorrect,
          category: cat,
        }),
      }).catch(() => {})
    }
  }, [soloDone])

  // Timer for questions
  useEffect(() => {
    if (timeLeft > 0 && question && gameMode === 'online') {
      const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [timeLeft, question, gameMode])

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try { wsRef.current.send(JSON.stringify({ type: 'leave_room' })) } catch {}
        try { wsRef.current.send(JSON.stringify({ type: 'leave_queue' })) } catch {}
        wsRef.current.close()
      }
    }
  }, [])

  // ---- WebSocket Setup ----
  const connect = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close() } catch {}
    }
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.hostname}:${location.port}/?token=${encodeURIComponent(user.token)}`
    const socket = new WebSocket(url)
    wsRef.current = socket

    socket.onopen = () => {
      setWs(socket)
    }

    socket.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      switch (msg.type) {
        case 'connected':
          break
        case 'error':
          alert(msg.message)
          break
        case 'room_created':
          setRoomCode(msg.roomCode)
          setRoomSlots(msg.slots)
          setRoomPlayers(msg.players)
          setStep('room-lobby')
          break
        case 'room_update':
          setRoomPlayers(msg.players)
          break
        case 'match_found':
          setOpponent(msg.opponent)
          setTotalQ(msg.totalQuestions)
          setScores({})
          setResult(null)
          setStep('playing')
          break
        case 'match_start':
          setTotalQ(msg.totalQuestions)
          setScores({})
          setResult(null)
          break
        case 'question':
          setQuestion(msg)
          setQNumber(msg.questionNumber)
          setTotalQ(msg.totalQuestions)
          setSelected(null)
          setAnswered(false)
          setTimeLeft(msg.timeLimit || 15)
          if (step !== 'playing') setStep('playing')
          break
        case 'answer_result':
          setScores(msg.scores)
          break
        case 'timeout':
          setQuestion(null)
          break
        case 'match_end':
          setResult(msg)
          setQuestion(null)
          setStep('result')
          break
        case 'opponent_left':
          socket.close()
          setWs(null)
          setStep('mode-select')
          break
        case 'queue_status':
          break
      }
    }

    socket.onclose = () => {
      setWs(null)
    }

    return socket
  }, [user, step])

  // Solo: fetch questions
  const startSolo = async () => {
    const params = new URLSearchParams()
    if (subjects.length > 0 && subjects.length < SUBJECTS.length) {
      params.set('subjects', subjects.join(','))
    }
    if (difficulty > 0) {
      params.set('difficulty', difficulty.toString())
    }
    try {
      const res = await fetch(`/api/quiz/solo?${params}`)
      const data = await res.json()
      if (data.length === 0) {
        alert('没有找到符合条件的题目，请调整选择')
        return
      }
      setSoloQuestions(data)
      setSoloIndex(0)
      setSoloDone(false)
      setSoloCorrect(0)
      setSoloAnswers({})
      setSelected(null)
      setAnswered(false)
      setSoloLoading(false)
      setStep('playing')
    } catch {
      alert('获取题目失败，请重试')
      setSoloLoading(false)
    }
  }

  const handleSoloAnswer = (idx: number) => {
    if (answered) return
    setSelected(idx)
    setAnswered(true)
    setSoloAnswers(prev => ({ ...prev, [soloIndex]: idx }))
    if (idx === soloQuestions[soloIndex]?.answer) {
      setSoloCorrect(c => c + 1)
    }
  }

  const handleSoloNext = () => {
    if (soloIndex < soloQuestions.length - 1) {
      const next = soloIndex + 1
      setSoloIndex(next)
      setSelected(soloAnswers[next] ?? null)
      setAnswered(soloAnswers[next] !== undefined)
    } else {
      setSoloDone(true)
    }
  }

  const handleSoloPrev = () => {
    if (soloIndex > 0) {
      const prev = soloIndex - 1
      setSoloIndex(prev)
      setSelected(soloAnswers[prev] ?? null)
      setAnswered(soloAnswers[prev] !== undefined)
    }
  }

  // Online: create room
  const createRoom = () => {
    const socket = connect()
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'create_room',
        subjects,
        difficulty,
        teamSize,
      }))
    }
  }

  // Online: join room by code
  const joinRoom = (code: string) => {
    const socket = connect()
    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join_room',
        roomCode: code,
      }))
    }
  }

  // Online: start match (host)
  const startMatch = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'start_match' }))
      setStep('queue')
    }
  }

  // Online: quick match
  const quickMatch = () => {
    const socket = connect()
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'join_queue' }))
      setStep('queue')
    }
  }

  // Handle answer (online)
  const handleAnswer = (idx: number) => {
    if (answered || !wsRef.current) return
    setSelected(idx)
    setAnswered(true)
    wsRef.current.send(JSON.stringify({ type: 'submit_answer', answer: idx }))
  }

  // Leave room / cancel
  const handleLeave = () => {
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'leave_room' })) } catch {}
      try { wsRef.current.send(JSON.stringify({ type: 'leave_queue' })) } catch {}
      wsRef.current.close()
    }
    setWs(null)
    setSoloLoading(false)
    setStep('mode-select')
    setQuestion(null)
    setResult(null)
    setSoloDone(false)
    setSoloQuestions([])
    setRoomCode('')
    setRoomPlayers([])
    setGameMode(null)
  }

  const toggleSubject = (id: string) => {
    setSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const selectAllSubjects = () => {
    setSubjects(prev => prev.length === SUBJECTS.length ? [] : SUBJECTS.map(s => s.id))
  }

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode).catch(() => {})
    }
  }

  const currentSoloQ = soloQuestions[soloIndex]

  // ===================== RENDER =====================

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <button className="btn-secondary" onClick={handleLeave}>← 返回</button>
        {step === 'playing' && gameMode === 'online' && question && (
          <span style={{ fontSize: 13, color: 'var(--text-light)' }}>⏱ {timeLeft}s</span>
        )}
        {step === 'playing' && gameMode === 'solo' && !soloLoading && (
          <span style={{ fontSize: 13, color: 'var(--text-light)' }}>
            已答 {Object.keys(soloAnswers).length}/{soloQuestions.length}
          </span>
        )}
      </div>

      {/* Step 1: Mode Select */}
      {step === 'mode-select' && (
        <div className="zone-select">
          <h2>选择挑战模式</h2>
          <p className="subtitle">你想怎么玩？</p>
          <div className="zone-cards">
            <div className="zone-card" onClick={() => { setGameMode('solo'); setStep('subject-select'); }}>
              <div className="zone-icon">📚</div>
              <div className="zone-info">
                <h3>单人练习</h3>
                <p>自己练习题目，自定节奏，没有对手压力。选好科目和难度后开始答题，每道题可以慢慢思考。</p>
              </div>
            </div>
            <div className="zone-card" onClick={() => { setGameMode('online'); setStep('subject-select'); }}>
              <div className="zone-icon">⚔️</div>
              <div className="zone-info">
                <h3>在线对战</h3>
                <p>和全国小朋友实时对战！可以快速匹配、创建房间邀请好友，比拼谁的知识更渊博。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Subject Select */}
      {step === 'subject-select' && (
        <div className="subject-select">
          <h2>{gameMode === 'solo' ? '选择练习科目' : '选择对战科目'}</h2>
          <p className="subtitle">选择你想挑战的科目（可多选）</p>

          <div className="subject-grid">
            {SUBJECTS.map(s => (
              <div
                key={s.id}
                className={`subject-card ${subjects.includes(s.id) ? 'selected' : ''}`}
                onClick={() => toggleSubject(s.id)}
              >
                <div className="subj-icon">{s.icon}</div>
                <div className="subj-name">{s.name}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: -4 }}>
            <button className="diff-btn" onClick={selectAllSubjects} style={{ fontSize: 13, padding: '4px 16px' }}>
              {subjects.length === SUBJECTS.length ? '取消全选' : '全选'}
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>难度选择</p>
            <div className="difficulty-select">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  className={`diff-btn ${difficulty === d.value ? 'selected' : ''}`}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
            {gameMode === 'solo' ? (
              <button
                className="btn-primary"
                onClick={() => { setSoloLoading(true); startSolo(); }}
              >
                🚀 开始练习
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => setStep('room-setup')}
              >
                下一步
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Room Setup (online only) */}
      {step === 'room-setup' && (
        <div className="room-setup">
          <h2>房间设置</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>选择每队人数</p>

          <div className="team-size-select">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className={`team-size-btn ${teamSize === n ? 'selected' : ''}`}
                onClick={() => setTeamSize(n)}
              >
                <div className="size">{n}v{n}</div>
                <div className="size-label">每队{n}人</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
            <button className="btn-primary" onClick={createRoom}>
              🏠 创建房间
            </button>
            <button className="btn-secondary" onClick={quickMatch}>
              ⚡ 快速匹配
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 8 }}>
              已有房间码？
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
              <input
                id="join-room-input"
                placeholder="输入房间码"
                maxLength={4}
                style={{
                  padding: '10px 14px', border: '2px solid #e7e5e4', borderRadius: 10,
                  fontSize: 18, width: 120, textAlign: 'center', letterSpacing: 4, textTransform: 'uppercase',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim().toUpperCase()
                    if (val) joinRoom(val)
                  }
                }}
              />
              <button className="btn-primary" style={{ padding: '10px 20px' }} onClick={() => {
                const inp = document.getElementById('join-room-input') as HTMLInputElement
                if (inp && inp.value.trim()) joinRoom(inp.value.trim().toUpperCase())
              }}>
                加入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Room Lobby */}
      {step === 'room-lobby' && (
        <div className="room-lobby">
          <h2>等待队友加入</h2>

          <div className="room-code-box" onClick={copyRoomCode}>
            <div className="label">房间码（点击复制）</div>
            <div className="code">{roomCode}</div>
            <div className="hint">邀请好友输入这个房间码加入</div>
          </div>

          <div className="team-slots">
            {Array.from({ length: roomSlots }).map((_, i) => {
              const player = roomPlayers[i]
              return (
                <div key={i} className={`slot ${player ? 'filled' : ''}`}>
                  <div className="slot-icon">{player ? '👤' : '⬜'}</div>
                  <div className="slot-name">{player ? player.username : '等待加入...'}</div>
                  <div className="slot-status">
                    {player ? (player.userId === roomPlayers[0]?.userId ? '👑 房主' : '✅ 已加入') : '⏳'}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={startMatch}>
              🚀 开始对战
            </button>
            <button className="btn-secondary" onClick={handleLeave}>
              离开房间
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Queue */}
      {step === 'queue' && (
        <div className="quiz-card waiting">
          <div className="spinner" />
          <p>正在匹配...</p>
          <p style={{ fontSize: 13, color: 'var(--text-light)' }}>请稍候</p>
          <button className="btn-secondary" onClick={handleLeave}>取消匹配</button>
        </div>
      )}

      {/* Step 6: Playing - Online */}
      {step === 'playing' && gameMode === 'online' && question && (
        <div className="quiz-card">
          <div className="question-number">
            第 {qNumber}/{totalQ} 题 · {SUBJECT_LABELS[question.category] || question.category}
            {question.difficulty >= 2 ? ' · ⭐难度' + question.difficulty : ''}
          </div>
          <div className="question-text">{question.question}</div>
          <div className="options">
            {JSON.parse(typeof question.options === 'string' ? question.options : '[]').map((opt: string, i: number) => (
              <button
                key={i}
                className={`option-btn ${selected === i ? (answered ? (i === question.answer ? 'correct' : 'wrong') : 'selected') : ''}`}
                onClick={() => handleAnswer(i)}
                disabled={answered}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="score-bar" style={{ marginTop: 16 }}>
            <span>你：{scores[user.id] || 0}分</span>
            <span>
              {Object.entries(scores).filter(([k]) => k !== user.id).length > 0
                ? `对手：${Object.entries(scores).filter(([k]) => k !== user.id).reduce((a, [, v]) => a + v, 0)}分`
                : `对手：0分`}
            </span>
          </div>
        </div>
      )}

      {/* Step 6: Playing - Solo (loading) */}
      {step === 'playing' && gameMode === 'solo' && soloLoading && (
        <div className="quiz-card waiting">
          <div className="spinner" />
          <p>加载题目中...</p>
        </div>
      )}

      {/* Step 6: Playing - Solo */}
      {step === 'playing' && gameMode === 'solo' && currentSoloQ && !soloDone && !soloLoading && (
        <div className="quiz-card">
          <div className="question-number">
            第 {soloIndex + 1}/{soloQuestions.length} 题 · {SUBJECT_LABELS[currentSoloQ.category] || currentSoloQ.category}
          </div>
          <div className="question-text">{currentSoloQ.question}</div>
          <div className="options">
            {JSON.parse(typeof currentSoloQ.options === 'string' ? currentSoloQ.options : '[]').map((opt: string, i: number) => (
              <button
                key={i}
                className={`option-btn ${
                  selected === i
                    ? answered
                      ? i === currentSoloQ.answer ? 'correct' : 'wrong'
                      : 'selected'
                    : answered && i === currentSoloQ.answer
                      ? 'correct'
                      : ''
                }`}
                onClick={() => handleSoloAnswer(i)}
                disabled={answered}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="solo-question-nav">
            <button onClick={handleSoloPrev} disabled={soloIndex === 0}>← 上一题</button>
            <span>{soloIndex + 1} / {soloQuestions.length}</span>
            <button onClick={handleSoloNext}>
              {soloIndex < soloQuestions.length - 1 ? '下一题 →' : '查看结果'}
            </button>
          </div>
        </div>
      )}

      {/* Solo Result */}
      {soloDone && (
        <div className="solo-result quiz-card">
          <div className="result-icon">📊</div>
          <h2>练习完成！</h2>
          <p className="score-detail">你完成了 {soloQuestions.length} 道题</p>
          <div className="stats">
            <div className="stat-item">
              <div className="num">{soloCorrect}</div>
              <div className="lbl">答对</div>
            </div>
            <div className="stat-item">
              <div className="num">{soloQuestions.length - soloCorrect}</div>
              <div className="lbl">答错</div>
            </div>
            <div className="stat-item">
              <div className="num">{soloQuestions.length > 0 ? Math.round(soloCorrect / soloQuestions.length * 100) : 0}%</div>
              <div className="lbl">正确率</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={handleLeave}>返回首页</button>
            <button className="btn-secondary" onClick={() => {
              setSoloDone(false)
              setSoloQuestions([])
              setQuestion(null)
              setStep('mode-select')
            }}>重新选择</button>
          </div>
        </div>
      )}

      {/* Waiting for question (online) */}
      {step === 'playing' && gameMode === 'online' && !question && !result && (
        <div className="quiz-card waiting">
          <div className="spinner" />
          <p>等待题目...</p>
        </div>
      )}

      {/* Result (online) */}
      {step === 'result' && result && (
        <div className="quiz-card quiz-result">
          <div className="result-icon">{result.isWinner ? '🎉' : result.isDraw ? '🤝' : '💪'}</div>
          <h2>{result.message}</h2>
          <div className="score" style={{ fontSize: 36 }}>
            {result.teamScore} : {result.opponentScore}
          </div>
          {result.opponents.length > 0 && (
            <p className="detail">vs {result.opponents.join('、')}</p>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn-primary" onClick={() => { handleLeave(); setStep('room-setup'); }}>再来一局</button>
            <button className="btn-secondary" onClick={onBack}>返回首页</button>
          </div>
        </div>
      )}
    </div>
  )
}

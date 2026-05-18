import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'haodaer-tiaozhan-dev-secret';

const app = express();
const server = createServer(app);

app.use(express.json());

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: '登录已过期' });
  }
}

// Register/login
app.post('/api/auth', (req, res) => {
  const { userId, username } = req.body;
  if (!userId || !username) return res.status(400).json({ error: '缺少参数' });

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) {
    db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(userId, username);
  }
  const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Leaderboard (global/online)
app.get('/api/quiz/leaderboard', (_req, res) => {
  const list = db.prepare(
    'SELECT username, elo_rating AS score, games_played, games_won FROM users ORDER BY elo_rating DESC LIMIT 20'
  ).all();
  res.json(list);
});

// Solo leaderboard
app.get('/api/quiz/leaderboard/solo', (_req, res) => {
  const category = _req.query.category || 'mixed';
  const list = db.prepare(`
    SELECT username, total_questions, total_correct, games_played,
           CASE WHEN total_questions > 0 THEN CAST(ROUND(CAST(total_correct AS REAL) / total_questions * 100) AS INTEGER) ELSE 0 END as accuracy
    FROM solo_scores
    WHERE category = ?
    ORDER BY total_correct DESC, accuracy DESC
    LIMIT 20
  `).all(category);
  res.json(list);
});

// Record solo practice result
app.post('/api/quiz/solo/record', auth, (req, res) => {
  const { totalQuestions, totalCorrect, category } = req.body;
  if (typeof totalQuestions !== 'number' || typeof totalCorrect !== 'number') {
    return res.status(400).json({ error: '参数错误' });
  }
  const cat = category || 'mixed';
  db.prepare(`
    INSERT INTO solo_scores (user_id, category, username, total_questions, total_correct, games_played, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
    ON CONFLICT(user_id, category) DO UPDATE SET
      username = excluded.username,
      total_questions = total_questions + excluded.total_questions,
      total_correct = total_correct + excluded.total_correct,
      games_played = games_played + 1,
      updated_at = datetime('now')
  `).run(req.user.id, cat, req.user.username, totalQuestions, totalCorrect);
  res.json({ ok: true });
});

// Solo practice: fetch questions by subjects & difficulty
app.get('/api/quiz/solo', (_req, res) => {
  const subjects = _req.query.subjects ? _req.query.subjects.split(',') : [];
  const difficulty = parseInt(_req.query.difficulty) || 0;

  let sql = 'SELECT * FROM quiz_questions';
  const params = [];
  const conditions = [];

  if (subjects.length > 0) {
    conditions.push(`category IN (${subjects.map(() => '?').join(',')})`);
    params.push(...subjects);
  }
  if (difficulty > 0) {
    conditions.push('difficulty = ?');
    params.push(difficulty);
  }
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY RANDOM() LIMIT 15';

  const questions = db.prepare(sql).all(...params);
  res.json(questions);
});

// Serve built frontend
app.use(express.static(path.join(__dirname, '..', 'dist')));

// WebSocket server
const wss = new WebSocketServer({ server });
const matchmaking = [];
const rooms = new Map();
const userRooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[crypto.randomInt(chars.length)];
  } while (rooms.has(code));
  return code;
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  let user = null;
  if (token) {
    try { user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
  }
  if (!user) {
    ws.send(JSON.stringify({ type: 'error', message: '请先登录' }));
    ws.close();
    return;
  }

  ws.userId = user.id;
  ws.username = user.username;
  ws.roomCode = null;

  ws.send(JSON.stringify({ type: 'connected', userId: user.id, username: user.username }));

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    switch (msg.type) {
      case 'join_queue':
        handleJoinQueue(ws);
        break;
      case 'leave_queue':
        handleLeaveQueue(ws);
        break;
      case 'submit_answer':
        handleSubmitAnswer(ws, msg);
        break;
      case 'leave_room':
        handleLeaveRoom(ws);
        break;
      case 'create_room':
        handleCreateRoom(ws, msg);
        break;
      case 'join_room':
        handleJoinRoom(ws, msg);
        break;
      case 'start_match':
        handleStartMatch(ws);
        break;
    }
  });

  ws.on('close', () => {
    handleLeaveQueue(ws);
    handleLeaveRoom(ws);
  });
});

// Room management
function handleCreateRoom(ws, msg) {
  const code = generateRoomCode();
  const room = {
    id: code, code, host: ws.userId,
    subjects: msg.subjects || [], difficulty: msg.difficulty || 0, teamSize: msg.teamSize || 1,
    players: [{ ws, userId: ws.userId, username: ws.username }],
    currentQ: 0, questions: [], scores: {},
    answered: new Set(), timer: null, started: false,
  };
  rooms.set(code, room);
  userRooms.set(ws.userId, code);
  ws.roomCode = code;

  db.prepare('INSERT OR REPLACE INTO quiz_rooms (code, host_id, subjects, difficulty, team_size, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(code, ws.userId, (msg.subjects || []).join(','), msg.difficulty || 0, msg.teamSize || 1, 'waiting');

  const slots = msg.teamSize * 2;
  ws.send(JSON.stringify({ type: 'room_created', roomCode: code, slots, players: [{ userId: ws.userId, username: ws.username }] }));
}

function handleJoinRoom(ws, msg) {
  const code = msg.roomCode ? msg.roomCode.toUpperCase() : '';
  const room = rooms.get(code);
  if (!room) { ws.send(JSON.stringify({ type: 'error', message: '房间码不正确，请检查后重试' })); return; }
  if (room.started) { ws.send(JSON.stringify({ type: 'error', message: '对战已开始，无法加入' })); return; }
  const maxSlots = room.teamSize * 2;
  if (room.players.length >= maxSlots) { ws.send(JSON.stringify({ type: 'error', message: '房间已满' })); return; }

  room.players.push({ ws, userId: ws.userId, username: ws.username });
  userRooms.set(ws.userId, code);
  ws.roomCode = code;

  const playerList = room.players.map(p => ({ userId: p.userId, username: p.username }));
  room.players.forEach(p => {
    if (p.ws.readyState === 1) p.ws.send(JSON.stringify({ type: 'room_update', roomCode: code, slots: maxSlots, players: playerList, joined: ws.username }));
  });
}

function handleStartMatch(ws) {
  const code = ws.roomCode;
  const room = code ? rooms.get(code) : null;
  if (!room) return;
  if (room.host !== ws.userId) { ws.send(JSON.stringify({ type: 'error', message: '只有房主可以开始' })); return; }

  const maxSlots = room.teamSize * 2;
  if (room.players.length < maxSlots) { ws.send(JSON.stringify({ type: 'error', message: `还需等待${maxSlots - room.players.length}位玩家` })); return; }

  room.started = true;
  room.currentQ = 0;
  room.scores = {};
  room.players.forEach(p => { room.scores[p.userId] = 0; });

  let sql = 'SELECT * FROM quiz_questions';
  const params = [];
  const conditions = [];
  if (room.subjects && room.subjects.length > 0) {
    conditions.push(`category IN (${room.subjects.map(() => '?').join(',')})`);
    params.push(...room.subjects);
  }
  if (room.difficulty > 0) {
    conditions.push('difficulty = ?');
    params.push(room.difficulty);
  }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY RANDOM() LIMIT 10';

  room.questions = db.prepare(sql).all(...params);
  if (room.questions.length < 3) {
    room.questions = db.prepare('SELECT * FROM quiz_questions ORDER BY RANDOM() LIMIT 10').all();
  }

  room.players.forEach(p => {
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(p.userId);
    if (!existing) db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(p.userId, p.username);
  });

  room.players.forEach(p => {
    if (p.ws.readyState === 1) p.ws.send(JSON.stringify({ type: 'match_start', totalQuestions: room.questions.length, players: room.players.map(x => ({ userId: x.userId, username: x.username })) }));
  });

  setTimeout(() => sendRoomQuestion(room), 2000);
}

function sendRoomQuestion(room) {
  if (room.currentQ >= room.questions.length) { endRoomMatch(room); return; }
  room.answered = new Set();
  const q = room.questions[room.currentQ];
  const payload = { type: 'question', questionNumber: room.currentQ + 1, totalQuestions: room.questions.length, question: q.question, options: JSON.parse(q.options), category: q.category, difficulty: q.difficulty, timeLimit: 15 };
  room.players.forEach(p => { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(payload)); });
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    room.currentQ++;
    room.answered = new Set();
    room.players.forEach(p => { if (p.ws.readyState === 1) p.ws.send(JSON.stringify({ type: 'timeout' })); });
    setTimeout(() => sendRoomQuestion(room), 1500);
  }, 15000);
}

function endRoomMatch(room) {
  if (room.timer) clearTimeout(room.timer);
  const half = Math.floor(room.players.length / 2);
  const team1 = room.players.slice(0, half);
  const team2 = room.players.slice(half);
  const team1Score = team1.reduce((s, p) => s + (room.scores[p.userId] || 0), 0);
  const team2Score = team2.reduce((s, p) => s + (room.scores[p.userId] || 0), 0);
  const winners = team1Score > team2Score ? team1 : team2Score > team1Score ? team2 : null;

  if (winners) {
    winners.forEach(p => db.prepare('UPDATE users SET games_played = games_played + 1, games_won = games_won + 1, elo_rating = elo_rating + 10 WHERE id = ?').run(p.userId));
    const losers = winners === team1 ? team2 : team1;
    losers.forEach(p => db.prepare('UPDATE users SET games_played = games_played + 1, elo_rating = GREATEST(elo_rating - 5, 100) WHERE id = ?').run(p.userId));
  } else {
    room.players.forEach(p => db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?').run(p.userId));
  }

  const matchId = crypto.randomUUID();
  db.prepare('INSERT INTO quiz_matches (id, room_code, player1_id, questions_count, status, finished_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))').run(matchId, room.code, room.host, room.questions.length, 'finished');

  room.players.forEach(p => {
    if (p.ws.readyState === 1) {
      const isTeam1 = room.players.slice(0, half).includes(p);
      const myTeam = isTeam1 ? team1 : team2;
      const otherTeam = isTeam1 ? team2 : team1;
      const myScore = isTeam1 ? team1Score : team2Score;
      const otherScore = isTeam1 ? team2Score : team1Score;
      p.ws.send(JSON.stringify({ type: 'match_end', scores: room.scores, teamScore: myScore, opponentScore: otherScore, teamMembers: myTeam.filter(x => x.userId !== p.userId).map(x => x.username), opponents: otherTeam.map(x => x.username), isWinner: myScore > otherScore, isDraw: myScore === otherScore, message: myScore > otherScore ? '🎉 团队获胜！' : myScore === otherScore ? '🤝 平局！' : '💪 下次加油！' }));
    }
  });

  rooms.delete(room.code);
  room.players.forEach(p => { userRooms.delete(p.userId); p.ws.roomCode = null; });
}

function handleSubmitAnswer(ws, msg) {
  const code = ws.roomCode;
  const room = code ? rooms.get(code) : null;
  if (!room) return;
  if (room.answered.has(ws.userId)) return;
  room.answered.add(ws.userId);
  const q = room.questions[room.currentQ];
  const correct = q && msg.answer === q.answer;
  if (correct) room.scores[ws.userId] = (room.scores[ws.userId] || 0) + (room.answered.size === 1 ? 10 : 5);
  room.players.forEach(p => { if (p.ws.readyState === 1) p.ws.send(JSON.stringify({ type: 'answer_result', userId: ws.userId, username: ws.username, correct, scores: room.scores, answeredCount: room.answered.size, totalPlayers: room.players.length })); });
  if (room.answered.size >= room.players.length) { if (room.timer) clearTimeout(room.timer); room.currentQ++; setTimeout(() => sendRoomQuestion(room), 1500); }
}

function handleLeaveRoom(ws) {
  handleLeaveQueue(ws);
  const code = ws.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;
  room.players = room.players.filter(p => p.userId !== ws.userId);
  userRooms.delete(ws.userId);
  ws.roomCode = null;
  if (room.players.length === 0) { if (room.timer) clearTimeout(room.timer); rooms.delete(code); return; }
  if (room.host === ws.userId && room.players.length > 0) room.host = room.players[0].userId;
  const playerList = room.players.map(p => ({ userId: p.userId, username: p.username }));
  room.players.forEach(p => { if (p.ws.readyState === 1) p.ws.send(JSON.stringify({ type: 'room_update', roomCode: code, slots: room.teamSize * 2, players: playerList, left: ws.username, newHost: room.host })); });
}

function handleJoinQueue(ws) {
  handleLeaveQueue(ws);
  matchmaking.push(ws);
  if (matchmaking.length >= 2) {
    const p1 = matchmaking.shift();
    const p2 = matchmaking.shift();
    if (p1.readyState === 1 && p2.readyState === 1) {
      const code = generateRoomCode();
      const room = { id: code, code, host: p1.userId, subjects: [], difficulty: 0, teamSize: 1, players: [{ ws: p1, userId: p1.userId, username: p1.username }, { ws: p2, userId: p2.userId, username: p2.username }], currentQ: 0, questions: [], scores: {}, answered: new Set(), timer: null, started: true };
      rooms.set(code, room);
      userRooms.set(p1.userId, code); p1.roomCode = code;
      userRooms.set(p2.userId, code); p2.roomCode = code;
      room.questions = db.prepare('SELECT * FROM quiz_questions ORDER BY RANDOM() LIMIT 5').all();
      [p1, p2].forEach(p => { const e = db.prepare('SELECT id FROM users WHERE id = ?').get(p.userId); if (!e) db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(p.userId, p.username); });
      [p1, p2].forEach(p => { if (p.readyState === 1) p.send(JSON.stringify({ type: 'match_found', roomId: code, opponent: p === p1 ? p2.username : p1.username, totalQuestions: room.questions.length })); });
      setTimeout(() => sendRoomQuestion(room), 1500);
    } else {
      if (p1.readyState === 1) matchmaking.push(p1);
      if (p2.readyState === 1) matchmaking.push(p2);
    }
  }
  if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'queue_status', position: matchmaking.length, message: matchmaking.length >= 2 ? '正在匹配...' : '等待对手中...' }));
}

function handleLeaveQueue(ws) {
  const idx = matchmaking.indexOf(ws);
  if (idx !== -1) matchmaking.splice(idx, 1);
}

// Fallback for SPA routing
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[haodaer-tiaozhan] running on port ${PORT}`);
});

export default app;

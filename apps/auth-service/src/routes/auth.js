const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateTokens, verifyRefreshToken, revokeSession, revokeAllUserSessions } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - Register with username + password + phone
router.post('/register', async (req, res) => {
  const { username, password, phone, verificationCode, nickname } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '用户名和密码不能为空' });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ code: 'INVALID_USERNAME', message: '用户名长度需在2-20个字符之间' });
  }
  if (password.length < 6) {
    return res.status(400).json({ code: 'INVALID_PASSWORD', message: '密码长度不能少于6位' });
  }

  // If phone provided, verify code
  if (phone) {
    if (!verificationCode) {
      return res.status(400).json({ code: 'VERIFICATION_REQUIRED', message: '手机号验证码不能为空' });
    }
    const valid = db.prepare(
      `SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND purpose = 'register' AND used = 0 AND expires_at > datetime('now')`
    ).get(phone, verificationCode);
    if (!valid) {
      return res.status(400).json({ code: 'INVALID_VERIFICATION_CODE', message: '验证码错误或已过期' });
    }
    db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(valid.id);
  }

  // Check duplicates
  const existing = db.prepare(`SELECT id FROM users WHERE username = ? OR phone = ?`).get(username, phone);
  if (existing) {
    return res.status(409).json({ code: 'USER_EXISTS', message: '用户名或手机号已注册' });
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(
    `INSERT INTO users (id, username, phone, password_hash, nickname) VALUES (?, ?, ?, ?, ?)`
  ).run(id, username, phone || null, passwordHash, nickname || username);

  // Create points record
  db.prepare(`INSERT INTO points (user_id, balance, total_earned) VALUES (?, 0, 0)`).run(id);

  const tokens = generateTokens({ id, role: 'user' });

  setTokenCookie(res, tokens.accessToken, tokens.expiresAt);

  res.json({
    code: 'OK',
    data: {
      user: { id, username, nickname: nickname || username, phone },
      ...tokens,
    },
  });
});

// POST /api/auth/login - Login with username/phone + password
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '用户名和密码不能为空' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE username = ? OR phone = ?`).get(username, username);
  if (!user) {
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' });
  }

  const tokens = generateTokens(user);

  setTokenCookie(res, tokens.accessToken, tokens.expiresAt);

  res.json({
    code: 'OK',
    data: {
      user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, phone: user.phone },
      ...tokens,
    },
  });
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'refreshToken 不能为空' });
  }

  const session = verifyRefreshToken(refreshToken);
  if (!session) {
    return res.status(401).json({ code: 'REFRESH_EXPIRED', message: '刷新令牌已过期' });
  }

  revokeSession(refreshToken);
  const tokens = generateTokens({ id: session.user_id, role: session.role });

  setTokenCookie(res, tokens.accessToken, tokens.expiresAt);

  res.json({ code: 'OK', data: tokens });
});

// POST /api/auth/logout - Logout
router.post('/logout', (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (refreshToken) {
    revokeSession(refreshToken);
  }
  res.clearCookie('access_token');
  res.json({ code: 'OK' });
});

// POST /api/auth/send-code - Send SMS verification code
router.post('/send-code', (req, res) => {
  const { phone, purpose } = req.body;
  if (!phone) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '手机号不能为空' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO verification_codes (id, phone, code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)`
  ).run(uuidv4(), phone, code, purpose || 'register', expiresAt);

  // TODO: Integrate with Aliyun SMS service
  console.log(`[SMS] Code for ${phone}: ${code} (purpose: ${purpose || 'register'})`);

  res.json({ code: 'OK', message: '验证码已发送（开发模式）' });
});

// POST /api/auth/verify-code - Verify code (for password reset flow)
router.post('/verify-code', (req, res) => {
  const { phone, code, purpose } = req.body;
  const valid = db.prepare(
    `SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND purpose = ? AND used = 0 AND expires_at > datetime('now')`
  ).get(phone, code, purpose || 'register');
  if (!valid) {
    return res.status(400).json({ code: 'INVALID_CODE', message: '验证码错误或已过期' });
  }
  db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(valid.id);
  res.json({ code: 'OK' });
});

// POST /api/auth/reset-password - Reset password with verification code
router.post('/reset-password', (req, res) => {
  const { phone, code, newPassword } = req.body;
  const valid = db.prepare(
    `SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND purpose = 'reset_password' AND used = 0 AND expires_at > datetime('now')`
  ).get(phone, code);
  if (!valid) {
    return res.status(400).json({ code: 'INVALID_CODE', message: '验证码错误或已过期' });
  }
  db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(valid.id);

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE phone = ?`).run(hash, phone);
  revokeAllUserSessions(db.prepare(`SELECT id FROM users WHERE phone = ?`).get(phone)?.id);

  res.json({ code: 'OK' });
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(`SELECT id, username, phone, nickname, avatar, role, created_at FROM users WHERE id = ?`).get(req.user.id);
  if (!user) {
    return res.status(404).json({ code: 'USER_NOT_FOUND', message: '用户不存在' });
  }
  const points = db.prepare(`SELECT balance FROM points WHERE user_id = ?`).get(user.id);
  res.json({ code: 'OK', data: { ...user, points: points?.balance || 0 } });
});

// POST /api/auth/phone-login - Phone + verification code login (auto-register)
router.post('/phone-login', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '手机号和验证码不能为空' });
  }

  const valid = db.prepare(
    `SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND used = 0 AND expires_at > datetime('now')`
  ).get(phone, code);
  if (!valid) {
    return res.status(400).json({ code: 'INVALID_CODE', message: '验证码错误或已过期' });
  }
  db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(valid.id);

  // Find existing user or auto-register
  let user = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(phone);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const id = uuidv4();
    const defaultName = 'user_' + phone.substring(phone.length - 4);
    db.prepare(
      `INSERT INTO users (id, phone, username, nickname) VALUES (?, ?, ?, ?)`
    ).run(id, phone, defaultName, defaultName);
    db.prepare(`INSERT INTO points (user_id, balance, total_earned) VALUES (?, 0, 0)`).run(id);
    user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  }

  const tokens = generateTokens(user);
  setTokenCookie(res, tokens.accessToken, tokens.expiresAt);

  res.json({
    code: 'OK',
    data: {
      user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, phone: user.phone },
      isNewUser,
      ...tokens,
    },
  });
});

function setTokenCookie(res, token, expiresAt) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/',
  });
}

module.exports = router;

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { revokeAllUserSessions } = require('../utils/jwt');

const router = express.Router();

// GET /api/user/profile - Get user profile
router.get('/profile', authenticate, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.phone, u.nickname, u.avatar, u.role, u.created_at,
           p.balance as points
    FROM users u
    LEFT JOIN points p ON p.user_id = u.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ code: 'USER_NOT_FOUND', message: '用户不存在' });
  }

  res.json({ code: 'OK', data: user });
});

// PUT /api/user/profile - Update user profile
router.put('/profile', authenticate, (req, res) => {
  const { nickname, avatar } = req.body;
  const updates = [];
  const values = [];

  if (nickname !== undefined) {
    updates.push('nickname = ?');
    values.push(nickname);
  }
  if (avatar !== undefined) {
    updates.push('avatar = ?');
    values.push(avatar);
  }

  if (updates.length === 0) {
    return res.status(400).json({ code: 'NO_CHANGES', message: '没有需要更新的字段' });
  }

  updates.push("updated_at = datetime('now')");
  values.push(req.user.id);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const user = db.prepare(`SELECT id, username, phone, nickname, avatar FROM users WHERE id = ?`).get(req.user.id);
  res.json({ code: 'OK', data: user });
});

// PUT /api/user/password - Change password
router.put('/password', authenticate, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '旧密码和新密码不能为空' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ code: 'INVALID_PASSWORD', message: '新密码长度不能少于6位' });
  }

  const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(401).json({ code: 'WRONG_PASSWORD', message: '旧密码错误' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, req.user.id);
  revokeAllUserSessions(req.user.id);

  res.json({ code: 'OK', message: '密码已修改，请重新登录' });
});

// GET /api/user/points - Get point balance & transactions
router.get('/points', authenticate, (req, res) => {
  const points = db.prepare(`SELECT balance, total_earned, total_spent FROM points WHERE user_id = ?`).get(req.user.id);
  const transactions = db.prepare(`
    SELECT id, amount, type, description, created_at
    FROM point_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  res.json({
    code: 'OK',
    data: {
      balance: points?.balance || 0,
      totalEarned: points?.total_earned || 0,
      totalSpent: points?.total_spent || 0,
      transactions,
    },
  });
});

// POST /api/user/wechat-bind - Bind WeChat account
router.post('/wechat-bind', authenticate, (req, res) => {
  const { openid } = req.body;
  if (!openid) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'openid 不能为空' });
  }

  const existing = db.prepare(`SELECT id FROM users WHERE wechat_openid = ?`).get(openid);
  if (existing) {
    return res.status(409).json({ code: 'WECHAT_ALREADY_BOUND', message: '该微信已绑定其他账号' });
  }

  db.prepare(`UPDATE users SET wechat_openid = ?, updated_at = datetime('now') WHERE id = ?`).run(openid, req.user.id);
  res.json({ code: 'OK' });
});

// GET /api/user/children - Get all children for current user
router.get('/children', authenticate, (req, res) => {
  const children = db.prepare(
    `SELECT id, user_id, nickname, gender, age, avatar, created_at FROM children WHERE user_id = ? ORDER BY created_at ASC`
  ).all(req.user.id);
  res.json({ code: 'OK', data: children });
});

// POST /api/user/children - Add a child
router.post('/children', authenticate, (req, res) => {
  const { nickname, gender, age, avatar } = req.body;
  if (!nickname) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '孩子昵称不能为空' });
  }
  const id = uuidv4();
  db.prepare(
    `INSERT INTO children (id, user_id, nickname, gender, age, avatar) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.user.id, nickname, gender || null, age ? parseInt(age) : null, avatar || null);
  const child = db.prepare(`SELECT * FROM children WHERE id = ?`).get(id);
  res.status(201).json({ code: 'OK', data: child });
});

// PUT /api/user/children/:id - Update a child
router.put('/children/:id', authenticate, (req, res) => {
  const { nickname, gender, age, avatar } = req.body;
  const existing = db.prepare(`SELECT id FROM children WHERE id = ? AND user_id = ?`).get(req.params.id, req.user.id);
  if (!existing) {
    return res.status(404).json({ code: 'NOT_FOUND', message: '孩子信息不存在' });
  }
  const updates = [];
  const values = [];
  if (nickname !== undefined) { updates.push('nickname = ?'); values.push(nickname); }
  if (gender !== undefined) { updates.push('gender = ?'); values.push(gender); }
  if (age !== undefined) { updates.push('age = ?'); values.push(parseInt(age)); }
  if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
  if (updates.length > 0) {
    values.push(req.params.id);
    db.prepare(`UPDATE children SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  const child = db.prepare(`SELECT * FROM children WHERE id = ?`).get(req.params.id);
  res.json({ code: 'OK', data: child });
});

module.exports = router;

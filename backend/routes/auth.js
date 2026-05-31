const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, graduation_year, major } = req.body;

    if (!email || !password || !name || !graduation_year) {
      return res.status(400).json({ error: '邮箱、密码、姓名和毕业年份为必填项' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const insertUser = db.prepare(`
      INSERT INTO users (email, password, name, role)
      VALUES (?, ?, ?, 'alumni')
    `);
    const userResult = insertUser.run(email, hashedPassword, name);
    const userId = userResult.lastInsertRowid;

    db.prepare(`
      INSERT INTO alumni_profiles (user_id, graduation_year, major)
      VALUES (?, ?, ?)
    `).run(userId, graduation_year, major || '');

    const token = jwt.sign(
      { id: userId, email, role: 'alumni', name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const sessionId = uuidv4();
    db.prepare(`
      INSERT INTO user_sessions (id, user_id, token)
      VALUES (?, ?, ?)
    `).run(sessionId, userId, token);

    res.status(201).json({
      message: '注册成功',
      user: { id: userId, email, name, role: 'alumni' },
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const sessionId = uuidv4();
    db.prepare(`
      INSERT INTO user_sessions (id, user_id, token)
      VALUES (?, ?, ?)
    `).run(sessionId, user.id, token);

    const profile = db.prepare('SELECT * FROM alumni_profiles WHERE user_id = ?').get(user.id);

    res.json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/logout', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      db.prepare('DELETE FROM user_sessions WHERE token = ?').run(token);
    }

    res.json({ message: '登出成功' });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;

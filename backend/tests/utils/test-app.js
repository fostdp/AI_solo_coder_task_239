const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

process.env.JWT_SECRET = 'test_jwt_secret';

const testDbPath = path.join(__dirname, '../../data/test-alumni.db');

const Database = require('better-sqlite3');

module.exports = function createTestApp() {
  const app = express();
  
  const db = new Database(testDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  Object.defineProperty(app, 'db', {
    get: () => db
  });

  app.closeDb = function() {
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  };

  const auth = function(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '未授权访问' });
    }

    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token无效或已过期' });
      }
      req.user = user;
      req.db = db;
      next();
    });
  };

  const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
  };

  const requireAlumni = (req, res, next) => {
    if (req.user.role !== 'alumni' && req.user.role !== 'admin') {
      return res.status(403).json({ error: '需要校友或管理员权限' });
    }
    next();
  };

  app.use(cors());
  app.use(express.json());
  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  const { v4: uuidv4 } = require('uuid');
  const bcrypt = require('bcryptjs');

  app.post('/api/auth/register', async (req, res) => {
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

      const jwt = require('jsonwebtoken');
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

  app.get('/api/alumni/list', auth, (req, res) => {
    try {
      const { graduation_year, city, industry, name, page = 1, limit = 20 } = req.query;

      const queryParts = [`
        SELECT u.id, u.name, u.email, ap.graduation_year, ap.major, ap.city, 
               ap.industry, ap.company, ap.position, ap.last_updated, 
               ap.update_reminder_status
        FROM users u
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE u.role = 'alumni'
      `];
      const params = [];

      if (graduation_year && graduation_year !== '' && !isNaN(parseInt(graduation_year))) {
        queryParts.push('AND ap.graduation_year = ?');
        params.push(parseInt(graduation_year));
      }
      if (city && city.trim() !== '') {
        queryParts.push('AND (ap.city IS NOT NULL AND ap.city LIKE ?)');
        params.push(`%${city.trim()}%`);
      }
      if (industry && industry.trim() !== '') {
        queryParts.push('AND (ap.industry IS NOT NULL AND ap.industry LIKE ?)');
        params.push(`%${industry.trim()}%`);
      }
      if (name && name.trim() !== '') {
        queryParts.push('AND u.name LIKE ?');
        params.push(`%${name.trim()}%`);
      }

      const query = queryParts.join(' ');

      const countQuery = query.replace(
        'SELECT u.id, u.name, u.email, ap.graduation_year, ap.major, ap.city, ap.industry, ap.company, ap.position, ap.last_updated, ap.update_reminder_status',
        'SELECT COUNT(*) as total'
      );
      const totalResult = db.prepare(countQuery).get(...params);
      const total = totalResult.total;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const finalQuery = query + ' ORDER BY ap.last_updated DESC LIMIT ? OFFSET ?';
      const finalParams = [...params, parseInt(limit), offset];

      const alumni = db.prepare(finalQuery).all(...finalParams);

      res.json({
        alumni,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('获取校友列表错误:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  });

  app.get('/api/alumni/:id', auth, (req, res) => {
    try {
      const isAdmin = req.user.role === 'admin';
      const isSelf = parseInt(req.params.id) === req.user.id;

      let query;
      if (isAdmin || isSelf) {
        query = `
          SELECT u.id, u.name, u.email, u.created_at,
                 ap.graduation_year, ap.major, ap.city,
                 ap.industry, ap.company, ap.position,
                 ap.phone, ap.bio, ap.avatar_url,
                 ap.last_updated, ap.update_reminder_status
          FROM users u
          LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
          WHERE u.id = ? AND u.role = 'alumni'
        `;
      } else {
        query = `
          SELECT u.id, u.name,
                 ap.graduation_year, ap.major, ap.city,
                 ap.industry, ap.company, ap.position,
                 ap.last_updated, ap.update_reminder_status
          FROM users u
          LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
          WHERE u.id = ? AND u.role = 'alumni'
        `;
      }

      const alumni = db.prepare(query).get(req.params.id);

      if (!alumni) {
        return res.status(404).json({ error: '校友不存在' });
      }

      let jobChanges = [];
      if (isAdmin || isSelf) {
        jobChanges = db.prepare(`
          SELECT * FROM job_changes
          WHERE user_id = ?
          ORDER BY change_date DESC, created_at DESC
        `).all(req.params.id);
      }

      res.json({
        ...alumni,
        jobChanges,
        canViewContact: isAdmin || isSelf
      });
    } catch (error) {
      console.error('获取校友详情错误:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  });

  app.post('/api/admin/send-reminder', auth, requireAdmin, (req, res) => {
    try {
      const { target_user_id, message } = req.body;

      if (!target_user_id) {
        return res.status(400).json({ error: '目标用户ID为必填项' });
      }

      const targetUser = db.prepare(`
        SELECT u.*, ap.email_opt_out 
        FROM users u 
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id 
        WHERE u.id = ? AND u.role = 'alumni'
      `).get(target_user_id);

      if (!targetUser) {
        return res.status(404).json({ error: '目标校友不存在' });
      }

      if (targetUser.email_opt_out === 1) {
        return res.status(400).json({ error: '该校友已退订更新提醒' });
      }

      db.prepare(`
        INSERT INTO update_reminders (admin_id, target_user_id, status)
        VALUES (?, ?, 'pending')
      `).run(req.user.id, target_user_id);

      db.prepare(`
        UPDATE alumni_profiles
        SET update_reminder_status = 'pending',
            last_reminder_date = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(target_user_id);

      res.json({
        message: '更新提醒已发送',
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email
        }
      });
    } catch (error) {
      console.error('发送更新提醒错误:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  });

  app.post('/api/admin/send-batch-reminders', auth, requireAdmin, (req, res) => {
    try {
      const { target_user_ids, message } = req.body;

      if (!target_user_ids || !Array.isArray(target_user_ids) || target_user_ids.length === 0) {
        return res.status(400).json({ error: '目标用户ID列表为必填项' });
      }

      const placeholders = target_user_ids.map(() => '?').join(',');
      const targetUsers = db.prepare(`
        SELECT u.id, u.name, u.email 
        FROM users u 
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id 
        WHERE u.id IN (${placeholders}) 
          AND u.role = 'alumni' 
          AND (ap.email_opt_out IS NULL OR ap.email_opt_out != 1)
      `).all(...target_user_ids);

      const optOutCount = target_user_ids.length - targetUsers.length;

      if (targetUsers.length === 0) {
        return res.status(404).json({ 
          error: '未找到有效的目标校友',
          optOutCount
        });
      }

      const insertReminder = db.prepare(`
        INSERT INTO update_reminders (admin_id, target_user_id, status)
        VALUES (?, ?, 'pending')
      `);

      const updateProfile = db.prepare(`
        UPDATE alumni_profiles
        SET update_reminder_status = 'pending',
            last_reminder_date = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);

      const transaction = db.transaction(() => {
        targetUsers.forEach(user => {
          insertReminder.run(req.user.id, user.id);
          updateProfile.run(user.id);
        });
      });

      transaction();

      res.json({
        message: `已向 ${targetUsers.length} 位校友发送更新提醒${optOutCount > 0 ? `（跳过 ${optOutCount} 位已退订校友）` : ''}`,
        sentCount: targetUsers.length,
        optOutCount
      });
    } catch (error) {
      console.error('批量发送更新提醒错误:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  });

  app.put('/api/alumni/me', auth, (req, res) => {
    try {
      const {
        graduation_year, major, city, industry,
        company, position, phone, bio, avatar_url, email_opt_out
      } = req.body;

      const existingProfile = db.prepare('SELECT * FROM alumni_profiles WHERE user_id = ?').get(req.user.id);
      
      if (!existingProfile) {
        return res.status(404).json({ error: '档案不存在' });
      }

      db.prepare(`
        UPDATE alumni_profiles
        SET graduation_year = COALESCE(?, graduation_year),
            major = COALESCE(?, major),
            city = COALESCE(?, city),
            industry = COALESCE(?, industry),
            company = COALESCE(?, company),
            position = COALESCE(?, position),
            phone = COALESCE(?, phone),
            bio = COALESCE(?, bio),
            avatar_url = COALESCE(?, avatar_url),
            email_opt_out = CASE WHEN ? IS NOT NULL THEN ? ELSE email_opt_out END,
            last_updated = CURRENT_TIMESTAMP,
            update_reminder_status = CASE WHEN update_reminder_status = 'pending' THEN 'completed' ELSE update_reminder_status END
        WHERE user_id = ?
      `).run(
        graduation_year, major, city, industry,
        company, position, phone, bio, avatar_url,
        email_opt_out, email_opt_out,
        req.user.id
      );

      const updatedProfile = db.prepare('SELECT * FROM alumni_profiles WHERE user_id = ?').get(req.user.id);
      
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

      res.json({
        message: '档案更新成功',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profile: updatedProfile
        }
      });
    } catch (error) {
      console.error('更新个人信息错误:', error);
      res.status(500).json({ error: '服务器内部错误' });
    }
  });

  return app;
};

const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/dashboard', authenticateToken, requireAdmin, (req, res) => {
  try {
    const totalAlumni = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'alumni'
    `).get().count;

    const pendingReminders = db.prepare(`
      SELECT COUNT(*) as count FROM update_reminders WHERE status = 'pending'
    `).get().count;

    const completedReminders = db.prepare(`
      SELECT COUNT(*) as count FROM update_reminders WHERE status = 'completed'
    `).get().count;

    const recentUpdates = db.prepare(`
      SELECT u.name, ap.last_updated
      FROM alumni_profiles ap
      JOIN users u ON ap.user_id = u.id
      ORDER BY ap.last_updated DESC
      LIMIT 10
    `).all();

    const yearStats = db.prepare(`
      SELECT graduation_year, COUNT(*) as count
      FROM alumni_profiles
      WHERE graduation_year IS NOT NULL
      GROUP BY graduation_year
      ORDER BY graduation_year DESC
    `).all();

    const cityStats = db.prepare(`
      SELECT city, COUNT(*) as count
      FROM alumni_profiles
      WHERE city IS NOT NULL AND city != ''
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `).all();

    const industryStats = db.prepare(`
      SELECT industry, COUNT(*) as count
      FROM alumni_profiles
      WHERE industry IS NOT NULL AND industry != ''
      GROUP BY industry
      ORDER BY count DESC
      LIMIT 10
    `).all();

    res.json({
      statistics: {
        totalAlumni,
        pendingReminders,
        completedReminders
      },
      recentUpdates,
      yearStats,
      cityStats,
      industryStats
    });
  } catch (error) {
    console.error('获取管理员仪表盘错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/send-reminder', authenticateToken, requireAdmin, (req, res) => {
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

router.post('/send-batch-reminders', authenticateToken, requireAdmin, (req, res) => {
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

router.get('/reminders', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT ur.*, u.name as target_name, u.email as target_email,
             a.name as admin_name
      FROM update_reminders ur
      JOIN users u ON ur.target_user_id = u.id
      JOIN users a ON ur.admin_id = a.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE ur.status = ?';
      params.push(status);
    }

    const countQuery = query.replace(
      'SELECT ur.*, u.name as target_name, u.email as target_email, a.name as admin_name',
      'SELECT COUNT(*) as total'
    );
    const totalResult = db.prepare(countQuery).get(...params);
    const total = totalResult.total;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY ur.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const reminders = db.prepare(query).all(...params);

    res.json({
      reminders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取提醒列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/alumni-without-recent-updates', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { days = 180 } = req.query;

    const alumni = db.prepare(`
      SELECT u.id, u.name, u.email, ap.last_updated, ap.graduation_year,
             ap.city, ap.industry, ap.company, ap.position, ap.email_opt_out
      FROM users u
      JOIN alumni_profiles ap ON u.id = ap.user_id
      WHERE u.role = 'alumni'
        AND (ap.email_opt_out IS NULL OR ap.email_opt_out != 1)
        AND (ap.last_updated IS NULL 
             OR julianday('now') - julianday(ap.last_updated) > ?)
        AND (ap.update_reminder_status != 'pending' OR ap.update_reminder_status IS NULL)
      ORDER BY ap.last_updated ASC
    `).all(parseInt(days));

    res.json({
      alumni,
      daysWithoutUpdate: parseInt(days)
    });
  } catch (error) {
    console.error('获取未更新校友错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/confirm-update/:userId', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(userId, 'alumni');
    if (!targetUser) {
      return res.status(404).json({ error: '目标校友不存在' });
    }

    const pendingReminder = db.prepare(`
      SELECT * FROM update_reminders
      WHERE target_user_id = ? AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(userId);

    if (pendingReminder) {
      db.prepare(`
        UPDATE update_reminders
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(pendingReminder.id);
    }

    db.prepare(`
      UPDATE alumni_profiles
      SET update_reminder_status = 'completed',
          last_updated = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(userId);

    res.json({
      message: '更新已确认',
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email
      }
    });
  } catch (error) {
    console.error('确认更新错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;

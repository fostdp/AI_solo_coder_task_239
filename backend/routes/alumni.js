const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAlumni } = require('../middleware/auth');
const router = express.Router();

router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT u.*, ap.* FROM users u
      LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
      WHERE u.id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const userWithProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      profile: {
        id: user.id,
        graduation_year: user.graduation_year,
        major: user.major,
        city: user.city,
        industry: user.industry,
        company: user.company,
        position: user.position,
        phone: user.phone,
        bio: user.bio,
        avatar_url: user.avatar_url,
        last_updated: user.last_updated,
        update_reminder_status: user.update_reminder_status
      }
    };

    res.json(userWithProfile);
  } catch (error) {
    console.error('获取个人信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/me', authenticateToken, requireAlumni, (req, res) => {
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

router.get('/list', authenticateToken, (req, res) => {
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

router.get('/:id', authenticateToken, (req, res) => {
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

router.post('/job-changes', authenticateToken, requireAlumni, (req, res) => {
  try {
    const { previous_company, previous_position, new_company, new_position, change_date } = req.body;

    const insertJobChange = db.prepare(`
      INSERT INTO job_changes
      (user_id, previous_company, previous_position, new_company, new_position, change_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insertJobChange.run(
      req.user.id,
      previous_company,
      previous_position,
      new_company,
      new_position,
      change_date
    );

    const jobChange = db.prepare('SELECT * FROM job_changes WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: '工作变动记录已添加',
      jobChange
    });
  } catch (error) {
    console.error('添加工作变动错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/stats/filters', authenticateToken, (req, res) => {
  try {
    const years = db.prepare(`
      SELECT DISTINCT graduation_year FROM alumni_profiles
      WHERE graduation_year IS NOT NULL
      ORDER BY graduation_year DESC
    `).all().map(row => row.graduation_year);

    const cities = db.prepare(`
      SELECT DISTINCT city FROM alumni_profiles
      WHERE city IS NOT NULL AND city != ''
      ORDER BY city
    `).all().map(row => row.city);

    const industries = db.prepare(`
      SELECT DISTINCT industry FROM alumni_profiles
      WHERE industry IS NOT NULL AND industry != ''
      ORDER BY industry
    `).all().map(row => row.industry);

    res.json({
      years,
      cities,
      industries
    });
  } catch (error) {
    console.error('获取筛选统计错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;

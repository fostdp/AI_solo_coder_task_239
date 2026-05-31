const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT e.*, u.name as organizer_name,
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as participant_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
    `;
    const params = [];

    if (status && status !== '') {
      query += ' WHERE e.status = ?';
      params.push(status);
    }

    const countQuery = query.replace(
      'SELECT e.*, u.name as organizer_name, (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as participant_count',
      'SELECT COUNT(*) as total'
    );
    const totalResult = db.prepare(countQuery).get(...params);
    const total = totalResult.total;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY e.event_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const events = db.prepare(query).all(...params);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取活动列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/my', authenticateToken, (req, res) => {
  try {
    const myOrganizedEvents = db.prepare(`
      SELECT e.*, 
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as participant_count
      FROM events e
      WHERE e.organizer_id = ?
      ORDER BY e.event_date DESC
    `).all(req.user.id);

    const myRegisteredEvents = db.prepare(`
      SELECT e.*, er.registration_status, er.registered_at,
             u.name as organizer_name,
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as participant_count
      FROM event_registrations er
      JOIN events e ON er.event_id = e.id
      JOIN users u ON e.organizer_id = u.id
      WHERE er.user_id = ?
      ORDER BY er.registered_at DESC
    `).all(req.user.id);

    res.json({
      organized: myOrganizedEvents,
      registered: myRegisteredEvents
    });
  } catch (error) {
    console.error('获取我的活动错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const event = db.prepare(`
      SELECT e.*, u.name as organizer_name, u.email as organizer_email,
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as participant_count
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = ?
    `).get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const myRegistration = db.prepare(`
      SELECT * FROM event_registrations
      WHERE event_id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    const registrations = [];
    if (event.organizer_id === req.user.id || req.user.role === 'admin') {
      const regs = db.prepare(`
        SELECT er.*, u.name, u.email, ap.company, ap.position, ap.city
        FROM event_registrations er
        JOIN users u ON er.user_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE er.event_id = ?
        ORDER BY er.registered_at ASC
      `).all(req.params.id);
      registrations.push(...regs);
    }

    res.json({
      ...event,
      myRegistration,
      registrations: event.organizer_id === req.user.id || req.user.role === 'admin' ? registrations : undefined
    });
  } catch (error) {
    console.error('获取活动详情错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      title, description, location, event_date,
      registration_deadline, max_participants
    } = req.body;

    if (!title || !event_date) {
      return res.status(400).json({ error: '活动标题和日期为必填项' });
    }

    const isAdmin = req.user.role === 'admin';

    const insertEvent = db.prepare(`
      INSERT INTO events
      (title, description, location, event_date, registration_deadline, max_participants, organizer_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertEvent.run(
      title, description, location, event_date,
      registration_deadline, max_participants,
      req.user.id,
      isAdmin ? 'active' : 'pending'
    );

    const event = db.prepare(`
      SELECT e.*, u.name as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: isAdmin ? '活动创建成功' : '活动已提交，等待管理员审核',
      event
    });
  } catch (error) {
    console.error('创建活动错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  try {
    const {
      title, description, location, event_date,
      registration_deadline, max_participants, status
    } = req.body;

    const existingEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

    if (!existingEvent) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const isOrganizer = existingEvent.organizer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({ error: '无权修改此活动' });
    }

    db.prepare(`
      UPDATE events
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          location = COALESCE(?, location),
          event_date = COALESCE(?, event_date),
          registration_deadline = COALESCE(?, registration_deadline),
          max_participants = COALESCE(?, max_participants),
          status = CASE WHEN ? IS NOT NULL AND (? = 1 OR ? = 'admin') THEN ? ELSE status END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title, description, location, event_date,
      registration_deadline, max_participants,
      status, isAdmin ? 1 : 0, req.user.role, status,
      req.params.id
    );

    const updatedEvent = db.prepare(`
      SELECT e.*, u.name as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.id = ?
    `).get(req.params.id);

    res.json({
      message: '活动更新成功',
      event: updatedEvent
    });
  } catch (error) {
    console.error('更新活动错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const existingEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

    if (!existingEvent) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const isOrganizer = existingEvent.organizer_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({ error: '无权删除此活动' });
    }

    db.prepare('DELETE FROM event_registrations WHERE event_id = ?').run(req.params.id);
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);

    res.json({ message: '活动已删除' });
  } catch (error) {
    console.error('删除活动错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/register', authenticateToken, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: '活动不存在' });
    }

    if (event.status !== 'active') {
      return res.status(400).json({ error: '活动不可报名' });
    }

    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      if (new Date() > deadline) {
        return res.status(400).json({ error: '报名已截止' });
      }
    }

    if (event.max_participants) {
      const participantCount = db.prepare(
        'SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ?'
      ).get(req.params.id).count;

      if (participantCount >= event.max_participants) {
        return res.status(400).json({ error: '报名人数已满' });
      }
    }

    const existingRegistration = db.prepare(
      'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (existingRegistration) {
      return res.status(400).json({ error: '您已报名此活动' });
    }

    db.prepare(`
      INSERT INTO event_registrations (event_id, user_id, registration_status)
      VALUES (?, ?, 'registered')
    `).run(req.params.id, req.user.id);

    res.json({ message: '报名成功' });
  } catch (error) {
    console.error('活动报名错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id/register', authenticateToken, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: '活动不存在' });
    }

    const existingRegistration = db.prepare(
      'SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!existingRegistration) {
      return res.status(400).json({ error: '您未报名此活动' });
    }

    db.prepare(
      'DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?'
    ).run(req.params.id, req.user.id);

    res.json({ message: '已取消报名' });
  } catch (error) {
    console.error('取消报名错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/pending/list', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const events = db.prepare(`
      SELECT e.*, u.name as organizer_name
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      WHERE e.status = 'pending'
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    res.json({ events });
  } catch (error) {
    console.error('获取待审核活动错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/approve', authenticateToken, requireAdmin, (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: '活动不存在' });
    }

    db.prepare("UPDATE events SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(req.params.id);

    res.json({ message: '活动已审核通过' });
  } catch (error) {
    console.error('审核活动错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/reject', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { reason } = req.body;
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: '活动不存在' });
    }

    db.prepare("UPDATE events SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(req.params.id);

    res.json({ message: '活动已拒绝' });
  } catch (error) {
    console.error('拒绝活动错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;

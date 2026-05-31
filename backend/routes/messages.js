const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/conversations', authenticateToken, (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        (SELECT content FROM private_messages 
         WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM private_messages 
         WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
         ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM private_messages 
         WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
      FROM users u
      WHERE u.id IN (
        SELECT DISTINCT CASE 
          WHEN sender_id = ? THEN receiver_id 
          ELSE sender_id 
        END as other_user_id
        FROM private_messages 
        WHERE sender_id = ? OR receiver_id = ?
      )
      ORDER BY last_message_time DESC
    `).all(
      req.user.id, req.user.id,
      req.user.id, req.user.id,
      req.user.id,
      req.user.id,
      req.user.id, req.user.id
    );

    res.json({ conversations });
  } catch (error) {
    console.error('获取会话列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/conversations/:userId', authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const targetUser = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);

    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const messages = db.prepare(`
      SELECT pm.*, 
             s.name as sender_name,
             r.name as receiver_name
      FROM private_messages pm
      JOIN users s ON pm.sender_id = s.id
      JOIN users r ON pm.receiver_id = r.id
      WHERE (pm.sender_id = ? AND pm.receiver_id = ?)
         OR (pm.sender_id = ? AND pm.receiver_id = ?)
      ORDER BY pm.created_at DESC
      LIMIT ? OFFSET ?
    `).all(
      req.user.id, userId,
      userId, req.user.id,
      parseInt(limit), offset
    );

    db.prepare(`
      UPDATE private_messages
      SET is_read = 1
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `).run(userId, req.user.id);

    res.json({
      messages: messages.reverse(),
      targetUser,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('获取会话消息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/send/:userId', authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '消息内容为必填项' });
    }

    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: '不能给自己发送消息' });
    }

    const targetUser = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);

    if (!targetUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const result = db.prepare(`
      INSERT INTO private_messages (sender_id, receiver_id, content)
      VALUES (?, ?, ?)
    `).run(req.user.id, userId, content.trim());

    const message = db.prepare(`
      SELECT pm.*, 
             s.name as sender_name,
             r.name as receiver_name
      FROM private_messages pm
      JOIN users s ON pm.sender_id = s.id
      JOIN users r ON pm.receiver_id = r.id
      WHERE pm.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: '消息发送成功',
      data: message
    });
  } catch (error) {
    console.error('发送消息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/unread/count', authenticateToken, (req, res) => {
  try {
    const count = db.prepare(`
      SELECT COUNT(*) as count
      FROM private_messages
      WHERE receiver_id = ? AND is_read = 0
    `).get(req.user.id).count;

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('获取未读消息数错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/mark-read/:messageId', authenticateToken, (req, res) => {
  try {
    const message = db.prepare('SELECT * FROM private_messages WHERE id = ?').get(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    if (message.receiver_id !== req.user.id) {
      return res.status(403).json({ error: '无权标记此消息为已读' });
    }

    db.prepare('UPDATE private_messages SET is_read = 1 WHERE id = ?').run(req.params.messageId);

    res.json({ message: '消息已标记为已读' });
  } catch (error) {
    console.error('标记已读错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/mark-all-read/:userId', authenticateToken, (req, res) => {
  try {
    db.prepare(`
      UPDATE private_messages
      SET is_read = 1
      WHERE sender_id = ? AND receiver_id = ? AND is_read = 0
    `).run(req.params.userId, req.user.id);

    res.json({ message: '所有消息已标记为已读' });
  } catch (error) {
    console.error('标记全部已读错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:messageId', authenticateToken, (req, res) => {
  try {
    const message = db.prepare('SELECT * FROM private_messages WHERE id = ?').get(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    if (message.sender_id !== req.user.id && message.receiver_id !== req.user.id) {
      return res.status(403).json({ error: '无权删除此消息' });
    }

    db.prepare('DELETE FROM private_messages WHERE id = ?').run(req.params.messageId);

    res.json({ message: '消息已删除' });
  } catch (error) {
    console.error('删除消息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;

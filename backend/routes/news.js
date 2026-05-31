const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const { source, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT n.*, u.name as created_by_name
      FROM news n
      LEFT JOIN users u ON n.created_by = u.id
    `;
    const params = [];

    if (source && source.trim() !== '') {
      query += ' WHERE n.source LIKE ?';
      params.push(`%${source.trim()}%`);
    }

    const countQuery = query.replace(
      'SELECT n.*, u.name as created_by_name',
      'SELECT COUNT(*) as total'
    );
    const totalResult = db.prepare(countQuery).get(...params);
    const total = totalResult.total;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY n.publish_date DESC, n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const news = db.prepare(query).all(...params);

    res.json({
      news,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取新闻列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const news = db.prepare(`
      SELECT n.*, u.name as created_by_name
      FROM news n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = ?
    `).get(req.params.id);

    if (!news) {
      return res.status(404).json({ error: '新闻不存在' });
    }

    res.json(news);
  } catch (error) {
    console.error('获取新闻详情错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, content, source, source_url, publish_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: '新闻标题为必填项' });
    }

    const result = db.prepare(`
      INSERT INTO news (title, content, source, source_url, publish_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      title, content, source, source_url,
      publish_date || new Date().toISOString(),
      req.user.id
    );

    const news = db.prepare(`
      SELECT n.*, u.name as created_by_name
      FROM news n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: '新闻发布成功',
      news
    });
  } catch (error) {
    console.error('发布新闻错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { title, content, source, source_url, publish_date } = req.body;

    const existingNews = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);

    if (!existingNews) {
      return res.status(404).json({ error: '新闻不存在' });
    }

    db.prepare(`
      UPDATE news
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          source = COALESCE(?, source),
          source_url = COALESCE(?, source_url),
          publish_date = COALESCE(?, publish_date)
      WHERE id = ?
    `).run(
      title, content, source, source_url, publish_date,
      req.params.id
    );

    const updatedNews = db.prepare(`
      SELECT n.*, u.name as created_by_name
      FROM news n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = ?
    `).get(req.params.id);

    res.json({
      message: '新闻更新成功',
      news: updatedNews
    });
  } catch (error) {
    console.error('更新新闻错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const existingNews = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);

    if (!existingNews) {
      return res.status(404).json({ error: '新闻不存在' });
    }

    db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);

    res.json({ message: '新闻已删除' });
  } catch (error) {
    console.error('删除新闻错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/stats/sources', authenticateToken, (req, res) => {
  try {
    const sources = db.prepare(`
      SELECT DISTINCT source FROM news WHERE source IS NOT NULL AND source != ''
      ORDER BY source
    `).all().map(row => row.source);

    res.json({ sources });
  } catch (error) {
    console.error('获取新闻来源错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;

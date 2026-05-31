const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const { industry, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT c.*, u.name as creator_name,
             (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count,
             (SELECT COUNT(*) FROM circle_posts WHERE circle_id = c.id) as post_count,
             (SELECT 1 FROM circle_members WHERE circle_id = c.id AND user_id = ?) as is_member
      FROM circles c
      JOIN users u ON c.creator_id = u.id
      WHERE c.is_private = 0
    `;
    const params = [req.user.id];

    if (industry && industry.trim() !== '') {
      query += ' AND c.industry LIKE ?';
      params.push(`%${industry.trim()}%`);
    }

    const countQuery = query.replace(
      'SELECT c.*, u.name as creator_name, (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count, (SELECT COUNT(*) FROM circle_posts WHERE circle_id = c.id) as post_count, (SELECT 1 FROM circle_members WHERE circle_id = c.id AND user_id = ?) as is_member',
      'SELECT COUNT(*) as total'
    ).split('?');
    countQuery.pop();
    const countQueryFinal = countQuery.join('?');

    const totalResult = db.prepare(countQueryFinal).get(...params.slice(0, -1));
    const total = totalResult?.total || 0;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const circles = db.prepare(query).all(...params);

    res.json({
      circles: circles.map(c => ({
        ...c,
        is_member: !!c.is_member
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取圈子列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/my', authenticateToken, (req, res) => {
  try {
    const myCircles = db.prepare(`
      SELECT c.*, u.name as creator_name,
             (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count,
             (SELECT COUNT(*) FROM circle_posts WHERE circle_id = c.id) as post_count,
             cm.role as my_role
      FROM circle_members cm
      JOIN circles c ON cm.circle_id = c.id
      JOIN users u ON c.creator_id = u.id
      WHERE cm.user_id = ?
      ORDER BY cm.joined_at DESC
    `).all(req.user.id);

    res.json({ circles: myCircles });
  } catch (error) {
    console.error('获取我的圈子错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id', authenticateToken, (req, res) => {
  try {
    const circle = db.prepare(`
      SELECT c.*, u.name as creator_name, u.email as creator_email,
             (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as member_count,
             (SELECT COUNT(*) FROM circle_posts WHERE circle_id = c.id) as post_count,
             (SELECT role FROM circle_members WHERE circle_id = c.id AND user_id = ?) as my_role
      FROM circles c
      JOIN users u ON c.creator_id = u.id
      WHERE c.id = ?
    `).get(req.user.id, req.params.id);

    if (!circle) {
      return res.status(404).json({ error: '圈子不存在' });
    }

    const isMember = circle.my_role !== null;
    const isPrivate = circle.is_private === 1;

    if (isPrivate && !isMember && circle.creator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: '该圈子为私密圈子，需要加入后才能查看' });
    }

    const members = [];
    if (isMember || circle.creator_id === req.user.id || req.user.role === 'admin') {
      const memberList = db.prepare(`
        SELECT cm.*, u.name, u.email, ap.company, ap.position
        FROM circle_members cm
        JOIN users u ON cm.user_id = u.id
        LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
        WHERE cm.circle_id = ?
        ORDER BY cm.joined_at ASC
      `).all(req.params.id);
      members.push(...memberList);
    }

    const posts = [];
    if (isMember || circle.creator_id === req.user.id || req.user.role === 'admin' || !isPrivate) {
      const postList = db.prepare(`
        SELECT cp.*, u.name as author_name,
               (SELECT COUNT(*) FROM circle_post_comments WHERE post_id = cp.id) as comment_count
        FROM circle_posts cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.circle_id = ?
        ORDER BY cp.created_at DESC
        LIMIT 50
      `).all(req.params.id);
      posts.push(...postList);
    }

    res.json({
      circle: {
        ...circle,
        my_role: circle.my_role
      },
      members,
      posts,
      is_member: isMember
    });
  } catch (error) {
    console.error('获取圈子详情错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, description, industry, is_private } = req.body;

    if (!name) {
      return res.status(400).json({ error: '圈子名称为必填项' });
    }

    const insertCircle = db.prepare(`
      INSERT INTO circles (name, description, industry, creator_id, is_private)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insertCircle.run(
      name, description, industry,
      req.user.id,
      is_private ? 1 : 0
    );

    db.prepare(`
      INSERT INTO circle_members (circle_id, user_id, role)
      VALUES (?, ?, 'admin')
    `).run(result.lastInsertRowid, req.user.id);

    const circle = db.prepare(`
      SELECT c.*, u.name as creator_name
      FROM circles c
      JOIN users u ON c.creator_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: '圈子创建成功',
      circle
    });
  } catch (error) {
    console.error('创建圈子错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, description, industry, is_private } = req.body;

    const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(req.params.id);

    if (!circle) {
      return res.status(404).json({ error: '圈子不存在' });
    }

    const myMembership = db.prepare(
      'SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    const isAdmin = req.user.role === 'admin';
    const isCircleAdmin = myMembership?.role === 'admin';
    const isCreator = circle.creator_id === req.user.id;

    if (!isAdmin && !isCircleAdmin && !isCreator) {
      return res.status(403).json({ error: '无权修改此圈子' });
    }

    db.prepare(`
      UPDATE circles
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          industry = COALESCE(?, industry),
          is_private = CASE WHEN ? IS NOT NULL THEN ? ELSE is_private END
      WHERE id = ?
    `).run(
      name, description, industry,
      is_private, is_private ? 1 : 0,
      req.params.id
    );

    const updatedCircle = db.prepare(`
      SELECT c.*, u.name as creator_name
      FROM circles c
      JOIN users u ON c.creator_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    res.json({
      message: '圈子更新成功',
      circle: updatedCircle
    });
  } catch (error) {
    console.error('更新圈子错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(req.params.id);

    if (!circle) {
      return res.status(404).json({ error: '圈子不存在' });
    }

    const isAdmin = req.user.role === 'admin';
    const isCreator = circle.creator_id === req.user.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: '无权删除此圈子' });
    }

    db.prepare('DELETE FROM circle_post_comments WHERE post_id IN (SELECT id FROM circle_posts WHERE circle_id = ?)').run(req.params.id);
    db.prepare('DELETE FROM circle_posts WHERE circle_id = ?').run(req.params.id);
    db.prepare('DELETE FROM circle_members WHERE circle_id = ?').run(req.params.id);
    db.prepare('DELETE FROM circles WHERE id = ?').run(req.params.id);

    res.json({ message: '圈子已删除' });
  } catch (error) {
    console.error('删除圈子错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/join', authenticateToken, (req, res) => {
  try {
    const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(req.params.id);

    if (!circle) {
      return res.status(404).json({ error: '圈子不存在' });
    }

    const existingMembership = db.prepare(
      'SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (existingMembership) {
      return res.status(400).json({ error: '您已加入此圈子' });
    }

    db.prepare(`
      INSERT INTO circle_members (circle_id, user_id, role)
      VALUES (?, ?, 'member')
    `).run(req.params.id, req.user.id);

    res.json({ message: '加入圈子成功' });
  } catch (error) {
    console.error('加入圈子错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id/leave', authenticateToken, (req, res) => {
  try {
    const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(req.params.id);

    if (!circle) {
      return res.status(404).json({ error: '圈子不存在' });
    }

    if (circle.creator_id === req.user.id) {
      return res.status(400).json({ error: '圈子创建者不能退出圈子，请转让或删除圈子' });
    }

    const existingMembership = db.prepare(
      'SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!existingMembership) {
      return res.status(400).json({ error: '您未加入此圈子' });
    }

    db.prepare('DELETE FROM circle_members WHERE circle_id = ? AND user_id = ?')
      .run(req.params.id, req.user.id);

    res.json({ message: '已退出圈子' });
  } catch (error) {
    console.error('退出圈子错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/posts', authenticateToken, (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '帖子内容为必填项' });
    }

    const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(req.params.id);

    if (!circle) {
      return res.status(404).json({ error: '圈子不存在' });
    }

    const isMember = db.prepare(
      'SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    const isAdmin = req.user.role === 'admin';
    const isCreator = circle.creator_id === req.user.id;

    if (!isMember && !isAdmin && !isCreator) {
      return res.status(403).json({ error: '需要加入圈子后才能发帖' });
    }

    const result = db.prepare(`
      INSERT INTO circle_posts (circle_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(req.params.id, req.user.id, content.trim());

    const post = db.prepare(`
      SELECT cp.*, u.name as author_name
      FROM circle_posts cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: '发帖成功',
      post
    });
  } catch (error) {
    console.error('发帖错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.get('/:id/posts/:postId', authenticateToken, (req, res) => {
  try {
    const post = db.prepare(`
      SELECT cp.*, u.name as author_name,
             (SELECT COUNT(*) FROM circle_post_comments WHERE post_id = cp.id) as comment_count
      FROM circle_posts cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.id = ?
    `).get(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    const comments = db.prepare(`
      SELECT cpc.*, u.name as author_name
      FROM circle_post_comments cpc
      JOIN users u ON cpc.user_id = u.id
      WHERE cpc.post_id = ?
      ORDER BY cpc.created_at ASC
    `).all(req.params.postId);

    res.json({ post, comments });
  } catch (error) {
    console.error('获取帖子详情错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.post('/:id/posts/:postId/comments', authenticateToken, (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '评论内容为必填项' });
    }

    const post = db.prepare('SELECT * FROM circle_posts WHERE id = ?').get(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    const circle = db.prepare('SELECT * FROM circles WHERE id = ?').get(post.circle_id);

    const isMember = db.prepare(
      'SELECT * FROM circle_members WHERE circle_id = ? AND user_id = ?'
    ).get(post.circle_id, req.user.id);

    const isAdmin = req.user.role === 'admin';
    const isCreator = circle.creator_id === req.user.id;

    if (!isMember && !isAdmin && !isCreator) {
      return res.status(403).json({ error: '需要加入圈子后才能评论' });
    }

    const result = db.prepare(`
      INSERT INTO circle_post_comments (post_id, user_id, content)
      VALUES (?, ?, ?)
    `).run(req.params.postId, req.user.id, content.trim());

    const comment = db.prepare(`
      SELECT cpc.*, u.name as author_name
      FROM circle_post_comments cpc
      JOIN users u ON cpc.user_id = u.id
      WHERE cpc.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      message: '评论成功',
      comment
    });
  } catch (error) {
    console.error('评论错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id/posts/:postId', authenticateToken, (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM circle_posts WHERE id = ?').get(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: '帖子不存在' });
    }

    const isAuthor = post.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: '无权删除此帖子' });
    }

    db.prepare('DELETE FROM circle_post_comments WHERE post_id = ?').run(req.params.postId);
    db.prepare('DELETE FROM circle_posts WHERE id = ?').run(req.params.postId);

    res.json({ message: '帖子已删除' });
  } catch (error) {
    console.error('删除帖子错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

router.delete('/:id/posts/:postId/comments/:commentId', authenticateToken, (req, res) => {
  try {
    const comment = db.prepare('SELECT * FROM circle_post_comments WHERE id = ?').get(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    const isAuthor = comment.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    db.prepare('DELETE FROM circle_post_comments WHERE id = ?').run(req.params.commentId);

    res.json({ message: '评论已删除' });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;

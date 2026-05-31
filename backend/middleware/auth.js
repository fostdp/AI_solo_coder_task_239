const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未授权访问' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token无效或已过期' });
    }
    req.user = user;
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

module.exports = {
  authenticateToken,
  requireAdmin,
  requireAlumni
};

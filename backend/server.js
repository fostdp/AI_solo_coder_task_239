require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const alumniRoutes = require('./routes/alumni');
const adminRoutes = require('./routes/admin');
const eventsRoutes = require('./routes/events');
const circlesRoutes = require('./routes/circles');
const messagesRoutes = require('./routes/messages');
const newsRoutes = require('./routes/news');

const app = express();
const PORT = process.env.PORT || 3001;

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '校友通讯录API服务正常运行' });
});

app.use('/api/auth', authRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/circles', circlesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/news', newsRoutes);

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log('提示: 首次运行请执行 npm run init-db 初始化数据库');
  console.log('默认管理员账号: admin@alumni.com / admin123');
});

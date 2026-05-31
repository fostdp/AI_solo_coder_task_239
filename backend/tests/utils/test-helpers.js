const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const testDbPath = path.join(__dirname, '../../data/test-alumni.db');

function initTestDb() {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  const db = new Database(testDbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'alumni',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alumni_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      graduation_year INTEGER NOT NULL,
      major TEXT,
      city TEXT,
      industry TEXT,
      company TEXT,
      position TEXT,
      phone TEXT,
      bio TEXT,
      avatar_url TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      update_reminder_status TEXT DEFAULT 'none',
      last_reminder_date DATETIME,
      email_opt_out INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS job_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      previous_company TEXT,
      previous_position TEXT,
      new_company TEXT,
      new_position TEXT,
      change_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS update_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (admin_id) REFERENCES users(id),
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return db;
}

function createAdminUser(db) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const result = db.prepare(`
    INSERT INTO users (email, password, name, role)
    VALUES (?, ?, ?, 'admin')
  `).run('admin@test.com', hashedPassword, '测试管理员');

  return {
    id: result.lastInsertRowid,
    email: 'admin@test.com',
    name: '测试管理员',
    role: 'admin'
  };
}

function createAlumniUser(db, options = {}) {
  const {
    email = `alumni_${Date.now()}_${Math.random().toString(36).substr(2, 5)}@test.com`,
    password = 'password123',
    name = '测试校友',
    graduation_year = 2020,
    major = '计算机科学',
    city = '北京',
    industry = '互联网',
    company = '科技公司',
    position = '工程师',
    phone = '13800138000',
    email_opt_out = 0
  } = options;

  const hashedPassword = bcrypt.hashSync(password, 10);
  const userResult = db.prepare(`
    INSERT INTO users (email, password, name, role)
    VALUES (?, ?, ?, 'alumni')
  `).run(email, hashedPassword, name);

  const userId = userResult.lastInsertRowid;

  db.prepare(`
    INSERT INTO alumni_profiles
    (user_id, graduation_year, major, city, industry, company, position, phone, email_opt_out)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, graduation_year, major, city, industry, company, position, phone, email_opt_out);

  return {
    id: userId,
    email,
    name,
    role: 'alumni'
  };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    'test_jwt_secret',
    { expiresIn: '1h' }
  );
}

function closeTestDb(db) {
  db.close();
}

module.exports = {
  testDbPath,
  initTestDb,
  createAdminUser,
  createAlumniUser,
  generateToken,
  closeTestDb
};

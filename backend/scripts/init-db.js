const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/alumni.db');
const db = new Database(dbPath);

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

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    event_date DATETIME NOT NULL,
    registration_deadline DATETIME,
    max_participants INTEGER,
    organizer_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS event_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    registration_status TEXT DEFAULT 'registered',
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(event_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS circles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    creator_id INTEGER NOT NULL,
    is_private INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS circle_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (circle_id) REFERENCES circles(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(circle_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS circle_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    circle_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (circle_id) REFERENCES circles(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS circle_post_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES circle_posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS private_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    source TEXT,
    source_url TEXT,
    publish_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

const hashedPassword = bcrypt.hashSync('admin123', 10);
const adminCheck = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@alumni.com');

if (!adminCheck) {
  db.prepare(`
    INSERT INTO users (email, password, name, role)
    VALUES (?, ?, ?, 'admin')
  `).run('admin@alumni.com', hashedPassword, '系统管理员');
}

console.log('数据库初始化完成！');
console.log('默认管理员账号: admin@alumni.com / admin123');

db.close();

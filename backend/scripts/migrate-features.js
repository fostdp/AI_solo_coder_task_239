const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/alumni.db');
const db = new Database(dbPath);

const tableExists = (tableName) => {
  const result = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
  return !!result;
};

if (!tableExists('events')) {
  db.exec(`
    CREATE TABLE events (
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
  `);
  console.log('已创建 events 表');
}

if (!tableExists('event_registrations')) {
  db.exec(`
    CREATE TABLE event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      registration_status TEXT DEFAULT 'registered',
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(event_id, user_id)
    );
  `);
  console.log('已创建 event_registrations 表');
}

if (!tableExists('circles')) {
  db.exec(`
    CREATE TABLE circles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      industry TEXT,
      creator_id INTEGER NOT NULL,
      is_private INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );
  `);
  console.log('已创建 circles 表');
}

if (!tableExists('circle_members')) {
  db.exec(`
    CREATE TABLE circle_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      circle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (circle_id) REFERENCES circles(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(circle_id, user_id)
    );
  `);
  console.log('已创建 circle_members 表');
}

if (!tableExists('circle_posts')) {
  db.exec(`
    CREATE TABLE circle_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      circle_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (circle_id) REFERENCES circles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log('已创建 circle_posts 表');
}

if (!tableExists('circle_post_comments')) {
  db.exec(`
    CREATE TABLE circle_post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES circle_posts(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
  console.log('已创建 circle_post_comments 表');
}

if (!tableExists('private_messages')) {
  db.exec(`
    CREATE TABLE private_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );
  `);
  console.log('已创建 private_messages 表');
}

if (!tableExists('news')) {
  db.exec(`
    CREATE TABLE news (
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
  console.log('已创建 news 表');
}

const profileInfo = db.prepare("PRAGMA table_info(alumni_profiles)").all();
const hasEmailOptOut = profileInfo.some(col => col.name === 'email_opt_out');

if (!hasEmailOptOut) {
  db.exec(`ALTER TABLE alumni_profiles ADD COLUMN email_opt_out INTEGER DEFAULT 0;`);
  console.log('已添加 email_opt_out 字段到 alumni_profiles 表');
}

db.close();
console.log('数据库迁移完成！');

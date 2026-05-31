const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/alumni.db');
const db = new Database(dbPath);

const tableInfo = db.prepare('PRAGMA table_info(alumni_profiles)').all();
const hasEmailOptOut = tableInfo.some(col => col.name === 'email_opt_out');

if (!hasEmailOptOut) {
  db.exec(`
    ALTER TABLE alumni_profiles ADD COLUMN email_opt_out INTEGER DEFAULT 0;
  `);
  console.log('已添加 email_opt_out 字段到 alumni_profiles 表');
} else {
  console.log('email_opt_out 字段已存在，跳过迁移');
}

db.close();
console.log('迁移完成！');

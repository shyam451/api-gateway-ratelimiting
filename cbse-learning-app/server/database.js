const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'learning.db');

// Ensure data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('parent', 'student')),
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade INTEGER DEFAULT 5
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    image_path TEXT,
    extracted_text TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('mcq', 'short', 'long')),
    question_text TEXT NOT NULL,
    options TEXT,  -- JSON array for MCQ options
    correct_answer TEXT NOT NULL,
    marks INTEGER DEFAULT 1,
    difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
    approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
  );

  CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject_id TEXT,
    chapter_id TEXT,
    created_by TEXT NOT NULL,
    assigned_to TEXT,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'in_progress', 'completed')),
    total_marks INTEGER DEFAULT 0,
    time_limit_minutes INTEGER DEFAULT 60,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS test_questions (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_order INTEGER DEFAULT 0,
    FOREIGN KEY (test_id) REFERENCES tests(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );

  CREATE TABLE IF NOT EXISTS test_attempts (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    total_score REAL DEFAULT 0,
    max_score INTEGER DEFAULT 0,
    percentage REAL DEFAULT 0,
    FOREIGN KEY (test_id) REFERENCES tests(id),
    FOREIGN KEY (student_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    student_answer TEXT,
    is_correct INTEGER,
    score REAL DEFAULT 0,
    max_score INTEGER DEFAULT 1,
    ai_feedback TEXT,
    evaluated_at TEXT,
    FOREIGN KEY (attempt_id) REFERENCES test_attempts(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );
`);

// Seed default subjects for CBSE Grade 5
const seedSubjects = db.prepare(`
  INSERT OR IGNORE INTO subjects (id, name, grade) VALUES (?, ?, 5)
`);

const subjects = [
  ['subj-math', 'Mathematics'],
  ['subj-science', 'Science'],
  ['subj-english', 'English'],
  ['subj-hindi', 'Hindi'],
  ['subj-social', 'Social Science'],
  ['subj-evs', 'Environmental Studies'],
];

const seedTx = db.transaction(() => {
  for (const [id, name] of subjects) {
    seedSubjects.run(id, name);
  }
});
seedTx();

// Seed default users if none exist
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const { v4: uuidv4 } = require('uuid');
  const seedUsers = db.prepare(`
    INSERT INTO users (id, username, password, role, name) VALUES (?, ?, ?, ?, ?)
  `);
  const userTx = db.transaction(() => {
    seedUsers.run(uuidv4(), 'parent', 'parent123', 'parent', 'Parent');
    seedUsers.run(uuidv4(), 'student', 'student123', 'student', 'Student');
  });
  userTx();
}

module.exports = db;

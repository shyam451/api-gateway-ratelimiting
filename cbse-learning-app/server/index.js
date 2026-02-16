const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
const ai = require('./claude-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// File upload config
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ============ AUTH ROUTES ============

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare('SELECT id, username, role, name FROM users WHERE username = ? AND password = ?')
    .get(username, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ user });
});

app.get('/api/auth/users', (req, res) => {
  const users = db.prepare('SELECT id, username, role, name FROM users').all();
  res.json(users);
});

// ============ SUBJECT ROUTES ============

app.get('/api/subjects', (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects ORDER BY name').all();
  res.json(subjects);
});

// ============ CHAPTER ROUTES ============

app.get('/api/chapters', (req, res) => {
  const { subject_id } = req.query;
  let chapters;
  if (subject_id) {
    chapters = db
      .prepare(
        `SELECT c.*, s.name as subject_name,
         (SELECT COUNT(*) FROM questions WHERE chapter_id = c.id) as question_count
         FROM chapters c JOIN subjects s ON c.subject_id = s.id
         WHERE c.subject_id = ? ORDER BY c.created_at DESC`
      )
      .all(subject_id);
  } else {
    chapters = db
      .prepare(
        `SELECT c.*, s.name as subject_name,
         (SELECT COUNT(*) FROM questions WHERE chapter_id = c.id) as question_count
         FROM chapters c JOIN subjects s ON c.subject_id = s.id
         ORDER BY c.created_at DESC`
      )
      .all();
  }
  res.json(chapters);
});

app.get('/api/chapters/:id', (req, res) => {
  const chapter = db
    .prepare(
      `SELECT c.*, s.name as subject_name
       FROM chapters c JOIN subjects s ON c.subject_id = s.id
       WHERE c.id = ?`
    )
    .get(req.params.id);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
  res.json(chapter);
});

// Upload textbook image and extract text + generate questions
app.post('/api/chapters/scan', upload.single('image'), async (req, res) => {
  try {
    const { subject_id, chapter_name } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    if (!subject_id || !chapter_name) {
      return res.status(400).json({ error: 'Subject and chapter name are required' });
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;

    // Step 1: Extract text from image
    const extractedText = await ai.extractTextFromImage(imagePath);

    // Step 2: Save chapter
    const chapterId = uuidv4();
    db.prepare(
      'INSERT INTO chapters (id, subject_id, name, image_path, extracted_text) VALUES (?, ?, ?, ?, ?)'
    ).run(chapterId, subject_id, chapter_name, imageUrl, extractedText);

    // Step 3: Get subject name for context
    const subject = db.prepare('SELECT name FROM subjects WHERE id = ?').get(subject_id);

    // Step 4: Generate questions
    const mcqCount = parseInt(req.body.mcq_count) || 5;
    const shortCount = parseInt(req.body.short_count) || 3;
    const longCount = parseInt(req.body.long_count) || 2;

    const questions = await ai.generateQuestions(
      extractedText,
      subject.name,
      chapter_name,
      { mcq: mcqCount, short: shortCount, long: longCount }
    );

    // Step 5: Save questions
    const insertQ = db.prepare(
      'INSERT INTO questions (id, chapter_id, type, question_text, options, correct_answer, marks, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const savedQuestions = [];
    const insertTx = db.transaction(() => {
      for (const q of questions) {
        const qId = uuidv4();
        insertQ.run(
          qId,
          chapterId,
          q.type,
          q.question_text,
          q.options ? JSON.stringify(q.options) : null,
          q.correct_answer,
          q.marks || (q.type === 'mcq' ? 1 : q.type === 'short' ? 2 : 5),
          q.difficulty || 'medium'
        );
        savedQuestions.push({ id: qId, ...q });
      }
    });
    insertTx();

    res.json({
      chapter: {
        id: chapterId,
        name: chapter_name,
        subject_id,
        image_path: imageUrl,
        extracted_text: extractedText,
      },
      questions: savedQuestions,
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ QUESTION ROUTES ============

app.get('/api/questions', (req, res) => {
  const { chapter_id, type, approved } = req.query;
  let sql = `SELECT q.*, c.name as chapter_name, s.name as subject_name
             FROM questions q
             JOIN chapters c ON q.chapter_id = c.id
             JOIN subjects s ON c.subject_id = s.id WHERE 1=1`;
  const params = [];

  if (chapter_id) {
    sql += ' AND q.chapter_id = ?';
    params.push(chapter_id);
  }
  if (type) {
    sql += ' AND q.type = ?';
    params.push(type);
  }
  if (approved !== undefined) {
    sql += ' AND q.approved = ?';
    params.push(parseInt(approved));
  }
  sql += ' ORDER BY q.created_at DESC';

  const questions = db.prepare(sql).all(...params);
  // Parse options JSON for MCQs
  questions.forEach((q) => {
    if (q.options) q.options = JSON.parse(q.options);
  });
  res.json(questions);
});

app.put('/api/questions/:id', (req, res) => {
  const { question_text, options, correct_answer, marks, difficulty, approved } = req.body;
  const updates = [];
  const params = [];

  if (question_text !== undefined) { updates.push('question_text = ?'); params.push(question_text); }
  if (options !== undefined) { updates.push('options = ?'); params.push(JSON.stringify(options)); }
  if (correct_answer !== undefined) { updates.push('correct_answer = ?'); params.push(correct_answer); }
  if (marks !== undefined) { updates.push('marks = ?'); params.push(marks); }
  if (difficulty !== undefined) { updates.push('difficulty = ?'); params.push(difficulty); }
  if (approved !== undefined) { updates.push('approved = ?'); params.push(approved); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE questions SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (question && question.options) question.options = JSON.parse(question.options);
  res.json(question);
});

app.delete('/api/questions/:id', (req, res) => {
  db.prepare('DELETE FROM test_questions WHERE question_id = ?').run(req.params.id);
  db.prepare('DELETE FROM answers WHERE question_id = ?').run(req.params.id);
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Approve all questions for a chapter
app.post('/api/questions/approve-all', (req, res) => {
  const { chapter_id } = req.body;
  db.prepare('UPDATE questions SET approved = 1 WHERE chapter_id = ?').run(chapter_id);
  res.json({ success: true });
});

// ============ TEST ROUTES ============

app.get('/api/tests', (req, res) => {
  const { status, assigned_to, created_by } = req.query;
  let sql = `SELECT t.*, s.name as subject_name, c.name as chapter_name,
             u1.name as creator_name, u2.name as assignee_name,
             (SELECT COUNT(*) FROM test_questions WHERE test_id = t.id) as question_count
             FROM tests t
             LEFT JOIN subjects s ON t.subject_id = s.id
             LEFT JOIN chapters c ON t.chapter_id = c.id
             LEFT JOIN users u1 ON t.created_by = u1.id
             LEFT JOIN users u2 ON t.assigned_to = u2.id
             WHERE 1=1`;
  const params = [];

  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (assigned_to) { sql += ' AND t.assigned_to = ?'; params.push(assigned_to); }
  if (created_by) { sql += ' AND t.created_by = ?'; params.push(created_by); }
  sql += ' ORDER BY t.created_at DESC';

  res.json(db.prepare(sql).all(...params));
});

app.get('/api/tests/:id', (req, res) => {
  const test = db
    .prepare(
      `SELECT t.*, s.name as subject_name, c.name as chapter_name
       FROM tests t
       LEFT JOIN subjects s ON t.subject_id = s.id
       LEFT JOIN chapters c ON t.chapter_id = c.id
       WHERE t.id = ?`
    )
    .get(req.params.id);

  if (!test) return res.status(404).json({ error: 'Test not found' });

  const questions = db
    .prepare(
      `SELECT q.*, tq.question_order
       FROM test_questions tq
       JOIN questions q ON tq.question_id = q.id
       WHERE tq.test_id = ?
       ORDER BY tq.question_order`
    )
    .all(req.params.id);

  questions.forEach((q) => {
    if (q.options) q.options = JSON.parse(q.options);
  });

  res.json({ ...test, questions });
});

app.post('/api/tests', (req, res) => {
  const { title, subject_id, chapter_id, created_by, question_ids, time_limit_minutes } = req.body;
  const testId = uuidv4();

  const totalMarks = db
    .prepare(
      `SELECT COALESCE(SUM(marks), 0) as total FROM questions WHERE id IN (${question_ids.map(() => '?').join(',')})`
    )
    .get(...question_ids).total;

  db.prepare(
    'INSERT INTO tests (id, title, subject_id, chapter_id, created_by, total_marks, time_limit_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(testId, title, subject_id || null, chapter_id || null, created_by, totalMarks, time_limit_minutes || 60);

  const insertTQ = db.prepare(
    'INSERT INTO test_questions (id, test_id, question_id, question_order) VALUES (?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    question_ids.forEach((qId, i) => {
      insertTQ.run(uuidv4(), testId, qId, i);
    });
  });
  tx();

  res.json({ id: testId, title, total_marks: totalMarks });
});

// Publish a test (assign to student)
app.post('/api/tests/:id/publish', (req, res) => {
  const { assigned_to } = req.body;
  db.prepare('UPDATE tests SET status = ?, assigned_to = ? WHERE id = ?').run(
    'published',
    assigned_to,
    req.params.id
  );
  res.json({ success: true });
});

// ============ TEST ATTEMPT ROUTES ============

// Start a test attempt
app.post('/api/tests/:id/start', (req, res) => {
  const { student_id } = req.body;
  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(req.params.id);
  if (!test) return res.status(404).json({ error: 'Test not found' });

  // Check if already attempted
  const existing = db
    .prepare('SELECT * FROM test_attempts WHERE test_id = ? AND student_id = ? AND completed_at IS NULL')
    .get(req.params.id, student_id);

  if (existing) {
    return res.json(existing);
  }

  const attemptId = uuidv4();
  db.prepare(
    'INSERT INTO test_attempts (id, test_id, student_id, max_score) VALUES (?, ?, ?, ?)'
  ).run(attemptId, req.params.id, student_id, test.total_marks);

  // Update test status
  db.prepare('UPDATE tests SET status = ? WHERE id = ?').run('in_progress', req.params.id);

  res.json({ id: attemptId, test_id: req.params.id, student_id, max_score: test.total_marks });
});

// Submit answers for evaluation
app.post('/api/attempts/:id/submit', async (req, res) => {
  try {
    const { answers: studentAnswers } = req.body;
    const attempt = db.prepare('SELECT * FROM test_attempts WHERE id = ?').get(req.params.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const results = [];
    let totalScore = 0;

    for (const ans of studentAnswers) {
      const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(ans.question_id);
      if (!question) continue;

      if (question.options) question.options = JSON.parse(question.options);

      // Evaluate using AI
      const evaluation = await ai.evaluateAnswer(
        question,
        ans.answer,
        question.correct_answer,
        question.marks
      );

      const answerId = uuidv4();
      db.prepare(
        `INSERT INTO answers (id, attempt_id, question_id, student_answer, is_correct, score, max_score, ai_feedback, evaluated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).run(
        answerId,
        req.params.id,
        ans.question_id,
        ans.answer,
        evaluation.isCorrect ? 1 : 0,
        evaluation.score,
        question.marks,
        evaluation.feedback
      );

      totalScore += evaluation.score;
      results.push({
        question_id: ans.question_id,
        question_text: question.question_text,
        type: question.type,
        student_answer: ans.answer,
        correct_answer: question.correct_answer,
        score: evaluation.score,
        max_score: question.marks,
        feedback: evaluation.feedback,
        is_correct: evaluation.isCorrect,
      });
    }

    const maxScore = attempt.max_score;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100 * 10) / 10 : 0;

    // Update attempt
    db.prepare(
      `UPDATE test_attempts SET completed_at = datetime('now'), total_score = ?, percentage = ? WHERE id = ?`
    ).run(totalScore, percentage, req.params.id);

    // Update test status
    db.prepare('UPDATE tests SET status = ? WHERE id = ?').run('completed', attempt.test_id);

    res.json({
      attempt_id: req.params.id,
      total_score: totalScore,
      max_score: maxScore,
      percentage,
      results,
    });
  } catch (error) {
    console.error('Evaluation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attempt results
app.get('/api/attempts/:id/results', (req, res) => {
  const attempt = db
    .prepare(
      `SELECT ta.*, t.title as test_title, u.name as student_name
       FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       JOIN users u ON ta.student_id = u.id
       WHERE ta.id = ?`
    )
    .get(req.params.id);

  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  const answers = db
    .prepare(
      `SELECT a.*, q.question_text, q.type, q.options, q.correct_answer
       FROM answers a
       JOIN questions q ON a.question_id = q.id
       WHERE a.attempt_id = ?`
    )
    .all(req.params.id);

  answers.forEach((a) => {
    if (a.options) a.options = JSON.parse(a.options);
  });

  res.json({ ...attempt, answers });
});

// Get all attempts for a test
app.get('/api/tests/:id/attempts', (req, res) => {
  const attempts = db
    .prepare(
      `SELECT ta.*, u.name as student_name
       FROM test_attempts ta
       JOIN users u ON ta.student_id = u.id
       WHERE ta.test_id = ?
       ORDER BY ta.started_at DESC`
    )
    .all(req.params.id);
  res.json(attempts);
});

// ============ DASHBOARD STATS ============

app.get('/api/stats/parent', (req, res) => {
  const totalChapters = db.prepare('SELECT COUNT(*) as count FROM chapters').get().count;
  const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  const totalTests = db.prepare('SELECT COUNT(*) as count FROM tests').get().count;
  const completedTests = db
    .prepare("SELECT COUNT(*) as count FROM tests WHERE status = 'completed'")
    .get().count;
  const avgScore = db
    .prepare('SELECT AVG(percentage) as avg FROM test_attempts WHERE completed_at IS NOT NULL')
    .get().avg;

  res.json({
    totalChapters,
    totalQuestions,
    totalTests,
    completedTests,
    averageScore: avgScore ? Math.round(avgScore * 10) / 10 : 0,
  });
});

app.get('/api/stats/student', (req, res) => {
  const { student_id } = req.query;
  const pendingTests = db
    .prepare(
      "SELECT COUNT(*) as count FROM tests WHERE assigned_to = ? AND status = 'published'"
    )
    .get(student_id).count;
  const completedTests = db
    .prepare(
      'SELECT COUNT(*) as count FROM test_attempts WHERE student_id = ? AND completed_at IS NOT NULL'
    )
    .get(student_id).count;
  const avgScore = db
    .prepare(
      'SELECT AVG(percentage) as avg FROM test_attempts WHERE student_id = ? AND completed_at IS NOT NULL'
    )
    .get(student_id).avg;
  const recentResults = db
    .prepare(
      `SELECT ta.*, t.title as test_title
       FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       WHERE ta.student_id = ? AND ta.completed_at IS NOT NULL
       ORDER BY ta.completed_at DESC LIMIT 5`
    )
    .all(student_id);

  res.json({
    pendingTests,
    completedTests,
    averageScore: avgScore ? Math.round(avgScore * 10) / 10 : 0,
    recentResults,
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CBSE Learning App running at http://localhost:${PORT}`);
});

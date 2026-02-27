'use strict';

const Anthropic = require('@anthropic-ai/sdk');

// Support both API-key (x-api-key) and Bearer-token (Authorization) auth
const authOpts = process.env.ANTHROPIC_AUTH_TOKEN
  ? { authToken: process.env.ANTHROPIC_AUTH_TOKEN }
  : { apiKey: process.env.ANTHROPIC_API_KEY };
const client = new Anthropic(authOpts);
const MODEL = 'claude-sonnet-4-6';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch {
    return {};
  }
}

function getPath(event) {
  return event.path || event.rawPath || '';
}

function getMethod(event) {
  return (event.httpMethod || event.requestContext?.http?.method || '').toUpperCase();
}

// ─── Claude helpers ───────────────────────────────────────────────────────────

/**
 * Ask Claude to generate a fresh world-capitals multiple-choice question.
 * Returns { question, country, options, correctAnswer, funFact, difficulty }.
 */
async function generateQuestion(difficulty) {
  const difficultyInstruction =
    difficulty === 'hard'
      ? 'Choose an obscure or less commonly known country.'
      : difficulty === 'medium'
      ? 'Choose a moderately well-known country.'
      : 'Choose a well-known country that most people would recognise.';

  const prompt = `You are a world geography expert running a quiz.
${difficultyInstruction}
Generate ONE multiple-choice question asking what the capital of a specific country is.

Respond with ONLY a valid JSON object — no markdown fences, no extra text — in this exact shape:
{
  "country": "<country name>",
  "question": "What is the capital of <country name>?",
  "options": ["<correct capital>", "<plausible wrong city 1>", "<plausible wrong city 2>", "<plausible wrong city 3>"],
  "correctAnswer": "<correct capital>",
  "funFact": "<one interesting sentence about the capital city>",
  "difficulty": "${difficulty || 'easy'}"
}

Shuffle the options so the correct answer is not always first.
Use real city names only. Do NOT reuse the same country or capital every time — vary widely across all continents.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  // Strip accidental markdown fences if Claude adds them
  const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/m, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Ask Claude to evaluate a free-text answer against the correct capital.
 * Handles typos, alternate spellings, local names, etc.
 * Returns { correct, normalizedAnswer, explanation }.
 */
async function evaluateAnswer(country, correctAnswer, userAnswer) {
  const prompt = `You are a strict but fair geography quiz judge.

Question: What is the capital of ${country}?
Correct answer: ${correctAnswer}
Student's answer: ${userAnswer}

Decide whether the student's answer is correct. Accept common alternate spellings,
transliterations, and well-known local names (e.g. "Peking" for Beijing is NOT accepted
in a modern quiz; "The Hague" for Netherlands government seat is acceptable context).
Do NOT accept completely wrong cities.

Respond with ONLY a valid JSON object — no markdown, no extra text:
{
  "correct": <true|false>,
  "normalizedAnswer": "<the student's answer as you interpreted it>",
  "explanation": "<one or two sentences explaining the verdict and a fun fact about ${correctAnswer}>"
}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/m, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Ask Claude to generate a complete quiz session of N questions (no duplicates).
 * Returns an array of question objects.
 */
async function generateSession(count, difficulty) {
  const n = Math.min(Math.max(parseInt(count, 10) || 10, 3), 20);
  const difficultyInstruction =
    difficulty === 'hard'
      ? 'Mix in many obscure countries from all continents.'
      : difficulty === 'medium'
      ? 'Use moderately well-known countries from all continents.'
      : 'Use well-known, recognisable countries from all continents.';

  const prompt = `You are a world geography expert creating a quiz.
${difficultyInstruction}
Generate exactly ${n} unique multiple-choice world-capitals questions. No two questions should use the same country.

Respond with ONLY a valid JSON array — no markdown fences, no extra text — where each element has this shape:
{
  "id": <1-based integer>,
  "country": "<country name>",
  "question": "What is the capital of <country name>?",
  "options": ["<opt1>", "<opt2>", "<opt3>", "<opt4>"],
  "correctAnswer": "<correct capital>",
  "funFact": "<one interesting sentence about the capital>",
  "difficulty": "${difficulty || 'easy'}"
}

Shuffle options randomly for each question. Use real city names only. Span all continents.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/```$/m, '').trim();
  return JSON.parse(cleaned);
}

// ─── Route handlers ───────────────────────────────────────────────────────────

/** GET /quiz/question?difficulty=easy|medium|hard */
async function handleGetQuestion(event) {
  const difficulty = event.queryStringParameters?.difficulty || 'easy';
  const data = await generateQuestion(difficulty);
  return jsonResponse(200, {
    id: `q_${Date.now()}`,
    ...data,
  });
}

/**
 * POST /quiz/answer
 * Body: { country, correctAnswer, userAnswer }
 * Uses Claude to judge free-text answers (handles typos / alternate names).
 */
async function handlePostAnswer(event) {
  const { country, correctAnswer, userAnswer } = parseBody(event);

  if (!country || !correctAnswer || userAnswer === undefined) {
    return jsonResponse(400, {
      error: 'Missing fields: country, correctAnswer, and userAnswer are required.',
    });
  }

  const result = await evaluateAnswer(country, correctAnswer, String(userAnswer));
  return jsonResponse(200, result);
}

/**
 * GET /quiz/session?count=10&difficulty=easy|medium|hard
 * Returns a full quiz session with N questions so the client can run offline.
 */
async function handleGetSession(event) {
  const count = event.queryStringParameters?.count || 10;
  const difficulty = event.queryStringParameters?.difficulty || 'easy';
  const questions = await generateSession(count, difficulty);
  return jsonResponse(200, {
    sessionId: `session_${Date.now()}`,
    difficulty,
    totalQuestions: questions.length,
    questions,
  });
}

/** GET /quiz — API info */
async function handleRoot() {
  return jsonResponse(200, {
    name: 'World Capitals Quiz API',
    version: '1.0.0',
    brain: MODEL,
    description: 'A quiz on world capitals powered by the Claude AI model.',
    endpoints: {
      'GET /quiz': 'This help message.',
      'GET /quiz/question': 'Get a single random question. Query: ?difficulty=easy|medium|hard',
      'POST /quiz/answer':
        'Evaluate a free-text answer. Body: { country, correctAnswer, userAnswer }',
      'GET /quiz/session':
        'Get a full quiz session. Query: ?count=10&difficulty=easy|medium|hard',
    },
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  console.log('Quiz event:', JSON.stringify({ path: getPath(event), method: getMethod(event) }));

  const method = getMethod(event);
  const path = getPath(event);

  // CORS preflight
  if (method === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      return jsonResponse(500, { error: 'Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN before starting the server.' });
    }

    if (method === 'GET' && /\/quiz\/question/.test(path)) {
      return await handleGetQuestion(event);
    }

    if (method === 'POST' && /\/quiz\/answer/.test(path)) {
      return await handlePostAnswer(event);
    }

    if (method === 'GET' && /\/quiz\/session/.test(path)) {
      return await handleGetSession(event);
    }

    if (method === 'GET' && /\/quiz\/?$/.test(path)) {
      return await handleRoot();
    }

    return jsonResponse(404, { error: `Route not found: ${method} ${path}` });
  } catch (err) {
    console.error('Quiz handler error:', err);
    return jsonResponse(500, { error: 'Internal server error.', detail: err.message });
  }
};

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic();

/**
 * Extract text content from a textbook image using Claude's vision
 */
async function extractTextFromImage(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const ext = path.extname(imagePath).toLowerCase();
  const mediaTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const mediaType = mediaTypes[ext] || 'image/jpeg';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `You are looking at a scanned page from a CBSE Grade 5 textbook.

Please extract ALL the text content from this image accurately. Include:
- Chapter titles and headings
- Main body text
- Any definitions, formulas, or key concepts
- Questions if present
- Figure/diagram descriptions

Format the output clearly with proper headings and paragraphs.
If this is a math page, preserve equations and formulas.
If this is a science page, note any diagrams or illustrations described.`,
          },
        ],
      },
    ],
  });

  return response.content[0].text;
}

/**
 * Generate questions from extracted text content
 */
async function generateQuestions(extractedText, subjectName, chapterName, questionCounts = {}) {
  const mcqCount = questionCounts.mcq || 5;
  const shortCount = questionCounts.short || 3;
  const longCount = questionCounts.long || 2;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `You are an expert CBSE Grade 5 teacher for ${subjectName}. Based on the following textbook content from the chapter "${chapterName}", generate questions suitable for a Grade 5 student.

TEXTBOOK CONTENT:
${extractedText}

Generate exactly:
- ${mcqCount} Multiple Choice Questions (MCQ) with 4 options each
- ${shortCount} Short Answer Questions (2-3 sentence answers)
- ${longCount} Long Answer Questions (paragraph answers)

IMPORTANT: Return your response as a valid JSON array. Each question object must follow this exact format:

For MCQ:
{
  "type": "mcq",
  "question_text": "the question",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct_answer": "the correct option text exactly as it appears in options",
  "marks": 1,
  "difficulty": "easy|medium|hard"
}

For Short Answer:
{
  "type": "short",
  "question_text": "the question",
  "correct_answer": "the expected short answer (2-3 sentences)",
  "marks": 2,
  "difficulty": "easy|medium|hard"
}

For Long Answer:
{
  "type": "long",
  "question_text": "the question",
  "correct_answer": "the expected detailed answer (a full paragraph)",
  "marks": 5,
  "difficulty": "medium|hard"
}

Make questions age-appropriate for a 10-11 year old. Use simple language.
Mix difficulty levels across questions.
Ensure questions cover different parts of the content.

Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  const text = response.content[0].text.trim();
  // Extract JSON from response (handle possible markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse questions from AI response');
  }
  return JSON.parse(jsonMatch[0]);
}

/**
 * Evaluate a student's answer using Claude
 */
async function evaluateAnswer(question, studentAnswer, correctAnswer, maxMarks) {
  if (!studentAnswer || studentAnswer.trim() === '') {
    return {
      score: 0,
      feedback: 'No answer provided.',
      isCorrect: false,
    };
  }

  // For MCQ, do exact match
  if (question.type === 'mcq') {
    const isCorrect =
      studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    return {
      score: isCorrect ? maxMarks : 0,
      feedback: isCorrect
        ? 'Correct!'
        : `Incorrect. The correct answer is: ${correctAnswer}`,
      isCorrect,
    };
  }

  // For short and long answers, use Claude for evaluation
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a kind and encouraging CBSE Grade 5 teacher evaluating a student's answer.

QUESTION: ${question.question_text}
QUESTION TYPE: ${question.type === 'short' ? 'Short Answer' : 'Long Answer'}
MAXIMUM MARKS: ${maxMarks}
EXPECTED ANSWER: ${correctAnswer}
STUDENT'S ANSWER: ${studentAnswer}

Evaluate the student's answer and provide:
1. A score out of ${maxMarks} (can be partial marks like 1.5)
2. Brief, encouraging feedback suitable for a 10-11 year old
3. Whether the answer captures the key concepts

Return your response as JSON:
{
  "score": <number>,
  "feedback": "<encouraging feedback>",
  "isCorrect": <true if score >= ${maxMarks * 0.5}>
}

Be generous with partial marks if the student shows understanding.
Always encourage the student even if the answer is wrong.

Return ONLY the JSON, no other text.`,
      },
    ],
  });

  const text = response.content[0].text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse evaluation from AI response');
  }
  return JSON.parse(jsonMatch[0]);
}

module.exports = {
  extractTextFromImage,
  generateQuestions,
  evaluateAnswer,
};

// API helper module
const API = {
  async request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },

  // Auth
  login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getUsers() {
    return this.request('/api/auth/users');
  },

  // Subjects
  getSubjects() {
    return this.request('/api/subjects');
  },

  // Chapters
  getChapters(subjectId) {
    const qs = subjectId ? `?subject_id=${subjectId}` : '';
    return this.request(`/api/chapters${qs}`);
  },

  getChapter(id) {
    return this.request(`/api/chapters/${id}`);
  },

  async scanTextbook(formData) {
    const res = await fetch('/api/chapters/scan', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  // Questions
  getQuestions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/questions?${qs}`);
  },

  updateQuestion(id, data) {
    return this.request(`/api/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteQuestion(id) {
    return this.request(`/api/questions/${id}`, { method: 'DELETE' });
  },

  approveAllQuestions(chapterId) {
    return this.request('/api/questions/approve-all', {
      method: 'POST',
      body: JSON.stringify({ chapter_id: chapterId }),
    });
  },

  // Tests
  getTests(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/tests?${qs}`);
  },

  getTest(id) {
    return this.request(`/api/tests/${id}`);
  },

  createTest(data) {
    return this.request('/api/tests', { method: 'POST', body: JSON.stringify(data) });
  },

  publishTest(id, assignedTo) {
    return this.request(`/api/tests/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ assigned_to: assignedTo }),
    });
  },

  startTest(testId, studentId) {
    return this.request(`/api/tests/${testId}/start`, {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId }),
    });
  },

  submitTest(attemptId, answers) {
    return this.request(`/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  },

  getAttemptResults(attemptId) {
    return this.request(`/api/attempts/${attemptId}/results`);
  },

  getTestAttempts(testId) {
    return this.request(`/api/tests/${testId}/attempts`);
  },

  // Stats
  getParentStats() {
    return this.request('/api/stats/parent');
  },

  getStudentStats(studentId) {
    return this.request(`/api/stats/student?student_id=${studentId}`);
  },
};

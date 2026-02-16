// ============ State ============
let currentUser = null;
let currentView = 'dashboard';
let viewParams = {};

// ============ Router ============
function navigate(view, params = {}) {
  currentView = view;
  viewParams = params;
  render();
}

// ============ Render Entry ============
function render() {
  const app = document.getElementById('app');
  if (!currentUser) {
    app.innerHTML = renderLogin();
    attachLoginEvents();
    return;
  }

  app.innerHTML = `
    <div class="app-container">
      ${renderSidebar()}
      <div class="main-content" id="main-content">
        ${renderCurrentView()}
      </div>
    </div>
  `;
  attachSidebarEvents();
  attachViewEvents();
}

// ============ Login ============
function renderLogin() {
  return `
    <div class="login-container">
      <div class="login-card">
        <div class="app-icon">&#128218;</div>
        <h1>CBSE Learning App</h1>
        <p class="subtitle">Grade 5 - Powered by AI</p>
        <form id="login-form">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="login-username" placeholder="parent or student" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-password" placeholder="Enter password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Login</button>
          <p class="mt-4" style="font-size: 12px; color: var(--text-light);">
            Default accounts: parent/parent123 &bull; student/student123
          </p>
        </form>
      </div>
    </div>
  `;
}

function attachLoginEvents() {
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    try {
      const { user } = await API.login(username, password);
      currentUser = user;
      currentView = 'dashboard';
      render();
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  });
}

// ============ Sidebar ============
function renderSidebar() {
  const isParent = currentUser.role === 'parent';
  const menuItems = isParent
    ? [
        { view: 'dashboard', icon: '&#127968;', label: 'Dashboard' },
        { view: 'scan', icon: '&#128247;', label: 'Scan Textbook' },
        { view: 'chapters', icon: '&#128214;', label: 'Chapters' },
        { view: 'questions', icon: '&#10067;', label: 'Question Bank' },
        { view: 'create-test', icon: '&#128221;', label: 'Create Test' },
        { view: 'tests', icon: '&#128203;', label: 'All Tests' },
      ]
    : [
        { view: 'dashboard', icon: '&#127968;', label: 'My Dashboard' },
        { view: 'my-tests', icon: '&#128203;', label: 'My Tests' },
        { view: 'my-results', icon: '&#127942;', label: 'My Results' },
      ];

  return `
    <div class="sidebar">
      <div class="sidebar-header">
        <h2>&#128218; CBSE Grade 5</h2>
        <p>Welcome, ${currentUser.name}</p>
        <span class="role-badge ${currentUser.role}">${currentUser.role}</span>
      </div>
      <ul class="nav-menu">
        ${menuItems
          .map(
            (item) => `
          <li>
            <a href="#" data-view="${item.view}" class="${currentView === item.view ? 'active' : ''}">
              <span class="icon">${item.icon}</span>
              ${item.label}
            </a>
          </li>
        `
          )
          .join('')}
      </ul>
      <div class="sidebar-footer">
        <a href="#" id="logout-btn">Logout</a>
      </div>
    </div>
  `;
}

function attachSidebarEvents() {
  document.querySelectorAll('.nav-menu a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(a.dataset.view);
    });
  });
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    currentUser = null;
    navigate('dashboard');
  });
}

// ============ View Router ============
function renderCurrentView() {
  if (currentUser.role === 'parent') {
    switch (currentView) {
      case 'dashboard': return renderParentDashboard();
      case 'scan': return renderScanPage();
      case 'chapters': return renderChaptersPage();
      case 'questions': return renderQuestionsPage();
      case 'create-test': return renderCreateTestPage();
      case 'tests': return renderTestsPage();
      case 'review-questions': return renderReviewQuestionsPage();
      case 'test-results': return renderTestResultsView();
      default: return renderParentDashboard();
    }
  } else {
    switch (currentView) {
      case 'dashboard': return renderStudentDashboard();
      case 'my-tests': return renderMyTestsPage();
      case 'take-test': return renderTakeTestPage();
      case 'test-result': return renderTestResultPage();
      case 'my-results': return renderMyResultsPage();
      default: return renderStudentDashboard();
    }
  }
}

function attachViewEvents() {
  // Attach view-specific events after render
  if (currentUser.role === 'parent') {
    switch (currentView) {
      case 'dashboard': attachParentDashboardEvents(); break;
      case 'scan': attachScanEvents(); break;
      case 'chapters': attachChaptersEvents(); break;
      case 'questions': attachQuestionsEvents(); break;
      case 'create-test': attachCreateTestEvents(); break;
      case 'tests': attachTestsEvents(); break;
      case 'review-questions': attachReviewQuestionsEvents(); break;
      case 'test-results': attachTestResultsEvents(); break;
    }
  } else {
    switch (currentView) {
      case 'dashboard': attachStudentDashboardEvents(); break;
      case 'my-tests': attachMyTestsEvents(); break;
      case 'take-test': attachTakeTestEvents(); break;
      case 'test-result': attachTestResultEvents(); break;
      case 'my-results': attachMyResultsEvents(); break;
    }
  }
}

// ============ PARENT VIEWS ============

// -- Parent Dashboard --
function renderParentDashboard() {
  return `
    <div class="page-header"><h1>&#127968; Parent Dashboard</h1></div>
    <div class="stats-grid" id="parent-stats">
      <div class="stat-card"><div class="stat-icon">&#128247;</div><div class="stat-value">-</div><div class="stat-label">Chapters Scanned</div></div>
      <div class="stat-card"><div class="stat-icon">&#10067;</div><div class="stat-value">-</div><div class="stat-label">Questions Generated</div></div>
      <div class="stat-card"><div class="stat-icon">&#128203;</div><div class="stat-value">-</div><div class="stat-label">Tests Created</div></div>
      <div class="stat-card"><div class="stat-icon">&#9989;</div><div class="stat-value">-</div><div class="stat-label">Tests Completed</div></div>
      <div class="stat-card"><div class="stat-icon">&#127942;</div><div class="stat-value">-</div><div class="stat-label">Average Score</div></div>
    </div>
    <div class="card">
      <h3>Quick Actions</h3>
      <div class="flex-row flex-wrap mt-4">
        <button class="btn btn-primary" onclick="navigate('scan')">&#128247; Scan Textbook</button>
        <button class="btn btn-success" onclick="navigate('create-test')">&#128221; Create Test</button>
        <button class="btn btn-secondary" onclick="navigate('questions')">&#10067; Question Bank</button>
      </div>
    </div>
  `;
}

async function attachParentDashboardEvents() {
  try {
    const stats = await API.getParentStats();
    const cards = document.querySelectorAll('.stat-card .stat-value');
    if (cards.length >= 5) {
      cards[0].textContent = stats.totalChapters;
      cards[1].textContent = stats.totalQuestions;
      cards[2].textContent = stats.totalTests;
      cards[3].textContent = stats.completedTests;
      cards[4].textContent = stats.averageScore + '%';
    }
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

// -- Scan Textbook --
function renderScanPage() {
  return `
    <div class="page-header"><h1>&#128247; Scan Textbook Page</h1></div>
    <div class="card">
      <form id="scan-form">
        <div class="form-group">
          <label>Subject</label>
          <select id="scan-subject" required>
            <option value="">Select Subject</option>
          </select>
        </div>
        <div class="form-group">
          <label>Chapter Name</label>
          <input type="text" id="scan-chapter" placeholder="e.g., Chapter 3 - Fractions" required>
        </div>
        <div class="form-group">
          <label>Textbook Page Image</label>
          <div class="upload-area" id="upload-area">
            <div class="upload-icon">&#128247;</div>
            <p>Click or drag an image of the textbook page</p>
            <p class="file-name" id="file-name-display"></p>
            <input type="file" id="scan-file" accept="image/*" style="display:none">
            <img id="image-preview" class="image-preview" style="display:none">
          </div>
        </div>
        <div class="flex-row flex-wrap">
          <div class="form-group">
            <label>MCQ Questions</label>
            <input type="number" id="mcq-count" value="5" min="1" max="15" style="width:80px">
          </div>
          <div class="form-group">
            <label>Short Answer</label>
            <input type="number" id="short-count" value="3" min="1" max="10" style="width:80px">
          </div>
          <div class="form-group">
            <label>Long Answer</label>
            <input type="number" id="long-count" value="2" min="1" max="5" style="width:80px">
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="scan-btn">
          &#9889; Scan & Generate Questions
        </button>
      </form>
    </div>
  `;
}

async function attachScanEvents() {
  // Load subjects
  const subjects = await API.getSubjects();
  const select = document.getElementById('scan-subject');
  subjects.forEach((s) => {
    select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
  });

  // File upload
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('scan-file');
  const preview = document.getElementById('image-preview');
  const fileName = document.getElementById('file-name-display');

  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      showPreview(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) showPreview(fileInput.files[0]);
  });

  function showPreview(file) {
    fileName.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  // Submit
  document.getElementById('scan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) return alert('Please select a textbook image');

    const btn = document.getElementById('scan-btn');
    btn.disabled = true;
    btn.textContent = 'Scanning & generating questions... This may take a moment';
    showLoading('Analyzing textbook page with AI...');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('subject_id', document.getElementById('scan-subject').value);
      formData.append('chapter_name', document.getElementById('scan-chapter').value);
      formData.append('mcq_count', document.getElementById('mcq-count').value);
      formData.append('short_count', document.getElementById('short-count').value);
      formData.append('long_count', document.getElementById('long-count').value);

      const result = await API.scanTextbook(formData);
      hideLoading();

      alert(`Generated ${result.questions.length} questions from the textbook page!`);
      navigate('review-questions', { chapter_id: result.chapter.id });
    } catch (err) {
      hideLoading();
      btn.disabled = false;
      btn.textContent = 'Scan & Generate Questions';
      alert('Error: ' + err.message);
    }
  });
}

// -- Chapters --
function renderChaptersPage() {
  return `
    <div class="page-header">
      <h1>&#128214; Scanned Chapters</h1>
      <button class="btn btn-primary" onclick="navigate('scan')">&#128247; Scan New</button>
    </div>
    <div id="chapters-list">
      <div class="text-center mt-4"><div class="spinner" style="margin:0 auto"></div></div>
    </div>
  `;
}

async function attachChaptersEvents() {
  try {
    const chapters = await API.getChapters();
    const container = document.getElementById('chapters-list');
    if (chapters.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#128214;</div>
          <h3>No chapters scanned yet</h3>
          <p>Scan a textbook page to get started</p>
          <button class="btn btn-primary mt-4" onclick="navigate('scan')">Scan Textbook</button>
        </div>
      `;
      return;
    }
    container.innerHTML = chapters.map((ch) => `
      <div class="test-list-item">
        <div class="test-info">
          <h4>${ch.name}</h4>
          <p>${ch.subject_name} &bull; ${ch.question_count} questions &bull; ${new Date(ch.created_at).toLocaleDateString()}</p>
        </div>
        <div class="flex-row">
          <button class="btn btn-primary btn-sm" onclick="navigate('review-questions', { chapter_id: '${ch.id}' })">Review Questions</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('chapters-list').innerHTML = '<p>Error loading chapters</p>';
  }
}

// -- Review Questions (for a chapter) --
function renderReviewQuestionsPage() {
  return `
    <div class="page-header">
      <h1>&#10067; Review Questions</h1>
      <div class="flex-row">
        <button class="btn btn-success btn-sm" id="approve-all-btn">&#9989; Approve All</button>
        <button class="btn btn-secondary btn-sm" onclick="navigate('chapters')">Back</button>
      </div>
    </div>
    <div id="chapter-info" class="card mb-4"></div>
    <div id="review-questions-list">
      <div class="text-center mt-4"><div class="spinner" style="margin:0 auto"></div></div>
    </div>
  `;
}

async function attachReviewQuestionsEvents() {
  const chapterId = viewParams.chapter_id;
  if (!chapterId) return navigate('chapters');

  try {
    const [chapter, questions] = await Promise.all([
      API.getChapter(chapterId),
      API.getQuestions({ chapter_id: chapterId }),
    ]);

    document.getElementById('chapter-info').innerHTML = `
      <h3>${chapter.name}</h3>
      <p style="color:var(--text-light)">${chapter.subject_name} &bull; ${questions.length} questions</p>
      ${chapter.image_path ? `<img src="${chapter.image_path}" class="image-preview" alt="Textbook scan">` : ''}
    `;

    renderQuestionsList('review-questions-list', questions, true);

    document.getElementById('approve-all-btn').addEventListener('click', async () => {
      await API.approveAllQuestions(chapterId);
      alert('All questions approved!');
      navigate('review-questions', { chapter_id: chapterId });
    });
  } catch (e) {
    document.getElementById('review-questions-list').innerHTML = '<p>Error loading questions</p>';
  }
}

// -- Question Bank --
function renderQuestionsPage() {
  return `
    <div class="page-header">
      <h1>&#10067; Question Bank</h1>
    </div>
    <div class="card mb-4">
      <div class="flex-row flex-wrap">
        <div class="form-group">
          <label>Filter by Chapter</label>
          <select id="filter-chapter"><option value="">All Chapters</option></select>
        </div>
        <div class="form-group">
          <label>Filter by Type</label>
          <select id="filter-type">
            <option value="">All Types</option>
            <option value="mcq">MCQ</option>
            <option value="short">Short Answer</option>
            <option value="long">Long Answer</option>
          </select>
        </div>
      </div>
    </div>
    <div id="questions-list">
      <div class="text-center mt-4"><div class="spinner" style="margin:0 auto"></div></div>
    </div>
  `;
}

async function attachQuestionsEvents() {
  const chapters = await API.getChapters();
  const chapterSelect = document.getElementById('filter-chapter');
  chapters.forEach((ch) => {
    chapterSelect.innerHTML += `<option value="${ch.id}">${ch.name} (${ch.subject_name})</option>`;
  });

  async function loadQuestions() {
    const params = {};
    const chId = document.getElementById('filter-chapter').value;
    const type = document.getElementById('filter-type').value;
    if (chId) params.chapter_id = chId;
    if (type) params.type = type;

    const questions = await API.getQuestions(params);
    renderQuestionsList('questions-list', questions, true);
  }

  document.getElementById('filter-chapter').addEventListener('change', loadQuestions);
  document.getElementById('filter-type').addEventListener('change', loadQuestions);
  loadQuestions();
}

function renderQuestionsList(containerId, questions, showActions) {
  const container = document.getElementById(containerId);
  if (questions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#10067;</div>
        <h3>No questions found</h3>
      </div>
    `;
    return;
  }

  container.innerHTML = questions.map((q, i) => `
    <div class="question-card ${q.type}">
      <div class="q-header">
        <span>Q${i + 1}.</span>
        <div class="flex-row">
          <span class="q-type ${q.type}">${q.type.toUpperCase()}</span>
          ${q.approved ? '<span class="status-badge completed">Approved</span>' : '<span class="status-badge draft">Pending</span>'}
        </div>
      </div>
      <div class="q-text">${q.question_text}</div>
      ${q.type === 'mcq' && q.options ? `
        <ul class="options-list">
          ${q.options.map((opt) => `
            <li class="${opt === q.correct_answer ? 'correct' : ''}">${opt} ${opt === q.correct_answer ? '&#9989;' : ''}</li>
          `).join('')}
        </ul>
      ` : `
        <div class="q-answer"><strong>Answer:</strong> ${q.correct_answer}</div>
      `}
      <div class="q-meta">
        <span>Marks: ${q.marks}</span>
        <span>Difficulty: ${q.difficulty}</span>
        ${q.chapter_name ? `<span>${q.chapter_name}</span>` : ''}
      </div>
      ${showActions ? `
        <div class="q-actions">
          ${!q.approved ? `<button class="btn btn-success btn-sm" onclick="approveQuestion('${q.id}')">Approve</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${q.id}')">Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Global actions for questions
window.approveQuestion = async (id) => {
  await API.updateQuestion(id, { approved: 1 });
  attachViewEvents(); // Reload
};

window.deleteQuestion = async (id) => {
  if (!confirm('Delete this question?')) return;
  await API.deleteQuestion(id);
  attachViewEvents();
};

// -- Create Test --
function renderCreateTestPage() {
  return `
    <div class="page-header"><h1>&#128221; Create Test</h1></div>
    <div class="card">
      <form id="create-test-form">
        <div class="form-group">
          <label>Test Title</label>
          <input type="text" id="test-title" placeholder="e.g., Math Chapter 3 Test" required>
        </div>
        <div class="form-group">
          <label>Select Chapter</label>
          <select id="test-chapter" required>
            <option value="">Select Chapter</option>
          </select>
        </div>
        <div class="form-group">
          <label>Time Limit (minutes)</label>
          <input type="number" id="test-time" value="60" min="10" max="180">
        </div>
        <div class="form-group">
          <label>Select Questions</label>
          <div id="question-selection">
            <p style="color:var(--text-light)">Select a chapter first to see available questions</p>
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="create-test-btn" disabled>
          Create Test
        </button>
      </form>
    </div>
  `;
}

async function attachCreateTestEvents() {
  const chapters = await API.getChapters();
  const chapterSelect = document.getElementById('test-chapter');
  chapters.forEach((ch) => {
    chapterSelect.innerHTML += `<option value="${ch.id}" data-subject="${ch.subject_id}">${ch.name} (${ch.subject_name}) - ${ch.question_count} questions</option>`;
  });

  chapterSelect.addEventListener('change', async () => {
    const chapterId = chapterSelect.value;
    if (!chapterId) return;

    const questions = await API.getQuestions({ chapter_id: chapterId, approved: 1 });
    const container = document.getElementById('question-selection');

    if (questions.length === 0) {
      container.innerHTML = '<p style="color:var(--text-light)">No approved questions for this chapter. Please approve questions first.</p>';
      document.getElementById('create-test-btn').disabled = true;
      return;
    }

    container.innerHTML = `
      <div class="mb-4">
        <button type="button" class="btn btn-sm btn-secondary" id="select-all-btn">Select All</button>
      </div>
      <div class="checkbox-group">
        ${questions.map((q) => `
          <label>
            <input type="checkbox" name="question" value="${q.id}" data-marks="${q.marks}">
            <span class="q-type ${q.type}">${q.type}</span>
            ${q.question_text.substring(0, 60)}... (${q.marks}m)
          </label>
        `).join('')}
      </div>
      <p class="mt-2" style="font-size:13px;color:var(--text-light)">Selected: <span id="selected-count">0</span> questions, <span id="selected-marks">0</span> marks</p>
    `;

    document.getElementById('select-all-btn').addEventListener('click', () => {
      document.querySelectorAll('input[name="question"]').forEach((cb) => (cb.checked = true));
      updateSelectionCount();
    });

    document.querySelectorAll('input[name="question"]').forEach((cb) => {
      cb.addEventListener('change', updateSelectionCount);
    });

    document.getElementById('create-test-btn').disabled = false;
  });

  function updateSelectionCount() {
    const checked = document.querySelectorAll('input[name="question"]:checked');
    document.getElementById('selected-count').textContent = checked.length;
    let totalMarks = 0;
    checked.forEach((cb) => (totalMarks += parseInt(cb.dataset.marks)));
    document.getElementById('selected-marks').textContent = totalMarks;
  }

  document.getElementById('create-test-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const selected = [...document.querySelectorAll('input[name="question"]:checked')].map((cb) => cb.value);
    if (selected.length === 0) return alert('Please select at least one question');

    const chapterOpt = chapterSelect.options[chapterSelect.selectedIndex];

    try {
      const test = await API.createTest({
        title: document.getElementById('test-title').value,
        chapter_id: chapterSelect.value,
        subject_id: chapterOpt.dataset.subject,
        created_by: currentUser.id,
        question_ids: selected,
        time_limit_minutes: parseInt(document.getElementById('test-time').value),
      });

      // Ask to publish immediately
      if (confirm('Test created! Would you like to publish it to the student now?')) {
        const users = await API.getUsers();
        const student = users.find((u) => u.role === 'student');
        if (student) {
          await API.publishTest(test.id, student.id);
          alert('Test published to student!');
        }
      }
      navigate('tests');
    } catch (err) {
      alert('Error creating test: ' + err.message);
    }
  });
}

// -- Tests List (Parent) --
function renderTestsPage() {
  return `
    <div class="page-header">
      <h1>&#128203; All Tests</h1>
      <button class="btn btn-primary" onclick="navigate('create-test')">&#128221; Create Test</button>
    </div>
    <div id="tests-list">
      <div class="text-center mt-4"><div class="spinner" style="margin:0 auto"></div></div>
    </div>
  `;
}

async function attachTestsEvents() {
  try {
    const tests = await API.getTests();
    const container = document.getElementById('tests-list');
    if (tests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#128203;</div>
          <h3>No tests created yet</h3>
          <button class="btn btn-primary mt-4" onclick="navigate('create-test')">Create First Test</button>
        </div>
      `;
      return;
    }

    container.innerHTML = tests.map((t) => `
      <div class="test-list-item">
        <div class="test-info">
          <h4>${t.title}</h4>
          <p>${t.subject_name || ''} ${t.chapter_name ? '- ' + t.chapter_name : ''} &bull; ${t.question_count} questions &bull; ${t.total_marks} marks</p>
          ${t.assignee_name ? `<p>Assigned to: ${t.assignee_name}</p>` : ''}
        </div>
        <div class="flex-row">
          <span class="status-badge ${t.status}">${t.status.replace('_', ' ')}</span>
          ${t.status === 'draft' ? `<button class="btn btn-success btn-sm" onclick="publishTest('${t.id}')">Publish</button>` : ''}
          ${t.status === 'completed' ? `<button class="btn btn-primary btn-sm" onclick="viewTestResults('${t.id}')">View Results</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('tests-list').innerHTML = '<p>Error loading tests</p>';
  }
}

window.publishTest = async (testId) => {
  try {
    const users = await API.getUsers();
    const student = users.find((u) => u.role === 'student');
    if (!student) return alert('No student user found');
    await API.publishTest(testId, student.id);
    alert('Test published!');
    navigate('tests');
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

window.viewTestResults = (testId) => {
  navigate('test-results', { test_id: testId });
};

// -- Test Results (Parent View) --
function renderTestResultsView() {
  return `
    <div class="page-header">
      <h1>&#127942; Test Results</h1>
      <button class="btn btn-secondary" onclick="navigate('tests')">Back to Tests</button>
    </div>
    <div id="test-results-content">
      <div class="text-center mt-4"><div class="spinner" style="margin:0 auto"></div></div>
    </div>
  `;
}

async function attachTestResultsEvents() {
  const testId = viewParams.test_id;
  if (!testId) return navigate('tests');

  try {
    const attempts = await API.getTestAttempts(testId);
    const container = document.getElementById('test-results-content');

    if (attempts.length === 0) {
      container.innerHTML = '<p>No attempts yet.</p>';
      return;
    }

    const attempt = attempts[0]; // Most recent
    const results = await API.getAttemptResults(attempt.id);

    const pct = results.percentage;
    const scoreClass = pct >= 80 ? 'excellent' : pct >= 60 ? 'good' : pct >= 40 ? 'average' : 'needs-work';

    container.innerHTML = `
      <div class="result-summary">
        <div class="score-circle ${scoreClass}">
          ${pct}%
          <span class="score-label">Score</span>
        </div>
        <h2>${results.test_title}</h2>
        <p>Student: ${results.student_name} &bull; Score: ${results.total_score}/${results.max_score}</p>
      </div>
      ${results.answers.map((a, i) => {
        const cls = a.score >= a.max_score ? 'correct' : a.score > 0 ? 'partial' : 'incorrect';
        return `
          <div class="result-question ${cls}">
            <div class="q-header">
              <span><strong>Q${i + 1}.</strong> <span class="q-type ${a.type}">${a.type.toUpperCase()}</span></span>
              <span>${a.score}/${a.max_score} marks</span>
            </div>
            <div class="q-text">${a.question_text}</div>
            <p class="mt-2"><strong>Student's Answer:</strong> ${a.student_answer || '<em>No answer</em>'}</p>
            <p><strong>Correct Answer:</strong> ${a.correct_answer}</p>
            <div class="feedback">${a.ai_feedback}</div>
          </div>
        `;
      }).join('')}
    `;
  } catch (e) {
    document.getElementById('test-results-content').innerHTML = '<p>Error loading results: ' + e.message + '</p>';
  }
}

// ============ STUDENT VIEWS ============

// -- Student Dashboard --
function renderStudentDashboard() {
  return `
    <div class="page-header"><h1>&#127968; My Dashboard</h1></div>
    <div class="stats-grid" id="student-stats">
      <div class="stat-card"><div class="stat-icon">&#128203;</div><div class="stat-value">-</div><div class="stat-label">Pending Tests</div></div>
      <div class="stat-card"><div class="stat-icon">&#9989;</div><div class="stat-value">-</div><div class="stat-label">Completed Tests</div></div>
      <div class="stat-card"><div class="stat-icon">&#127942;</div><div class="stat-value">-</div><div class="stat-label">Average Score</div></div>
    </div>
    <div class="card">
      <h3>Recent Results</h3>
      <div id="recent-results" class="mt-4"></div>
    </div>
  `;
}

async function attachStudentDashboardEvents() {
  try {
    const stats = await API.getStudentStats(currentUser.id);
    const cards = document.querySelectorAll('.stat-card .stat-value');
    if (cards.length >= 3) {
      cards[0].textContent = stats.pendingTests;
      cards[1].textContent = stats.completedTests;
      cards[2].textContent = stats.averageScore + '%';
    }

    const resultsDiv = document.getElementById('recent-results');
    if (stats.recentResults.length === 0) {
      resultsDiv.innerHTML = '<p style="color:var(--text-light)">No test results yet. Take your first test!</p>';
    } else {
      resultsDiv.innerHTML = stats.recentResults.map((r) => {
        const pct = r.percentage;
        const scoreClass = pct >= 80 ? 'excellent' : pct >= 60 ? 'good' : pct >= 40 ? 'average' : 'needs-work';
        return `
          <div class="test-list-item">
            <div class="test-info">
              <h4>${r.test_title}</h4>
              <p>${new Date(r.completed_at).toLocaleDateString()}</p>
            </div>
            <div class="score-circle ${scoreClass}" style="width:48px;height:48px;font-size:14px">
              ${pct}%
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (e) {
    console.error('Failed to load student stats:', e);
  }
}

// -- My Tests --
function renderMyTestsPage() {
  return `
    <div class="page-header"><h1>&#128203; My Tests</h1></div>
    <div id="my-tests-list">
      <div class="text-center mt-4"><div class="spinner" style="margin:0 auto"></div></div>
    </div>
  `;
}

async function attachMyTestsEvents() {
  try {
    const tests = await API.getTests({ assigned_to: currentUser.id, status: 'published' });
    const container = document.getElementById('my-tests-list');

    if (tests.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#128203;</div>
          <h3>No pending tests</h3>
          <p>Your parent hasn't assigned any tests yet. Check back later!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tests.map((t) => `
      <div class="test-list-item">
        <div class="test-info">
          <h4>${t.title}</h4>
          <p>${t.subject_name || ''} &bull; ${t.question_count} questions &bull; ${t.total_marks} marks &bull; ${t.time_limit_minutes} min</p>
        </div>
        <button class="btn btn-primary" onclick="startTest('${t.id}')">Start Test</button>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('my-tests-list').innerHTML = '<p>Error loading tests</p>';
  }
}

window.startTest = (testId) => {
  navigate('take-test', { test_id: testId });
};

// -- Take Test --
function renderTakeTestPage() {
  return `
    <div id="test-content">
      <div class="text-center mt-4"><div class="spinner" style="margin:0 auto"></div></div>
      <p class="text-center mt-2">Loading test...</p>
    </div>
  `;
}

async function attachTakeTestEvents() {
  const testId = viewParams.test_id;
  if (!testId) return navigate('my-tests');

  try {
    const test = await API.getTest(testId);
    const attempt = await API.startTest(testId, currentUser.id);
    const container = document.getElementById('test-content');

    container.innerHTML = `
      <div class="test-header">
        <h2>${test.title}</h2>
        <div class="test-meta">
          <span>&#128203; ${test.questions.length} Questions</span>
          <span>&#127942; ${test.total_marks} Marks</span>
          <span>&#9200; ${test.time_limit_minutes} Minutes</span>
        </div>
      </div>
      <form id="test-form">
        ${test.questions.map((q, i) => `
          <div class="test-question" data-question-id="${q.id}">
            <span class="q-marks">${q.marks} mark${q.marks > 1 ? 's' : ''}</span>
            <span class="q-number">${i + 1}</span>
            <span class="q-type ${q.type}">${q.type.toUpperCase()}</span>
            <div class="q-text mt-2">${q.question_text}</div>
            ${q.type === 'mcq' ? `
              <ul class="mcq-options">
                ${q.options.map((opt, j) => `
                  <li>
                    <label>
                      <input type="radio" name="answer-${q.id}" value="${opt}">
                      <span>${opt}</span>
                    </label>
                  </li>
                `).join('')}
              </ul>
            ` : q.type === 'short' ? `
              <div class="form-group mt-2">
                <textarea name="answer-${q.id}" rows="3" placeholder="Write your short answer here..."></textarea>
              </div>
            ` : `
              <div class="form-group mt-2">
                <textarea name="answer-${q.id}" rows="6" placeholder="Write your detailed answer here..."></textarea>
              </div>
            `}
          </div>
        `).join('')}
        <button type="submit" class="btn btn-success btn-block" style="font-size:18px;padding:16px" id="submit-test-btn">
          &#9989; Submit Test
        </button>
      </form>
    `;

    document.getElementById('test-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!confirm('Are you sure you want to submit? You cannot change your answers after submission.')) return;

      const answers = test.questions.map((q) => {
        let answer = '';
        if (q.type === 'mcq') {
          const selected = document.querySelector(`input[name="answer-${q.id}"]:checked`);
          answer = selected ? selected.value : '';
        } else {
          const textarea = document.querySelector(`textarea[name="answer-${q.id}"]`);
          answer = textarea ? textarea.value : '';
        }
        return { question_id: q.id, answer };
      });

      const btn = document.getElementById('submit-test-btn');
      btn.disabled = true;
      showLoading('Evaluating your answers with AI...');

      try {
        const results = await API.submitTest(attempt.id, answers);
        hideLoading();
        navigate('test-result', { attempt_id: attempt.id, results });
      } catch (err) {
        hideLoading();
        btn.disabled = false;
        alert('Error submitting: ' + err.message);
      }
    });
  } catch (e) {
    document.getElementById('test-content').innerHTML = '<p>Error loading test: ' + e.message + '</p>';
  }
}

// -- Test Result (Student) --
function renderTestResultPage() {
  const results = viewParams.results;
  if (!results) {
    return `<div class="text-center mt-4"><div class="spinner" style="margin:0 auto"></div></div>`;
  }

  const pct = results.percentage;
  const scoreClass = pct >= 80 ? 'excellent' : pct >= 60 ? 'good' : pct >= 40 ? 'average' : 'needs-work';
  const message = pct >= 80 ? 'Excellent work! Keep it up!' :
    pct >= 60 ? 'Good job! You\'re doing well!' :
    pct >= 40 ? 'Not bad! Keep practicing!' : 'Don\'t worry! Practice makes perfect!';

  return `
    <div class="page-header">
      <h1>&#127942; Test Results</h1>
      <button class="btn btn-secondary" onclick="navigate('my-tests')">Back to Tests</button>
    </div>
    <div class="result-summary">
      <div class="score-circle ${scoreClass}">
        ${pct}%
        <span class="score-label">Score</span>
      </div>
      <h2>${results.total_score} / ${results.max_score}</h2>
      <p style="font-size:18px;margin-top:8px">${message}</p>
    </div>
    ${results.results.map((r, i) => {
      const cls = r.score >= r.max_score ? 'correct' : r.score > 0 ? 'partial' : 'incorrect';
      return `
        <div class="result-question ${cls}">
          <div class="q-header">
            <span><strong>Q${i + 1}.</strong> <span class="q-type ${r.type}">${r.type.toUpperCase()}</span></span>
            <span>${r.score}/${r.max_score} marks</span>
          </div>
          <div class="q-text">${r.question_text}</div>
          <p class="mt-2"><strong>Your Answer:</strong> ${r.student_answer || '<em>No answer given</em>'}</p>
          ${!r.is_correct ? `<p><strong>Correct Answer:</strong> ${r.correct_answer}</p>` : ''}
          <div class="feedback">${r.feedback}</div>
        </div>
      `;
    }).join('')}
    <div class="text-center mt-4">
      <button class="btn btn-primary" onclick="navigate('my-tests')">Take More Tests</button>
    </div>
  `;
}

function attachTestResultEvents() {}

// -- My Results --
function renderMyResultsPage() {
  return `
    <div class="page-header"><h1>&#127942; My Results</h1></div>
    <div id="all-results">
      <div class="text-center mt-4"><div class="spinner" style="margin:0 auto"></div></div>
    </div>
  `;
}

async function attachMyResultsEvents() {
  try {
    const stats = await API.getStudentStats(currentUser.id);
    const container = document.getElementById('all-results');

    if (stats.recentResults.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#127942;</div>
          <h3>No results yet</h3>
          <p>Complete a test to see your results here!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="card mb-4">
        <h3>Overall Average: ${stats.averageScore}%</h3>
        <p style="color:var(--text-light)">${stats.completedTests} tests completed</p>
      </div>
      ${stats.recentResults.map((r) => {
        const pct = r.percentage;
        const scoreClass = pct >= 80 ? 'excellent' : pct >= 60 ? 'good' : pct >= 40 ? 'average' : 'needs-work';
        return `
          <div class="test-list-item">
            <div class="test-info">
              <h4>${r.test_title}</h4>
              <p>Score: ${r.total_score}/${r.max_score} &bull; ${new Date(r.completed_at).toLocaleDateString()}</p>
            </div>
            <div class="score-circle ${scoreClass}" style="width:56px;height:56px;font-size:16px">
              ${pct}%
            </div>
          </div>
        `;
      }).join('')}
    `;
  } catch (e) {
    document.getElementById('all-results').innerHTML = '<p>Error loading results</p>';
  }
}

// ============ Loading Overlay ============
function showLoading(message) {
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.id = 'loading-overlay';
  overlay.innerHTML = `<div class="spinner"></div><p>${message || 'Loading...'}</p>`;
  document.body.appendChild(overlay);
}

function hideLoading() {
  document.getElementById('loading-overlay')?.remove();
}

// ============ Initialize ============
render();

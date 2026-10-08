(() => {
  'use strict';

  const LANG = { name: 'Vietnamese', flag: '🇻🇳', speech: 'vi-VN', hello: 'Xin chào!', helloMeaning: 'Hello!' };
  const VOCAB = Array.isArray(window.VIETNAMESE_VOCAB) ? window.VIETNAMESE_VOCAB : [];
  const CATEGORIES = Array.isArray(window.VIETNAMESE_CATEGORIES) ? window.VIETNAMESE_CATEGORIES : [];
  const CATEGORY_LOOKUP = Object.fromEntries(CATEGORIES.map(category => [category.id, category]));
  const STORAGE_KEY = 'littleLinguaVietnameseV1';
  const PAGE_SIZE = 48;
  const initialState = { language: 'vi', known: [], stars: 0, minutes: 0, streak: 1, goal: 10, nickname: 'Sunny', practiceDays: [] };
  let state = loadState();
  let activeCategory = 'all';
  let searchTerm = '';
  let showKnownOnly = false;
  let currentPage = 1;
  let currentQuestion = null;
  let questionAnswered = false;
  let storyPage = 0;
  let toastTimer = null;
  let spotlightWord = VOCAB[0] || null;

  const STORIES = [
    '<p>Luna thức dậy vào một ngày nắng đẹp. Cô thỏ nhỏ mỉm cười và nói: <span class="story-word">“Xin chào!”</span> <span class="story-translation">(Hello!)</span></p><p>Luna nhìn thấy những bông hoa trong khu vườn. <span class="story-word">Hoa đẹp quá!</span> <span class="story-translation">(The flowers are so pretty!)</span></p>',
    '<p>Một chú mèo đi đến bên Luna. Luna hỏi: <span class="story-word">“Bạn có muốn uống nước không?”</span> <span class="story-translation">(Would you like some water?)</span></p><p>Chú mèo vui vẻ kêu: “Meo meo!” rồi uống một chút nước.</p>',
    '<p>Chú mèo nói: <span class="story-word">“Cảm ơn bạn!”</span> <span class="story-translation">(Thank you!)</span></p><p>Luna và người bạn mới cùng chơi dưới ánh nắng. <span class="story-word">Tạm biệt, hẹn gặp lại!</span> <span class="story-translation">(Goodbye, see you again!)</span></p>'
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const language = () => LANG;
  const translate = item => item.vi;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        ...initialState,
        ...saved,
        language: 'vi',
        known: Array.isArray(saved.known) ? saved.known : [],
        practiceDays: Array.isArray(saved.practiceDays) ? saved.practiceDays : []
      };
    } catch (_) { return { ...initialState }; }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (_) { /* The app remains usable if local storage is unavailable. */ }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
  }

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('show'), 2600);
  }

  function speak(text, slow = false) {
    if (!('speechSynthesis' in window)) {
      toast('Audio pronunciation is not available in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = LANG.speech;
    utterance.rate = slow ? 0.62 : 0.82;
    utterance.pitch = 1.08;
    const voices = window.speechSynthesis.getVoices();
    const vietnameseVoice = voices.find(voice => /^vi(-|_)/i.test(voice.lang));
    if (vietnameseVoice) utterance.voice = vietnameseVoice;
    window.speechSynthesis.speak(utterance);
  }

  function changeView(name) {
    const validViews = ['today', 'learn', 'play', 'stories', 'progress'];
    if (!validViews.includes(name)) name = 'today';
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
    $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    const labels = { today: 'My day', learn: 'Learn Vietnamese', play: 'Play & practice', stories: 'Story garden', progress: 'My progress' };
    $('#page-crumb').textContent = labels[name];
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'learn') renderVocab();
    if (name === 'play' && !currentQuestion) nextQuestion();
    if (name === 'stories') renderStory();
    if (name === 'progress') renderProgress();
  }

  function markPractice() {
    const key = localDateKey();
    if (!state.practiceDays.includes(key)) state.practiceDays.push(key);
    saveState();
  }

  function updateDashboard() {
    const name = escapeHTML(state.nickname || 'Sunny');
    $('#welcome-title').innerHTML = `Hello, ${name}! <span class="wave">👋</span>`;
    $('#daily-minutes').textContent = state.minutes;
    $('#hero-progress-fill').style.width = `${Math.min(100, state.minutes / Math.max(1, state.goal) * 100)}%`;
    $('#week-words').textContent = state.known.length;
    $('#streak-count').textContent = `${state.streak} ${state.streak === 1 ? 'day' : 'days'}`;
    $('#language-flag').textContent = LANG.flag;
    $('#language-select').value = 'vi';
    $('#learned-count').textContent = state.known.length;
    $('#progress-words').textContent = state.known.length;
    $('#progress-minutes').textContent = state.minutes;
    $('#progress-stars').textContent = state.stars;
    $('#progress-streak').textContent = state.streak;
    $('#game-score').textContent = state.stars;
    $('#today-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());

    if (VOCAB.length) {
      const dayIndex = Math.floor(new Date().setHours(0, 0, 0, 0) / 86400000) % VOCAB.length;
      spotlightWord = VOCAB[dayIndex];
      $('#spotlight-word').textContent = spotlightWord.vi;
      $('#spotlight-meaning').textContent = spotlightWord.en;
      $('#spotlight-emoji').textContent = spotlightWord.emoji;
      $('#speak-spotlight').setAttribute('aria-label', `Listen to ${spotlightWord.vi}`);
    }

    const todayIndex = (new Date().getDay() + 6) % 7;
    $$('.day-item').forEach((item, index) => {
      const bubble = $('.day-bubble', item);
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - ((todayIndex - index + 7) % 7));
      const dateKey = localDateKey(dayDate);
      bubble.classList.toggle('done', state.practiceDays.includes(dateKey));
      bubble.classList.toggle('today', index === todayIndex && !state.practiceDays.includes(dateKey));
      bubble.textContent = state.practiceDays.includes(dateKey) ? '✓' : index === todayIndex ? '✦' : '·';
    });
    renderProgress();
  }

  function initCategories() {
    const select = $('#category-select');
    if (!select || select.dataset.ready === 'true') return;
    select.innerHTML = '<option value="all">All topics</option>' + CATEGORIES.map(category =>
      `<option value="${escapeHTML(category.id)}">${escapeHTML(category.icon)} ${escapeHTML(category.label)}</option>`
    ).join('');
    select.dataset.ready = 'true';
  }

  function currentFilteredWords() {
    const query = normalizeText(searchTerm);
    return VOCAB.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (showKnownOnly && !state.known.includes(item.id)) return false;
      if (!query) return true;
      return [item.vi, item.en, item.categoryLabel].some(value => normalizeText(value).includes(query));
    });
  }

  function renderVocab() {
    const grid = $('#vocab-grid');
    if (!grid) return;
    initCategories();
    const words = currentFilteredWords();
    const visibleWords = words.slice(0, currentPage * PAGE_SIZE);
    grid.innerHTML = visibleWords.map(item => {
      const known = state.known.includes(item.id);
      return `<article class="vocab-card ${known ? 'known' : ''}" data-vocab-id="${escapeHTML(item.id)}">
        <div class="vocab-card-top"><span class="vocab-category">${escapeHTML(item.categoryLabel)}</span><span class="vocab-card-number">VI</span></div>
        <div class="vocab-emoji" aria-hidden="true">${escapeHTML(item.emoji)}</div>
        <div class="vocab-word"><h3 lang="vi-VN">${escapeHTML(item.vi)}</h3><button class="speaker-button" data-speak="${escapeHTML(item.id)}" aria-label="Hear ${escapeHTML(item.vi)} in Vietnamese" title="Hear Vietnamese pronunciation">♫</button></div>
        <p class="vocab-meaning"><span>English</span>${escapeHTML(item.en)}</p>
        <button class="know-button" data-known="${escapeHTML(item.id)}">${known ? '✓ Learned' : 'Mark as learned'}</button>
      </article>`;
    }).join('');
    $('#learned-count').textContent = state.known.length;
    $('#vocab-count').textContent = words.length === 0
      ? 'No words found. Try another search.'
      : `Showing ${visibleWords.length} of ${words.length} words${activeCategory === 'all' ? '' : ` in ${CATEGORY_LOOKUP[activeCategory]?.label || 'this topic'}`}`;
    const moreButton = $('#vocab-load-more');
    moreButton.hidden = visibleWords.length >= words.length;
    moreButton.textContent = `Load ${Math.min(PAGE_SIZE, words.length - visibleWords.length)} more words ↓`;
  }

  function toggleKnown(id) {
    const isKnown = state.known.includes(id);
    if (isKnown) state.known = state.known.filter(item => item !== id);
    else {
      state.known.push(id);
      state.minutes = Math.min(state.goal, state.minutes + 1);
      markPractice();
      toast('Tuyệt vời! Great learning — one more word in your basket. 🌟');
    }
    saveState();
    renderVocab();
    updateDashboard();
  }

  function startLesson(kind) {
    const categoryByLesson = { animals: 'animals', phrases: 'phrases', words: 'everyday' };
    activeCategory = categoryByLesson[kind] || 'all';
    searchTerm = '';
    showKnownOnly = false;
    currentPage = 1;
    $('#vocab-search').value = '';
    $('#known-filter').checked = false;
    $('#category-select').value = activeCategory;
    changeView('learn');
    renderVocab();
    toast(kind === 'animals' ? 'Let’s meet Vietnamese animal words! 🐾' : kind === 'phrases' ? 'Let’s practice friendly Vietnamese phrases! 💛' : 'Your Vietnamese word adventure starts now! 🌱');
  }

  function nextQuestion() {
    if (!VOCAB.length) return;
    const pool = VOCAB;
    let item = pool[Math.floor(Math.random() * pool.length)];
    if (currentQuestion && pool.length > 1) {
      let attempts = 0;
      while (item.id === currentQuestion.id && attempts < 12) { item = pool[Math.floor(Math.random() * pool.length)]; attempts++; }
    }
    currentQuestion = item;
    questionAnswered = false;
    $('#question-emoji').textContent = item.emoji;
    $('#question-hint').textContent = `What is “${item.en}” in Vietnamese?`;
    $('#game-feedback').textContent = 'Choose a Vietnamese word to earn a star!';
    $('#game-feedback').className = 'game-feedback';
    $('#next-question').textContent = 'Next word →';
    const distractors = pool.filter(word => word.id !== item.id).sort(() => Math.random() - .5).slice(0, 3);
    const answers = [item, ...distractors].sort(() => Math.random() - .5);
    $('#answer-grid').innerHTML = answers.map(answer => `<button class="answer-option" data-answer="${escapeHTML(answer.id)}" lang="vi-VN">${escapeHTML(answer.vi)}</button>`).join('');
  }

  function chooseAnswer(id, button) {
    if (questionAnswered || !currentQuestion) return;
    questionAnswered = true;
    $$('.answer-option').forEach(option => { option.disabled = true; });
    if (id === currentQuestion.id) {
      button.classList.add('correct');
      state.stars += 1;
      state.minutes = Math.min(state.goal, state.minutes + 1);
      if (!state.known.includes(currentQuestion.id)) state.known.push(currentQuestion.id);
      markPractice();
      $('#game-feedback').textContent = 'Đúng rồi! That’s right — your brain is blooming! 🌼';
      $('#game-feedback').className = 'game-feedback good';
      $('#question-hint').textContent = `${currentQuestion.vi} means “${currentQuestion.en}”. Tap ♫ on a word card to hear it.`;
      $('#next-question').textContent = 'Next word →';
    } else {
      button.classList.add('wrong');
      const correct = $(`[data-answer="${CSS.escape(currentQuestion.id)}"]`);
      if (correct) correct.classList.add('correct');
      $('#game-feedback').textContent = `Good try! “${currentQuestion.vi}” means “${currentQuestion.en}”. Let’s try another!`;
      $('#game-feedback').className = 'game-feedback try-again';
    }
    saveState();
    updateDashboard();
  }

  function renderStory() {
    $('#story-text').innerHTML = STORIES[storyPage];
    $('#story-page-label').textContent = `Page ${storyPage + 1} of ${STORIES.length}`;
    $('#story-progress-fill').style.width = `${(storyPage + 1) / STORIES.length * 100}%`;
    $('#story-prev').disabled = storyPage === 0;
    $('#story-next').textContent = storyPage === STORIES.length - 1 ? 'Read again ↻' : 'Next page →';
  }

  function renderProgress() {
    $('#progress-words').textContent = state.known.length;
    $('#progress-minutes').textContent = state.minutes;
    $('#progress-stars').textContent = state.stars;
    $('#progress-streak').textContent = state.streak;
    const percent = Math.min(100, state.known.length / 10 * 100);
    $('#badge-progress-fill').style.width = `${percent}%`;
    $('#badge-progress-text').textContent = `${Math.min(10, state.known.length)} of 10 words`;
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayBars = $$('.progress-day');
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7;
    dayBars.forEach((bar, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - mondayOffset + index);
      const practiced = state.practiceDays.includes(localDateKey(date));
      const fill = $('.bar-shell i', bar);
      if (fill) fill.style.height = `${practiced ? 84 : 10}%`;
      $('span', bar).textContent = dayLabels[index];
    });
  }

  // Navigation and learning controls.
  $$('.nav-link').forEach(button => button.addEventListener('click', () => changeView(button.dataset.view)));
  $$('[data-go]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.go)));
  $$('[data-lesson]').forEach(button => button.addEventListener('click', () => startLesson(button.dataset.lesson)));
  $('#start-quest').addEventListener('click', () => startLesson('words'));
  $('#language-select').addEventListener('change', () => toast('Vietnamese is your learning language! 🇻🇳'));
  $('#speak-spotlight').addEventListener('click', () => { if (spotlightWord) speak(spotlightWord.vi); });
  $('#vocab-grid').addEventListener('click', event => {
    const speakButton = event.target.closest('[data-speak]');
    const knownButton = event.target.closest('[data-known]');
    if (speakButton) {
      const item = VOCAB.find(word => word.id === speakButton.dataset.speak);
      if (item) speak(item.vi, event.shiftKey);
    }
    if (knownButton) toggleKnown(knownButton.dataset.known);
  });
  $('#vocab-search').addEventListener('input', event => {
    searchTerm = event.target.value;
    currentPage = 1;
    renderVocab();
  });
  $('#category-select').addEventListener('change', event => {
    activeCategory = event.target.value;
    currentPage = 1;
    renderVocab();
  });
  $('#known-filter').addEventListener('change', event => {
    showKnownOnly = event.target.checked;
    currentPage = 1;
    renderVocab();
  });
  $('#vocab-load-more').addEventListener('click', () => { currentPage += 1; renderVocab(); });
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      changeView('learn');
      $('#vocab-search').focus();
    }
  });

  $('#answer-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-answer]');
    if (button) chooseAnswer(button.dataset.answer, button);
  });
  $('#next-question').addEventListener('click', () => {
    if (!questionAnswered) { toast('Choose the Vietnamese word first! 😊'); return; }
    nextQuestion();
  });
  $('#story-next').addEventListener('click', () => {
    storyPage = storyPage === STORIES.length - 1 ? 0 : storyPage + 1;
    renderStory();
    if (storyPage === 0) toast('A story is even more fun the second time! 📖');
  });
  $('#story-prev').addEventListener('click', () => { storyPage = Math.max(0, storyPage - 1); renderStory(); });
  $('#story-listen').addEventListener('click', () => {
    const text = $('#story-text').innerText.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ');
    speak(text, true);
  });

  // Adult settings are a prototype rather than a security gate.
  const modal = $('#modal-backdrop');
  function openModal() {
    modal.hidden = false;
    $('#learner-name').value = state.nickname;
    $('#daily-goal').value = String(state.goal);
    $('#learner-name').focus();
  }
  function closeModal() { modal.hidden = true; $('#grownup-button').focus(); }
  $('#grownup-button').addEventListener('click', openModal);
  $('#profile-button').addEventListener('click', openModal);
  $('#modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
  $('#save-settings').addEventListener('click', () => {
    const nickname = $('#learner-name').value.trim().slice(0, 20);
    state.nickname = nickname || 'Sunny';
    state.goal = Number($('#daily-goal').value) || 10;
    state.minutes = Math.min(state.minutes, state.goal);
    saveState(); updateDashboard(); closeModal(); toast('Your learning space is all set! ✨');
  });
  $('#reset-progress').addEventListener('click', () => {
    const confirmed = window.confirm('Reset Vietnamese learning progress on this device?');
    if (!confirmed) return;
    const preserved = { language: 'vi', nickname: state.nickname, goal: state.goal };
    state = { ...initialState, ...preserved };
    saveState(); updateDashboard(); renderVocab(); toast('A fresh start! Every little step counts. 🌱');
  });
  $('#sound-toggle').addEventListener('click', () => {
    const button = $('#sound-toggle');
    const nowOn = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(nowOn));
    button.classList.toggle('is-off', !nowOn);
    button.textContent = nowOn ? '♫' : '♪';
    toast(nowOn ? 'Sound button is on. Use speaker buttons to hear Vietnamese words.' : 'The visual sound control is muted; pronunciation buttons still work.');
  });

  // Initial render.
  initCategories();
  updateDashboard();
  renderVocab();
  renderStory();
  nextQuestion();
})();

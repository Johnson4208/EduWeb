(() => {
  'use strict';

  const LANGUAGES = {
    es: { name: 'Spanish', flag: '🇪🇸', speech: 'es-ES', hello: '¡Hola!', helloMeaning: 'Hello!', phrase: '¡Hola, jardín!', thanks: 'Gracias' },
    fr: { name: 'French', flag: '🇫🇷', speech: 'fr-FR', hello: 'Bonjour !', helloMeaning: 'Hello!', phrase: 'Bonjour, jardin !', thanks: 'Merci' },
    ja: { name: 'Japanese', flag: '🇯🇵', speech: 'ja-JP', hello: 'こんにちは', helloMeaning: 'Hello!', phrase: 'こんにちは、おにわ！', thanks: 'ありがとう' }
  };

  const VOCAB = [
    { id: 'apple', emoji: '🍎', category: 'everyday', en: 'Apple', es: 'Manzana', fr: 'Pomme', ja: 'りんご' },
    { id: 'water', emoji: '💧', category: 'everyday', en: 'Water', es: 'Agua', fr: 'Eau', ja: '水' },
    { id: 'sun', emoji: '☀️', category: 'everyday', en: 'Sun', es: 'Sol', fr: 'Soleil', ja: '太陽' },
    { id: 'book', emoji: '📚', category: 'everyday', en: 'Book', es: 'Libro', fr: 'Livre', ja: '本' },
    { id: 'house', emoji: '🏠', category: 'everyday', en: 'House', es: 'Casa', fr: 'Maison', ja: '家' },
    { id: 'red', emoji: '❤️', category: 'everyday', en: 'Red', es: 'Rojo', fr: 'Rouge', ja: '赤' },
    { id: 'cat', emoji: '🐱', category: 'animals', en: 'Cat', es: 'Gato', fr: 'Chat', ja: 'ねこ' },
    { id: 'dog', emoji: '🐶', category: 'animals', en: 'Dog', es: 'Perro', fr: 'Chien', ja: 'いぬ' },
    { id: 'frog', emoji: '🐸', category: 'animals', en: 'Frog', es: 'Rana', fr: 'Grenouille', ja: 'かえる' },
    { id: 'bird', emoji: '🐦', category: 'animals', en: 'Bird', es: 'Pájaro', fr: 'Oiseau', ja: '鳥' },
    { id: 'hello', emoji: '👋', category: 'phrases', en: 'Hello!', es: '¡Hola!', fr: 'Bonjour !', ja: 'こんにちは' },
    { id: 'thanks', emoji: '💛', category: 'phrases', en: 'Thank you', es: 'Gracias', fr: 'Merci', ja: 'ありがとう' },
    { id: 'please', emoji: '🌼', category: 'phrases', en: 'Please', es: 'Por favor', fr: 'S’il te plaît', ja: 'お願いします' },
    { id: 'happy', emoji: '😊', category: 'phrases', en: 'Happy', es: 'Feliz', fr: 'Heureux', ja: 'うれしい' },
    { id: 'moon', emoji: '🌙', category: 'everyday', en: 'Moon', es: 'Luna', fr: 'Lune', ja: '月' }
  ];

  const STORIES = {
    es: [
      '<p>Luna the bunny wakes up to a bright, sunny <span class="story-word">día</span> (day).</p><p>“¡Hola, garden!” she says to the flowers.</p>',
      '<p>Luna spots a little <span class="story-word">gato</span> (cat) resting beside a red flower.</p><p>“Would you like some <span class="story-word">agua</span> (water)?” she asks.</p>',
      '<p>The cat purrs. Luna smiles and says, <span class="story-word">¡gracias!</span> (thank you).</p><p>They watch the <span class="story-word">sol</span> (sun) set. What a lovely day!</p>'
    ],
    fr: [
      '<p>Luna the bunny wakes up to a bright, sunny <span class="story-word">journée</span> (day).</p><p>“<span class="story-word">Bonjour</span>, garden!” she says to the flowers.</p>',
      '<p>Luna spots a little <span class="story-word">chat</span> (cat) resting beside a red flower.</p><p>“Would you like some <span class="story-word">eau</span> (water)?” she asks.</p>',
      '<p>The cat purrs. Luna smiles and says, <span class="story-word">merci</span> (thank you).</p><p>They watch the <span class="story-word">soleil</span> (sun) set. What a lovely day!</p>'
    ],
    ja: [
      '<p>Luna the bunny wakes up to a bright, sunny <span class="story-word">日 (ひ)</span> (day).</p><p>“<span class="story-word">こんにちは</span> (hello), garden!” she says to the flowers.</p>',
      '<p>Luna spots a little <span class="story-word">ねこ</span> (cat) resting beside a red flower.</p><p>“Would you like some <span class="story-word">水 (みず)</span> (water)?” she asks.</p>',
      '<p>The cat purrs. Luna smiles and says, <span class="story-word">ありがとう</span> (thank you).</p><p>They watch the <span class="story-word">太陽 (たいよう)</span> (sun) set. What a lovely day!</p>'
    ]
  };

  const STORAGE_KEY = 'littleLinguaDemoV1';
  const initialState = { language: 'es', known: [], stars: 0, minutes: 0, streak: 1, goal: 10, nickname: 'Sunny', practiceDays: [] };
  let state = loadState();
  let activeCategory = 'all';
  let currentQuestion = null;
  let questionAnswered = false;
  let storyPage = 0;
  let toastTimer = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { ...initialState, ...saved, known: Array.isArray(saved.known) ? saved.known : [], practiceDays: Array.isArray(saved.practiceDays) ? saved.practiceDays : [] };
    } catch (_) { return { ...initialState }; }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* Private browsing may block storage; the app still works for this session. */ }
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const language = () => LANGUAGES[state.language] || LANGUAGES.es;
  const translate = (item) => item[state.language] || item.en;

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('show'), 2400);
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      toast('Audio pronunciation is not available in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = language().speech;
    utterance.rate = state.language === 'ja' ? 0.82 : 0.85;
    utterance.pitch = 1.12;
    window.speechSynthesis.speak(utterance);
  }

  function changeView(name) {
    const validViews = ['today', 'learn', 'play', 'stories', 'progress'];
    if (!validViews.includes(name)) name = 'today';
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
    $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === name));
    const labels = { today: 'My day', learn: 'Learn words', play: 'Play & practice', stories: 'Story garden', progress: 'My progress' };
    $('#page-crumb').textContent = labels[name];
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'learn') renderVocab();
    if (name === 'play' && !currentQuestion) nextQuestion();
    if (name === 'stories') renderStory();
    if (name === 'progress') renderProgress();
  }

  function markPractice() {
    const key = new Date().toISOString().slice(0, 10);
    if (!state.practiceDays.includes(key)) state.practiceDays.push(key);
    // This is a friendly demo counter, not a timer monitoring a child's activity.
    saveState();
  }

  function updateDashboard() {
    const lang = language();
    $('#welcome-title').innerHTML = `Hello, ${escapeHTML(state.nickname || 'Sunny')}! <span class="wave">👋</span>`;
    $('#daily-minutes').textContent = state.minutes;
    $('#hero-progress-fill').style.width = `${Math.min(100, state.minutes / state.goal * 100)}%`;
    $('#week-words').textContent = state.known.length;
    $('#streak-count').textContent = `${state.streak} ${state.streak === 1 ? 'day' : 'days'}`;
    $('#spotlight-word').textContent = lang.hello;
    $('#spotlight-meaning').textContent = lang.helloMeaning;
    $('#language-flag').textContent = lang.flag;
    $('#language-select').value = state.language;
    $('#learned-count').textContent = state.known.length;
    $('#progress-words').textContent = state.known.length;
    $('#progress-minutes').textContent = state.minutes;
    $('#progress-stars').textContent = state.stars;
    $('#progress-streak').textContent = state.streak;
    $('#game-score').textContent = state.stars;
    $('#spotlight-emoji').textContent = '👋';
    $('#today-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
    const todayIndex = (new Date().getDay() + 6) % 7;
    $$('.day-item').forEach((item, index) => {
      const bubble = $('.day-bubble', item);
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - ((todayIndex - index + 7) % 7));
      const dateKey = dayDate.toISOString().slice(0, 10);
      bubble.classList.toggle('done', state.practiceDays.includes(dateKey));
      bubble.classList.toggle('today', index === todayIndex && !state.practiceDays.includes(dateKey));
      if (state.practiceDays.includes(dateKey)) bubble.textContent = '✓';
      else bubble.textContent = index === todayIndex ? '✦' : '·';
    });
    renderProgress();
  }

  function renderVocab() {
    const words = VOCAB.filter(item => activeCategory === 'all' || item.category === activeCategory);
    $('#vocab-grid').innerHTML = words.map(item => {
      const known = state.known.includes(item.id);
      const categoryLabel = item.category === 'everyday' ? 'Everyday' : item.category === 'animals' ? 'Animal friend' : 'Friendly phrase';
      return `<article class="vocab-card ${known ? 'known' : ''}" data-vocab-id="${item.id}">
        <div class="vocab-card-top"><span class="vocab-category">${categoryLabel}</span></div>
        <div class="vocab-emoji" aria-hidden="true">${item.emoji}</div>
        <div class="vocab-word"><h3 lang="${language().speech}">${escapeHTML(translate(item))}</h3><button class="speaker-button" data-speak="${item.id}" aria-label="Hear ${escapeHTML(translate(item))}" title="Listen">♫</button></div>
        <p class="vocab-meaning">Means “${escapeHTML(item.en)}”</p>
        <button class="know-button" data-known="${item.id}">${known ? '✓ I know this!' : 'I know this!'}</button>
      </article>`;
    }).join('');
    $('#learned-count').textContent = state.known.length;
  }

  function toggleKnown(id) {
    const isKnown = state.known.includes(id);
    if (isKnown) state.known = state.known.filter(item => item !== id);
    else {
      state.known.push(id);
      state.minutes = Math.min(state.goal, state.minutes + 1);
      markPractice();
      toast('Lovely learning! One more word in your word basket. 🌟');
    }
    saveState();
    renderVocab();
    updateDashboard();
  }

  function wordsForLesson(kind) {
    if (kind === 'animals') return VOCAB.filter(item => item.category === 'animals');
    if (kind === 'phrases') return VOCAB.filter(item => item.category === 'phrases');
    return VOCAB.filter(item => item.category === 'everyday').slice(0, 5);
  }

  function startLesson(kind) {
    activeCategory = kind === 'animals' || kind === 'phrases' ? kind : 'everyday';
    changeView('learn');
    $$('.filter-pill').forEach(button => button.classList.toggle('active', button.dataset.category === activeCategory));
    renderVocab();
    toast(kind === 'animals' ? 'Animal friends are ready to meet you! 🐾' : kind === 'phrases' ? 'Let’s practice kind words! 💛' : 'Your first-word adventure starts now! 🍎');
  }

  function nextQuestion() {
    const pool = VOCAB.filter(item => item.category !== 'phrases' || ['hello', 'thanks'].includes(item.id));
    let item = pool[Math.floor(Math.random() * pool.length)];
    if (currentQuestion && pool.length > 1) {
      let attempts = 0;
      while (item.id === currentQuestion.id && attempts < 10) { item = pool[Math.floor(Math.random() * pool.length)]; attempts++; }
    }
    currentQuestion = item;
    questionAnswered = false;
    $('#question-emoji').textContent = item.emoji;
    $('#question-hint').textContent = 'Can you find the word for this?';
    $('#game-feedback').textContent = 'Pick an answer to start earning stars!';
    $('#game-feedback').className = 'game-feedback';
    $('#next-question').textContent = 'Next picture →';
    const distractors = pool.filter(word => word.id !== item.id).sort(() => Math.random() - .5).slice(0, 3);
    const answers = [item, ...distractors].sort(() => Math.random() - .5);
    $('#answer-grid').innerHTML = answers.map(answer => `<button class="answer-option" data-answer="${answer.id}" lang="${language().speech}">${escapeHTML(translate(answer))}</button>`).join('');
  }

  function chooseAnswer(id, button) {
    if (questionAnswered) return;
    questionAnswered = true;
    $$('.answer-option').forEach(option => { option.disabled = true; });
    if (id === currentQuestion.id) {
      button.classList.add('correct');
      state.stars += 1;
      state.minutes = Math.min(state.goal, state.minutes + 1);
      if (!state.known.includes(currentQuestion.id)) state.known.push(currentQuestion.id);
      markPractice();
      $('#game-feedback').textContent = 'That’s right! Your brain is blooming! 🌼';
      $('#game-feedback').className = 'game-feedback good';
      $('#question-hint').textContent = `${translate(currentQuestion)} — ${currentQuestion.en}!`;
      $('#next-question').textContent = 'Next picture →';
    } else {
      button.classList.add('wrong');
      const correct = $(`[data-answer="${currentQuestion.id}"]`);
      if (correct) correct.classList.add('correct');
      $('#game-feedback').textContent = `Good try! The answer is “${translate(currentQuestion)}”. Let’s try another!`;
      $('#game-feedback').className = 'game-feedback try-again';
    }
    saveState();
    updateDashboard();
  }

  function renderStory() {
    const pages = STORIES[state.language] || STORIES.es;
    $('#story-text').innerHTML = pages[storyPage];
    $('#story-page-label').textContent = `Page ${storyPage + 1} of ${pages.length}`;
    $('#story-progress-fill').style.width = `${(storyPage + 1) / pages.length * 100}%`;
    $('#story-prev').disabled = storyPage === 0;
    $('#story-next').textContent = storyPage === pages.length - 1 ? 'Read again ↻' : 'Next page →';
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
      const key = date.toISOString().slice(0, 10);
      const practiced = state.practiceDays.includes(key);
      const height = practiced ? 84 : 10;
      const fill = $('.bar-shell i', bar);
      if (fill) fill.style.height = `${height}%`;
      $('span', bar).textContent = dayLabels[index];
    });
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function updateLanguage(nextLanguage) {
    if (!LANGUAGES[nextLanguage]) return;
    state.language = nextLanguage;
    saveState();
    updateDashboard();
    renderVocab();
    if (currentQuestion && $('#view-play').classList.contains('active')) nextQuestion();
    renderStory();
    toast(`Let’s explore ${language().name}! ${language().flag}`);
  }

  // Navigation and top-level actions.
  $$('.nav-link').forEach(button => button.addEventListener('click', () => changeView(button.dataset.view)));
  $$('[data-go]').forEach(button => button.addEventListener('click', () => changeView(button.dataset.go)));
  $$('[data-lesson]').forEach(button => button.addEventListener('click', () => startLesson(button.dataset.lesson)));
  $('#start-quest').addEventListener('click', () => startLesson('words'));
  $('#language-select').addEventListener('change', event => updateLanguage(event.target.value));
  $('#speak-spotlight').addEventListener('click', () => speak(language().hello));
  $('#vocab-grid').addEventListener('click', event => {
    const speakButton = event.target.closest('[data-speak]');
    const knownButton = event.target.closest('[data-known]');
    if (speakButton) {
      const item = VOCAB.find(word => word.id === speakButton.dataset.speak);
      if (item) speak(translate(item));
    }
    if (knownButton) toggleKnown(knownButton.dataset.known);
  });
  $$('.filter-pill').forEach(button => button.addEventListener('click', () => {
    activeCategory = button.dataset.category;
    $$('.filter-pill').forEach(pill => pill.classList.toggle('active', pill === button));
    renderVocab();
  }));
  $('#answer-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-answer]');
    if (button) chooseAnswer(button.dataset.answer, button);
  });
  $('#next-question').addEventListener('click', () => {
    if (!questionAnswered) { toast('Choose the word that matches the picture first! 😊'); return; }
    nextQuestion();
  });
  $('#story-next').addEventListener('click', () => {
    storyPage = storyPage === STORIES[state.language].length - 1 ? 0 : storyPage + 1;
    renderStory();
    if (storyPage === 0) toast('A story is even more fun the second time! 📖');
  });
  $('#story-prev').addEventListener('click', () => { storyPage = Math.max(0, storyPage - 1); renderStory(); });
  $('#story-listen').addEventListener('click', () => {
    const text = $('#story-text').innerText.replace(/\(.*?\)/g, '');
    speak(text);
  });

  // Demo settings: clearly labelled as a prototype, not a security gate.
  const modal = $('#modal-backdrop');
  function openModal() { modal.hidden = false; $('#learner-name').value = state.nickname; $('#daily-goal').value = String(state.goal); $('#learner-name').focus(); }
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
    const confirmed = window.confirm('Reset the demo learning progress on this device?');
    if (!confirmed) return;
    const preserved = { language: state.language, nickname: state.nickname, goal: state.goal };
    state = { ...initialState, ...preserved };
    saveState(); updateDashboard(); renderVocab(); toast('Fresh start! Every little step counts. 🌱');
  });
  $('#sound-toggle').addEventListener('click', () => {
    const button = $('#sound-toggle');
    const nowOn = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(nowOn));
    button.classList.toggle('is-off', !nowOn);
    button.textContent = nowOn ? '♫' : '♪';
    toast(nowOn ? 'Sound button is on. Use the speaker buttons to hear words.' : 'Sound button is muted visually. Pronunciation buttons still work.');
  });

  // Initial render.
  $('#today-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
  updateDashboard();
  renderVocab();
  renderStory();
  nextQuestion();
})();

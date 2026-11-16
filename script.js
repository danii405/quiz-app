// ==================== CONFIGURACIÓN ====================
const QUESTIONS_PER_QUIZ = 10;
const QUIZ_FILES = [
  { id: 'cultura', file: 'data/quiz-cultura.json' },
  { id: 'ciencia', file: 'data/quiz-ciencia.json' },
  { id: 'cine', file: 'data/quiz-cine.json' }
];

// ==================== ESTADO ====================
let quizzes = {};          // id -> datos del quiz
let currentQuizId = null;
let currentQuestions = []; // preguntas seleccionadas y mezcladas
let currentIndex = 0;
let score = 0;
let selectedOption = null;
let answered = false;
let hintsRemaining = 1;
let hintUsedThisQuestion = false;

// ==================== ELEMENTOS DOM ====================
const screens = {
  home: document.getElementById('home-screen'),
  ranking: document.getElementById('ranking-screen'),
  quiz: document.getElementById('quiz-screen'),
  results: document.getElementById('results-screen')
};

const elements = {
  quizGrid: document.getElementById('quiz-grid'),
  rankingList: document.getElementById('ranking-list'),
  questionCounter: document.getElementById('question-counter'),
  scoreDisplay: document.getElementById('score-display'),
  progressFill: document.getElementById('progress-fill'),
  questionText: document.getElementById('question-text'),
  optionsContainer: document.getElementById('options-container'),
  questionImageContainer: document.getElementById('question-image-container'),
  hintBox: document.getElementById('hint-box'),
  hintText: document.getElementById('hint-text'),
  btnHint: document.getElementById('btn-hint'),
  btnConfirm: document.getElementById('btn-confirm'),
  resultsEmoji: document.getElementById('results-emoji'),
  resultsTitle: document.getElementById('results-title'),
  resultsScore: document.getElementById('results-score'),
  resultsPercentage: document.getElementById('results-percentage'),
  resultsMessage: document.getElementById('results-message'),
  playerName: document.getElementById('player-name'),
  btnSaveScore: document.getElementById('btn-save-score'),
  saveFeedback: document.getElementById('save-feedback')
};

// ==================== UTILIDADES ====================
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function getRanking() {
  try {
    return JSON.parse(localStorage.getItem('quizMasterRanking') || '[]');
  } catch {
    return [];
  }
}

function saveRanking(entry) {
  const ranking = getRanking();
  ranking.push(entry);
  ranking.sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));
  // Mantener solo los 20 mejores
  const top = ranking.slice(0, 20);
  localStorage.setItem('quizMasterRanking', JSON.stringify(top));
}

// ==================== CARGA DE QUIZZES ====================
async function loadQuizzes() {
  const promises = QUIZ_FILES.map(async ({ id, file }) => {
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`Error cargando ${file}`);
      const data = await res.json();
      quizzes[id] = { ...data, id };
    } catch (err) {
      console.error(err);
    }
  });
  await Promise.all(promises);
  renderHome();
}

function renderHome() {
  elements.quizGrid.innerHTML = '';
  Object.values(quizzes).forEach(quiz => {
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.innerHTML = `
      <div class="icon">${quiz.icon || '❓'}</div>
      <div class="info">
        <h3>${quiz.title}</h3>
        <p>${quiz.description}</p>
        <div class="meta">${quiz.questions.length} preguntas disponibles · ${QUESTIONS_PER_QUIZ} por partida</div>
      </div>
    `;
    card.addEventListener('click', () => startQuiz(quiz.id));
    elements.quizGrid.appendChild(card);
  });
}

// ==================== QUIZ ====================
function startQuiz(quizId) {
  currentQuizId = quizId;
  const quiz = quizzes[quizId];
  if (!quiz) return;

  // Seleccionar N preguntas aleatorias
  const shuffled = shuffleArray(quiz.questions);
  currentQuestions = shuffled.slice(0, Math.min(QUESTIONS_PER_QUIZ, shuffled.length));

  // Mezclar opciones de cada pregunta (manteniendo el índice correcto)
  currentQuestions = currentQuestions.map(q => {
    const options = [...q.options];
    const correctAnswer = options[q.correct];
    const shuffledOpts = shuffleArray(options);
    const newCorrect = shuffledOpts.indexOf(correctAnswer);
    return {
      ...q,
      options: shuffledOpts,
      correct: newCorrect
    };
  });

  currentIndex = 0;
  score = 0;
  hintsRemaining = 1;
  selectedOption = null;
  answered = false;
  hintUsedThisQuestion = false;

  showScreen('quiz');
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuestions[currentIndex];
  if (!q) return;

  // Contador y progreso
  elements.questionCounter.textContent = `Pregunta ${currentIndex + 1} / ${currentQuestions.length}`;
  elements.scoreDisplay.textContent = `Puntos: ${score}`;
  const progress = ((currentIndex) / currentQuestions.length) * 100;
  elements.progressFill.style.width = `${progress}%`;

  // Pregunta
  elements.questionText.textContent = q.question;

  // Imagen (opcional)
  if (q.image) {
    elements.questionImageContainer.innerHTML = `<img src="${q.image}" alt="Imagen de la pregunta" loading="lazy">`;
    elements.questionImageContainer.classList.remove('hidden');
  } else {
    elements.questionImageContainer.classList.add('hidden');
    elements.questionImageContainer.innerHTML = '';
  }

  // Opciones
  elements.optionsContainer.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.dataset.index = idx;
    btn.innerHTML = `
      <span class="letter">${letters[idx] || (idx + 1)}</span>
      <span class="text">${opt}</span>
    `;
    btn.addEventListener('click', () => selectOption(idx));
    elements.optionsContainer.appendChild(btn);
  });

  // Pista
  elements.hintBox.classList.add('hidden');
  hintUsedThisQuestion = false;
  elements.btnHint.disabled = hintsRemaining <= 0 || !q.hint;
  elements.btnHint.textContent = `💡 Pista (${hintsRemaining} disponible${hintsRemaining !== 1 ? 's' : ''})`;

  // Botón confirmar
  selectedOption = null;
  answered = false;
  elements.btnConfirm.disabled = true;
  elements.btnConfirm.textContent = 'Confirmar respuesta';
  elements.btnConfirm.onclick = confirmAnswer;
}

function selectOption(index) {
  if (answered) return;
  selectedOption = index;

  // Actualizar UI
  const options = elements.optionsContainer.querySelectorAll('.option');
  options.forEach((opt, i) => {
    opt.classList.toggle('selected', i === index);
  });

  elements.btnConfirm.disabled = false;
}

function confirmAnswer() {
  if (selectedOption === null || answered) return;
  answered = true;

  const q = currentQuestions[currentIndex];
  const options = elements.optionsContainer.querySelectorAll('.option');
  const isCorrect = selectedOption === q.correct;

  // Marcar respuestas
  options.forEach((opt, i) => {
    opt.classList.add('disabled');
    if (i === q.correct) {
      opt.classList.add('correct');
    } else if (i === selectedOption && !isCorrect) {
      opt.classList.add('incorrect');
    }
  });

  if (isCorrect) {
    score++;
    elements.scoreDisplay.textContent = `Puntos: ${score}`;
  }

  // Cambiar botón a "Siguiente"
  if (currentIndex < currentQuestions.length - 1) {
    elements.btnConfirm.textContent = 'Siguiente pregunta →';
    elements.btnConfirm.onclick = nextQuestion;
  } else {
    elements.btnConfirm.textContent = 'Ver resultados →';
    elements.btnConfirm.onclick = showResults;
  }
  elements.btnConfirm.disabled = false;

  // Desactivar pista
  elements.btnHint.disabled = true;
}

function nextQuestion() {
  currentIndex++;
  renderQuestion();
}

function showHint() {
  if (hintsRemaining <= 0 || hintUsedThisQuestion || answered) return;
  const q = currentQuestions[currentIndex];
  if (!q.hint) return;

  hintsRemaining--;
  hintUsedThisQuestion = true;
  elements.hintText.textContent = q.hint;
  elements.hintBox.classList.remove('hidden');
  elements.btnHint.disabled = true;
  elements.btnHint.textContent = `💡 Pista (${hintsRemaining} disponible${hintsRemaining !== 1 ? 's' : ''})`;
}

function showResults() {
  // Completar barra de progreso
  elements.progressFill.style.width = '100%';

  const total = currentQuestions.length;
  const percentage = Math.round((score / total) * 100);

  let emoji, title, message;
  if (percentage >= 90) {
    emoji = '🏆';
    title = '¡Excelente!';
    message = 'Eres un verdadero maestro del conocimiento.';
  } else if (percentage >= 70) {
    emoji = '🎉';
    title = '¡Muy bien!';
    message = 'Gran puntuación. ¡Sigue así!';
  } else if (percentage >= 50) {
    emoji = '👍';
    title = '¡Buen intento!';
    message = 'No está mal, pero puedes mejorar.';
  } else {
    emoji = '💪';
    title = '¡Sigue practicando!';
    message = 'La próxima vez lo harás mejor.';
  }

  elements.resultsEmoji.textContent = emoji;
  elements.resultsTitle.textContent = title;
  elements.resultsScore.innerHTML = `Has acertado <strong>${score}</strong> de <strong>${total}</strong>`;
  elements.resultsPercentage.textContent = `${percentage}%`;
  elements.resultsMessage.textContent = message;

  // Reset save
  elements.playerName.value = '';
  elements.saveFeedback.classList.add('hidden');
  elements.btnSaveScore.disabled = false;

  showScreen('results');
}

// ==================== RANKING ====================
function renderRanking() {
  const ranking = getRanking();
  elements.rankingList.innerHTML = '';

  if (ranking.length === 0) {
    elements.rankingList.innerHTML = `
      <div class="empty-ranking">
        <p>Aún no hay puntuaciones guardadas.</p>
        <p>¡Sé el primero en aparecer aquí!</p>
      </div>
    `;
    return;
  }

  ranking.forEach((entry, i) => {
    const item = document.createElement('div');
    item.className = 'ranking-item';
    let rankClass = '';
    if (i === 0) rankClass = 'gold';
    else if (i === 1) rankClass = 'silver';
    else if (i === 2) rankClass = 'bronze';

    const date = new Date(entry.date).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    item.innerHTML = `
      <div class="rank ${rankClass}">${i + 1}</div>
      <div class="name">
        ${entry.name}
        <div class="quiz-name">${entry.quizTitle} · ${date}</div>
      </div>
      <div class="score">${entry.score}/${entry.total}</div>
    `;
    elements.rankingList.appendChild(item);
  });
}

function handleSaveScore() {
  const name = elements.playerName.value.trim();
  if (!name) {
    elements.playerName.focus();
    return;
  }

  const quiz = quizzes[currentQuizId];
  saveRanking({
    name,
    score,
    total: currentQuestions.length,
    quizId: currentQuizId,
    quizTitle: quiz ? quiz.title : 'Quiz',
    date: new Date().toISOString()
  });

  elements.saveFeedback.textContent = '¡Puntuación guardada!';
  elements.saveFeedback.classList.remove('hidden');
  elements.btnSaveScore.disabled = true;
}

// ==================== EVENTOS ====================
document.getElementById('btn-ranking').addEventListener('click', () => {
  renderRanking();
  showScreen('ranking');
});

document.getElementById('btn-back-from-ranking').addEventListener('click', () => {
  showScreen('home');
});

document.getElementById('btn-hint').addEventListener('click', showHint);

document.getElementById('btn-home').addEventListener('click', () => {
  showScreen('home');
});

document.getElementById('btn-retry').addEventListener('click', () => {
  if (currentQuizId) startQuiz(currentQuizId);
});

document.getElementById('btn-save-score').addEventListener('click', handleSaveScore);

elements.playerName.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSaveScore();
});

// ==================== INICIO ====================
loadQuizzes();

// Nombres de los archivos que contienen las preguntas.
const QUIZ_FILES = [
  { id: "cultura", file: "quiz-cultura.json" },
  { id: "ciencia", file: "quiz-ciencia.json" },
  { id: "cine", file: "quiz-cine.json" }
];

const quizList = document.getElementById("quiz-list");
const screens = document.querySelectorAll(".screen");

let quizzes = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedAnswer = null;
let answered = false;
let currentQuizTitle = "";

// Cambia de pantalla.
function showScreen(screenId) {
  screens.forEach(screen => screen.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
}

// Carga los tres archivos JSON.
async function loadQuizzes() {
  quizList.innerHTML = "<p>Cargando cuestionarios...</p>";

  try {
    const requests = QUIZ_FILES.map(async quizFile => {
      const response = await fetch("./" + quizFile.file);
      if (!response.ok) {
        throw new Error("No se encuentra " + quizFile.file);
      }
      return await response.json();
    });

    quizzes = await Promise.all(requests);
    renderHome();
  } catch (error) {
    console.error("No se pudieron cargar los cuestionarios:", error);
    quizList.innerHTML = "<p class='feedback'>No se pudieron cargar los quizzes. Comprueba que los tres JSON están en la misma carpeta que index.html y abre la página con Live Server.</p>";
  }
}

// Crea un botón para cada categoría.
function renderHome() {
  quizList.innerHTML = "";

  quizzes.forEach((quiz, index) => {
    const button = document.createElement("button");
    button.className = "quiz-card";
    button.innerHTML = `<strong>${quiz.title}</strong><span>${quiz.questions.length} preguntas disponibles</span>`;
    button.addEventListener("click", () => startQuiz(index));
    quizList.appendChild(button);
  });
}

// Mezcla una lista al azar (algoritmo Fisher-Yates).
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Empieza una partida con 10 preguntas aleatorias.
function startQuiz(quizIndex) {
  const quiz = quizzes[quizIndex];
  currentQuizTitle = quiz.title;
  currentQuestions = shuffle(quiz.questions).slice(0, 10);
  currentQuestionIndex = 0;
  score = 0;
  document.getElementById("quiz-category").textContent = currentQuizTitle;
  showScreen("quiz-screen");
  showQuestion();
}

// Muestra la pregunta y sus posibles respuestas.
function showQuestion() {
  const question = currentQuestions[currentQuestionIndex];
  selectedAnswer = null;
  answered = false;

  document.getElementById("question-count").textContent =
    `Pregunta ${currentQuestionIndex + 1} de ${currentQuestions.length}`;
  document.getElementById("score").textContent = `Puntos: ${score}`;
  document.getElementById("question-text").textContent = question.question;
  document.getElementById("progress-bar").style.width =
    `${(currentQuestionIndex / currentQuestions.length) * 100}%`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("hint-button").disabled = false;

  const answersBox = document.getElementById("answers");
  answersBox.innerHTML = "";

  question.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.textContent = answer;
    button.addEventListener("click", () => selectAnswer(index));
    answersBox.appendChild(button);
  });

  const confirmButton = document.getElementById("confirm-button");
  confirmButton.textContent = "Confirmar respuesta";
  confirmButton.disabled = true;
}

// Guarda la opción que el jugador ha seleccionado.
function selectAnswer(index) {
  if (answered) return;
  selectedAnswer = index;

  document.querySelectorAll(".answer").forEach((button, buttonIndex) => {
    button.classList.toggle("selected", buttonIndex === index);
  });
  document.getElementById("confirm-button").disabled = false;
}

// Comprueba la respuesta. Después, el botón sirve para avanzar.
function confirmAnswer() {
  if (!answered) {
    if (selectedAnswer === null) return;

    const question = currentQuestions[currentQuestionIndex];
    const answerButtons = document.querySelectorAll(".answer");

    answered = true;
    answerButtons.forEach((button, index) => {
      if (index === question.correct) button.classList.add("correct");
      if (index === selectedAnswer && index !== question.correct) {
        button.classList.add("wrong");
      }
    });

    if (selectedAnswer === question.correct) {
      score++;
      document.getElementById("feedback").textContent = "¡Correcto! +1 punto";
    } else {
      document.getElementById("feedback").textContent =
        "No es correcto. La respuesta verde es la buena.";
    }

    document.getElementById("score").textContent = `Puntos: ${score}`;
    document.getElementById("confirm-button").textContent = "Siguiente pregunta";
    document.getElementById("hint-button").disabled = true;
  } else {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
      showQuestion();
    } else {
      showResults();
    }
  }
}

// Muestra la pantalla final.
function showResults() {
  document.getElementById("progress-bar").style.width = "100%";
  document.getElementById("final-score").textContent =
    `Has conseguido ${score} de ${currentQuestions.length} puntos.`;
  document.getElementById("player-name").value = "";
  document.getElementById("save-message").textContent = "";
  showScreen("results-screen");
}

// Guarda nombre y puntuación en el navegador.
function saveScore() {
  const nameInput = document.getElementById("player-name");
  const name = nameInput.value.trim();

  if (!name) {
    document.getElementById("save-message").textContent = "Escribe tu nombre antes de guardar.";
    return;
  }

  const ranking = JSON.parse(localStorage.getItem("quizRanking") || "[]");
  ranking.push({ name, score, quiz: currentQuizTitle });
  ranking.sort((a, b) => b.score - a.score);
  localStorage.setItem("quizRanking", JSON.stringify(ranking.slice(0, 10)));

  document.getElementById("save-message").textContent = "¡Puntuación guardada!";
}

// Enseña una pista sin revelar la respuesta.
function showHint() {
  const question = currentQuestions[currentQuestionIndex];
  document.getElementById("feedback").textContent =
    question.hint || "Piensa con calma antes de responder.";
  document.getElementById("hint-button").disabled = true;
}

// Muestra las mejores puntuaciones guardadas.
function renderRanking() {
  const ranking = JSON.parse(localStorage.getItem("quizRanking") || "[]");
  const list = document.getElementById("ranking-list");
  list.innerHTML = "";

  if (ranking.length === 0) {
    list.innerHTML = "<li>Aún no hay puntuaciones. ¡Juega una partida!</li>";
    return;
  }

  ranking.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.name} — ${item.score}/10 (${item.quiz})`;
    list.appendChild(li);
  });
}

// Eventos de los botones.
document.getElementById("confirm-button").addEventListener("click", confirmAnswer);
document.getElementById("hint-button").addEventListener("click", showHint);
document.getElementById("ranking-button").addEventListener("click", () => {
  renderRanking();
  showScreen("ranking-screen");
});
document.getElementById("back-button").addEventListener("click", () => showScreen("home-screen"));
document.getElementById("menu-button").addEventListener("click", () => showScreen("home-screen"));
document.getElementById("save-score-button").addEventListener("click", saveScore);

// Carga los cuestionarios al abrir la página.
loadQuizzes();

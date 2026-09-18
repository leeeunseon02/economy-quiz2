let currentCategory = null;
let currentConcept = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let selectedAnswer = null;
let score = 0;

const screens = document.querySelectorAll(".screen");

function showScreen(id) {
  screens.forEach(screen => screen.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHome() {
  currentCategory = null;
  currentConcept = null;
  currentQuestions = [];
  currentQuestionIndex = 0;
  selectedAnswer = null;
  score = 0;
  renderCategories();
  showScreen("home-screen");
}

function renderCategories() {
  const list = document.getElementById("category-list");
  list.innerHTML = quizData.map(category => `
    <button class="category-card" onclick="selectCategory('${category.id}')">
      <div class="category-icon">${category.icon}</div>
      <h3>${category.name}</h3>
      <p>${category.description}</p>
    </button>
  `).join("");
}

function selectCategory(categoryId) {
  currentCategory = quizData.find(category => category.id === categoryId);
  currentConcept = currentCategory.concepts[0];
  document.getElementById("concept-progress").textContent =
    `개념 1 / ${currentCategory.concepts.length}`;

  renderConcept();
  showScreen("concept-screen");
}

function renderConcept() {
  document.getElementById("concept-content").innerHTML = `
    <span class="concept-tag">${currentCategory.name}</span>
    <h1>${currentConcept.title}</h1>
    <p class="definition">${currentConcept.definition}</p>
    <div class="key-points">
      <h3>핵심 포인트</h3>
      <ul>${currentConcept.points.map(point => `<li>${point}</li>`).join("")}</ul>
    </div>
  `;

  document.getElementById("start-quiz-button").textContent =
    `${currentConcept.title} 문제 풀기 →`;
}

document.getElementById("start-quiz-button").addEventListener("click", startQuiz);

function startQuiz() {
  currentQuestions = currentCategory.concepts.flatMap(concept =>
    concept.questions.map(question => ({ ...question, conceptTitle: concept.title }))
  );

  currentQuestionIndex = 0;
  score = 0;
  renderQuestion();
  showScreen("quiz-screen");
}

function renderQuestion() {
  const question = currentQuestions[currentQuestionIndex];
  selectedAnswer = null;

  document.getElementById("quiz-progress").textContent =
    `문제 ${currentQuestionIndex + 1} / ${currentQuestions.length}`;

  document.getElementById("progress-fill").style.width =
    `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%`;

  document.getElementById("question-text").textContent = question.question;

  const options = document.getElementById("options");
  options.innerHTML = question.options.map((option, index) => `
    <button class="option" onclick="selectAnswer(${index})">
      <span class="option-number">${index + 1}</span>${option}
    </button>
  `).join("");

  document.getElementById("submit-button").disabled = true;
}

function selectAnswer(index) {
  selectedAnswer = index;

  document.querySelectorAll(".option").forEach((button, i) => {
    button.classList.toggle("selected", i === index);
  });

  document.getElementById("submit-button").disabled = false;
}

document.getElementById("submit-button").addEventListener("click", showExplanation);

function showExplanation() {
  if (selectedAnswer === null) return;

  const question = currentQuestions[currentQuestionIndex];
  const isCorrect = selectedAnswer === question.answer;

  if (isCorrect) score++;

  const result = document.getElementById("answer-result");
  result.className = `answer-result ${isCorrect ? "correct" : "wrong"}`;
  result.innerHTML = `
    <strong>${isCorrect ? "정답입니다!" : "아쉬워요!"}</strong>
    <span>정답: ${question.options[question.answer]}</span>
  `;

  document.getElementById("explanation-title").textContent =
    question.conceptTitle;
  document.getElementById("explanation-text").textContent =
    question.explanation;

  document.getElementById("next-button").textContent =
    currentQuestionIndex === currentQuestions.length - 1
      ? "결과 보기 →"
      : "다음 문제 →";

  showScreen("explanation-screen");
}

document.getElementById("next-button").addEventListener("click", () => {
  if (currentQuestionIndex < currentQuestions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
    showScreen("quiz-screen");
  } else {
    showResult();
  }
});

function showResult() {
  const total = currentQuestions.length;
  const percentage = Math.round((score / total) * 100);

  document.getElementById("final-score").textContent = `${score} / ${total}`;
  document.getElementById("correct-count").textContent = score;
  document.getElementById("total-count").textContent = total;
  document.getElementById("accuracy").textContent = `${percentage}%`;

  document.getElementById("final-message").textContent =
    percentage === 100
      ? "모든 문제를 맞혔어요!"
      : percentage >= 70
        ? "좋아요! 핵심 개념을 잘 이해하고 있어요."
        : "개념을 다시 읽고 한 번 더 도전해보세요.";

  showScreen("result-screen");
}

document.getElementById("retry-button").addEventListener("click", startQuiz);

renderCategories();

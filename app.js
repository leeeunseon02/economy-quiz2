let currentCategory=null,currentConcept=null,currentQuestionIndex=0,currentScore=0,answered=false;
const screens=["homeScreen","categoryScreen","conceptListScreen","conceptScreen","quizScreen","resultScreen"];

function showScreen(id){screens.forEach(x=>document.getElementById(x).classList.remove("active"));document.getElementById(id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"});}
function goHome(){currentCategory=null;currentConcept=null;document.getElementById("progressText").textContent="";showScreen("homeScreen");}

function showCategories(){
  const list=document.getElementById("categoryList");list.innerHTML="";
  quizData.forEach(category=>{
    const b=document.createElement("button");b.className="category-btn";
    b.innerHTML=`<div class="category-icon">${category.icon}</div><div class="category-name">${category.name}</div><div class="category-desc">${category.description}</div>`;
    b.onclick=()=>selectCategory(category.id);list.appendChild(b);
  });
  document.getElementById("progressText").textContent="카테고리 선택";showScreen("categoryScreen");
}
function selectCategory(id){currentCategory=quizData.find(x=>x.id===id);showConceptList();}
function showConceptList(){
  if(!currentCategory){showCategories();return;}
  document.getElementById("conceptCategoryTitle").textContent=`${currentCategory.name} · 개념 선택`;
  const list=document.getElementById("conceptList");list.innerHTML="";
  currentCategory.concepts.forEach(concept=>{
    const b=document.createElement("button");b.className="concept-item";
    b.innerHTML=`<div><div class="concept-item-title">${concept.title}</div><div class="concept-item-desc">${concept.summary}</div></div><div class="arrow">›</div>`;
    b.onclick=()=>selectConcept(concept.id);list.appendChild(b);
  });
  document.getElementById("progressText").textContent="개념 선택";showScreen("conceptListScreen");
}
function selectConcept(id){
  currentConcept=currentCategory.concepts.find(x=>x.id===id);
  document.getElementById("conceptTitle").textContent=currentConcept.title;
  document.getElementById("conceptSummary").textContent=currentConcept.summary;
  document.getElementById("conceptDescription").textContent=currentConcept.description;
  const ul=document.getElementById("keyPoints");ul.innerHTML="";
  currentConcept.keyPoints.forEach(p=>{const li=document.createElement("li");li.textContent=p;ul.appendChild(li);});
  document.getElementById("progressText").textContent="개념 학습";showScreen("conceptScreen");
}
function startQuestions(){if(!currentConcept||!currentConcept.questions.length){alert("이 개념에는 아직 문제가 없습니다.");return;}currentQuestionIndex=0;currentScore=0;showQuestion();}
function retryConcept(){startQuestions();}
function showQuestion(){
  answered=false;const q=currentConcept.questions[currentQuestionIndex];
  document.getElementById("questionNumber").textContent=`${currentQuestionIndex+1} / ${currentConcept.questions.length}`;
  document.getElementById("scoreText").textContent=`점수 ${currentScore}`;
  document.getElementById("questionText").textContent=q.question;
  const options=document.getElementById("options");options.innerHTML="";
  q.options.forEach((o,i)=>{const b=document.createElement("button");b.className="option-btn";b.textContent=`${i+1}. ${o}`;b.onclick=()=>checkAnswer(i);options.appendChild(b);});
  document.getElementById("answerBox").classList.add("hidden");
  document.getElementById("answerResult").textContent="";document.getElementById("answerExplanation").textContent="";
  document.getElementById("nextButton").textContent=currentQuestionIndex===currentConcept.questions.length-1?"결과 보기 →":"다음 문제 →";
  document.getElementById("progressText").textContent=`${currentConcept.title} 문제`;showScreen("quizScreen");
}
function checkAnswer(selected){
  if(answered)return;answered=true;const q=currentConcept.questions[currentQuestionIndex],buttons=document.querySelectorAll(".option-btn");
  buttons.forEach(b=>b.disabled=true);buttons[q.answer].classList.add("correct");
  const result=document.getElementById("answerResult");
  if(selected===q.answer){currentScore++;result.textContent="✅ 정답입니다!";result.style.color="var(--correct)";}
  else{buttons[selected].classList.add("wrong");result.textContent=`❌ 오답입니다. 정답은 ${q.answer+1}번입니다.`;result.style.color="var(--wrong)";}
  document.getElementById("answerExplanation").textContent=q.explanation;document.getElementById("scoreText").textContent=`점수 ${currentScore}`;document.getElementById("answerBox").classList.remove("hidden");
}
function nextQuestion(){if(!answered)return;if(currentQuestionIndex<currentConcept.questions.length-1){currentQuestionIndex++;showQuestion();}else showResult();}
function showResult(){
  const total=currentConcept.questions.length,p=Math.round(currentScore/total*100);
  document.getElementById("resultScore").textContent=`${currentScore} / ${total} (${p}점)`;
  document.getElementById("resultMessage").textContent=p===100?"모든 문제를 맞혔습니다. 개념을 잘 이해하고 있어요!":p>=70?"좋아요! 핵심 개념을 잘 이해하고 있습니다.":"괜찮아요. 개념 설명을 다시 읽고 한 번 더 풀어보세요.";
  document.getElementById("progressText").textContent="학습 결과";showScreen("resultScreen");
}
showScreen("homeScreen");
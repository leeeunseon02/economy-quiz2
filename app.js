let currentCategory=null,currentConcept=null,currentQuestionIndex=0,currentScore=0,answered=false;
const screens=["homeScreen","categoryScreen","conceptListScreen","conceptScreen","quizScreen","resultScreen"];
let remoteLoaded=false;
const QUIZ_SUPABASE_URL="https://ixaloamlmmwwygmqxkfc.supabase.co";
const QUIZ_SUPABASE_KEY="sb_publishable_oxsexRgt0avACwjuBm01bg_HEG5F1Rm";
const quizDb=window.supabase.createClient(QUIZ_SUPABASE_URL,QUIZ_SUPABASE_KEY);

async function loadRemoteData(){
  if(remoteLoaded)return;
  try{
    const [catsRes,consRes,qsRes]=await Promise.all([
      quizDb.from('categories').select('*').order('sort_order'),
      quizDb.from('concepts').select('*').order('sort_order'),
      quizDb.from('questions').select('*').order('sort_order')
    ]);
    if(catsRes.error||consRes.error||qsRes.error) throw (catsRes.error||consRes.error||qsRes.error);
    if(!catsRes.data.length){remoteLoaded=true;return;}
    quizData=catsRes.data.map(cat=>({
      id:cat.id,name:cat.name,icon:cat.icon||'📘',description:cat.description||'',
      concepts:consRes.data.filter(c=>c.category_id===cat.id).map(con=>({
        id:con.id,title:con.title,summary:con.summary||'',description:con.description||'',
        keyPoints:Array.isArray(con.key_points)?con.key_points:[],
        questions:qsRes.data.filter(q=>q.concept_id===con.id).map(q=>({question:q.question,options:Array.isArray(q.options)?q.options:[],answer:Number(q.answer_index)||0,explanation:q.explanation||''}))
      }))
    }));
    remoteLoaded=true;
  }catch(err){
    console.warn('Supabase 학습 데이터를 불러오지 못했습니다. 기본 예시 데이터를 표시합니다.',err.message||err);
    remoteLoaded=true;
  }
}
function showScreen(id){screens.forEach(x=>document.getElementById(x).classList.remove("active"));document.getElementById(id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"});}
function goHome(){currentCategory=null;currentConcept=null;document.getElementById("progressText").textContent="";showScreen("homeScreen");}
async function showCategories(){
  document.getElementById("categoryList").innerHTML='<p>학습 목록을 불러오는 중...</p>';
  await loadRemoteData();
  const list=document.getElementById("categoryList");list.innerHTML="";
  quizData.forEach(category=>{
    const b=document.createElement("button");b.className="category-btn";
    const icon=document.createElement('div');icon.className='category-icon';icon.textContent=category.icon;
    const name=document.createElement('div');name.className='category-name';name.textContent=category.name;
    const desc=document.createElement('div');desc.className='category-desc';desc.textContent=category.description;
    b.append(icon,name,desc);b.onclick=()=>selectCategory(category.id);list.appendChild(b);
  });
  if(!quizData.length)list.innerHTML='<p>아직 등록된 카테고리가 없습니다.</p>';
  document.getElementById("progressText").textContent="카테고리 선택";showScreen("categoryScreen");
}
function selectCategory(id){currentCategory=quizData.find(x=>x.id===id);showConceptList();}
function showConceptList(){
  if(!currentCategory){showCategories();return;}
  document.getElementById("conceptCategoryTitle").textContent=`${currentCategory.name} · 개념 선택`;
  const list=document.getElementById("conceptList");list.innerHTML="";
  currentCategory.concepts.forEach(concept=>{
    const b=document.createElement("button");b.className="concept-item";
    const wrap=document.createElement('div'),title=document.createElement('div'),desc=document.createElement('div'),arrow=document.createElement('div');
    title.className='concept-item-title';title.textContent=concept.title;desc.className='concept-item-desc';desc.textContent=concept.summary;arrow.className='arrow';arrow.textContent='›';wrap.append(title,desc);b.append(wrap,arrow);
    b.onclick=()=>selectConcept(concept.id);list.appendChild(b);
  });
  if(!currentCategory.concepts.length)list.innerHTML='<p>이 카테고리에 등록된 개념이 없습니다.</p>';
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
  document.getElementById("answerBox").classList.add("hidden");document.getElementById("answerResult").textContent="";document.getElementById("answerExplanation").textContent="";
  document.getElementById("nextButton").textContent=currentQuestionIndex===currentConcept.questions.length-1?"결과 보기 →":"다음 문제 →";
  document.getElementById("progressText").textContent=`${currentConcept.title} 문제`;showScreen("quizScreen");
}
function checkAnswer(selected){
  if(answered)return;answered=true;const q=currentConcept.questions[currentQuestionIndex],buttons=document.querySelectorAll(".option-btn");
  buttons.forEach(b=>b.disabled=true);if(buttons[q.answer])buttons[q.answer].classList.add("correct");
  const result=document.getElementById("answerResult");
  if(selected===q.answer){currentScore++;result.textContent="✅ 정답입니다!";result.style.color="var(--correct)";}
  else{buttons[selected].classList.add("wrong");result.textContent=`❌ 오답입니다. 정답은 ${q.answer+1}번입니다.`;result.style.color="var(--wrong)";}
  document.getElementById("answerExplanation").textContent=q.explanation;document.getElementById("scoreText").textContent=`점수 ${currentScore}`;document.getElementById("answerBox").classList.remove("hidden");
}
function nextQuestion(){if(!answered)return;if(currentQuestionIndex<currentConcept.questions.length-1){currentQuestionIndex++;showQuestion();}else showResult();}
function showResult(){const total=currentConcept.questions.length,p=Math.round(currentScore/total*100);document.getElementById("resultScore").textContent=`${currentScore} / ${total} (${p}점)`;document.getElementById("resultMessage").textContent=p===100?"모든 문제를 맞혔습니다. 개념을 잘 이해하고 있어요!":p>=70?"좋아요! 핵심 개념을 잘 이해하고 있습니다.":"괜찮아요. 개념 설명을 다시 읽고 한 번 더 풀어보세요.";document.getElementById("progressText").textContent="학습 결과";showScreen("resultScreen");}
showScreen("homeScreen");

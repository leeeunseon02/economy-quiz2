let currentCategory=null,currentConcept=null,currentQuestionIndex=0,currentScore=0,answered=false;
const screens=["homeScreen","categoryScreen","conceptListScreen","conceptScreen","quizScreen","resultScreen","dashboardScreen"];
let remoteLoaded=false,remoteDataAvailable=false,currentUser=null,conceptReadThisVisit=false;
let progressByConcept={};
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
        questions:qsRes.data.filter(q=>q.concept_id===con.id).map(q=>({id:q.id,question:q.question,options:Array.isArray(q.options)?q.options:[],answer:Number(q.answer_index)||0,explanation:q.explanation||'',points:Math.max(1,Number(q.points)||1)}))
      }))
    }));
    remoteDataAvailable=true;
    remoteLoaded=true;
  }catch(err){
    console.warn('Supabase 학습 데이터를 불러오지 못했습니다. 기본 예시 데이터를 표시합니다.',err.message||err);
    remoteLoaded=true;
  }
}
function showScreen(id){screens.forEach(x=>document.getElementById(x)?.classList.remove("active"));document.getElementById(id)?.classList.add("active");window.scrollTo({top:0,behavior:"smooth"});}
function goHome(){currentCategory=null;currentConcept=null;document.getElementById("progressText").textContent="";showScreen("homeScreen");renderHomeStats();}
function completedCount(){return Object.values(progressByConcept).filter(p=>p.completed).length;}
function allConcepts(){return (quizData||[]).flatMap(c=>c.concepts||[]);}
function renderHomeStats(){
  const box=document.getElementById('homeProgressSummary');if(!box)return;
  const concepts=allConcepts(),done=completedCount(),percent=concepts.length?Math.round(done/concepts.length*100):0;
  if(!currentUser){box.innerHTML='<p class="muted-note">로그인하면 학습 진도와 점수가 계정에 자동 저장됩니다.</p>';return;}
  box.innerHTML=`<div class="mini-stats"><div><span>전체 진도</span><strong>${percent}%</strong></div><div><span>완료한 개념</span><strong>${done} / ${concepts.length}</strong></div><div><span>누적 문제 풀이</span><strong>${Object.values(progressByConcept).reduce((n,p)=>n+(Number(p.attempts)||0),0)}회</strong></div></div><div class="progress-track"><div style="width:${percent}%"></div></div><button class="secondary-btn full-btn" onclick="showDashboard()">나의 학습실 보기 →</button>`;
}
async function loadUserProgress(){
  progressByConcept={};
  if(!currentUser||!remoteDataAvailable){renderHomeStats();return;}
  const {data,error}=await quizDb.from('concept_progress').select('*').eq('user_id',currentUser.id);
  if(error){console.warn('학습 진도를 불러오지 못했습니다.',error.message);return;}
  (data||[]).forEach(row=>{progressByConcept[row.concept_id]=row;});
  renderHomeStats();
}
async function initLearning(){
  const {data}=await quizDb.auth.getSession();currentUser=data?.session?.user||null;
  await loadRemoteData();
  await loadUserProgress();
  renderHomeStats();
}
async function showCategories(){
  document.getElementById("categoryList").innerHTML='<p>학습 목록을 불러오는 중...</p>';
  await loadRemoteData();
  const list=document.getElementById("categoryList");list.innerHTML="";
  quizData.forEach(category=>{
    const b=document.createElement("button");b.className="category-btn";
    const icon=document.createElement('div');icon.className='category-icon';icon.textContent=category.icon;
    const name=document.createElement('div');name.className='category-name';name.textContent=category.name;
    const desc=document.createElement('div');desc.className='category-desc';desc.textContent=category.description;
    const total=category.concepts.length,done=category.concepts.filter(c=>progressByConcept[c.id]?.completed).length;
    const stat=document.createElement('div');stat.className='category-progress';stat.textContent=currentUser?`완료 ${done}/${total}`:'로그인하면 진도 저장';
    b.append(icon,name,desc,stat);b.onclick=()=>selectCategory(category.id);list.appendChild(b);
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
    title.className='concept-item-title';title.textContent=concept.title;
    const saved=progressByConcept[concept.id];
    if(saved?.completed){const badge=document.createElement('span');badge.className='completed-badge';badge.textContent='✓ 완료';title.append(' ',badge);}
    desc.className='concept-item-desc';desc.textContent=concept.summary;
    const detail=document.createElement('div');detail.className='concept-progress-detail';
    detail.textContent=saved?`최근 ${saved.last_score ?? 0}점 · 최고 ${saved.best_score ?? 0}점 · ${saved.attempts||0}회 풀이`:'아직 학습 기록이 없습니다';
    arrow.className='arrow';arrow.textContent='›';wrap.append(title,desc,detail);b.append(wrap,arrow);b.onclick=()=>selectConcept(concept.id);list.appendChild(b);
  });
  if(!currentCategory.concepts.length)list.innerHTML='<p>이 카테고리에 등록된 개념이 없습니다.</p>';
  document.getElementById("progressText").textContent="개념 선택";showScreen("conceptListScreen");
}
function selectConcept(id){
  currentConcept=currentCategory.concepts.find(x=>x.id===id);conceptReadThisVisit=true;
  document.getElementById("conceptTitle").textContent=currentConcept.title;
  document.getElementById("conceptSummary").textContent=currentConcept.summary;
  document.getElementById("conceptDescription").textContent=currentConcept.description;
  const ul=document.getElementById("keyPoints");ul.innerHTML="";
  currentConcept.keyPoints.forEach(p=>{const li=document.createElement("li");li.textContent=p;ul.appendChild(li);});
  const saved=progressByConcept[currentConcept.id];
  const status=document.getElementById('conceptSavedStatus');
  if(status)status.textContent=saved?.completed?`✓ 완료한 개념 · 최근 ${saved.last_score}점 · 최고 ${saved.best_score}점`:'문제를 끝까지 풀면 학습 완료로 저장됩니다.';
  document.getElementById("progressText").textContent="개념 학습";showScreen("conceptScreen");
}
function startQuestions(){if(!currentConcept||!currentConcept.questions.length){alert("이 개념에는 아직 문제가 없습니다.");return;}currentQuestionIndex=0;currentScore=0;showQuestion();}
function retryConcept(){conceptReadThisVisit=true;startQuestions();}
function showQuestion(){
  answered=false;const q=currentConcept.questions[currentQuestionIndex];
  document.getElementById("questionNumber").textContent=`${currentQuestionIndex+1} / ${currentConcept.questions.length}`;
  document.getElementById("scoreText").textContent=`획득 배점 ${currentScore}`;
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
  if(selected===q.answer){currentScore+=Math.max(1,Number(q.points)||1);result.textContent=`✅ 정답입니다! (+${Math.max(1,Number(q.points)||1)}점)`;result.style.color="var(--correct)";}
  else{buttons[selected].classList.add("wrong");result.textContent=`❌ 오답입니다. 정답은 ${q.answer+1}번입니다.`;result.style.color="var(--wrong)";}
  document.getElementById("answerExplanation").textContent=q.explanation;document.getElementById("scoreText").textContent=`획득 배점 ${currentScore}`;document.getElementById("answerBox").classList.remove("hidden");
}
function nextQuestion(){if(!answered)return;if(currentQuestionIndex<currentConcept.questions.length-1){currentQuestionIndex++;showQuestion();}else showResult();}
async function saveConceptProgress(score,total){
  if(!currentUser){return {saved:false,message:'로그인하면 학습 기록을 저장할 수 있습니다.'};}
  if(!remoteDataAvailable||!currentConcept?.id){return {saved:false,message:'데이터베이스 학습 콘텐츠가 연결되지 않아 기록을 저장하지 못했습니다.'};}
  const percent=Math.round(score/total*100),previous=progressByConcept[currentConcept.id];
  const now=new Date().toISOString();
  const row={user_id:currentUser.id,concept_id:currentConcept.id,completed:true,completed_at:previous?.completed_at||now,last_score:percent,best_score:Math.max(percent,Number(previous?.best_score)||0),attempts:(Number(previous?.attempts)||0)+1,last_studied_at:now,updated_at:now};
  const {data,error}=await quizDb.from('concept_progress').upsert(row,{onConflict:'user_id,concept_id'}).select().single();
  if(error){console.error('학습 진도 저장 실패:',error.message);return {saved:false,message:'기록 저장에 실패했습니다. Supabase 진도 SQL을 실행했는지 확인해 주세요.'};}
  progressByConcept[currentConcept.id]=data;renderHomeStats();return {saved:true,message:'학습 진도가 저장되었습니다.'};
}
async function showResult(){
  const totalPoints=currentConcept.questions.reduce((sum,q)=>sum+Math.max(1,Number(q.points)||1),0),p=totalPoints?Math.round(currentScore/totalPoints*100):0;
  document.getElementById("resultScore").textContent=`획득 ${currentScore} / ${totalPoints}점 · 환산 점수 ${p}점`;
  document.getElementById("resultMessage").textContent=p===100?"모든 문제를 맞혔습니다. 개념을 잘 이해하고 있어요!":p>=70?"좋아요! 핵심 개념을 잘 이해하고 있습니다.":"괜찮아요. 개념 설명을 다시 읽고 한 번 더 풀어보세요.";
  const status=document.getElementById('resultSaveStatus');if(status)status.textContent='학습 기록 저장 중...';
  document.getElementById("progressText").textContent="학습 결과";showScreen("resultScreen");
  if(conceptReadThisVisit){const saved=await saveConceptProgress(currentScore,totalPoints);if(status)status.textContent=saved.message;}
}
async function showDashboard(){
  await loadRemoteData();await loadUserProgress();
  const title=document.getElementById('dashboardGreeting');
  if(title)title.textContent=currentUser?`${currentUser.user_metadata?.display_name||currentUser.email?.split('@')[0]||'회원'}님의 학습실`:'나의 학습실';
  const concepts=allConcepts(),done=completedCount(),percent=concepts.length?Math.round(done/concepts.length*100):0;
  document.getElementById('dashboardProgress').textContent=`${percent}%`;
  const progressBar=document.getElementById('dashboardProgressBar');if(progressBar)progressBar.style.width=`${percent}%`;
  document.getElementById('dashboardCompleted').textContent=`${done} / ${concepts.length}`;
  const records=Object.values(progressByConcept);
  document.getElementById('dashboardAttempts').textContent=`${records.reduce((n,p)=>n+(Number(p.attempts)||0),0)}회`;
  const scores=records.filter(p=>p.last_score!==null&&p.last_score!==undefined).sort((a,b)=>new Date(b.last_studied_at||0)-new Date(a.last_studied_at||0));
  document.getElementById('dashboardRecentScore').textContent=scores.length?`${scores[0].last_score}점`:'-';
  const list=document.getElementById('dashboardConceptList');list.innerHTML='';
  concepts.forEach(concept=>{
    const row=document.createElement('div');row.className='dashboard-concept-row';
    const info=document.createElement('div');info.className='dashboard-concept-info';
    const name=document.createElement('strong');name.textContent=concept.title;
    const detail=document.createElement('span');const saved=progressByConcept[concept.id];detail.textContent=saved?`최근 ${saved.last_score}점 · 최고 ${saved.best_score}점 · ${saved.attempts}회 풀이`:'아직 학습하지 않음';
    info.append(name,detail);const action=document.createElement('button');action.className=saved?.completed?'small-secondary':'small-primary';action.textContent=saved?.completed?'다시 학습':'학습하기';action.onclick=()=>{const category=quizData.find(c=>c.concepts.some(x=>x.id===concept.id));if(category){currentCategory=category;selectConcept(concept.id);}};
    const status=document.createElement('span');status.className=saved?.completed?'completed-badge':'not-completed-badge';status.textContent=saved?.completed?'✓ 완료':'미완료';row.append(status,info,action);list.appendChild(row);
  });
  if(!currentUser){document.getElementById('dashboardLoginNote').textContent='로그인 상태가 아닙니다. 로그인하면 진도와 점수가 계정에 저장됩니다.';}else if(!remoteDataAvailable){document.getElementById('dashboardLoginNote').textContent='데이터베이스 콘텐츠가 연결되지 않아 진도를 저장할 수 없습니다.';}else{document.getElementById('dashboardLoginNote').textContent='개념 설명을 읽고 문제를 끝까지 풀면 완료로 표시됩니다. 다시 풀어도 최고 점수는 유지됩니다.';}
  document.getElementById("progressText").textContent="나의 학습실";showScreen('dashboardScreen');
}
quizDb.auth.onAuthStateChange((_event,session)=>{
  const nextUser=session?.user||null;
  if(nextUser?.id!==currentUser?.id){currentUser=nextUser;loadUserProgress().then(()=>{renderHomeStats();});}
});
showScreen("homeScreen");
initLearning().catch(err=>console.error('학습 초기화 오류:',err));

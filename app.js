let currentCategory=null,currentConcept=null,currentQuestionIndex=0,currentScore=0,answered=false;
const screens=["homeScreen","categoryScreen","conceptListScreen","conceptScreen","quizScreen","resultScreen","dashboardScreen","wrongNotesScreen"];
let remoteLoaded=false,remoteDataAvailable=false,currentUser=null,conceptReadThisVisit=false;
let progressByConcept={},wrongNotesCache=[],wrongReviewMode=false;
const QUIZ_SUPABASE_URL="https://ixaloamlmmwwygmqxkfc.supabase.co";
const QUIZ_SUPABASE_KEY="sb_publishable_oxsexRgt0avACwjuBm01bg_HEG5F1Rm";
const quizDb=window.quizDb || window.supabase.createClient(QUIZ_SUPABASE_URL,QUIZ_SUPABASE_KEY);
window.quizDb=quizDb;

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
        questions:qsRes.data.filter(q=>q.concept_id===con.id).map(q=>({id:q.id,question:q.question,options:Array.isArray(q.options)?q.options:[],answer:Number(q.answer_index)||0,explanation:q.explanation||''}))
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
  if(wrongReviewMode){showWrongNotes();return;}
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
  wrongReviewMode=false;currentConcept=currentCategory.concepts.find(x=>x.id===id);conceptReadThisVisit=true;
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
function startQuestions(){wrongReviewMode=false;if(!currentConcept||!currentConcept.questions.length){alert("이 개념에는 아직 문제가 없습니다.");return;}currentQuestionIndex=0;currentScore=0;showQuestion();}
function retryConcept(){if(wrongReviewMode){startWrongReview();return;}conceptReadThisVisit=true;startQuestions();}
function showQuestion(){
  answered=false;const q=currentConcept.questions[currentQuestionIndex];
  document.getElementById("questionNumber").textContent=`${currentQuestionIndex+1} / ${currentConcept.questions.length}`;
  document.getElementById("scoreText").textContent=`정답 ${currentScore}개`;
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
  document.getElementById("answerExplanation").textContent=q.explanation;document.getElementById("scoreText").textContent=`정답 ${currentScore}개`;document.getElementById("answerBox").classList.remove("hidden");
  if(selected!==q.answer){saveWrongAnswer(q,selected).catch(err=>console.error('오답노트 저장 실패:',err));}
  else if(wrongReviewMode && q._wrongNoteId){
    markWrongNoteResolved(q._wrongNoteId).catch(err=>console.error('복습 완료 저장 실패:',err));
  }
}
async function markWrongNoteResolved(noteId){
  if(!currentUser)return;
  const {error}=await quizDb.from('wrong_notes').update({resolved:true,updated_at:new Date().toISOString()}).eq('id',noteId).eq('user_id',currentUser.id);
  if(error)throw error;
  const note=wrongNotesCache.find(x=>String(x.id)===String(noteId));if(note)note.resolved=true;
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
  const totalPoints=currentConcept.questions.length,p=totalPoints?Math.round(currentScore/totalPoints*100):0;
  document.getElementById("resultScore").textContent=`정답 ${currentScore} / ${currentConcept.questions.length}문제 · 점수 ${p}점`;
  document.getElementById("resultMessage").textContent=wrongReviewMode?(p===100?"훌륭해요! 복습한 오답을 모두 맞혔습니다.":"아직 틀린 문제가 있어요. 오답노트에서 다시 도전해 보세요."):p===100?"모든 문제를 맞혔습니다. 개념을 잘 이해하고 있어요!":p>=70?"좋아요! 핵심 개념을 잘 이해하고 있습니다.":"괜찮아요. 개념 설명을 다시 읽고 한 번 더 풀어보세요.";
  const status=document.getElementById('resultSaveStatus');if(status)status.textContent=wrongReviewMode?'복습 결과는 일반 학습 점수에 반영하지 않았습니다.':'학습 기록 저장 중...';
  document.getElementById("progressText").textContent="학습 결과";showScreen("resultScreen");
  if(conceptReadThisVisit&&!wrongReviewMode){const saved=await saveConceptProgress(currentScore,totalPoints);if(status)status.textContent=saved.message;}
}
function stableQuestionId(q){
  return String(q.id || `static:${currentConcept?.id || 'concept'}:${currentQuestionIndex}`);
}
async function saveWrongAnswer(q, selectedIndex){
  if(!currentUser){return;}
  const questionId=stableQuestionId(q);
  const {data:old,error:readError}=await quizDb.from('wrong_notes').select('id,wrong_count').eq('user_id',currentUser.id).eq('question_id',questionId).maybeSingle();
  if(readError) throw readError;
  const categoryTitle=q._categoryTitle||currentCategory?.name||'';
  const payload={
    user_id:currentUser.id, question_id:questionId, concept_id:String(q._conceptId||currentConcept?.id||''),
    concept_title:q._conceptTitle||currentConcept?.title||'', category_title:categoryTitle,
    question:q.question, options:q.options, answer_index:Number(q.answer)||0,
    selected_index:Number(selectedIndex)||0, explanation:q.explanation||'',
    wrong_count:(Number(old?.wrong_count)||0)+1, resolved:false,
    last_wrong_at:new Date().toISOString(), updated_at:new Date().toISOString()
  };
  if(!old) payload.first_wrong_at=payload.last_wrong_at;
  const {error}=await quizDb.from('wrong_notes').upsert(payload,{onConflict:'user_id,question_id'});
  if(error) throw error;
  const status=document.getElementById('resultSaveStatus');
  if(status) status.textContent='오답이 오답노트에 저장됩니다. (로그인 상태)';
}
async function showWrongNotes(){
  wrongReviewMode=false;
  showScreen('wrongNotesScreen');
  const list=document.getElementById('wrongNotesList');
  const note=document.getElementById('wrongNotesStatus');
  const reviewAll=document.getElementById('wrongReviewAllButton');
  if(!currentUser){note.textContent='오답노트를 이용하려면 먼저 로그인해 주세요.';list.innerHTML='';if(reviewAll)reviewAll.hidden=true;return;}
  note.textContent='오답노트를 불러오는 중...';list.innerHTML='';if(reviewAll)reviewAll.hidden=true;
  const {data,error}=await quizDb.from('wrong_notes').select('*').eq('user_id',currentUser.id).order('last_wrong_at',{ascending:false});
  if(error){console.error('오답노트 조회 실패:',error.message);note.textContent='오답노트를 불러오지 못했습니다. WRONG_NOTES_MIGRATION.sql을 실행했는지 확인해 주세요.';return;}
  const notes=data||[];wrongNotesCache=notes;
  const pending=notes.filter(x=>!x.resolved).length;
  note.textContent=`총 ${notes.length}개 · 복습할 오답 ${pending}개`;
  if(reviewAll){reviewAll.hidden=pending===0;reviewAll.textContent=`🔁 오답만 다시 풀기 (${pending}개)`;}
  if(!notes.length){list.innerHTML='<div class="empty-state">아직 저장된 오답이 없습니다. 로그인한 상태에서 문제를 틀리면 여기에 자동으로 저장됩니다.</div>';return;}
  notes.forEach(item=>{
    const card=document.createElement('article');card.className='wrong-note-card card';
    const top=document.createElement('div');top.className='wrong-note-top';
    const subject=document.createElement('div');subject.className='wrong-note-subject';subject.textContent=`${item.category_title||'경제'} · ${item.concept_title||'개념'}`;
    const badge=document.createElement('span');badge.className=item.resolved?'completed-badge':'not-completed-badge';badge.textContent=item.resolved?'복습 완료':'복습 필요';top.append(subject,badge);
    const question=document.createElement('h3');question.textContent=item.question;
    const choices=document.createElement('ol');choices.className='wrong-note-options';
    (Array.isArray(item.options)?item.options:[]).forEach((option,i)=>{const li=document.createElement('li');li.textContent=`${i+1}. ${option}${i===Number(item.answer_index)?' ✓ 정답':''}${i===Number(item.selected_index)?' · 내가 선택한 답':''}`;if(i===Number(item.answer_index))li.className='right-answer';if(i===Number(item.selected_index)&&i!==Number(item.answer_index))li.className='wrong-answer';choices.appendChild(li);});
    const explanation=document.createElement('p');explanation.className='wrong-note-explanation';explanation.textContent=item.explanation||'등록된 해설이 없습니다.';
    const meta=document.createElement('p');meta.className='muted-note';meta.textContent=`틀린 횟수 ${item.wrong_count||1}회 · 최근 오답 ${item.last_wrong_at?new Date(item.last_wrong_at).toLocaleDateString('ko-KR'):'날짜 정보 없음'}`;
    const actions=document.createElement('div');actions.className='wrong-note-actions';
    const retry=document.createElement('button');retry.className='small-primary';retry.textContent='이 문제 다시 풀기';retry.onclick=()=>startWrongReview(item.id);
    const action=document.createElement('button');action.className=item.resolved?'small-secondary':'small-secondary';action.textContent=item.resolved?'복습 필요로 되돌리기':'복습 완료로 표시';
    action.onclick=async()=>{action.disabled=true;const {error:updateError}=await quizDb.from('wrong_notes').update({resolved:!item.resolved,updated_at:new Date().toISOString()}).eq('id',item.id).eq('user_id',currentUser.id);if(updateError){alert('상태를 변경하지 못했습니다: '+updateError.message);action.disabled=false;return;}showWrongNotes();};
    actions.append(retry,action);card.append(top,question,choices,explanation,meta,actions);list.appendChild(card);
  });
}
async function startWrongReview(noteId=null){
  if(!currentUser){alert('오답 복습을 하려면 먼저 로그인해 주세요.');return;}
  let notes=wrongNotesCache;
  if(!notes.length){const {data,error}=await quizDb.from('wrong_notes').select('*').eq('user_id',currentUser.id).order('last_wrong_at',{ascending:false});if(error){alert('오답을 불러오지 못했습니다: '+error.message);return;}notes=data||[];wrongNotesCache=notes;}
  const selected=noteId===null?notes.filter(x=>!x.resolved):notes.filter(x=>String(x.id)===String(noteId));
  if(!selected.length){alert(noteId===null?'복습할 오답이 없습니다.':'선택한 오답을 찾을 수 없습니다.');return;}
  wrongReviewMode=true;conceptReadThisVisit=false;currentCategory={id:'wrong-review',name:'오답 복습'};
  currentConcept={id:'wrong-review',title:'오답 복습',summary:'틀렸던 문제만 다시 풀어봅니다.',description:'',keyPoints:[],questions:selected.map(item=>({id:item.question_id,question:item.question,options:Array.isArray(item.options)?item.options:[],answer:Number(item.answer_index)||0,explanation:item.explanation||'',_wrongNoteId:item.id,_conceptId:item.concept_id,_conceptTitle:item.concept_title,_categoryTitle:item.category_title}))};
  currentQuestionIndex=0;currentScore=0;showQuestion();
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

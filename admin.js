const ADMIN_SUPABASE_URL='https://ixaloamlmmwwygmqxkfc.supabase.co';
const ADMIN_SUPABASE_KEY='sb_publishable_oxsexRgt0avACwjuBm01bg_HEG5F1Rm';
const db=window.supabase.createClient(ADMIN_SUPABASE_URL,ADMIN_SUPABASE_KEY);
const $=id=>document.getElementById(id);let categories=[],concepts=[],questions=[];
function status(msg,error=false){$('status').textContent=msg;$('status').style.color=error?'#b42318':'var(--muted)';}
function safe(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=txt??'';return e;}
async function init(){
 const {data:{session},error}=await db.auth.getSession();
 if(error||!session){status('관리자 페이지를 이용하려면 먼저 로그인해야 합니다. 로그인 페이지로 이동합니다.',true);setTimeout(()=>location.href='login.html?next=admin.html',800);return;}
 const {data:admin,error:adminErr}=await db.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle();
 if(adminErr||!admin){status('이 계정에는 관리자 권한이 없습니다. 사이트 소유자 계정으로 로그인하세요.',true);return;}
 $('adminApp').classList.remove('hidden');await refresh();
}
async function refresh(){
 status('데이터를 불러오는 중...');
 const [c,co,q]=await Promise.all([db.from('categories').select('*').order('sort_order'),db.from('concepts').select('*').order('sort_order'),db.from('questions').select('*').order('sort_order')]);
 const err=c.error||co.error||q.error;if(err){status('데이터를 불러오지 못했습니다: '+err.message,true);return;}
 categories=c.data||[];concepts=co.data||[];questions=q.data||[];render();status('저장된 콘텐츠를 불러왔습니다.');
}
function render(){
 fillSelect('conceptCategory',categories.map(x=>({value:x.id,label:x.name})),'카테고리를 선택하세요');
 fillSelect('questionConcept',concepts.map(x=>({value:x.id,label:(categories.find(c=>c.id===x.category_id)?.name||'카테고리')+' · '+x.title})),'개념을 선택하세요');
 renderItems('categoryList',categories,x=>x.name,x=>editCategory(x),x=>removeRow('categories',x.id,x.name));
 renderItems('conceptListAdmin',concepts,x=>x.title+' · '+(categories.find(c=>c.id===x.category_id)?.name||''),x=>editConcept(x),x=>removeRow('concepts',x.id,x.title));
 renderItems('questionListAdmin',questions,x=>x.question,x=>editQuestion(x),x=>removeRow('questions',x.id,'이 문제'));
}
function fillSelect(id,items,placeholder){const s=$(id),old=s.value;s.innerHTML='';const op=safe('option','',placeholder);op.value='';s.append(op);items.forEach(i=>{const o=safe('option','',i.label);o.value=i.value;s.append(o)});if(items.some(i=>i.value===old))s.value=old;}
function renderItems(id,items,label,onEdit,onDelete){const list=$(id);list.innerHTML='';if(!items.length){list.append(safe('small','','아직 등록된 항목이 없습니다.'));return;}items.forEach(item=>{const row=safe('div','admin-item',''),info=safe('div','',''),strong=safe('strong','',label(item)),small=safe('small','',item.description||item.summary||'');info.append(strong);if(small.textContent)info.append(small);const actions=safe('div','',''),edit=safe('button','mini-btn','수정'),del=safe('button','mini-btn delete','삭제');edit.type=del.type='button';edit.onclick=()=>onEdit(item);del.onclick=()=>onDelete(item);actions.append(edit,del);row.append(info,actions);list.append(row);});}
function clearCategory(){ $('categoryForm').reset();$('categoryId').value='';$('categoryIcon').value='📘';$('categoryOrder').value='0'; }
function clearConcept(){ $('conceptForm').reset();$('conceptId').value='';$('conceptOrder').value='0'; }
function clearQuestion(){ $('questionForm').reset();$('questionId').value='';$('questionOrder').value='0';$('questionAnswer').value='1'; }
function editCategory(x){$('categoryId').value=x.id;$('categoryName').value=x.name;$('categoryIcon').value=x.icon||'📘';$('categoryDescription').value=x.description||'';$('categoryOrder').value=x.sort_order||0;window.scrollTo({top:0,behavior:'smooth'});}
function editConcept(x){$('conceptId').value=x.id;$('conceptCategory').value=x.category_id;$('conceptTitle').value=x.title;$('conceptSummary').value=x.summary||'';$('conceptDescription').value=x.description||'';$('conceptPoints').value=(x.key_points||[]).join('\n');$('conceptOrder').value=x.sort_order||0;window.scrollTo({top:0,behavior:'smooth'});}
function editQuestion(x){$('questionId').value=x.id;$('questionConcept').value=x.concept_id;$('questionTextAdmin').value=x.question;$('questionOptions').value=(x.options||[]).join('\n');$('questionAnswer').value=String((Number(x.answer_index)||0)+1);$('questionExplanation').value=x.explanation||'';$('questionOrder').value=x.sort_order||0;window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});}
async function saveForm(table,idField,payload,formId){const id=$(idField).value;if(id)payload.id=id;status('저장 중...');const {error}=await db.from(table).upsert(payload).select();if(error){status('저장 실패: '+error.message,true);return;}$(formId).reset();if(idField==='categoryId')clearCategory();if(idField==='conceptId')clearConcept();if(idField==='questionId')clearQuestion();await refresh();status('저장했습니다. 학습 페이지에 반영됩니다.');}
$('categoryForm').addEventListener('submit',e=>{e.preventDefault();saveForm('categories','categoryId',{name:$('categoryName').value.trim(),icon:$('categoryIcon').value.trim()||'📘',description:$('categoryDescription').value.trim(),sort_order:Number($('categoryOrder').value)||0},'categoryForm')});
$('conceptForm').addEventListener('submit',e=>{e.preventDefault();if(!$('conceptCategory').value){status('카테고리를 먼저 선택하세요.',true);return;}saveForm('concepts','conceptId',{category_id:$('conceptCategory').value,title:$('conceptTitle').value.trim(),summary:$('conceptSummary').value.trim(),description:$('conceptDescription').value.trim(),key_points:$('conceptPoints').value.split('\n').map(x=>x.trim()).filter(Boolean),sort_order:Number($('conceptOrder').value)||0},'conceptForm')});
$('questionForm').addEventListener('submit',e=>{e.preventDefault();const options=$('questionOptions').value.split('\n').map(x=>x.trim()).filter(Boolean);if(options.length!==4){status('보기는 빈 줄을 제외하고 정확히 4개 입력하세요.',true);return;}if(!$('questionConcept').value){status('소속 개념을 선택하세요.',true);return;}saveForm('questions','questionId',{concept_id:$('questionConcept').value,question:$('questionTextAdmin').value.trim(),options,answer_index:Number($('questionAnswer').value)-1,explanation:$('questionExplanation').value.trim(),sort_order:Number($('questionOrder').value)||0},'questionForm')});
async function removeRow(table,id,label){if(!confirm(`'${label}' 항목을 삭제할까요?\n연결된 하위 항목도 삭제될 수 있습니다.`))return;const {error}=await db.from(table).delete().eq('id',id);if(error){status('삭제 실패: '+error.message,true);return;}await refresh();status('삭제했습니다.');}
$('categoryClear').onclick=clearCategory;$('conceptClear').onclick=clearConcept;$('questionClear').onclick=clearQuestion;
$('logoutBtn').onclick=async()=>{await db.auth.signOut();location.href='login.html';};
db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')location.href='login.html';});init();

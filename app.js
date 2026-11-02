// PSH 공부 V0.5.0 — EBS 기반 5지선다 실전 문제·채점·선지별 해설·오답 재풀이
// 학습 콘텐츠는 기존 검증 데이터만 재사용하며 새 주장이나 카드 원문을 추가하지 않는다.
const subjects={
 ethics:{name:'생활과 윤리',symbol:'◒',description:'사상가 · 윤리 이론',concepts:window.v033Topics.ethics,quizzes:window.v03Content.ethics,practice:window.pshPracticeV050.ethics},
 culture:{name:'사회·문화',symbol:'◎',description:'사회 현상 · 자료 분석',concepts:window.v033Topics.culture,quizzes:window.v03Content.culture,practice:window.pshPracticeV050.culture}
};
const $=selector=>document.querySelector(selector);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let subjectKey='ethics',mode='concept',index=0,direction='next',unit='all',shuffledIds=null;
let gesture=null,lastSwipeAt=0,detailHistoryActive=false,detailFocusReturn=null;
let studyView='quick',unknownOnly=false,cardRatings={},reviewFilter='all';
let personal={likes:{},bookmarks:{},notes:{}};
let memoKey=null,memoOriginal='',memoFocusReturn=null,memoHistoryActive=false,ignoreNextPop=false;
let settingsHistoryActive=false,settingsFocusReturn=null;
let practiceProgress={},practiceWrongOnly=false,practiceReviewHold=null;
try{
 const records=JSON.parse(localStorage.getItem('psh-practice-v050')||'{}');
 if(records&&typeof records==='object'&&!Array.isArray(records))practiceProgress=records;
}catch(_){}
try{practiceWrongOnly=localStorage.getItem('psh-practice-wrong-v050')==='true'}catch(_){}
function practiceKey(question){return subjectKey+':'+question.id}
function practiceState(question){return practiceProgress[practiceKey(question)]||{selected:null,submitted:false,attempts:0,lastCorrect:null}}
function savePractice(){
 try{localStorage.setItem('psh-practice-v050',JSON.stringify(practiceProgress));return true}
 catch(_){window.alert?.('문제 풀이 기록을 저장하지 못했어요. 저장 공간을 확인해 주세요.');return false}
}
function practiceStats(){
 const all=subjects[subjectKey].practice;
 const solved=all.filter(x=>practiceState(x).attempts>0);
 return {total:all.length,solved:solved.length,correct:solved.filter(x=>practiceState(x).lastCorrect===true).length,wrong:solved.filter(x=>practiceState(x).lastCorrect===false).length};
}
function updatePracticeToolbar(){
 const active=mode==='practice',stats=practiceStats();
 $('#practiceToolbar').hidden=!active;
 $('#practiceWrongOnly').textContent=(practiceWrongOnly?'오답만 보기 ✓':'오답만 다시 풀기')+' ('+stats.wrong+')';
 $('#practiceWrongOnly').setAttribute('aria-pressed',String(practiceWrongOnly));
 $('#practiceStats').textContent='풀이 '+stats.solved+'/'+stats.total+' · 최근 정답 '+stats.correct;
 $('#cardViewport').classList.toggle('practice-viewport',active);
}
function togglePracticeWrong(){
 if(mode!=='practice')return;
 practiceWrongOnly=!practiceWrongOnly;practiceReviewHold=null;shuffledIds=null;index=0;
 localStorage.setItem('psh-practice-wrong-v050',String(practiceWrongOnly));
 renderStudy();
}
const answerLabels=['①','②','③','④','⑤'];
function practiceCard(question){
 const state=practiceState(question),submitted=state.submitted===true;
 const options=question.choices.map((choice,i)=>{
  let status='';
  if(submitted){if(i===question.answer)status=' is-correct';else if(i===state.selected)status=' is-wrong'}
  return `<button type="button" class="practice-choice${status}${state.selected===i?' is-selected':''}" data-choice="${i}" aria-pressed="${state.selected===i}" ${submitted?'disabled':''}><span class="practice-number">${answerLabels[i]}</span><span>${escapeHtml(choice)}</span></button>`;
 }).join('');
 const feedback=submitted?`<section class="practice-feedback" aria-live="polite"><h3 class="${state.selected===question.answer?'correct':'wrong'}">${state.selected===question.answer?'정답입니다!':'오답입니다.'} 정답 ${answerLabels[question.answer]}</h3><p class="practice-explain-summary">${escapeHtml(question.summary)}</p><h4>선지별 해설</h4>${question.rationales.map((why,i)=>`<p class="practice-reason"><strong>${answerLabels[i]} ${i===question.answer?'✓ 정답':'✕'}</strong> ${escapeHtml(why)}</p>`).join('')}<p class="practice-source">근거: ${escapeHtml(question.source)}<br>기출 원문이 아닌 자체 제작 학습 문항입니다.</p></section>`:'';
 return `<div class="practice-scroll" tabindex="0" role="region" aria-label="5지선다 문제 풀이"><div class="practice-kicker">${escapeHtml(question.chapterId)} · 자체 제작 5지선다</div><h2>${escapeHtml(question.title)}</h2><p class="practice-stem">${escapeHtml(question.stem)}</p><div class="practice-choices" role="group" aria-label="답 선택">${options}</div>${feedback}</div><div class="practice-footer">${submitted?'<button type="button" id="practiceRetry">다시 풀기</button><button type="button" id="practiceNext" class="primary">다음 문제 →</button>':`<span class="practice-selection">${state.selected===null?'정답을 하나 고르세요.':'선택 '+answerLabels[state.selected]}</span><button type="button" id="practiceSubmit" class="primary" ${state.selected===null?'disabled':''}>정답 확인</button>`}</div>`;
}
function changePracticeChoice(choice){
 const item=deck()[index];if(mode!=='practice'||!item)return;
 const previous=practiceState(item);
 if(previous.submitted)return;
 const oldScroll=$('#studyCard').querySelector('.practice-scroll')?.scrollTop||0;
 const key=practiceKey(item);
 practiceProgress[key]={...previous,selected:choice};
 if(!savePractice()){practiceProgress[key]=previous;return}
 renderStudy();
 const scroller=$('#studyCard').querySelector('.practice-scroll');if(scroller)scroller.scrollTop=oldScroll;
}
function submitPractice(){
 const item=deck()[index];if(mode!=='practice'||!item)return;
 const prior=practiceState(item);
 if(prior.submitted||!Number.isInteger(prior.selected)||prior.selected<0||prior.selected>4)return;
 const oldScroll=$('#studyCard').querySelector('.practice-scroll')?.scrollTop||0;
 const key=practiceKey(item),correct=prior.selected===item.answer;
 practiceProgress[key]={...prior,submitted:true,attempts:(prior.attempts||0)+1,lastCorrect:correct};
 if(!savePractice()){practiceProgress[key]=prior;return}
 if(practiceWrongOnly&&correct)practiceReviewHold=item.id;
 renderStudy();
 const scroller=$('#studyCard').querySelector('.practice-scroll');if(scroller)scroller.scrollTop=oldScroll;
}
function retryPractice(){
 const item=deck()[index];if(mode!=='practice'||!item)return;
 const old=practiceState(item),key=practiceKey(item);
 practiceProgress[key]={...old,selected:null,submitted:false};
 if(!savePractice()){practiceProgress[key]=old;return}
 renderStudy();
}
function nextPractice(){
 if(practiceReviewHold){
  const current=practiceReviewHold;practiceReviewHold=null;
  const items=deck();index=items.length?Math.min(index,items.length-1):0;
  renderStudy();return;
 }
 move(1);
}
function bindPractice(card){
 card.querySelectorAll('.practice-choice').forEach(button=>button.onclick=()=>changePracticeChoice(Number(button.dataset.choice)));
 const submit=card.querySelector('#practiceSubmit');
 if(submit)submit.onclick=submitPractice;
 const retry=card.querySelector('#practiceRetry');
 if(retry)retry.onclick=retryPractice;
 const next=card.querySelector('#practiceNext');
 if(next)next.onclick=nextPractice;
}

try{
 const viewSettings=JSON.parse(localStorage.getItem('psh-view-v041')||'{}');
 studyView=viewSettings.mode==='reading'?'reading':'quick';
 unknownOnly=viewSettings.unknownOnly===true;
}catch(_){}
reviewFilter=unknownOnly?'unknown':'all';
try{
 const updatedView=JSON.parse(localStorage.getItem('psh-view-v042')||'{}');
 if(['all','unknown','bookmark','liked'].includes(updatedView.filter))reviewFilter=updatedView.filter;
}catch(_){}
unknownOnly=reviewFilter==='unknown';
try{
 const storedPersonal=JSON.parse(localStorage.getItem('psh-personal-v042')||'{}');
 for(const category of ['likes','bookmarks','notes']){
  if(storedPersonal[category]&&typeof storedPersonal[category]==='object'&&!Array.isArray(storedPersonal[category])){
   personal[category]=storedPersonal[category];
  }
 }
}catch(_){}
try{
 const savedRatings=JSON.parse(localStorage.getItem('psh-ratings-v041')||'{}');
 if(savedRatings&&typeof savedRatings==='object'&&!Array.isArray(savedRatings))cardRatings=savedRatings;
}catch(_){}
function saveView(){
 localStorage.setItem('psh-view-v041',JSON.stringify({mode:studyView,unknownOnly:reviewFilter==='unknown'}));
 localStorage.setItem('psh-view-v042',JSON.stringify({filter:reviewFilter}));
}
function savePersonal(){
 try{localStorage.setItem('psh-personal-v042',JSON.stringify(personal));return true}
 catch(_){window.alert?.('기기에 기록을 저장하지 못했어요. 저장 공간을 확인해 주세요.');return false}
}
function currentCard(){return mode==='concept'?deck()[index]||null:null}
function personalKey(item){return subjectKey+':'+item.id}
function personalActions(item){
 const key=personalKey(item),liked=personal.likes[key]===true,bookmarked=personal.bookmarks[key]===true,noted=Boolean(personal.notes[key]);
 return `<div class="personal-actions" role="group" aria-label="카드 개인화 기능"><button type="button" class="personal-control ${liked?'active':''}" data-action="like" aria-pressed="${liked}" aria-label="좋아요 ${liked?'취소':'추가'}"><span aria-hidden="true">${liked?'♥':'♡'}</span> 좋아요</button><button type="button" class="personal-control ${noted?'has-note':''}" data-action="note" aria-label="개인 메모 ${noted?'수정':'작성'}"><span aria-hidden="true">✎</span> 메모${noted?' ✓':''}</button><button type="button" class="personal-control ${bookmarked?'active':''}" data-action="bookmark" aria-pressed="${bookmarked}" aria-label="즐겨찾기 ${bookmarked?'해제':'추가'}"><span aria-hidden="true">${bookmarked?'★':'☆'}</span> 저장</button></div>`;
}
function bindPersonal(container){
 container.querySelectorAll('.personal-control').forEach(button=>{
  button.onclick=()=>{const kind=button.dataset.action;if(kind==='note')openMemo();else togglePersonal(kind)};
 });
}
function ratingKey(item){return subjectKey+':'+item.id}
function ratingOf(item){return cardRatings[ratingKey(item)]||null}
function ratingActions(item){
 const rated=ratingOf(item);
 return `<div class="rating-actions" role="group" aria-label="개념 이해도 기록"><button type="button" class="rating-control ${rated==='known'?'selected known':''}" data-rating="known" aria-pressed="${rated==='known'}">✓ 알겠음</button><button type="button" class="rating-control ${rated==='unknown'?'selected unknown':''}" data-rating="unknown" aria-pressed="${rated==='unknown'}">? 모르겠음</button></div>`;
}
function updateToolbar(){
 const concept=mode==='concept';
 $('#modeToolbar').hidden=!concept;
 $('#quickMode').setAttribute('aria-pressed',String(studyView==='quick'));
 $('#readingMode').setAttribute('aria-pressed',String(studyView==='reading'));
 $('#quickMode').classList.toggle('active',studyView==='quick');
 $('#readingMode').classList.toggle('active',studyView==='reading');
 const candidates=subjects[subjectKey].concepts.filter(item=>unit==='all'||item.chapterId===unit);
 const counts={
  unknown:candidates.filter(item=>ratingOf(item)==='unknown').length,
  bookmark:candidates.filter(item=>personal.bookmarks[personalKey(item)]===true).length,
  liked:candidates.filter(item=>personal.likes[personalKey(item)]===true).length
 };
 const filter=$('#reviewFilter');
 filter.innerHTML='<option value="all">전체 카드 ('+candidates.length+')</option>'+
  '<option value="unknown">모르는 카드 ('+counts.unknown+')</option>'+
  '<option value="bookmark">즐겨찾기 ('+counts.bookmark+')</option>'+
  '<option value="liked">좋아요 ('+counts.liked+')</option>';
 filter.value=reviewFilter;
 $('#cardViewport').classList.toggle('reading-viewport',concept&&studyView==='reading');
}
function changeStudyView(next){
 if(!$('#studyDetail').hidden||mode!=='concept'||!['quick','reading'].includes(next))return;
 studyView=next;gesture=null;saveView();renderStudy();
}
function changeReviewFilter(next){
 if(!$('#studyDetail').hidden||!$('#memoOverlay').hidden||mode!=='concept'||!['all','unknown','bookmark','liked'].includes(next))return;
 const selected=currentCard()?.id;
 reviewFilter=next;unknownOnly=next==='unknown';gesture=null;shuffledIds=null;saveView();
 const match=deck().findIndex(item=>item.id===selected);
 index=match>=0?match:0;renderStudy();
}
function markCurrent(status){
 if(mode!=='concept'||!['known','unknown'].includes(status))return;
 const item=deck()[index];if(!item)return;
 const previousScroll=$('#studyCard').querySelector('.reading-scroll')?.scrollTop||0;
 const key=ratingKey(item);
 if(cardRatings[key]===status)delete cardRatings[key];else cardRatings[key]=status;
 localStorage.setItem('psh-ratings-v041',JSON.stringify(cardRatings));
 const remains=(!unknownOnly||ratingOf(item)==='unknown');
 if(!remains){const available=deck();index=Math.min(index,Math.max(0,available.length-1));}
 renderStudy();
 if(remains){const scroller=$('#studyCard').querySelector('.reading-scroll');if(scroller)scroller.scrollTop=previousScroll;}
}
let saved=null;try{saved=JSON.parse(localStorage.getItem('psh-progress')||'null')}catch(_){}
if(saved&&subjects[saved.subjectKey]){
 subjectKey=saved.subjectKey;mode=['concept','quiz','practice'].includes(saved.mode)?saved.mode:'concept';
 index=Math.max(0,Number(saved.index)||0);
}
if(localStorage.getItem('psh-theme')==='dark')document.body.classList.add('dark');
function persist(){localStorage.setItem('psh-progress',JSON.stringify({subjectKey,mode,index,unit}))}
function itemId(item){return mode==='concept'||mode==='practice'?item.id:item[0]}
function deck(){
 const all=mode==='concept'?subjects[subjectKey].concepts:mode==='practice'?subjects[subjectKey].practice:subjects[subjectKey].quizzes;
 const items=all.filter(item=>{
  if(!(unit==='all'||(mode==='concept'||mode==='practice'?item.chapterId===unit:item[3].some(tag=>tag.startsWith(unit)))))return false;
  if(mode==='practice')return !practiceWrongOnly||(practiceState(item).attempts>0&&practiceState(item).lastCorrect===false)||practiceReviewHold===item.id;
  if(mode!=='concept'||reviewFilter==='all')return true;
  if(reviewFilter==='unknown')return ratingOf(item)==='unknown';
  if(reviewFilter==='bookmark')return personal.bookmarks[personalKey(item)]===true;
  if(reviewFilter==='liked')return personal.likes[personalKey(item)]===true;
  return false;
 });
 if(shuffledIds)items.sort((a,b)=>shuffledIds.indexOf(itemId(a))-shuffledIds.indexOf(itemId(b)));
 return items;
}
function renderHome(){
 $('#subjectGrid').innerHTML=Object.entries(subjects).map(([key,s])=>`<button class="subject-card" data-subject="${key}"><div class="symbol">${s.symbol}</div><strong>${s.name}</strong><small>${s.concepts.length}개 주제 · ${s.quizzes.length}개 문항별 복습</small></button>`).join('');
 document.querySelectorAll('[data-subject]').forEach(button=>button.onclick=()=>openStudy(button.dataset.subject));
}
function fillUnits(){
 const units=mode==='quiz'?[{value:'6모',label:'6월 모평'},{value:'9모',label:'9월 모평'}]:window.v034Curriculum.chapters.filter(ch=>ch.subject===subjectKey&&(mode==='concept'||subjects[subjectKey].practice.some(q=>q.chapterId===ch.id))).map(ch=>({value:ch.id,label:String(ch.number).padStart(2,'0')+'. '+ch.name+' · '+(mode==='practice'?subjects[subjectKey].practice.filter(q=>q.chapterId===ch.id).length:subjects[subjectKey].concepts.filter(t=>t.chapterId===ch.id).length)+(mode==='practice'?'문항':'장')}));
 $('#unitFilter').innerHTML='<option value="all">전체 카드</option>'+units.map(x=>`<option value="${escapeHtml(x.value)}">${escapeHtml(x.label)}</option>`).join('');
 $('#unitFilter').value=unit;
}
function openStudy(key){
 if(!subjects[key])return;
 if(subjectKey!==key&&reviewFilter!=='all'){reviewFilter='all';unknownOnly=false;saveView();}
 subjectKey=key;index=0;unit='all';shuffledIds=null;direction='next';gesture=null;practiceReviewHold=null;
 $('#studyDetail').hidden=true;detailHistoryActive=false;
 $('#home').hidden=true;$('#study').hidden=false;
 if(location.hash!==`#${key}`)history.pushState({study:true},'',`#${key}`);
 fillUnits();renderStudy();
}
function closeStudy(){
 if(!$('#shortsSettings').hidden){closeShortsSettings(true);return;}
 if(!$('#memoOverlay').hidden){closeMemo(true);return;}
 if(!$('#studyDetail').hidden){closeDetail(true);return;}
 history.replaceState({},'',location.pathname+location.search);
 $('#study').hidden=true;$('#home').hidden=false;renderHome();
}
function topicPreview(item){
 const preview=item.sections.slice(0,3).map(part=>`<div class="feed-person"><strong>${escapeHtml(part.name)}</strong><p>${escapeHtml(part.points[0]||'')}</p></div>`).join('');
 const rest=item.sections.length>3?`<p class="feed-more-count">그 외 ${item.sections.length-3}개 항목은 상세에서 확인</p>`:'';
 return `<div class="feed-main"><div class="card-kicker">${escapeHtml(item.chapterId||item.unit)}</div><h2 class="topic-title">${escapeHtml(item.title)}</h2><p class="feed-summary">${escapeHtml(item.summary)}</p><div class="feed-people">${preview}</div>${rest}</div><button type="button" class="read-more" aria-label="${escapeHtml(item.title)} 전체 개념 자세히 보기">전체 개념 자세히 보기</button>`;
}
function examPreview(item){
 return `<div class="feed-main"><div class="card-kicker">기출 문항별 복습 · ${item[3].map(escapeHtml).join(' · ')}</div><h2 class="topic-title">${escapeHtml(item[1])}</h2><p class="feed-summary">${escapeHtml(item[2])}</p><div class="feed-people"><div class="feed-person"><strong>정오 판단 포인트</strong><p>${escapeHtml(item[4]||'')}</p></div></div></div><button type="button" class="read-more" aria-label="문항별 복습 전체 내용 보기">전체 복습 자세히 보기</button>`;
}
function topicDetail(item){
 const sections=item.sections.map(part=>`<section class="detail-section"><h3>${escapeHtml(part.name)}</h3><ul>${part.points.map(point=>`<li>${escapeHtml(point)}</li>`).join('')}</ul></section>`).join('');
 return `<div class="detail-kicker">${escapeHtml(item.chapterId||item.unit)} · 검증 개념</div><h2 class="detail-title">${escapeHtml(item.title)}</h2><p class="detail-summary">${escapeHtml(item.summary)}</p>${sections}<section class="detail-trap"><h3>수능 함정</h3><p>${escapeHtml(item.trap)}</p></section><div class="detail-source"><details><summary>출처 보기</summary><p>${(item.sources||[]).map(escapeHtml).join(' · ')}</p></details></div>`;
}
function readingTopic(item){
 const sections=item.sections.map(part=>`<section class="detail-section"><h3>${escapeHtml(part.name)}</h3><ul>${part.points.map(point=>`<li>${escapeHtml(point)}</li>`).join('')}</ul></section>`).join('');
 return `<div class="reading-heading"><div class="card-kicker">${escapeHtml(item.chapterId||item.unit)} · 정독 모드</div><h2 class="topic-title">${escapeHtml(item.title)}</h2></div><div class="reading-scroll" tabindex="0" role="region" aria-label="전체 개념 본문"><p class="detail-summary">${escapeHtml(item.summary)}</p>${sections}<section class="detail-trap"><h3>수능 함정</h3><p>${escapeHtml(item.trap)}</p></section><div class="detail-source"><details><summary>출처 보기</summary><p>${(item.sources||[]).map(escapeHtml).join(' · ')}</p></details></div></div>${personalActions(item)}${ratingActions(item)}`;
}
function examDetail(item){
 return `<div class="detail-kicker">기출 문항별 복습 · ${item[3].map(escapeHtml).join(' · ')}</div><h2 class="detail-title">${escapeHtml(item[1])}</h2><p class="detail-summary">${escapeHtml(item[2])}</p><section class="detail-trap"><h3>정오 판단 포인트</h3><p>${escapeHtml(item[4]||'')}</p></section><p class="detail-source">문항 원문이 아닌 개념 복습 카드입니다. ${escapeHtml(item[6]||'')}</p>`;
}
function renderStudy(){
 const items=deck(),s=subjects[subjectKey];
 const shorts=mode==='concept'&&studyView==='quick';
 $('#study').classList.toggle('shorts-layout',shorts);
 $('#shortsSettingsButton').hidden=!shorts;
 if(!shorts)closeShortsSettings(false);
 $('#subjectTitle').textContent=shorts?'PSH 공부':s.name;
 document.querySelectorAll('.tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.mode===mode));
 const card=$('#studyCard');
 card.className=mode==='practice'?'study-card practice-card':mode==='concept'&&studyView==='reading'?'study-card reading-card':'study-card feed-card';
 updateToolbar();updatePracticeToolbar();
 gesture=null;
 if(!items.length){
  const filtering=(mode==='concept'&&reviewFilter!=='all')||(mode==='practice'&&practiceWrongOnly);
  $('#cardCounter').textContent=filtering?'0 / 0':'검증 대기';
  $('#progressText').textContent=filtering?'선택 목록에 카드 없음':'공개 콘텐츠 0장';
  const name=mode==='practice'?'다시 풀 오답 문제':({unknown:'모르는 카드',bookmark:'즐겨찾기',liked:'좋아요'}[reviewFilter]||'선택 목록');
  card.innerHTML=filtering?'<div class="feed-main empty-state"><h2>'+name+'가 없어요.</h2><p>다른 카드에서 표시하거나 위의 복습 목록을 전체 카드로 변경해 주세요.</p></div>':'<div class="feed-main"><h2>검증 중인 콘텐츠입니다</h2><p>원본과 대조한 내용만 공개해요.</p></div>';
  return;
 }
 index=Math.max(0,Math.min(index,items.length-1));
 const item=items[index];
 $('#cardCounter').textContent=`${index+1} / ${items.length}`;
 $('#progressText').textContent=mode==='practice'?'5지선다 · 채점 후 해설':mode==='concept'&&studyView==='reading'?'↕ 본문 · ↔ 카드':'↑ 다음 · ↓ 이전';
 card.innerHTML=mode==='practice'?practiceCard(item):mode==='concept'?(studyView==='reading'?readingTopic(item):topicPreview(item)+personalActions(item)+ratingActions(item)):examPreview(item);
 card.querySelector('.read-more')?.addEventListener('click',openDetail);
 card.querySelectorAll('.rating-control').forEach(button=>button.onclick=()=>markCurrent(button.dataset.rating));
 if(mode==='concept')bindPersonal(card);
 if(mode==='practice')bindPractice(card);
 persist();
}
function move(step){
 if(!$('#studyDetail').hidden)return false;
 if(mode==='practice'&&practiceReviewHold){nextPractice();return true;}
 const items=deck();if(!items.length)return false;
 direction=step>0?'next':'previous';index=(index+step+items.length)%items.length;
 renderStudy();return true;
}
function shuffle(){
 const items=deck();shuffledIds=items.map(itemId);
 for(let i=shuffledIds.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffledIds[i],shuffledIds[j]]=[shuffledIds[j],shuffledIds[i]]}
 index=0;renderStudy();
}
function openDetail(){
 if(!$('#studyDetail').hidden)return;
 const item=deck()[index];if(!item)return;
 gesture=null;detailFocusReturn=document.activeElement;
 $('#detailContent').innerHTML=mode==='concept'?topicDetail(item):examDetail(item);
// 상세 읽기에서는 쇼츠형 좋아요·메모·저장 UI를 표시하지 않는다.
 $('#studyDetail').hidden=false;$('#detailScroll').scrollTop=0;
 $('#detailClose').focus();
 history.pushState({studyDetail:true},'',location.href);
 detailHistoryActive=true;
}
function closeDetail(goBack){
 if($('#studyDetail').hidden)return;
 $('#studyDetail').hidden=true;
 gesture=null;
 if(detailFocusReturn?.isConnected)detailFocusReturn.focus();
 detailFocusReturn=null;
 if(goBack&&detailHistoryActive&&typeof history.back==='function')history.back();
 detailHistoryActive=false;
}
// Shorts에서는 학습 필터와 단원 컨트롤을 설정 창으로 옮긴다.
function openShortsSettings(){
 if(!$('#shortsSettings').hidden||$('#study').hidden||mode!=='concept'||studyView!=='quick')return;
 settingsFocusReturn=document.activeElement;
 const filter=$('#shortsReviewFilter'),unitSelect=$('#shortsUnitFilter');
 filter.innerHTML=$('#reviewFilter').innerHTML;filter.value=reviewFilter;
 unitSelect.innerHTML=$('#unitFilter').innerHTML;unitSelect.value=unit;
 $('#shortsTabConcept').setAttribute('aria-pressed','true');
 $('#shortsTabQuiz').setAttribute('aria-pressed','false');
 $('#shortsTabPractice').setAttribute('aria-pressed','false');
 $('#shortsSettings').hidden=false;gesture=null;
 $('#shortsSettingsClose').focus();
 history.pushState({shortsSettings:true},'',location.href);
 settingsHistoryActive=true;
}
function closeShortsSettings(goBack){
 if($('#shortsSettings').hidden)return;
 $('#shortsSettings').hidden=true;gesture=null;
 if(settingsFocusReturn?.isConnected)settingsFocusReturn.focus();
 settingsFocusReturn=null;
 if(goBack&&settingsHistoryActive&&typeof history.back==='function'){
  ignoreNextPop=true;history.back();
 }
 settingsHistoryActive=false;
}
$('#shortsSettingsButton').onclick=openShortsSettings;
$('#shortsSettingsClose').onclick=()=>closeShortsSettings(true);
$('#shortsSettingsBackdrop').onclick=()=>closeShortsSettings(true);
$('#shortsReviewFilter').onchange=e=>{
 const next=e.target.value;closeShortsSettings(true);changeReviewFilter(next);
};
$('#shortsUnitFilter').onchange=e=>{
 const next=e.target.value;closeShortsSettings(true);
 $('#unitFilter').value=next;$('#unitFilter').onchange({target:{value:next}});
};
$('#shortsRandom').onclick=()=>{closeShortsSettings(true);shuffle()};
$('#shortsTheme').onclick=()=>{$('#themeButton').onclick();closeShortsSettings(true)};
$('#shortsTabConcept').onclick=()=>closeShortsSettings(true);
$('#shortsTabPractice').onclick=()=>{
 closeShortsSettings(true);
 const button=document.querySelector('.tab[data-mode="practice"]');
 if(button)button.onclick?.();
};
$('#shortsTabQuiz').onclick=()=>{
 closeShortsSettings(true);
 const button=document.querySelector('.tab[data-mode="quiz"]');
 if(button)button.onclick?.();
};
// 카드는 항상 과목+검증된 고유 ID로 연결한다. 개인 기록은 서버로 전송되지 않는다.
function updatePersonalInView(){
 const item=currentCard();if(!item||mode!=='concept')return;
 const key=personalKey(item);
 for(const target of [$('#studyCard'),$('#detailContent')]){
  target.querySelectorAll('.personal-control').forEach(button=>{
   const action=button.dataset.action;
   const active=action==='like'?personal.likes[key]===true:action==='bookmark'?personal.bookmarks[key]===true:Boolean(personal.notes[key]);
   button.classList.toggle('active',active&&action!=='note');
   button.classList.toggle('has-note',active&&action==='note');
   if(action==='note'){
    button.innerHTML='<span aria-hidden="true">✎</span> 메모'+(active?' ✓':'');
    button.setAttribute('aria-label','개인 메모 '+(active?'수정':'작성'));
   }else{
    const icon=action==='like'?(active?'♥':'♡'):(active?'★':'☆');
    const label=action==='like'?'좋아요':'저장';
    button.innerHTML='<span aria-hidden="true">'+icon+'</span> '+label;
    button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',(action==='like'?'좋아요 ':'즐겨찾기 ')+(active?'해제':'추가'));
   }
  });
 }
}
function togglePersonal(kind){
 if(mode!=='concept'||!['like','bookmark'].includes(kind)||!$('#memoOverlay').hidden)return;
 const item=currentCard();if(!item)return;
 const key=personalKey(item),bucket=kind==='like'?personal.likes:personal.bookmarks;
 const wasSaved=bucket[key]===true;
 if(wasSaved)delete bucket[key];else bucket[key]=true;
 if(!savePersonal()){
  if(wasSaved)bucket[key]=true;else delete bucket[key];
  return;
 }
 const shouldRemove=wasSaved&&((reviewFilter==='liked'&&kind==='like')||(reviewFilter==='bookmark'&&kind==='bookmark'));
 if(shouldRemove){
  if(!$('#studyDetail').hidden)closeDetail(true);
  const available=deck();index=Math.min(index,Math.max(0,available.length-1));renderStudy();
 }else{
  updatePersonalInView();updateToolbar();
 }
}
function openMemo(){
 if(mode!=='concept'||!$('#memoOverlay').hidden)return;
 const item=currentCard();if(!item)return;
 memoKey=personalKey(item);
 memoOriginal=personal.notes[memoKey]||'';
 memoFocusReturn=document.activeElement;
 $('#memoTitle').textContent=item.title+' · 개인 메모';
 $('#memoInput').value=memoOriginal;
 $('#memoDelete').hidden=!memoOriginal;
 $('#memoOverlay').hidden=false;
 gesture=null;
 $('#memoInput').focus();
 history.pushState({memo:true},'',location.href);
 memoHistoryActive=true;
}
function closeMemo(goBack){
 if($('#memoOverlay').hidden)return true;
 if($('#memoInput').value!==memoOriginal&&typeof window.confirm==='function'&&!window.confirm('저장하지 않은 메모가 있어요. 버릴까요?'))return false;
 $('#memoOverlay').hidden=true;memoKey=null;gesture=null;
 if(memoFocusReturn?.isConnected)memoFocusReturn.focus();
 memoFocusReturn=null;
 if(goBack&&memoHistoryActive&&typeof history.back==='function'){
  ignoreNextPop=true;history.back();
 }
 memoHistoryActive=false;
 return true;
}
function saveMemo(){
 if(!memoKey)return;
 const text=$('#memoInput').value.trim(),previous=personal.notes[memoKey];
 if(text)personal.notes[memoKey]=text;else delete personal.notes[memoKey];
 if(!savePersonal()){
  if(previous===undefined)delete personal.notes[memoKey];else personal.notes[memoKey]=previous;
  return;
 }
 memoOriginal=$('#memoInput').value;
 closeMemo(true);updatePersonalInView();
}
function deleteMemo(){
 if(!memoKey||!personal.notes[memoKey])return;
 if(typeof window.confirm==='function'&&!window.confirm('이 카드의 메모를 삭제할까요?'))return;
 const backup=personal.notes[memoKey];delete personal.notes[memoKey];
 if(!savePersonal()){personal.notes[memoKey]=backup;return}
 memoOriginal=$('#memoInput').value;closeMemo(true);updatePersonalInView();
}
$('#memoCancel').onclick=()=>closeMemo(true);
$('#memoSave').onclick=saveMemo;
$('#memoDelete').onclick=deleteMemo;
document.querySelectorAll('.tab').forEach(button=>button.onclick=()=>{if(!$('#studyDetail').hidden)return;mode=button.dataset.mode;index=0;unit='all';shuffledIds=null;practiceReviewHold=null;fillUnits();renderStudy()});
$('#unitFilter').onchange=e=>{unit=e.target.value;index=0;shuffledIds=null;renderStudy()};
$('#randomButton').onclick=shuffle;$('#backButton').onclick=closeStudy;
$('#practiceWrongOnly').onclick=togglePracticeWrong;
$('#quickMode').onclick=()=>changeStudyView('quick');
$('#readingMode').onclick=()=>changeStudyView('reading');
$('#reviewFilter').onchange=e=>changeReviewFilter(e.target.value);
$('#previousTopic').onclick=()=>move(-1);$('#nextTopic').onclick=()=>move(1);
$('#detailClose').onclick=()=>closeDetail(true);
$('#themeButton').onclick=()=>{
 document.body.classList.toggle('dark');const dark=document.body.classList.contains('dark');
 localStorage.setItem('psh-theme',dark?'dark':'light');
 document.querySelector('meta[name="theme-color"]').content=dark?'#171513':'#f8f6f2';
};
// 피드에는 스크롤 가능한 본문이 없으며 한 손가락의 명확한 세로 스와이프만 처리한다.
const viewport=$('#cardViewport');
viewport.addEventListener('touchstart',e=>{
 gesture=null;
 if(mode==='practice'||!$('#shortsSettings').hidden||!$('#studyDetail').hidden||e.touches.length!==1||e.target?.closest?.('button,a,input,select,textarea,summary,details'))return;
 const t=e.touches[0];
 gesture={x:t.clientX,y:t.clientY,started:Date.now(),identifier:t.identifier};
},{passive:true});
viewport.addEventListener('touchmove',e=>{
 if(gesture&&$('#studyDetail').hidden&&$('#shortsSettings').hidden&&!(mode==='concept'&&studyView==='reading')&&e.cancelable)e.preventDefault();
},{passive:false});
viewport.addEventListener('touchend',e=>{
 const g=gesture;gesture=null;
 if(!g||!$('#shortsSettings').hidden||!$('#studyDetail').hidden||e.changedTouches.length!==1)return;
 const t=e.changedTouches[0];
 if(g.identifier!==undefined&&t.identifier!==undefined&&g.identifier!==t.identifier)return;
 const dx=t.clientX-g.x,dy=t.clientY-g.y,elapsed=Date.now()-g.started;
 if(elapsed>1600)return;
 const reading=mode==='concept'&&studyView==='reading';
 if(reading){
  // 정독에서는 세로 움직임을 절대로 카드 이동으로 처리하지 않는다.
  if(Math.abs(dx)<100||Math.abs(dx)<Math.abs(dy)*1.75)return;
 }else{
  const threshold=Math.max(100,Math.min(160,Math.round((viewport.clientHeight||600)*0.18)));
  if(Math.abs(dy)<threshold||Math.abs(dy)<Math.abs(dx)*1.5)return;
 }
 const now=Date.now();if(now-lastSwipeAt<400)return;
 lastSwipeAt=now;move(reading?(dx<0?1:-1):(dy<0?1:-1));
},{passive:true});
viewport.addEventListener('touchcancel',()=>{gesture=null},{passive:true});
window.addEventListener('blur',()=>{gesture=null});
function syncRoute(){
 if(ignoreNextPop){ignoreNextPop=false;return;}
 if(!$('#shortsSettings').hidden){closeShortsSettings(false);return;}
 if(!$('#memoOverlay').hidden){
  if(!closeMemo(false)&&typeof history.pushState==='function')history.pushState({memo:true},'',location.href);
  return;
 }
 if(!$('#studyDetail').hidden){closeDetail(false);return;}
 if(!location.hash&&!$('#study').hidden){$('#study').hidden=true;$('#home').hidden=false;renderHome();}
}
window.onpopstate=syncRoute;window.onhashchange=syncRoute;
document.addEventListener('keydown',e=>{
 if(!$('#shortsSettings').hidden){if(e.key==='Escape'){e.preventDefault();closeShortsSettings(true)}return}
 if(!$('#memoOverlay').hidden){if(e.key==='Escape'){e.preventDefault();closeMemo(true)}return}
 if(!$('#studyDetail').hidden){if(e.key==='Escape'){e.preventDefault();closeDetail(true)}return}
 if($('#study').hidden)return;
 if(mode==='practice'){
  if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}
  if(e.key==='ArrowRight'){e.preventDefault();move(1)}
  return;
 }
 if(mode==='concept'&&studyView==='reading'){
  if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}
  if(e.key==='ArrowRight'){e.preventDefault();move(1)}
 }else{
  if(['ArrowUp','ArrowRight'].includes(e.key)){e.preventDefault();move(-1)}
  if(['ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();move(1)}
 }
});
renderHome();
if(location.hash&&subjects[location.hash.slice(1)])openStudy(location.hash.slice(1));
else $('#study').hidden=true;

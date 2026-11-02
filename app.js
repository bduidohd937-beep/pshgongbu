// PSH 공부 V0.4.1 — 빠른 복습(세로 넘김)과 정독(세로 읽기), 취약 개념 기록
// 학습 콘텐츠는 기존 검증 데이터만 재사용하며 새 주장이나 카드 원문을 추가하지 않는다.
const subjects={
 ethics:{name:'생활과 윤리',symbol:'◒',description:'사상가 · 윤리 이론',concepts:window.v033Topics.ethics,quizzes:window.v03Content.ethics},
 culture:{name:'사회·문화',symbol:'◎',description:'사회 현상 · 자료 분석',concepts:window.v033Topics.culture,quizzes:window.v03Content.culture}
};
const $=selector=>document.querySelector(selector);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let subjectKey='ethics',mode='concept',index=0,direction='next',unit='all',shuffledIds=null;
let gesture=null,lastSwipeAt=0,detailHistoryActive=false,detailFocusReturn=null;
let studyView='quick',unknownOnly=false,cardRatings={};
try{
 const viewSettings=JSON.parse(localStorage.getItem('psh-view-v041')||'{}');
 studyView=viewSettings.mode==='reading'?'reading':'quick';
 unknownOnly=viewSettings.unknownOnly===true;
}catch(_){}
try{
 const savedRatings=JSON.parse(localStorage.getItem('psh-ratings-v041')||'{}');
 if(savedRatings&&typeof savedRatings==='object'&&!Array.isArray(savedRatings))cardRatings=savedRatings;
}catch(_){}
function saveView(){localStorage.setItem('psh-view-v041',JSON.stringify({mode:studyView,unknownOnly}))}
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
 const unknownCount=candidates.filter(item=>ratingOf(item)==='unknown').length;
 $('#unknownCount').textContent=String(unknownCount);
 $('#unknownOnlyButton').setAttribute('aria-pressed',String(unknownOnly));
 $('#unknownOnlyButton').classList.toggle('active',unknownOnly);
 $('#unknownOnlyButton').textContent=unknownOnly?`모르는 카드만 (${unknownCount}) ✓`:`모르는 카드만 (${unknownCount})`;
 $('#cardViewport').classList.toggle('reading-viewport',concept&&studyView==='reading');
}
function changeStudyView(next){
 if(!$('#studyDetail').hidden||mode!=='concept'||!['quick','reading'].includes(next))return;
 studyView=next;gesture=null;saveView();renderStudy();
}
function toggleUnknownOnly(){
 if(!$('#studyDetail').hidden||mode!=='concept')return;
 const current=deck()[index]?.id;
 unknownOnly=!unknownOnly;gesture=null;saveView();
 const newIndex=deck().findIndex(item=>item.id===current);
 index=newIndex>=0?newIndex:0;
 renderStudy();
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
 subjectKey=saved.subjectKey;mode=saved.mode==='quiz'?'quiz':'concept';
 index=Math.max(0,Number(saved.index)||0);
}
if(localStorage.getItem('psh-theme')==='dark')document.body.classList.add('dark');
function persist(){localStorage.setItem('psh-progress',JSON.stringify({subjectKey,mode,index,unit}))}
function itemId(item){return mode==='concept'?item.id:item[0]}
function deck(){
 const all=mode==='concept'?subjects[subjectKey].concepts:subjects[subjectKey].quizzes;
 const items=all.filter(item=>(unit==='all'||(mode==='concept'?item.chapterId===unit:item[3].some(tag=>tag.startsWith(unit))))&&(mode!=='concept'||!unknownOnly||ratingOf(item)==='unknown'));
 if(shuffledIds)items.sort((a,b)=>shuffledIds.indexOf(itemId(a))-shuffledIds.indexOf(itemId(b)));
 return items;
}
function renderHome(){
 $('#subjectGrid').innerHTML=Object.entries(subjects).map(([key,s])=>`<button class="subject-card" data-subject="${key}"><div class="symbol">${s.symbol}</div><strong>${s.name}</strong><small>${s.concepts.length}개 주제 · ${s.quizzes.length}개 문항별 복습</small></button>`).join('');
 document.querySelectorAll('[data-subject]').forEach(button=>button.onclick=()=>openStudy(button.dataset.subject));
}
function fillUnits(){
 const units=mode==='concept'?window.v034Curriculum.chapters.filter(ch=>ch.subject===subjectKey).map(ch=>({value:ch.id,label:String(ch.number).padStart(2,'0')+'. '+ch.name+' · '+subjects[subjectKey].concepts.filter(t=>t.chapterId===ch.id).length+'장'})):[{value:'6모',label:'6월 모평'},{value:'9모',label:'9월 모평'}];
 $('#unitFilter').innerHTML='<option value="all">전체 카드</option>'+units.map(x=>`<option value="${escapeHtml(x.value)}">${escapeHtml(x.label)}</option>`).join('');
 $('#unitFilter').value=unit;
}
function openStudy(key){
 if(!subjects[key])return;
 if(subjectKey!==key&&unknownOnly){unknownOnly=false;saveView();}
 subjectKey=key;index=0;unit='all';shuffledIds=null;direction='next';gesture=null;
 $('#studyDetail').hidden=true;detailHistoryActive=false;
 $('#home').hidden=true;$('#study').hidden=false;
 if(location.hash!==`#${key}`)history.pushState({study:true},'',`#${key}`);
 fillUnits();renderStudy();
}
function closeStudy(){
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
 return `<div class="reading-heading"><div class="card-kicker">${escapeHtml(item.chapterId||item.unit)} · 정독 모드</div><h2 class="topic-title">${escapeHtml(item.title)}</h2></div><div class="reading-scroll" tabindex="0" role="region" aria-label="전체 개념 본문"><p class="detail-summary">${escapeHtml(item.summary)}</p>${sections}<section class="detail-trap"><h3>수능 함정</h3><p>${escapeHtml(item.trap)}</p></section><div class="detail-source"><details><summary>출처 보기</summary><p>${(item.sources||[]).map(escapeHtml).join(' · ')}</p></details></div></div>${ratingActions(item)}`;
}
function examDetail(item){
 return `<div class="detail-kicker">기출 문항별 복습 · ${item[3].map(escapeHtml).join(' · ')}</div><h2 class="detail-title">${escapeHtml(item[1])}</h2><p class="detail-summary">${escapeHtml(item[2])}</p><section class="detail-trap"><h3>정오 판단 포인트</h3><p>${escapeHtml(item[4]||'')}</p></section><p class="detail-source">문항 원문이 아닌 개념 복습 카드입니다. ${escapeHtml(item[6]||'')}</p>`;
}
function renderStudy(){
 const items=deck(),s=subjects[subjectKey];
 $('#subjectTitle').textContent=s.name;
 document.querySelectorAll('.tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.mode===mode));
 const card=$('#studyCard');
 card.className=mode==='concept'&&studyView==='reading'?'study-card reading-card':'study-card feed-card';
 updateToolbar();
 gesture=null;
 if(!items.length){
  $('#cardCounter').textContent=unknownOnly&&mode==='concept'?'0 / 0':'검증 대기';
  $('#progressText').textContent=unknownOnly&&mode==='concept'?'취약 개념 없음':'공개 콘텐츠 0장';
  card.innerHTML=unknownOnly&&mode==='concept'?'<div class="feed-main empty-state"><h2>모르는 카드가 없어요!</h2><p>빠른 복습에서 ‘모르겠음’을 표시하거나 위의 ‘모르는 카드만’을 눌러 전체 카드로 돌아갈 수 있어요.</p></div>':'<div class="feed-main"><h2>검증 중인 콘텐츠입니다</h2><p>원본과 대조한 내용만 공개해요.</p></div>';
  return;
 }
 index=Math.max(0,Math.min(index,items.length-1));
 const item=items[index];
 $('#cardCounter').textContent=`${index+1} / ${items.length}`;
 $('#progressText').textContent=mode==='concept'&&studyView==='reading'?'↕ 본문 · ↔ 카드':'↑ 다음 · ↓ 이전';
 card.innerHTML=mode==='concept'?(studyView==='reading'?readingTopic(item):topicPreview(item)+ratingActions(item)):examPreview(item);
 card.querySelector('.read-more')?.addEventListener('click',openDetail);
 card.querySelectorAll('.rating-control').forEach(button=>button.onclick=()=>markCurrent(button.dataset.rating));
 persist();
}
function move(step){
 if(!$('#studyDetail').hidden)return false;
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
document.querySelectorAll('.tab').forEach(button=>button.onclick=()=>{if(!$('#studyDetail').hidden)return;mode=button.dataset.mode;index=0;unit='all';shuffledIds=null;fillUnits();renderStudy()});
$('#unitFilter').onchange=e=>{unit=e.target.value;index=0;shuffledIds=null;renderStudy()};
$('#randomButton').onclick=shuffle;$('#backButton').onclick=closeStudy;
$('#quickMode').onclick=()=>changeStudyView('quick');
$('#readingMode').onclick=()=>changeStudyView('reading');
$('#unknownOnlyButton').onclick=toggleUnknownOnly;
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
 if(!$('#studyDetail').hidden||e.touches.length!==1||e.target?.closest?.('button,a,input,select,textarea,summary,details'))return;
 const t=e.touches[0];
 gesture={x:t.clientX,y:t.clientY,started:Date.now(),identifier:t.identifier};
},{passive:true});
viewport.addEventListener('touchmove',e=>{
 if(gesture&&$('#studyDetail').hidden&&!(mode==='concept'&&studyView==='reading')&&e.cancelable)e.preventDefault();
},{passive:false});
viewport.addEventListener('touchend',e=>{
 const g=gesture;gesture=null;
 if(!g||!$('#studyDetail').hidden||e.changedTouches.length!==1)return;
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
 if(!$('#studyDetail').hidden){closeDetail(false);return;}
 if(!location.hash&&!$('#study').hidden){$('#study').hidden=true;$('#home').hidden=false;renderHome();}
}
window.onpopstate=syncRoute;window.onhashchange=syncRoute;
document.addEventListener('keydown',e=>{
 if(!$('#studyDetail').hidden){if(e.key==='Escape'){e.preventDefault();closeDetail(true)}return}
 if($('#study').hidden)return;
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

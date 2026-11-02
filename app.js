// PSH 공부 V0.3.7 — 카드 프레임·제목 고정, 본문 내부 전용 스크롤
const subjects={
 ethics:{name:'생활과 윤리',symbol:'◒',description:'사상가 · 윤리 이론',concepts:window.v033Topics.ethics,quizzes:window.v03Content.ethics},
 culture:{name:'사회·문화',symbol:'◎',description:'사회 현상 · 자료 분석',concepts:window.v033Topics.culture,quizzes:window.v03Content.culture}
};
const $=sel=>document.querySelector(sel);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let subjectKey='ethics',mode='concept',index=0,direction='next',unit='all',touchStart=0,touchStartX=0,shuffledIds=null;
let saved=null;try{saved=JSON.parse(localStorage.getItem('psh-progress')||'null')}catch(e){}
if(saved&&subjects[saved.subjectKey]){subjectKey=saved.subjectKey;mode=saved.mode==='quiz'?'quiz':'concept';index=Math.max(0,Number(saved.index)||0);unit='all'}
if(localStorage.getItem('psh-theme')==='dark')document.body.classList.add('dark');
function persist(){localStorage.setItem('psh-progress',JSON.stringify({subjectKey,mode,index,unit}))}
function itemId(card){return mode==='concept'?card.id:card[0]}
function deck(){
 const all=mode==='concept'?subjects[subjectKey].concepts:subjects[subjectKey].quizzes;
 const items=all.filter(item=>unit==='all'||(mode==='concept'?item.chapterId===unit:item[3].some(tag=>tag.startsWith(unit))));
 if(shuffledIds)items.sort((a,b)=>shuffledIds.indexOf(itemId(a))-shuffledIds.indexOf(itemId(b)));
 return items;
}
function renderHome(){
 $('#subjectGrid').innerHTML=Object.entries(subjects).map(([key,s])=>`<button class="subject-card" data-subject="${key}"><div class="symbol">${s.symbol}</div><strong>${s.name}</strong><small>${s.concepts.length}개 주제 · ${s.quizzes.length}개 문항별 복습</small></button>`).join('');
 document.querySelectorAll('[data-subject]').forEach(button=>button.onclick=()=>openStudy(button.dataset.subject));
}
function fillUnits(){
 const units=mode==='concept'?window.v034Curriculum.chapters.filter(c=>c.subject===subjectKey).map(c=>({value:c.id,label:String(c.number).padStart(2,'0')+'. '+c.name+' · '+subjects[subjectKey].concepts.filter(t=>t.chapterId===c.id).length+'장'})):[{value:'6모',label:'6월 모평'},{value:'9모',label:'9월 모평'}];
 $('#unitFilter').innerHTML='<option value="all">전체 카드</option>'+units.map(x=>`<option value="${escapeHtml(x.value)}">${escapeHtml(x.label)}</option>`).join('');
 $('#unitFilter').value=unit;
}
function openStudy(key){
 subjectKey=key;index=0;unit='all';shuffledIds=null;direction='next';
 $('#home').hidden=true;$('#study').hidden=false;
 if(location.hash!==`#${key}`)history.pushState({study:true},'',`#${key}`);
 fillUnits();renderStudy();
}
function closeStudy(){
 history.replaceState({},'',location.pathname+location.search);
 $('#study').hidden=true;$('#home').hidden=false;renderHome();
}
function topicHtml(item){
 const sections=item.sections.map(s=>`<section class="topic-section"><h3>${escapeHtml(s.name)}</h3><ul>${s.points.map(p=>`<li>${escapeHtml(p)}</li>`).join('')}</ul></section>`).join('');
 return `<div class="topic-fixed"><div class="card-kicker">${escapeHtml(item.unit)}</div><h2 class="topic-title">${escapeHtml(item.title)}</h2></div><div class="topic-scroll" tabindex="0" role="region" aria-label="개념 본문"><p class="topic-summary">${escapeHtml(item.summary)}</p><div class="topic-sections">${sections}</div><div class="topic-trap"><span class="trap-label">수능 함정</span><p>${escapeHtml(item.trap)}</p></div><div class="topic-source"><details><summary>출처 보기</summary><p>${item.sources.map(s=>escapeHtml(s)).join(' · ')}</p></details></div></div>`;
}
function examHtml(item){
 return `<div class="topic-fixed"><div class="card-kicker">기출 문항별 복습 · ${item[3].map(escapeHtml).join(' / ')}</div><h2 class="topic-title">${escapeHtml(item[1])}</h2></div><div class="topic-scroll" tabindex="0" role="region" aria-label="기출 복습 본문"><p class="topic-summary">${escapeHtml(item[2])}</p><div class="topic-trap"><span class="trap-label">정오 판단 포인트</span><p>${escapeHtml(item[4]||'')}</p></div><div class="topic-source">문항 원문이 아닌 개념 해설을 재구성한 복습 카드입니다. <span>${escapeHtml(item[6]||'')}</span></div></div>`;
}
function renderStudy(){
 const items=deck(),s=subjects[subjectKey];
 $('#subjectTitle').textContent=s.name;
 document.querySelectorAll('.tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.mode===mode));
 if(!items.length){
  $('#cardCounter').textContent='검증 대기';$('#progressText').textContent='공개 콘텐츠 0장';
  $('#studyCard').className='study-card topic-card';
  const ch=mode==='concept'?window.v034Curriculum.chapters.find(c=>c.id===unit):null;
  $('#studyCard').innerHTML=ch?`<div class="topic-main"><div class="card-kicker">${escapeHtml(ch.id)} · EBS 단원</div><h2 class="topic-title">${escapeHtml(ch.name)}</h2><p class="topic-summary">이 단원은 아직 원문과 대조된 개념 카드가 없어. 아래는 학습 예정 범위이며, 검증 완료된 학습 내용은 아니야.</p><div class="topic-sections"><section class="topic-section"><h3>검증 예정 주제</h3><ul>${ch.coreTopics.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ul></section></div></div><div class="topic-source">교재 개념 범위 조사만 완료 · 상세 내용은 검증 대기</div>`:'<div><div class="card-kicker">CONTENT REVIEW</div><h2>검증 중인 콘텐츠입니다</h2><p>원본 출처와 대조가 완료된 콘텐츠만 공개합니다.</p></div>';
  return;
 }
 index=Math.max(0,Math.min(index,items.length-1));
 const item=items[index];
 $('#cardCounter').textContent=`${index+1} / ${items.length}`;
 $('#progressText').textContent='↔ 카드 이동 · ↕ 본문 읽기';
 const card=$('#studyCard');
 card.className=`study-card ${direction} ${mode==='concept'?'topic-card':'exam-card'}`;
 card.innerHTML=mode==='concept'?topicHtml(item):examHtml(item);
 card.scrollTop=0;
 const scrollBody=card.querySelector?.('.topic-scroll');
 if(scrollBody)scrollBody.scrollTop=0;
 persist();
}
function move(step){
 const items=deck();if(!items.length)return;
 direction=step>0?'next':'previous';
 index=(index+step+items.length)%items.length;
 renderStudy();
}
function shuffle(){
 const items=deck();shuffledIds=items.map(itemId);
 for(let i=shuffledIds.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffledIds[i],shuffledIds[j]]=[shuffledIds[j],shuffledIds[i]]}
 index=0;renderStudy();
}
document.querySelectorAll('.tab').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;index=0;unit='all';shuffledIds=null;fillUnits();renderStudy()});
$('#unitFilter').onchange=event=>{unit=event.target.value;index=0;shuffledIds=null;renderStudy()};
$('#randomButton').onclick=shuffle;$('#backButton').onclick=closeStudy;
$('#previousTopic').onclick=()=>move(-1);
$('#nextTopic').onclick=()=>move(1);
$('#themeButton').onclick=()=>{
 document.body.classList.toggle('dark');
 const dark=document.body.classList.contains('dark');
 localStorage.setItem('psh-theme',dark?'dark':'light');
 document.querySelector('meta[name="theme-color"]').content=dark?'#171513':'#f8f6f2';
};
// 세로 움직임은 카드 내부 독서에만 사용한다. 가로 스와이프만 다음/이전 카드 이동.
$('#cardViewport').addEventListener('touchstart',e=>{if(e.touches.length!==1)return;touchStart=e.touches[0].clientY;touchStartX=e.touches[0].clientX},{passive:true});
$('#cardViewport').addEventListener('touchend',e=>{
 if(e.changedTouches.length!==1)return;
 const dy=e.changedTouches[0].clientY-touchStart,dx=e.changedTouches[0].clientX-touchStart;
 if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.25)return;
 move(dx<0?1:-1);
},{passive:true});
const syncRoute=()=>{if(!location.hash&&!$('#study').hidden){$('#study').hidden=true;$('#home').hidden=false;renderHome()}};
window.onpopstate=syncRoute;window.onhashchange=syncRoute;
document.addEventListener('keydown',e=>{if($('#study').hidden)return;if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}});
renderHome();
if(location.hash&&subjects[location.hash.slice(1)])openStudy(location.hash.slice(1));
else $('#study').hidden=true;

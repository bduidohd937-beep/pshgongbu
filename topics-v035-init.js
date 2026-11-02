// V0.3.5: 새롭게 검증한 카드만 공개하고 31강 순으로 학습한다.
(()=>{
 const bookOrder=Object.fromEntries(["ethics","culture"].flatMap(subject=>Array.from({length:subject==="ethics"?15:16},(_,i)=>[(subject==="ethics"?"E":"S")+String(i+1).padStart(2,"0"),i])));
 const oldCount={ethics:28,culture:28};
 const valid=card=>Boolean(card&&card.status==="verified"&&card.id&&card.chapterId&&card.title&&card.summary&&Array.isArray(card.sections)&&card.sections.length&&card.sections.every(s=>s.name&&Array.isArray(s.points)&&s.points.length&&s.points.every(p=>typeof p==="string"&&p.trim().length>=10))&&Array.isArray(card.sources)&&card.sources.length&&card.sources.every(s=>s.includes("2027학년도 EBS 수능특강")&&/\d+/.test(s))&&card.sourceComparison&&card.provenanceType==="EBS-source-checked");
 for(const subject of ["ethics","culture"]){
  const incoming=(window.v035NewTopics?.[subject]||[]);
  const ids=new Set();
  const list=window.v033Topics[subject].filter(c=>{
   if(ids.has(c.id))return false;ids.add(c.id);
   if(c.provenanceType==="EBS-source-checked")return valid(c);
   return c.status==="verified"&&c.chapterId&&c.title&&c.sections?.length&&c.sources?.length;
  });
  list.sort((a,b)=>(bookOrder[a.chapterId]??99)-(bookOrder[b.chapterId]??99)||Number(b.provenanceType==="EBS-source-checked")-Number(a.provenanceType==="EBS-source-checked"));
  window.v033Topics[subject]=list;
 }
 window.v035Publish={version:"V0.3.5",newEthics:(window.v035NewTopics?.ethics||[]).filter(valid).length,newCulture:(window.v035NewTopics?.culture||[]).filter(valid).length,totalEthics:window.v033Topics.ethics.length,totalCulture:window.v033Topics.culture.length,completeChaptersClaim:false,curriculumCoverage:"31강에서 최소 1개 이상 학습 노트 수록. 모든 세부 선지 검증을 뜻하지 않음"};
})();

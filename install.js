// PSH study mobile installation
(()=>{
 const panel=document.getElementById('installPanel');
 const button=document.getElementById('installButton');
 const help=document.getElementById('installHelp');
 if(!panel||!button||!help)return;
 let deferred=null;
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 if(standalone())panel.hidden=true;
 const manual=()=>{
  help.hidden=false;
  help.textContent='크롬 오른쪽 위 ⋮ → 앱 설치 또는 홈 화면에 추가를 눌러 주세요. 설치 후 PSH 공부를 홈 화면에서 바로 열 수 있어요.';
 };
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferred=event;
  help.hidden=true;
 });
 button.addEventListener('click',async()=>{
  if(standalone()){panel.hidden=true;return;}
  if(!deferred){manual();return;}
  const prompt=deferred;deferred=null;
  try{await prompt.prompt();const response=await prompt.userChoice;
   if(response.outcome==='accepted'){help.hidden=false;help.textContent='설치 요청이 접수됐어요. 휴대폰 홈 화면에서 PSH 공부를 확인해 주세요.';}
   else manual();
  }catch(_){manual();}
 });
 window.addEventListener('appinstalled',()=>{panel.hidden=true;deferred=null;});
 if('serviceWorker' in navigator){
  const alreadyControlled=Boolean(navigator.serviceWorker.controller);
  let hasRefreshed=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
   if(!alreadyControlled||hasRefreshed)return;
   hasRefreshed=true;
   window.location.reload();
  });
  navigator.serviceWorker.register('./sw.js',{scope:'./'})
   .then(reg=>reg.update().catch(()=>{}))
   .catch(()=>{
    help.hidden=false;help.textContent='오프라인 저장에 실패했어요. 인터넷 연결 상태에서 다시 열어 주세요.';
   });
 }
})();

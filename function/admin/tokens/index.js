  const T = window.tokensAdmin;
  const { getAuth } = T;
  whenDOMReady().then(()=> whenPartialsReady().then(()=>{
    try{ const { role }=getAuth(); const canView=(role==='admin'||role==='moderator'); if(canView && T.renderTokensDashboard) T.renderTokensDashboard(); }catch(_){ }
  }));
  whenDOMReady().then(()=>{
    try{ const setCtrl=(down)=> document.body.classList.toggle('ctrl-down', down); let ctrlLatch=false; window.addEventListener('keydown',(e)=>{ if(e.ctrlKey && !ctrlLatch){ ctrlLatch=true; setCtrl(true); } }); window.addEventListener('keyup',(e)=>{ if(!e.ctrlKey){ ctrlLatch=false; setCtrl(false); } }); window.addEventListener('blur',()=>{ ctrlLatch=false; setCtrl(false); }); }catch(_){ }
  });

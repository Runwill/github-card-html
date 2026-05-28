  const T = window.tokensAdmin;
  const { getAuth } = T;
  whenDOMReady().then(()=> whenPartialsReady().then(()=>{
    try{ const { role }=getAuth(); const canView=(role==='admin'||role==='moderator'); if(canView && T.renderTokensDashboard) T.renderTokensDashboard(); }catch(_){ }
  }));


(function(){
  const T = window.tokensAdmin;
  const { getAuth } = T;
  document.addEventListener('DOMContentLoaded', function(){ try{ const { role }=getAuth(); if(role==='admin' && window.renderTokensDashboard) window.renderTokensDashboard(); }catch(_){ }
    try{ const setCtrl=(down)=>{ if(down) document.body.classList.add('ctrl-down'); else document.body.classList.remove('ctrl-down'); }; let ctrlLatch=false; window.addEventListener('keydown',(e)=>{ if(e.ctrlKey && !ctrlLatch){ ctrlLatch=true; setCtrl(true); } }); window.addEventListener('keyup',(e)=>{ if(!e.ctrlKey){ ctrlLatch=false; setCtrl(false); } }); window.addEventListener('blur',()=>{ ctrlLatch=false; setCtrl(false); }); }catch(_){ }
  });
})();

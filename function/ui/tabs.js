;(function(){
  const onReady=fn=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn();
  const titles=['程序','技能','牌库','将池','草稿','词元'];
  function changeTitle(n){ try{ document.title='Documentー'+(titles[n]||'') }catch(_){} }
  const isAdmin=()=>{ try{ return localStorage.getItem('role')==='admin' }catch(_){ return false } };

  onReady(()=>{
    (window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve()).then(()=>{
      document.querySelectorAll('#example-tabs a.title-a').forEach((a,idx)=>{
        a.addEventListener('click',e=>{
          const href=a.getAttribute('href')||'';
          if(href==='#panel_tokens'){
            if(!isAdmin()) { e.preventDefault(); return; }
            try{ window.renderTokensDashboard && window.renderTokensDashboard() }catch(_){}
          }
          if(href==='#panel_draft'){
            try{ requestAnimationFrame(()=>{ window.draftPanel&&window.draftPanel.autosize && window.draftPanel.autosize() }) }catch(_){}
          }
          changeTitle(idx);
        });
      });
      var refreshBtn=document.getElementById('tokens-refresh-btn');
      refreshBtn&&refreshBtn.addEventListener('click',()=>{ try{ window.tokensRefresh ? window.tokensRefresh() : window.renderTokensDashboard && window.renderTokensDashboard() }catch(_ ){} });
    });
  });
  window.changeTitle=changeTitle;
})()

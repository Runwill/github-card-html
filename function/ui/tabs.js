;(function(){
  const titles=['程序','技能','牌库','将池','草稿','词元','权限'];
  const changeTitle=n=> document.title='Document丨'+(titles[n]||'');
  const isAdmin=()=>{ try{ return localStorage.getItem('role')==='admin' }catch(_){ return false } };

  Promise.resolve(window.partialsReady).then(()=>{
    document.querySelectorAll('#example-tabs a.title-a').forEach((a,idx)=>{
      a.addEventListener('click',e=>{
        const href=a.getAttribute('href')||'';
        if(href==='#panel_tokens'){
          if(!isAdmin()) { e.preventDefault(); return; }
          window.renderTokensDashboard && window.renderTokensDashboard();
        }
        if(href==='#panel_permissions'){
          if(!isAdmin()) { e.preventDefault(); return; }
          // 打开权限面板时渲染列表
          window.renderPermissionsPanel && window.renderPermissionsPanel('');
        }
        if(href==='#panel_draft'){
          requestAnimationFrame(()=>{ window.draftPanel?.autosize && window.draftPanel.autosize(); });
        }
        changeTitle(idx);
      });
    });
    document.getElementById('tokens-refresh-btn')?.addEventListener('click',()=>{
      (window.tokensRefresh?.() || window.renderTokensDashboard?.());
    });
  });
  window.changeTitle=changeTitle;
})()

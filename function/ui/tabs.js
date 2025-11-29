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
          // 打开权限面板时渲染列表：若已预渲染过且存在行，则不重复触发，避免二次动画/重排
          const list = document.getElementById('perm-list');
          const hasRow = !!(list && list.querySelector && list.querySelector('.approval-row'));
          if(window.renderPermissionsPanel && !hasRow){ window.renderPermissionsPanel(''); }
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

    const header = document.getElementById('header');
    if(header){
      let lastSwitch = 0;
      header.addEventListener('wheel', e => {
        const now = Date.now();
        if(now - lastSwitch < 150) return; 

        if(Math.abs(e.deltaY) < 10) return;

        e.preventDefault();

        const tabs = Array.from(document.querySelectorAll('#example-tabs .tabs-title'));
        const activeIndex = tabs.findIndex(tab => tab.classList.contains('is-active'));
        if(activeIndex === -1) return;

        const isTabAccessible = (tab) => {
          const link = tab.querySelector('a');
          if(!link) return false;
          // 简单的可见性检查，如果被display:none隐藏则跳过
          if(getComputedStyle(tab).display === 'none') return false;

          const href = link.getAttribute('href');
          if(href === '#panel_tokens' || href === '#panel_permissions') {
              return isAdmin();
          }
          return true;
        };

        const direction = e.deltaY > 0 ? 1 : -1;
        let nextIndex = activeIndex;
        
        // 查找下一个可用的 tab
        for(let i = 0; i < tabs.length; i++) {
            nextIndex = nextIndex + direction;
            if(nextIndex < 0) nextIndex = tabs.length - 1;
            if(nextIndex >= tabs.length) nextIndex = 0;
            
            if(isTabAccessible(tabs[nextIndex])) {
                break;
            }
        }

        if(nextIndex !== activeIndex) {
            const link = tabs[nextIndex].querySelector('a');
            if(link) {
                lastSwitch = now;
                link.click();
            }
        }
      }, { passive: false });
    }
  });
  window.changeTitle=changeTitle;
})()

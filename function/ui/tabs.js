;(function(){
  const titles=['程序','技能','牌库','将池','草稿','词元','权限','对局'];
  const changeTitle=n=> document.title='Document丨'+(titles[n]||'');
  const isAdmin=()=> !!window.TokensPerm?.API?.isAdmin?.();
  const isAdminPanel=href=> href==='#panel_tokens' || href==='#panel_permissions';
  const getActivePanelId=(fallback)=> document.querySelector('.tabs-panel.is-active')?.id || document.querySelector('#main-tabs .tabs-title.is-active a')?.getAttribute('href')?.replace('#', '') || fallback || null;
  const isPanelActive=(panelId)=>{ const activeId = panelId && getActivePanelId(); return !panelId || !activeId || activeId === (panelId[0] === '#' ? panelId.slice(1) : panelId); };

  Promise.resolve(window.partialsReady).then(()=>{
    document.querySelectorAll('#main-tabs a.title-a').forEach((a,idx)=>{
      a.addEventListener('click',e=>{
        const href=a.getAttribute('href')||'';
        if(isAdminPanel(href) && !isAdmin()) { e.preventDefault(); return; }
        if(href==='#panel_tokens'){
          window.renderTokensDashboard && window.renderTokensDashboard();
        }
        if(href==='#panel_permissions'){
          // 打开权限面板时渲染列表：若已预渲染过且存在行，则不重复触发，避免二次动画/重排
          const list = document.getElementById('perm-list');
          const hasRow = !!(list && list.querySelector && list.querySelector('.approval-row'));
          if(window.renderPermissionsPanel && !hasRow){ window.renderPermissionsPanel(''); }
        }
        if(href==='#panel_draft'){
          requestAnimationFrame(()=>{
            window.draftPanel?.autosize && window.draftPanel.autosize();
            window.CardEditor?.Panel?.renderAll && window.CardEditor.Panel.renderAll(false);
          });
        }
        changeTitle(idx);
      });
    });
    const header = document.getElementById('header');
    if(header){
      let lastSwitch = 0;
      header.addEventListener('wheel', e => {
        const now = Date.now();
        if(now - lastSwitch < 150) return; 

        if(Math.abs(e.deltaY) < 10) return;

        e.preventDefault();

        const tabs = Array.from(document.querySelectorAll('#main-tabs .tabs-title'));
        const activeIndex = tabs.findIndex(tab => tab.classList.contains('is-active'));
        if(activeIndex === -1) return;

        const isTabAccessible = (tab) => {
          const link = tab.querySelector('a');
          if(!link) return false;
          // 简单的可见性检查，如果被display:none隐藏则跳过
          if(getComputedStyle(tab).display === 'none') return false;

          const href = link.getAttribute('href');
            if(isAdminPanel(href)) {
              return isAdmin();
          }
          return true;
        };

        const direction = e.deltaY > 0 ? 1 : -1;
        let nextIndex = activeIndex;
        
        // 查找下一个可用的 tab
        for(let i = 0; i < tabs.length; i++) {
          nextIndex = (nextIndex + direction + tabs.length) % tabs.length;
            
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
  window.TabsUI = Object.assign(window.TabsUI || {}, { changeTitle, getActivePanelId, isPanelActive });
})()

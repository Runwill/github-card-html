(function(){
  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  var titles = ['程序','技能','牌库','将池','草稿','词元'];

  function changeTitle(n){
    try { document.title = 'Document丨' + (titles[n] || ''); } catch(_) {}
  }

  function isAdmin(){
    try { return localStorage.getItem('role') === 'admin'; } catch(_) { return false; }
  }

  onReady(function(){
    var ready = window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve();
    ready.then(function(){
    // 绑定标签栏标题切换
    var links = document.querySelectorAll('#example-tabs a.title-a');
    links.forEach(function(a, idx){
      a.addEventListener('click', function(e){
        var href = a.getAttribute('href') || '';
        // tokens 页权限与渲染
        if (href === '#panel_tokens'){
          if (!isAdmin()) { e.preventDefault(); return; }
          try {
            if (window.renderTokensDashboard) window.renderTokensDashboard();
          } catch(_) {}
        }
        // 草稿页：切换到该 tab 后，下一帧触发一次自适应高度
        if (href === '#panel_draft'){
          try {
            requestAnimationFrame(function(){ if (window.draftPanel && window.draftPanel.autosize) window.draftPanel.autosize(); });
          } catch(_) {}
        }
        changeTitle(idx);
      });
    });

    // tokens 刷新按钮
    var refreshBtn = document.getElementById('tokens-refresh-btn');
    if (refreshBtn){
      refreshBtn.addEventListener('click', function(){
        try {
          if (window.tokensRefresh) window.tokensRefresh();
          else if (window.renderTokensDashboard) window.renderTokensDashboard();
        } catch(_) {}
      });
    }
    });
  });

  // 暴露以兼容旧调用（若其它处引用）
  window.changeTitle = changeTitle;
})();

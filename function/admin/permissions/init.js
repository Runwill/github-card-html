(function(w){
  const ns = w.TokensPerm = w.TokensPerm || {};

  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else { try { fn(); } catch(_){ } }
  }

  // 确保暴露全局入口（模块加载顺序不确定时重试直至渲染函数就绪）
  (function ensureExpose(){
    if (ns.renderPermissionsPanel) {
      w.renderPermissionsPanel = ns.renderPermissionsPanel;
    } else {
      setTimeout(ensureExpose, 0);
    }
  })();
  // 事件绑定已在 render.js 内部完成，这里不再重复绑定，避免重复触发

  // 提前在后台渲染一次权限列表：
  // 1) 等待 HTML 分片加载完成，确保 #panel_permissions/#perm-list 已存在
  // 2) 仅在用户为管理员时执行
  // 3) 这样点击“权限”页签时，用户行已在 DOM 中，避免“先空白再突然出现”的体验
  onReady(()=>{
    try {
      const ready = (w.partialsReady instanceof Promise) ? w.partialsReady : Promise.resolve();
      ready.then(()=>{
        // 管理员判定：与 tabs.js 保持一致
        const isAdmin = ()=>{ try{ return localStorage.getItem('role') === 'admin'; } catch(_){ return false; } };
        if (!isAdmin()) return;
        // 若面板节点存在且渲染入口已就绪，则进行一次预渲染
        const panel = document.getElementById('panel_permissions');
        const list = document.getElementById('perm-list');
        if (panel && list && typeof w.renderPermissionsPanel === 'function') {
          // 使用默认搜索（空串），不会强制刷新；render.js 中已具备数据预取缓存
          try { w.renderPermissionsPanel(''); } catch(_){ }
        }
      }).catch(()=>{});
    } catch(_){}
  });
})(window);

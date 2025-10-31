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
})(window);

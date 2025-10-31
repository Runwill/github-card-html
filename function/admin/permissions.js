// 拆分模块加载器：保持向后兼容，按序加载 function/admin/permissions/* 模块
(function(w){
  if (w.__TokensPermSplitLoaded) return; // 避免重复加载
  w.__TokensPermSplitLoaded = true;

  function getBase(){
    const s = document.currentScript;
    if (s && s.src) return s.src.replace(/permissions\.js(\?.*)?$/, 'permissions/');
    // 兜底：按项目结构推断
    return 'function/admin/permissions/';
  }

  const base = getBase();
  const files = [ 'ui.js', 'api.js', 'constants.js', 'render.js', 'init.js' ];

  function loadSeq(i){
    if (i >= files.length) return;
    const el = document.createElement('script');
    el.src = base + files[i];
    // 顺序加载，避免依赖竞态
    el.onload = ()=> loadSeq(i+1);
    el.onerror = ()=> console.error('[permissions] Failed to load', el.src);
    document.head.appendChild(el);
  }

  loadSeq(0);
})(window);

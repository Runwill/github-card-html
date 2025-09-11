// 将侧边栏的“切换主题”按钮与 setTheme 绑定
(function(){
  function currentMode(){
    // 判定页面当前是否处于 dark（不区分 system 还是手动）
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function updateLabel(btn){
    const mode = currentMode();
    btn.textContent = mode === 'dark' ? '切换为浅色' : '切换为深色';
  }

  function onClick(){
    // 若已是 dark => 切为 light；否则切为 dark
    const next = currentMode() === 'dark' ? 'light' : 'dark';
    if(typeof window.setTheme === 'function'){
      window.setTheme(next);
      const btn = document.getElementById('theme-toggle-button');
      if(btn) updateLabel(btn);
    }
  }

  function bind(){
    const btn = document.getElementById('theme-toggle-button');
    if(!btn) return; // 可能当前页面没有侧边栏
    updateLabel(btn);
    btn.addEventListener('click', onClick);
    // 若系统/脚本切换了主题（system 模式下），保持文案同步
    const mo = new MutationObserver(() => updateLabel(btn));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function init(){
    // 优先等待局部模板注入完成
    try {
      if (window.partialsReady && typeof window.partialsReady.then === 'function') {
        window.partialsReady.then(() => bind()).catch(() => bind());
        return;
      }
    } catch(_) {}
    // 回退到 DOMContentLoaded 或立即执行
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  }

  init();
})();

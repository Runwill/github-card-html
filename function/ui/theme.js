/* 轻量主题初始化与切换助手
 * - 优先使用 localStorage.theme（"light" | "dark" | "system"）
 * - 默认跟随系统；暴露 window.setTheme 方便之后接入 UI 按钮
 */
(function(){
  const KEY = 'theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function apply(theme){
    if(theme === 'dark') { root.setAttribute('data-theme','dark'); return; }
    if(theme === 'light'){ root.removeAttribute('data-theme'); return; }
    // system
    if(media.matches) root.setAttribute('data-theme','dark');
    else root.removeAttribute('data-theme');
  }

  // 初始应用
  const saved = (localStorage.getItem(KEY) || 'system');
  apply(saved);

  // 跟随系统
  if(saved === 'system'){
    try{ media.addEventListener('change', () => apply('system')); }catch(e){ media.addListener(()=>apply('system')); }
  }

  // 暴露 API
  window.setTheme = function(theme){
    const t = (theme === 'light' || theme === 'dark') ? theme : 'system';
    localStorage.setItem(KEY, t);
    apply(t);
  };
})();

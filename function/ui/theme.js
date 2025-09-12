/* 轻量主题初始化与切换助手
 * - 优先使用 localStorage.theme（"light" | "dark" | "system"）
 * - 默认跟随系统；暴露 window.setTheme 方便之后接入 UI 按钮
 */
(function(){
  const KEY = 'theme';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let fadeTimer = null;

  function apply(theme){
    if(theme === 'dark') { root.setAttribute('data-theme','dark'); return; }
    if(theme === 'light'){ root.removeAttribute('data-theme'); return; }
    // system
    if(media.matches) root.setAttribute('data-theme','dark');
    else root.removeAttribute('data-theme');
  }

  // 仅在切换瞬间给整页一个轻量淡入淡出，避免对每个节点做颜色/背景渐变
  function applyWithFade(theme){
    // 避免重复添加/抖动
    if(fadeTimer){ clearTimeout(fadeTimer); fadeTimer = null; }
    root.classList.add('theme-switching');
    // 使用 rAF 确保样式先应用，再切换主题，产生平滑过渡
    requestAnimationFrame(() => {
      apply(theme);
      fadeTimer = setTimeout(() => {
        root.classList.remove('theme-switching');
        fadeTimer = null;
      }, 180); // 与 CSS 中的过渡时间保持一致
    });
  }

  // 初始应用
  const saved = (localStorage.getItem(KEY) || 'system');
  // 首次加载不做过渡，直接应用
  apply(saved);

  // 跟随系统
  if(saved === 'system'){
    const handler = () => applyWithFade('system');
    try{ media.addEventListener('change', handler); }catch(e){ media.addListener(handler); }
  }

  // 暴露 API
  window.setTheme = function(theme){
    const t = (theme === 'light' || theme === 'dark') ? theme : 'system';
    localStorage.setItem(KEY, t);
    applyWithFade(t);
  };
})();

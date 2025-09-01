(function(){
  var STORAGE_KEY = 'draftBlockContent';
  var inputEl, previewEl;

  function safe(fn){ try { return fn && fn(); } catch(_) {} }

  function $(sel){ return document.querySelector(sel); }

  function debounce(fn, wait){
    var t; return function(){
      var ctx = this, args = arguments;
      clearTimeout(t); t = setTimeout(function(){ fn.apply(ctx, args); }, wait);
    };
  }

  function callReplacers(root){
    // 顺序与原页面保持一致
    safe(function(){ return window.replace_character_name && window.replace_character_name('http://localhost:3000/api/character', root); });
    safe(function(){ return window.replace_skill_name && window.replace_skill_name('http://localhost:3000/api/skill' + (localStorage.getItem('strength') || ''), root); });
    safe(function(){ return window.replace_card_name && window.replace_card_name('http://localhost:3000/api/card', root); });
    safe(function(){ return window.replace_term && window.replace_term('http://localhost:3000/api/term-dynamic', 1, root); });
    safe(function(){ return window.replace_term && window.replace_term('http://localhost:3000/api/term-fixed', 1, root); });
    // 稍后确保代词追加
    setTimeout(function(){ safe(function(){ return window.pronounCheck && window.pronounCheck(root); }); }, 50);
  }

  function render(html){
    if (!previewEl) return;
    try {
      var cleaned = (html || '').replace(/\\/g, '');
      previewEl.innerHTML = cleaned;
      callReplacers(previewEl);
    } catch(_) {}
  }

  function save(html){
    try { localStorage.setItem(STORAGE_KEY, html || ''); } catch(_) {}
  }

  function load(){
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch(_) { return ''; }
  }

  function onInput(){
    var val = inputEl ? inputEl.value : '';
    // 自适应高度：先重置为 auto，再按 scrollHeight 设高
    try {
      autosizeNow();
    } catch(_) {}
    render(val);
    save(val);
  }

  function isVisible(el){
    if (!el) return false;
    var cs = window.getComputedStyle ? getComputedStyle(el) : null;
    if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function autosizeNow(){
    if (!inputEl) return;
    // 若不可见，跳过本次（避免取到 0 高）
    if (!isVisible(inputEl)) return;
    inputEl.style.height = 'auto';
    var next = Math.max(80, inputEl.scrollHeight);
    inputEl.style.height = next + 'px';
  }

  function init(){
    inputEl = $('#htmlInput');
    previewEl = document.querySelector('.draftBlock');
    if (!inputEl || !previewEl) return;

    // 恢复
    var saved = load();
    if (saved) {
      inputEl.value = saved;
      render(saved);
    }

    // 初始化时做一次高度自适应
    try {
      inputEl.style.height = 'auto';
      inputEl.style.overflow = 'hidden';
      inputEl.style.resize = 'none';
      // 若当前不可见，等待可见后再测量
      if (isVisible(inputEl)) {
        autosizeNow();
      }
    } catch(_) {}

    // 输入监听（内容渲染去抖，大小即时）
    inputEl.addEventListener('input', function(e){
      // 即时调整高度，避免输入时闪烁
  try { autosizeNow(); } catch(_) {}
      // 渲染与保存去抖
      debouncedRender();
    });

    var debouncedRender = debounce(onInput, 250);

    // 窗口大小变化时也重新测量（字体或宽度变化会影响换行）
    window.addEventListener('resize', function(){ try { autosizeNow(); } catch(_) {} });

    // 如果初始化时不可见，监听可见后自适应（一次）
    try {
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function(entries){
          for (var i=0;i<entries.length;i++){
            var en = entries[i];
            if (en && en.isIntersecting) { autosizeNow(); io.disconnect(); break; }
          }
        }, { root: null, threshold: 0 });
        io.observe(inputEl);
      } else {
        // 兜底：短时轮询最多 20 次
        var tries = 20;
        (function poll(){
          if (isVisible(inputEl)) { autosizeNow(); return; }
          if (--tries <= 0) return;
          setTimeout(poll, 150);
        })();
      }
    } catch(_) {}
  }

  // 等待 DOM 与 partials 注入后再初始化，避免元素不存在
  function whenDOMReady(){
    return new Promise(function(resolve){
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      } else { resolve(); }
    });
  }

  function whenPartialsReady(){
    if (!window.partialsReady || typeof window.partialsReady.then !== 'function') {
      return Promise.resolve();
    }
    return window.partialsReady.catch(function(){});
  }

  (async function boot(){
    await whenDOMReady();
    await whenPartialsReady();
    init();
  })();

  // 暴露少量 API 以便后续扩展
  window.draftPanel = {
    render: render,
    save: save,
    load: load,
  init: init,
  autosize: function(){ try { autosizeNow(); } catch(_) {} }
  };
})();

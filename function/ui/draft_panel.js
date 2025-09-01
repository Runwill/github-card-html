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
    render(val);
    save(val);
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

    // 输入监听，去抖以减轻替换调用频率
    inputEl.addEventListener('input', debounce(onInput, 250));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else { init(); }

  // 暴露少量 API 以便后续扩展
  window.draftPanel = {
    render: render,
    save: save,
    load: load,
    init: init
  };
})();

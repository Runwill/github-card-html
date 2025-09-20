(function(){
  var STORAGE_KEY = 'draftBlockContent';
  var inputEl, previewEl;

  function safe(fn){ try { return fn && fn(); } catch(_) {} }

  function $(sel){ return document.querySelector(sel); }

  function debounce(fn, wait){
    var t; return function(){ var c=this,a=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(c,a); }, wait); };
  }

  function callReplacers(root){
    var reps = [
      ['replace_character_name', endpoints.character()],
      ['replace_skill_name', endpoints.skill()],
      ['replace_card_name', endpoints.card()],
      ['replace_term', endpoints.termDynamic(), 1],
      ['replace_term', endpoints.termFixed(), 1]
    ];
    for (var i=0;i<reps.length;i++) (function(it){
      safe(function(){ var fn = window[it[0]]; if(!fn) return; var args = it.slice(1); args.push(root); return fn.apply(window, args); });
    })(reps[i]);
    setTimeout(function(){ safe(function(){ return window.pronounCheck && window.pronounCheck(root); }); }, 50);
  }

  function render(html){
    if (!previewEl) return;
    try {
      previewEl.innerHTML = (html || '').replace(/\\/g, '');
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
    render(val); save(val);
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
    if (!isVisible(inputEl)) return;
    inputEl.style.height = 'auto';
    var next = Math.max(80, inputEl.scrollHeight);
    inputEl.style.height = next + 'px';
  }

  function init(){
    inputEl = $('#htmlInput');
    previewEl = $('.draftBlock');
    if (!inputEl || !previewEl) return;

    var saved = load();
    if (saved) {
      inputEl.value = saved;
      render(saved);
    }

    try { inputEl.style.height='auto'; inputEl.style.overflow='hidden'; inputEl.style.resize='none'; if (isVisible(inputEl)) autosizeNow(); } catch(_) {}

    var debouncedRender = debounce(onInput, 250);
    inputEl.addEventListener('input', function(e){
      safe(autosizeNow);
      debouncedRender();
    });
    window.addEventListener('resize', function(){ safe(autosizeNow); });

    try {
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function(entries){
          for (var i=0;i<entries.length;i++){
            var en = entries[i];
            if (en && en.isIntersecting) { autosizeNow(); io.disconnect(); break; }
          }
        });
        io.observe(inputEl);
      } else {
        var tries = 20; (function poll(){ if (isVisible(inputEl)) { autosizeNow(); return; } if (--tries <= 0) return; setTimeout(poll, 150); })();
      }
    } catch(_) {}
  }

  function whenDOMReady(){
    return document.readyState === 'loading'
      ? new Promise(function(r){ document.addEventListener('DOMContentLoaded', r, { once: true }); })
      : Promise.resolve();
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

  window.draftPanel = { render: render, save: save, load: load, init: init, autosize: function(){ safe(autosizeNow); } };
})();

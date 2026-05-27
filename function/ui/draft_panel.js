  var STORAGE_KEY = 'draftBlockContent';
  var inputEl, previewEl;

  function debounce(fn, wait){
    var t; return function(){ var c=this,a=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(c,a); }, wait); };
  }

  function render(html){
    if (!previewEl) return;
    try {
      previewEl.innerHTML = (html || '').replace(/\\/g, '');
      window.runTextReplacers?.(previewEl);
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

  function setContent(html){
    if (!inputEl || !previewEl) init();
    if (!inputEl) return;
    var val = html || '';
    inputEl.value = val;
    render(val);
    save(val);
    autosizeNow();
  }

  function isVisible(el){
    if (!el) return false;
    var cs = window.getComputedStyle ? getComputedStyle(el) : null;
    if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function usesFixedEditorLayout(){
    return !!(inputEl && inputEl.closest && inputEl.closest('.draft-live__grid'));
  }

  function autosizeNow(){
    try {
      if (!inputEl || !isVisible(inputEl)) return;
      var fixed = usesFixedEditorLayout();
      inputEl.style.height = fixed ? '' : 'auto';
      inputEl.style.overflow = fixed ? 'auto' : 'hidden';
      inputEl.style.resize = 'none';
      if (!fixed) inputEl.style.height = Math.max(80, inputEl.scrollHeight) + 'px';
    } catch(_) {
    }
  }

  function init(){
    inputEl = document.querySelector('#htmlInput');
    previewEl = document.querySelector('.draftBlock');
    if (!inputEl || !previewEl) return;

    var saved = load();
    if (saved) {
      inputEl.value = saved;
      render(saved);
    }

    try {
      inputEl.style.height = usesFixedEditorLayout() ? '' : 'auto';
      inputEl.style.overflow = usesFixedEditorLayout() ? 'auto' : 'hidden';
      inputEl.style.resize = 'none';
      if (isVisible(inputEl)) autosizeNow();
    } catch(_) {}

    var debouncedRender = debounce(onInput, 250);
    inputEl.addEventListener('input', function(e){
      autosizeNow();
      debouncedRender();
    });
    window.addEventListener('resize', autosizeNow);

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

  (async function boot(){
    await whenDOMReady();
    await whenPartialsReady();
    init();
  })();

  window.draftPanel = { setContent: setContent, autosize: autosizeNow };

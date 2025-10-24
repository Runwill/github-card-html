(function(){
  const STORAGE_KEY = 'lang';
  const DEFAULT_LANG = 'zh';
  // 明确定义语言循环顺序：zh -> en -> debug -> zh ...
  // 注意：保留通过按钮切换到调试语言（debug）的能力
  const CYCLE_ORDER = ['zh','en','debug'];

  function current(){
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'zh' || saved === 'en' || saved === 'debug')) return saved;
    return DEFAULT_LANG;
  }

  function nameOf(lang){
    const m = { zh: (window.I18N_STRINGS?.zh?.['lang.name.zh']||'中文'), en: (window.I18N_STRINGS?.en?.['lang.name.en']||'English'), debug: (window.I18N_STRINGS?.zh?.['lang.name.debug']||'调试') };
    return m[lang] || lang;
  }

  function setLang(lang){
    if (!['zh','en','debug'].includes(lang)) return;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('data-lang', lang);
    apply();
    const ev = new CustomEvent('i18n:changed', { detail: { lang } });
    window.dispatchEvent(ev);
  }

  function nextLang(){
    const idx = CYCLE_ORDER.indexOf(current());
    return CYCLE_ORDER[(idx+1)%CYCLE_ORDER.length];
  }

  function dict(){
    const lang = current();
    const pack = (window.I18N_STRINGS && window.I18N_STRINGS[lang]) || {};
    // debug 是 Proxy，但也可直接使用
    return pack;
  }

  function format(str, params){
    if (!params) return str;
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : '{'+k+'}'));
  }

  function t(key, params){
    const lang = current();
    const packs = window.I18N_STRINGS || {};
    const cur = packs[lang] || {};
    let val = cur && cur[key];
    const missing = (val == null);
    // debug 语言用于显示 key，本身不提示告警
    if (missing && lang === 'debug') { val = key; }
    // 非 debug 语言：缺失键时仅告警一次（按 key+lang 去重）
    if (missing && lang !== 'debug') {
      try {
        const sig = lang + '|' + key;
        const store = (window.__I18N_WARNED__ = window.__I18N_WARNED__ || new Set());
        if (!store.has(sig)) { console.warn(`[i18n] Missing translation: "${key}" (lang=${lang})`); store.add(sig); }
      } catch {}
      val = key;
    }
    return format(val, params);
  }

  function apply(root){
    const scope = root || document;
    // data-i18n: 替换 textContent
    scope.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const paramsRaw = el.getAttribute('data-i18n-params');
      let params = null; if (paramsRaw) { try { params = JSON.parse(paramsRaw); } catch(_){} }
      el.textContent = t(key, params);
    });
    // data-i18n-attr: 逗号分隔的属性名
    scope.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const attrs = (el.getAttribute('data-i18n-attr')||'').split(',').map(s=>s.trim()).filter(Boolean);
      attrs.forEach(attr => {
        const key = el.getAttribute('data-i18n-'+attr);
        if (!key) return;
        const paramsRaw = el.getAttribute('data-i18n-params-'+attr);
        let params = null; if (paramsRaw) { try { params = JSON.parse(paramsRaw); } catch(_){} }
        try { el.setAttribute(attr, t(key, params)); } catch {}
      });
    });
    // 语言切换按钮（若存在）
    try {
      const btn = document.getElementById('lang-toggle-button');
      if (btn) btn.textContent = t('lang.button.label', { lang: nameOf(current()) });
    } catch {}
  }

  // 初始化：等待 partials 注入后应用翻译
  const ready = window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve();
  ready.then(() => {
    document.documentElement.setAttribute('data-lang', current());
    apply();
    // 语言按钮点击绑定交由 function/ui/lang_toggle_button.js 统一处理，避免重复绑定导致跳两步
    // 观察后续注入的节点，自动对含 i18n 标记的区域应用翻译（防止局部异步注入导致默认中文残留）
    try {
      const hasI18nMarks = (el)=>{
        if (!(el instanceof Element)) return false;
        if (el.hasAttribute('data-i18n') || el.hasAttribute('data-i18n-attr')) return true;
        return !!el.querySelector?.('[data-i18n], [data-i18n-attr]');
      };
      let scheduled = false; const queue = new Set();
      const flush = ()=>{
        scheduled = false;
        // 针对每个加入队列的根节点单独 apply，减少整页重绘
        queue.forEach(root => { try { apply(root); } catch {} });
        queue.clear();
      };
      const observer = new MutationObserver((mutations)=>{
        let found = false;
        for (const m of mutations) {
          if (!m.addedNodes) continue;
          for (const n of m.addedNodes) {
            if (hasI18nMarks(n)) { queue.add(n); found = true; }
          }
        }
        if (found && !scheduled) { scheduled = true; requestAnimationFrame(flush); }
      });
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    } catch {}
  });

  // 暴露全局 API：提供单一全局函数 t，避免重复别名
  window.t = t;
  window.i18n = { t, apply, setLang, getLang: current, nextLang, nameOf };
})();

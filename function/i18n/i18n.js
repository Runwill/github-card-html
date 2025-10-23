(function(){
  const STORAGE_KEY = 'lang';
  const DEFAULT_LANG = 'zh';

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
    const order = ['zh','en','debug'];
    const idx = order.indexOf(current());
    return order[(idx+1)%order.length];
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
    if (val == null && lang !== 'zh') { val = packs.zh && packs.zh[key]; }
    if (val == null && lang === 'debug') { val = key; }
    if (val == null) { val = key; }
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
  });

  // 暴露全局 API
  window.i18n = { t, apply, setLang, getLang: current, nextLang, nameOf };
})();

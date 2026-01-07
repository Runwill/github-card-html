(function(){
  const STORAGE_KEY = 'lang';
  const DEFAULT_LANG = 'zh';
  // 明确定义语言循环顺序：zh -> en -> debug -> zh ...
  // 注意：保留通过按钮切换到调试语言（debug）的能力
  const CYCLE_ORDER = ['zh','en','debug'];

  // 读取并解析本地权限数组
  function readPermissions(){
    try {
      const raw = localStorage.getItem('permissions');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch(_) { return []; }
  }

  // 是否拥有切换到调试语言的权限
  function hasDebugPermission(){
    try { return readPermissions().includes('赞拜不名'); } catch(_) { return false; }
  }

  // 尝试从后端拉取并缓存当前用户权限（若已登录且本地未缓存）
  let ensureRetryTimer = null;
  let ensureRetryCount = 0;
  const MAX_ENSURE_RETRY = 12;
  const scheduleEnsureRetry = () => {
    if (ensureRetryCount >= MAX_ENSURE_RETRY) return;
    if (ensureRetryTimer) return;
    ensureRetryTimer = setTimeout(() => {
      ensureRetryTimer = null;
      ensureRetryCount += 1;
      try { ensurePermissionsCached(); } catch(_){}
    }, 140);
  };

  async function ensurePermissionsCached(){
    try {
      if (readPermissions().length) return; // 已有缓存
      const id = localStorage.getItem('id');
      const token = localStorage.getItem('token');
      if (!id || !token) return; // 未登录
      const apiFn = (window.endpoints && typeof window.endpoints.api === 'function') ? window.endpoints.api : null;
      if (!apiFn) { scheduleEnsureRetry(); return; }
      const url = apiFn('/api/user/' + encodeURIComponent(id));
      const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
      if (res && res.status === 404) {
        try {
          localStorage.removeItem('id');
          localStorage.removeItem('token');
          localStorage.removeItem('username');
          localStorage.removeItem('avatar');
          localStorage.removeItem('intro');
          localStorage.removeItem('permissions');
        } catch(_){}
        return;
      }
      if (!res.ok) return;
      ensureRetryCount = 0;
      const data = await res.json().catch(()=>null);
      const perms = (data && Array.isArray(data.permissions)) ? data.permissions : [];
      try { localStorage.setItem('permissions', JSON.stringify(perms)); } catch(_){ }
    } catch(_){ }
  }

  function current(){
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'zh' || saved === 'en' || saved === 'debug')) return saved;
    return DEFAULT_LANG;
  }

  function nameOf(lang){
    // 返回当前界面语言包中的目标语言名称；若缺失，则返回键名本身，避免使用中文/英文等硬编码兜底
    try { return t(`lang.name.${lang}`); } catch (_) { return `lang.name.${lang}`; }
  }

  function setLang(lang){
    if (!['zh','en','debug'].includes(lang)) return;
    // 权限校验：无“赞拜不名”则不允许切至 debug
    if (lang === 'debug' && !hasDebugPermission()) {
      try { console.warn('[i18n] Debug language is restricted by permission.'); } catch(_){}
      return;
    }
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('data-lang', lang);
    apply();
    const ev = new CustomEvent('i18n:changed', { detail: { lang } });
    window.dispatchEvent(ev);
  }

  function nextLang(){
    // 无权限时，循环仅在 zh/en 之间；有权限则包含 debug
    const order = hasDebugPermission() ? CYCLE_ORDER : ['zh','en'];
    const cur = current();
    const idx = order.indexOf(cur);
    const next = order[(idx+1) % order.length];
    return next;
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

    // 针对单个元素应用 i18n（含自身与属性）
    const applyOne = (el) => {
      if (!el || !(el instanceof Element)) return;
      if (el.hasAttribute('data-i18n')) {
        const key = el.getAttribute('data-i18n');
        const paramsRaw = el.getAttribute('data-i18n-params');
        let params = null; if (paramsRaw) { try { params = JSON.parse(paramsRaw); } catch(_){} }
        // Detect HTML-like content (simple heuristic: starts with <span) to use innerHTML
        // Or if the key starts with 'game.timing.' or 'game.process.' which we know contain HTML
        const val = t(key, params);
        if (key && (key.startsWith('game.timing.') || key.startsWith('game.process.') || val.trim().startsWith('<span'))) {
            el.innerHTML = val;
        } else {
            el.textContent = val;
        }
      }
      if (el.hasAttribute('data-i18n-attr')) {
        const attrs = (el.getAttribute('data-i18n-attr')||'').split(',').map(s=>s.trim()).filter(Boolean);
        attrs.forEach(attr => {
          const key = el.getAttribute('data-i18n-'+attr);
          if (!key) return;
          const paramsRaw = el.getAttribute('data-i18n-params-'+attr);
          let params = null; if (paramsRaw) { try { params = JSON.parse(paramsRaw); } catch(_){} }
          try { el.setAttribute(attr, t(key, params)); } catch {}
        });
      }
    };

    // 先应用到根元素自身（若是元素）
    try { if (scope instanceof Element) applyOne(scope); } catch {}

    // 再应用到后代元素
    if (scope.querySelectorAll) {
      scope.querySelectorAll('[data-i18n]').forEach(applyOne);
      scope.querySelectorAll('[data-i18n-attr]').forEach(applyOne);
    }

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
    // 登录后的页面尽早缓存权限，供语言切换使用
    ensurePermissionsCached();
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

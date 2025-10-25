(function () {
  // tokens/ui/logger
  // 在词元页底部添加“变更日志”区域，并提供 logChange() 记录增删改

  const MAX_LOGS = 200;
  // localStorage persistence removed; logs are pulled from server

  // 折叠/展开动画：与 tokens.css 中的 .collapsible 配合
  function isAnimating(el){ return !!(el && (el.classList.contains('is-opening') || el.classList.contains('is-closing'))); }
  function isOpen(el){ return !!(el && el.classList.contains('is-open')); }
  function openCollapsible(el){
    try{
      if (!el || isAnimating(el) || isOpen(el)) return;
      const startH = el.offsetHeight; // 可能为 0
      el.classList.add('is-opening');
      el.style.height = startH + 'px';
      // 读一次触发重排
      void el.offsetHeight;
      const targetH = el.scrollHeight;
      el.style.height = targetH + 'px';
      const onEnd = (e)=>{
        if (e && e.target !== el) return;
        el.removeEventListener('transitionend', onEnd);
        el.classList.remove('is-opening');
        el.classList.add('is-open');
        el.style.height = 'auto';
      };
      el.addEventListener('transitionend', onEnd);
    }catch(_){ }
  }
  function closeCollapsible(el){
    try{
      if (!el || isAnimating(el) || !isOpen(el)) return;
      const startH = el.scrollHeight; // 已展开高度（可能被 max-height 限制）
      el.style.height = startH + 'px';
      // 读一次触发重排
      void el.offsetHeight;
      el.classList.add('is-closing');
      el.classList.remove('is-open');
      el.style.height = '0px';
      const onEnd = (e)=>{
        if (e && e.target !== el) return;
        el.removeEventListener('transitionend', onEnd);
        el.classList.remove('is-closing');
        // 维持 0 高度
      };
      el.addEventListener('transitionend', onEnd);
    }catch(_){ }
  }

  function html(s) {
    try {
      if (s == null) return '';
      const t = String(s);
      return t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    } catch (_) { return String(s || ''); }
  }

  function ensureTokensLogArea() {
    try {
      let body = document.getElementById('tokens-log');
      if (body && body.__ready) return body;

      const content = document.getElementById('tokens-content');
      if (!content) return null;

      // 容器：在 tokens-content 后追加一个日志面板
      let panel = document.getElementById('tokens-log-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'tokens-log-panel';
        panel.className = 'tokens-log';

    const header = document.createElement('div');
    header.className = 'tokens-log__header';
  header.innerHTML = '<div class="tokens-log__title" data-i18n="tokens.log.title"></div><div class="tokens-log__ctrls"><button class="btn btn--secondary btn--sm expand-btn js-log-collapse is-expanded" data-i18n="common.collapse" data-i18n-attr="title" data-i18n-title="common.collapse"></button><button class="btn btn--secondary btn--sm js-log-clear" data-i18n="tokens.log.clear" data-i18n-attr="title" data-i18n-title="tokens.log.clear"></button></div>';
    try { if (window.i18n && window.i18n.apply) { window.i18n.apply(header); } } catch (_) {}

        // 外包一层可折叠容器，内层保持可滚动
        const wrap = document.createElement('div');
        wrap.className = 'tokens-log__wrap collapsible is-open';
        // 可滚动主体
        body = document.createElement('div');
        body.id = 'tokens-log';
        body.className = 'tokens-log__body';
        body.setAttribute('aria-live', 'polite');
        wrap.appendChild(body);

        panel.appendChild(header);
        panel.appendChild(wrap);

        // 插入到 content 后
        if (content.parentElement) {
          content.parentElement.appendChild(panel);
        } else {
          content.insertAdjacentElement('afterend', panel);
        }

        // 绑定按钮（首次创建时）
        try{
          header.querySelector('.js-log-clear')?.addEventListener('click',async ()=>{
            try{
              const T = window.tokensAdmin || {}; const apiJson = T.apiJson; const getAuth = T.getAuth;
              const auth = typeof getAuth === 'function' ? getAuth() : { canEdit:false };
              if (!auth.canEdit) { try{ T.showToast && T.showToast(window.t('common.noPermission')); }catch(_){ } return; }
              if (typeof apiJson === 'function') {
                await apiJson('/tokens/logs', { method: 'DELETE', auth: true });
              }
              try{ body.innerHTML=''; }catch(_){}
              try{ (T && T.showToast) ? T.showToast(window.t('tokens.toast.cleared')) : null; }catch(_){ }
            }catch(e){ alert((e && e.message) || window.t('tokens.error.updateFailed')); }
          });
          header.querySelector('.js-log-collapse')?.addEventListener('click',(e)=>{
            const btn = e.currentTarget;
            const w = panel.querySelector('.tokens-log__wrap');
            if (!w) return;
            if (isAnimating(w)) return; // 动画中忽略重复点击
            if (isOpen(w)) {
              closeCollapsible(w);
              if (btn) { try{ btn.setAttribute('data-i18n','common.expand'); if (window.i18n && window.i18n.apply) window.i18n.apply(btn);}catch(_){ } btn.classList.remove('is-expanded'); }
            } else {
              openCollapsible(w);
              if (btn) { try{ btn.setAttribute('data-i18n','common.collapse'); if (window.i18n && window.i18n.apply) window.i18n.apply(btn);}catch(_){ } btn.classList.add('is-expanded'); }
            }
          });
        }catch(_){ }
      } else {
        body = document.getElementById('tokens-log');
        // 绑定控制按钮（在已存在面板时需要从 panel 查询 header）
  const headerEl = panel.querySelector('.tokens-log__header');
  headerEl?.querySelector('.js-log-clear')?.addEventListener('click',()=>{ try{ body.innerHTML=''; }catch(_){} });
        headerEl?.querySelector('.js-log-collapse')?.addEventListener('click',(e)=>{
          const btn = e.currentTarget;
          const w = panel.querySelector('.tokens-log__wrap');
          if (!w) return;
          if (isAnimating(w)) return;
          if (isOpen(w)) {
            closeCollapsible(w);
            if (btn) { try{ btn.setAttribute('data-i18n','common.expand'); if (window.i18n && window.i18n.apply) window.i18n.apply(btn);}catch(_){ } btn.classList.remove('is-expanded'); }
          } else {
            openCollapsible(w);
            if (btn) { try{ btn.setAttribute('data-i18n','common.collapse'); if (window.i18n && window.i18n.apply) window.i18n.apply(btn);}catch(_){ } btn.classList.add('is-expanded'); }
          }
        });
      }

      // 日志内“删除”按钮事件委托（样式与删除词元属性一致：.btn-del）；若有 _id 则请求后端删除
      try {
        if (body && !body.__delDelegationBound) {
          body.__delDelegationBound = true;
          body.addEventListener('click', (ev) => {
            const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del') : null;
            if (!btn) return;
            const entry = btn.closest('.tokens-log__entry');
            if (!entry) return;
            (async () => {
              const T = window.tokensAdmin || {}; const getAuth = T.getAuth; const auth = typeof getAuth === 'function' ? getAuth() : { canEdit:false };
              if (!auth.canEdit) { try{ T.showToast && T.showToast(window.t('common.noPermission')); }catch(_){ } return; }
              const id = entry.getAttribute('data-log-id');
              if (id) {
                try {
                  const apiJson = T.apiJson;
                  if (typeof apiJson === 'function') {
                    await apiJson(`/tokens/logs/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
                  }
                } catch (e) {
                  alert((e && e.message) || window.t('tokens.error.deleteFailed'));
                  return;
                }
              }
              try { entry.remove(); } catch (_) {}
              try { (T && T.showToast) ? T.showToast(window.t('tokens.toast.deleted')) : null; } catch (_) {}
            })();
          });
        }
      } catch (_) {}

      if (body) body.__ready = true;
      return body || null;
    } catch (_) { return null; }
  }

  function fmtTime(d) {
    try { return new Date(d || Date.now()).toLocaleTimeString(); } catch (_) { return '' + (d || Date.now()); }
  }

  // 解析各种时间输入为时间戳（ms）
  function parseTimeValue(v){
    try{
      if (v == null) return undefined;
      if (v instanceof Date) return v.getTime();
      if (typeof v === 'number') return v;
      if (typeof v === 'string') { const t = Date.parse(v); return isNaN(t) ? undefined : t; }
      return undefined;
    }catch(_){ return undefined; }
  }

  function formatAbs(v){
    try{ const t = parseTimeValue(v) ?? Date.now(); return new Date(t).toLocaleString(); }catch(_){ return String(v||''); }
  }

  function formatRel(v){
    try{
      const now = Date.now();
      const t = parseTimeValue(v) ?? now;
      let diff = Math.floor((now - t) / 1000); // 秒
      if (diff < -5) { // 未来时间，简单处理为“刚刚”以避免困惑
  return window.t('time.justNow');
      }
  if (diff < 5) return window.t('time.justNow');
  if (diff < 60) return window.t('time.secondsAgo', { n: diff });
      const m = Math.floor(diff / 60);
  if (m < 60) return window.t('time.minutesAgo', { n: m });
      const h = Math.floor(m / 60);
  if (h < 24) return window.t('time.hoursAgo', { n: h });
      const d = Math.floor(h / 24);
  if (d < 30) return window.t('time.daysAgo', { n: d });
      const mo = Math.floor(d / 30);
  if (mo < 12) return window.t('time.monthsAgo', { n: mo });
      const y = Math.floor(mo / 12);
  return window.t('time.yearsAgo', { n: y });
    }catch(_){ return ''; }
  }

  // 从对象中提取时间字段（服务端/前端均可用）
  function pickLogTime(v){
    try{
      return v && (v.ts || v.time || v.createdAt || v.updatedAt || v.date || v.at || v.timestamp);
    }catch(_){ return undefined; }
  }

  function briefDoc(doc) {
    try {
      if (!doc || typeof doc !== 'object') return '';
      const picks = [];
      if (doc.en) picks.push(`en:${doc.en}`);
      if (doc.cn) picks.push(`cn:${doc.cn}`);
      if (doc.name) picks.push(`name:${doc.name}`);
      if (doc.id != null) picks.push(`id:${doc.id}`);
      return picks.join(' ');
    } catch (_) { return ''; }
  }

  function mapCollectionName(coll) {
    try {
      const t = (window && window.t) ? window.t : null;
      switch (coll) {
        case 'term-fixed': return t ? t('tokens.section.termFixed') : 'term-fixed';
        case 'term-dynamic': return t ? t('tokens.section.termDynamic') : 'term-dynamic';
        case 'card': return t ? t('tokens.section.card') : 'card';
        case 'character': return t ? t('tokens.section.character') : 'character';
        case 'skill': return t ? t('tokens.section.skill') : 'skill';
        default: return coll || '';
      }
    } catch (_) { return coll || ''; }
  }

  // 取旧值/新值的通用帮助，兼容多种字段命名
  function pickOld(v){
    try{ return (v && (v.from !== undefined ? v.from : (v.prev !== undefined ? v.prev : (v.previous !== undefined ? v.previous : (v.old !== undefined ? v.old : v.before))))); }catch(_){ return undefined; }
  }
  function pickNew(v){
    try{ return (v && (v.value !== undefined ? v.value : (v.to !== undefined ? v.to : (v.new !== undefined ? v.new : v.after)))); }catch(_){ return undefined; }
  }

  function shortId(id) {
    try { const s = String(id || ''); return s.length > 8 ? s.slice(-6) : s; } catch(_) { return String(id || ''); }
  }

  function pickUnique(doc) {
    try{
      const candidates = ['en','cn','name','key','code','slug','title'];
      for (const k of candidates) {
        if (doc && typeof doc[k] === 'string' && doc[k].trim()) return doc[k].trim();
      }
      return '';
    }catch(_){ return ''; }
  }

  function resolveLabel(collection, id, fallback) {
    try{
      const doc = (window.tokensAdmin && window.tokensAdmin.findDocInState) ? window.tokensAdmin.findDocInState(collection, id) : null;
      const label = doc ? pickUnique(doc) : (fallback || '');
      return label || ('#' + shortId(id));
    }catch(_){ return ('#' + shortId(id)); }
  }

  function makeLine(type, payload) {
    const rawTime = pickLogTime(payload);
    const ts = parseTimeValue(rawTime) ?? Date.now();
    const iso = new Date(ts).toISOString();
    const timeAbs = formatAbs(ts);
    const timeRel = formatRel(ts);
    const timeHtml = `<time class="log-time" datetime="${html(iso)}" title="${html(timeAbs)}" data-ts="${html(String(ts))}" data-rel="${html(timeRel)}" data-abs="${html(timeAbs)}">${html(timeRel)}</time>`;
    const c = payload && payload.collection ? mapCollectionName(payload.collection) : '';
    const tag = (payload && payload.collection) ? resolveLabel(payload.collection, payload && payload.id, payload && payload.label) : '';
    const pill = (txt, cls='')=> `<i class="log-pill ${cls}">${html(txt||'')}</i>`;
    const code = (txt)=> `<code class="log-code">${html(txt||'')}</code>`;
    const json = (v)=> (v && typeof v==='object') ? JSON.stringify(v) : v;
    if (type === 'create') {
      const label = pickUnique(payload && payload.doc) || (payload && payload.id ? ('#' + shortId(payload.id)) : '');
      const msg = (function(){
        try{
          const d = payload && payload.doc;
          if (!d || typeof d !== 'object') return '';
          if (d.cn) return String(d.cn);
          if (d.en) return String(d.en);
          if (d.name) return String(d.name);
          if (d.id != null) return String(d.id);
          return '';
        }catch(_){ return ''; }
      })();
  return `<div class="log-row is-create">${timeHtml}${pill(window.t('tokens.log.create'),'is-green')}<i class="log-ctx">${html(c)} [${html(label)}]</i><i class="log-msg">${code(msg)}</i><div class="log-actions"><button class="btn-del" data-i18n="common.delete" data-i18n-attr="title,aria-label" data-i18n-title="common.delete" data-i18n-aria-label="common.delete"></button></div></div>`;
    }
    if (type === 'delete-doc') {
  return `<div class="log-row is-delete">${timeHtml}${pill(window.t('tokens.log.deleteDoc'),'is-red')}<i class="log-ctx">${html(c)} [${html(tag)}]</i><div class="log-actions"><button class="btn-del" data-i18n="common.delete" data-i18n-attr="title,aria-label" data-i18n-title="common.delete" data-i18n-aria-label="common.delete"></button></div></div>`;
    }
    if (type === 'delete-field') {
      const from = pickOld(payload);
  return `<div class="log-row is-delete">${timeHtml}${pill(window.t('tokens.log.deleteField'),'is-red')}<i class="log-ctx">${html(c)} [${html(tag)}]</i><i class="log-path">${code(payload.path)}</i>${from!==undefined? `<i class="log-val">${window.t('tokens.log.prev')}${code(json(from))}</i>`:''}<div class="log-actions"><button class="btn-del" data-i18n="common.delete" data-i18n-attr="title,aria-label" data-i18n-title="common.delete" data-i18n-aria-label="common.delete"></button></div></div>`;
    }
    if (type === 'update') {
      const v = pickNew(payload);
      const from = pickOld(payload);
  return `<div class="log-row is-update">${timeHtml}${pill(window.t('tokens.log.update'),'is-blue')}<i class="log-ctx">${html(c)} [${html(tag)}]</i><i class="log-path">${code(payload.path)}</i><i class="log-val">${from!==undefined? `${code(json(from))} → `:''}${code(json(v))}</i><div class="log-actions"><button class="btn-del" data-i18n="common.delete" data-i18n-attr="title,aria-label" data-i18n-title="common.delete" data-i18n-aria-label="common.delete"></button></div></div>`;
    }
    if (type === 'save-edits') {
      const sets = (payload && payload.sets) || [];
      const dels = (payload && payload.dels) || [];
  const summary = window.t('tokens.log.saveSummary', { sets: sets.length, dels: dels.length });
  const head = `<div class="log-row is-save">${timeHtml}${pill(window.t('tokens.edit.submit'),'is-indigo')}<i class="log-ctx">${html(c)} [${html(tag)}]</i><i class="log-head">${html(summary)}</i><div class="log-actions"><button class="btn-del" data-i18n="common.delete" data-i18n-attr="title,aria-label" data-i18n-title="common.delete" data-i18n-aria-label="common.delete"></button></div></div>`;
      const pick = (val) => (val && typeof val === 'object') ? JSON.stringify(val) : val;
      const detail = [];
      sets.slice(0, 10).forEach(s => { detail.push(`<div class="log-sub">${code(s.path)}：${s.from!==undefined? `${code(pick(s.from))} → `:''}${code(pick(s.to))}</div>`); });
  dels.slice(0, 10).forEach(d => { detail.push(`<div class="log-sub is-del">${window.t('common.delete')} ${code(d.path)}${d.from!==undefined? ` (${window.t('tokens.log.prev')}${code(pick(d.from))})`:''}</div>`); });
      return head + detail.join('');
    }
    return `<div class=\"log-row\">${timeHtml}${pill(type)}<div class=\"log-actions\"><button class=\"btn-del\" data-i18n=\"common.delete\" data-i18n-attr=\"title,aria-label\" data-i18n-title=\"common.delete\" data-i18n-aria-label=\"common.delete\"></button></div></div>`;
  }

  /**
   * 追加一条日志到前端面板。
   * 注意：若 payload 中包含 ts/time/createdAt/updatedAt/date/at/timestamp，将使用该时间显示；
   * 否则回退到客户端当前时间。
   */
  function logChange(type, payload) {
    try {
      const body = ensureTokensLogArea();
      if (!body) return;

  const line = makeLine(type, payload || {});
    const row = document.createElement('div');
    row.className = 'tokens-log__entry';
    row.innerHTML = line;
  try { if (window.i18n && window.i18n.apply) window.i18n.apply(row); } catch (_) {}
    // 在插入前记录当前滚动位置，用于插入后恢复视口
    const prevTop = body.scrollTop || 0;
    const atTop = prevTop <= 5; // 视为已置顶
    // 新在上：头插
    if (body.firstChild) body.insertBefore(row, body.firstChild); else body.appendChild(row);
    // 若用户不在顶部，保持当前可见内容不跳动（补偿新增节点高度）
    if (!atTop) {
      try {
        // 计算新增节点的可视高度（包含外边距）
        let delta = row.offsetHeight || 0;
        try {
          const cs = window.getComputedStyle(row);
          const mt = parseFloat(cs.marginTop) || 0;
          const mb = parseFloat(cs.marginBottom) || 0;
          delta += mt + mb;
        } catch (_) { /* ignore */ }
        body.scrollTop = prevTop + delta;
      } catch (_) { /* ignore */ }
    } else {
      // 在顶部时，保持顶部即可看到最新日志
      try { body.scrollTop = 0; } catch (_) { }
    }

  // Persistence removed; server is the source of truth

      // 裁剪过长日志（新在上，删除底部老的）
      try {
        const extra = (body.children.length - MAX_LOGS);
        for (let i = 0; i < extra; i++) body.removeChild(body.lastChild);
      } catch (_) {}

      // 不再强制滚动到底部；保持用户当前位置或置顶
    } catch (_) {}
  }

  Object.assign(window.tokensAdmin, { ensureTokensLogArea, logChange });

  // 页面加载后自动恢复本地缓存的日志
  function hydrateLogs(){
    try{
      const body = ensureTokensLogArea();
      if(!body) return;
      // 从服务端拉取最新日志
      const T = window.tokensAdmin || {};
      const fetchTokenLogs = T.fetchTokenLogs;
      (async ()=>{
        try{
          const out = fetchTokenLogs ? await fetchTokenLogs({ page:1, pageSize: 100 }) : null;
          const list = (out && out.list) || [];
          if (Array.isArray(list) && list.length){
            // 新在上：按时间降序排序（若缺时间则保持原顺序近似）
            const items = list.slice();
            try{
              items.sort((a,b)=>{
                const tb = parseTimeValue(pickLogTime(b)) ?? 0;
                const ta = parseTimeValue(pickLogTime(a)) ?? 0;
                return tb - ta;
              });
            }catch(_){ }
            const frag = document.createDocumentFragment();
            items.forEach(log=>{
              const payload = (function(){
                // 兼容更多字段名：旧值/新值
                const base = {
                  collection: log.collection,
                  id: log.docId,
                  path: log.path,
                  value: (log.value !== undefined ? log.value : (log.to !== undefined ? log.to : (log.new !== undefined ? log.new : log.after))),
                  from: (log.from !== undefined ? log.from : (log.prev !== undefined ? log.prev : (log.previous !== undefined ? log.previous : (log.old !== undefined ? log.old : log.before)))),
                  doc: log.doc,
                  // 兜底标签：若服务端提供了简要 doc，则从中挑选一个可读字段（en/cn/name/key/code/slug/title）
                  label: (function(){ try{ return log && log.doc ? pickUnique(log.doc) : ''; }catch(_){ return ''; } })()
                };
                // 注入时间字段，优先取服务端返回
                const t = pickLogTime(log);
                return t ? Object.assign(base, { ts: t }) : base;
              })();
              const row = document.createElement('div');
              row.className = 'tokens-log__entry';
              if (log && log._id) { try { row.setAttribute('data-log-id', String(log._id)); }catch(_){} }
              row.innerHTML = makeLine(log.type, payload);
              try { if (window.i18n && window.i18n.apply) window.i18n.apply(row); } catch (_) {}
              frag.appendChild(row);
            });
            body.appendChild(frag);
            // 新在上：滚动到顶部即可看到最新
            try { body.scrollTop = 0; } catch(_){ }
            return; // 服务端已填充
          }
        }catch(_){ /* ignore and fallback to local */ }
        // 拉取失败则暂不展示历史
      })();
    }catch(_){ }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const ready = (window.partialsReady instanceof Promise) ? window.partialsReady : Promise.resolve();
    ready.then(()=>{ try{ hydrateLogs(); }catch(_){ } }).then(()=>{
      // 启动一个轻量的定时器，每分钟刷新一次相对时间显示
      try{
        if (!window.__tokensLogRelTimer){
          window.__tokensLogRelTimer = setInterval(()=>{
            try{
                document.querySelectorAll('.log-time[data-ts]')?.forEach(el=>{
                  const ts = Number(el.getAttribute('data-ts')) || Date.now();
                  const rel = formatRel(ts);
                  el.setAttribute('data-rel', rel);
                  // 正在悬浮时不打断绝对时间展示
                  if (!el.matches(':hover')) {
                    el.textContent = rel;
                  }
                });
            }catch(_){ }
          }, 60000);
        }
      }catch(_){ }

        // 悬浮时切换为绝对时间，移开恢复相对时间（事件委托）
        try{
          const root = document.getElementById('tokens-log') || document;
          const onOver = (e)=>{
            const t = e.target && e.target.closest ? e.target.closest('.log-time') : null;
            if (t) { const abs = t.getAttribute('data-abs'); if (abs) t.textContent = abs; }
          };
          const onOut = (e)=>{
            const t = e.target && e.target.closest ? e.target.closest('.log-time') : null;
            if (t) { const rel = t.getAttribute('data-rel'); if (rel) t.textContent = rel; }
          };
          root.addEventListener('mouseover', onOver);
          root.addEventListener('mouseout', onOut);
        }catch(_){ }
    });
  });
})();

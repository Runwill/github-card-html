(function () {
  // tokens/ui/logger
  // 在词元页底部添加“变更日志”区域，并提供 logChange() 记录增删改

  const MAX_LOGS = 200;
  // localStorage persistence removed; logs are pulled from server

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
        header.innerHTML = '<div class="tokens-log__title">变更日志</div><div class="tokens-log__ctrls"><button class="btn btn--secondary btn--sm js-log-collapse" title="收起/展开">收起</button><button class="btn btn--secondary btn--sm js-log-clear" title="清空">清空</button></div>';

        body = document.createElement('div');
        body.id = 'tokens-log';
        body.className = 'tokens-log__body';
        body.setAttribute('aria-live', 'polite');

        panel.appendChild(header);
        panel.appendChild(body);

        // 插入到 content 后
        if (content.parentElement) {
          content.parentElement.appendChild(panel);
        } else {
          content.insertAdjacentElement('afterend', panel);
        }

        // 绑定按钮（首次创建时）
        try{
          header.querySelector('.js-log-clear')?.addEventListener('click',()=>{ try{ body.innerHTML=''; }catch(_){} });
          header.querySelector('.js-log-collapse')?.addEventListener('click',(e)=>{
            const btn = e.currentTarget; const collapsed = panel.classList.toggle('is-collapsed');
            if (btn) btn.textContent = collapsed ? '展开' : '收起';
          });
        }catch(_){ }
      } else {
        body = document.getElementById('tokens-log');
        // 绑定控制按钮（在已存在面板时需要从 panel 查询 header）
  const headerEl = panel.querySelector('.tokens-log__header');
  headerEl?.querySelector('.js-log-clear')?.addEventListener('click',()=>{ try{ body.innerHTML=''; }catch(_){} });
        headerEl?.querySelector('.js-log-collapse')?.addEventListener('click',(e)=>{
          const btn = e.currentTarget; const collapsed = panel.classList.toggle('is-collapsed');
          if (btn) btn.textContent = collapsed ? '展开' : '收起';
        });
      }

      if (body) body.__ready = true;
      return body || null;
    } catch (_) { return null; }
  }

  function fmtTime(d) {
    try { return new Date(d || Date.now()).toLocaleTimeString(); } catch (_) { return '' + (d || Date.now()); }
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
    switch (coll) {
      case 'term-fixed': return '静态术语';
      case 'term-dynamic': return '动态术语';
      case 'card': return '牌';
      case 'character': return '武将';
      case 'skill': return '技能';
      default: return coll || '';
    }
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
    const t = fmtTime();
    const c = payload && payload.collection ? mapCollectionName(payload.collection) : '';
    const tag = (payload && payload.collection) ? resolveLabel(payload.collection, payload && payload.id, payload && payload.label) : '';
    const pill = (txt, cls='')=> `<i class="log-pill ${cls}">${html(txt||'')}</i>`;
    const code = (txt)=> `<code class="log-code">${html(txt||'')}</code>`;
    const json = (v)=> (v && typeof v==='object') ? JSON.stringify(v) : v;
    if (type === 'create') {
      const label = pickUnique(payload && payload.doc) || (payload && payload.id ? ('#' + shortId(payload.id)) : '');
      return `<div class="log-row is-create"><time class="log-time">${html(t)}</time>${pill('新增','is-green')}<i class="log-ctx">${html(c)} [${html(label)}]</i><i class="log-msg">${html(briefDoc(payload && payload.doc))}</i></div>`;
    }
    if (type === 'delete-doc') {
      return `<div class="log-row is-delete"><time class="log-time">${html(t)}</time>${pill('删除对象','is-red')}<i class="log-ctx">${html(c)} [${html(tag)}]</i></div>`;
    }
    if (type === 'delete-field') {
      const from = payload && (payload.from !== undefined ? payload.from : (payload.prev !== undefined ? payload.prev : undefined));
      return `<div class="log-row is-delete"><time class="log-time">${html(t)}</time>${pill('删除字段','is-red')}<i class="log-ctx">${html(c)} [${html(tag)}]</i><i class="log-path">${code(payload.path)}</i>${from!==undefined? `<i class="log-val">原：${code(json(from))}</i>`:''}</div>`;
    }
    if (type === 'update') {
      const v = (payload && (payload.value !== undefined ? payload.value : payload.to));
      const from = payload && (payload.from !== undefined ? payload.from : payload.prev);
      return `<div class="log-row is-update"><time class="log-time">${html(t)}</time>${pill('修改','is-blue')}<i class="log-ctx">${html(c)} [${html(tag)}]</i><i class="log-path">${code(payload.path)}</i><i class="log-val">${from!==undefined? `${code(json(from))} → `:''}${code(json(v))}</i></div>`;
    }
    if (type === 'save-edits') {
      const sets = (payload && payload.sets) || [];
      const dels = (payload && payload.dels) || [];
      const head = `<div class="log-row is-save"><time class="log-time">${html(t)}</time>${pill('保存','is-indigo')}<i class="log-ctx">${html(c)} [${html(tag)}]</i><i class="log-head">修改 ${sets.length} 项，删除 ${dels.length} 项</i></div>`;
      const pick = (val) => (val && typeof val === 'object') ? JSON.stringify(val) : val;
      const detail = [];
      sets.slice(0, 10).forEach(s => { detail.push(`<div class="log-sub">${code(s.path)}：${s.from!==undefined? `${code(pick(s.from))} → `:''}${code(pick(s.to))}</div>`); });
      dels.slice(0, 10).forEach(d => { detail.push(`<div class="log-sub is-del">删除 ${code(d.path)}${d.from!==undefined? `（原：${code(pick(d.from))}）`:''}</div>`); });
      return head + detail.join('');
    }
    return `<div class=\"log-row\"><time class=\"log-time\">${html(t)}</time>${pill(type)}</div>`;
  }

  function logChange(type, payload) {
    try {
      const body = ensureTokensLogArea();
      if (!body) return;

      const line = makeLine(type, payload || {});
  const row = document.createElement('div');
  row.className = 'tokens-log__entry';
  row.innerHTML = line;
      body.appendChild(row);

  // Persistence removed; server is the source of truth

      // 裁剪过长日志
      try {
        const extra = (body.children.length - MAX_LOGS);
        for (let i = 0; i < extra; i++) body.removeChild(body.firstChild);
      } catch (_) {}

      // 滚动到底部
      try { body.scrollTop = body.scrollHeight; } catch (_) {}
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
            const items = list.slice().reverse(); // 旧在上，新在下
            const frag = document.createDocumentFragment();
            items.forEach(log=>{
              const payload = (function(){
                const base = { collection: log.collection, id: log.docId, path: log.path, value: log.value, from: log.from, doc: log.doc };
                return base;
              })();
              const row = document.createElement('div');
              row.className = 'tokens-log__entry';
              row.innerHTML = makeLine(log.type, payload);
              frag.appendChild(row);
            });
            body.appendChild(frag);
            try { body.scrollTop = body.scrollHeight; } catch(_){}
            return; // 服务端已填充
          }
        }catch(_){ /* ignore and fallback to local */ }
        // 拉取失败则暂不展示历史
      })();
    }catch(_){ }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const ready = (window.partialsReady instanceof Promise) ? window.partialsReady : Promise.resolve();
    ready.then(()=>{ try{ hydrateLogs(); }catch(_){ } });
  });
})();

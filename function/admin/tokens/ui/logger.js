(function () {
  const MAX_LOGS = 200;

  const T = window.tokensAdmin;
  const esc = T.esc;
  const { COLLECTIONS } = T;

  async function mutateLog(id, suffix, method, toastKey) {
    const auth = T.getAuth ? T.getAuth() : { canEdit:false };
    if (!auth.canEdit) { T.showToast(window.t('common.noPermission')); return; }
    if (id && T.apiJson) await T.apiJson(`/tokens/logs/${encodeURIComponent(id)}${suffix}`, { method, auth: true });
    T.showToast(window.t(toastKey));
  }

  function ensureTokensLogArea() {
    try {
      let body = document.getElementById('tokens-log');
      if (body && body.__ready) return body;

      const content = document.getElementById('tokens-content');
      if (!content) return null;

      body = LogUtils.ensureLogPanel({
        panelId: 'tokens-log-panel',
        bodyId: 'tokens-log',
        titleKey: 'tokens.log.title',
        mount: content.parentElement || content,
        insertAfter: content
      });

      try {
        if (body) {
          LogUtils.bindLogCopy(body);
          LogUtils.bindLogDelete(body,
            id => mutateLog(id, '', 'DELETE', 'tokens.toast.deleted'),
            id => mutateLog(id, '/restore', 'PATCH', 'tokens.toast.restored')
          );
        }
      } catch (_) {}

      if (body) body.__ready = true;
      return body || null;
    } catch (_) { return null; }
  }

  const { parseTimeValue } = window.TimeFmt;

  function pickLogTime(v){
    try{
      return v && (v.ts || v.time || v.createdAt || v.updatedAt || v.date || v.at || v.timestamp);
    }catch(_){ return undefined; }
  }

  function mapCollectionKey(coll) { return (COLLECTIONS[coll] && COLLECTIONS[coll].sectionKey) || ''; }

  function pickField(v, keys){
    try{ for (const key of keys) if (v && v[key] !== undefined) return v[key]; }catch(_){ }
    return undefined;
  }
  const pickOld = v => pickField(v, ['from','prev','previous','old','before']);
  const pickNew = v => pickField(v, ['value','to','new','after']);

  function pickList(source, key) {
    try {
      const value = source && (source[key] || (source.data && source.data[key]) || (source.diff && source.diff[key]));
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
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
      const doc = window.tokensAdmin?.findDocInState?.(collection, id) || null;
      const label = doc ? pickUnique(doc) : (fallback || '');
      return label || ('#' + shortId(id));
    }catch(_){ return ('#' + shortId(id)); }
  }

  function makeLine(type, payload) {
    const rawTime = pickLogTime(payload);
    const timeHtml = LogUtils.timeHtml(rawTime, esc);
  const cKey = payload && payload.collection ? mapCollectionKey(payload.collection) : '';
    const tag = (payload && payload.collection) ? resolveLabel(payload.collection, payload && payload.id, payload && payload.label) : '';
    const code = (txt)=> `<code class="log-code">${esc(txt||'')}</code>`;
    const json = (v)=> (v && typeof v==='object') ? JSON.stringify(v) : v;
    const actions = LogUtils.actionsHtml();
    if (type === 'create') {
      const label = pickUnique(payload && payload.doc) || (payload && payload.id ? ('#' + shortId(payload.id)) : '');
      const msgValue = pickField(payload && payload.doc, ['cn','en','name','id']);
      const msg = msgValue == null ? '' : String(msgValue);
  return `<div class="log-row is-create">${timeHtml}${LogUtils.pill('tokens.log.create','is-green')}<i class="log-ctx">${cKey? `<span data-i18n="${cKey}"></span>`:''} [${esc(label)}]</i><i class="log-msg">${code(msg)}</i>${actions}</div>`;
    }
    if (type === 'delete-doc') {
  return `<div class="log-row is-delete">${timeHtml}${LogUtils.pill('tokens.log.deleteDoc','is-red')}<i class="log-ctx">${cKey? `<span data-i18n="${cKey}"></span>`:''} [${esc(tag)}]</i>${actions}</div>`;
    }
    if (type === 'delete-field') {
      const from = pickOld(payload);
  return `<div class="log-row is-delete">${timeHtml}${LogUtils.pill('tokens.log.deleteField','is-red')}<i class="log-ctx">${cKey? `<span data-i18n="${cKey}"></span>`:''} [${esc(tag)}]</i><i class="log-path">${code(payload.path)}</i>${from!==undefined? `<i class="log-val"><span data-i18n="tokens.log.prev"></span>${code(json(from))}</i>`:''}${actions}</div>`;
    }
    if (type === 'update') {
      const v = pickNew(payload);
      const from = pickOld(payload);
  return `<div class="log-row is-update">${timeHtml}${LogUtils.pill('tokens.log.update','is-blue')}<i class="log-ctx">${cKey? `<span data-i18n="${cKey}"></span>`:''} [${esc(tag)}]</i><i class="log-path">${code(payload.path)}</i><i class="log-val">${from!==undefined? `${code(json(from))} → `:''}${code(json(v))}</i>${actions}</div>`;
    }
    if (type === 'save-edits') {
      const sets = pickList(payload, 'sets');
      const dels = pickList(payload, 'dels');
    const head = `${timeHtml}${LogUtils.pill('tokens.edit.submit','is-indigo')}<i class="log-ctx">${cKey? `<span data-i18n="${cKey}"></span>`:''} [${esc(tag)}]</i><span class="log-summary" data-i18n="tokens.log.saveSummary" data-i18n-params='${esc(JSON.stringify({ sets: sets.length, dels: dels.length }))}'></span>`;
      const detail = [];
      sets.slice(0, 10).forEach(s => { detail.push(`<span class="log-sub">${code(s.path)}：${s.from!==undefined? `${code(json(s.from))} → `:''}${code(json(s.to))}</span>`); });
    dels.slice(0, 10).forEach(d => { detail.push(`<span class="log-sub is-del"><span data-i18n="common.delete"></span> ${code(d.path)}${d.from!==undefined? ` (<span data-i18n="tokens.log.prev"></span>${code(json(d.from))})`:''}</span>`); });
      return `<div class="log-row is-save">${head}${detail.join('')}${actions}</div>`;
    }
  return `<div class=\"log-row\">${timeHtml}${LogUtils.pill(type)}${actions}</div>`;
  }

  function logChange(type, payload) {
    try {
      const body = ensureTokensLogArea();
      if (!body) return;

  const row = LogUtils.createLogEntry(makeLine(type, payload || {}));
    LogUtils.prependLogEntry(body, row, MAX_LOGS);

    } catch (_) {}
  }

  Object.assign(window.tokensAdmin, { ensureTokensLogArea, logChange });

  function hydrateLogs(){
    try{
      const body = ensureTokensLogArea();
      if(!body) return;
      const fetchTokenLogs = T.fetchTokenLogs;
      (async ()=>{
        try{
          const out = fetchTokenLogs ? await fetchTokenLogs({ page:1, pageSize: 100, includeDeleted: true }) : null;
          const list = (out && out.list) || [];
          if (Array.isArray(list) && list.length){
            const items = list.slice();
            try{
              items.sort((a,b)=>{
                const tb = parseTimeValue(pickLogTime(b)) ?? 0;
                const ta = parseTimeValue(pickLogTime(a)) ?? 0;
                return tb - ta;
              });
            }catch(_){ }
            LogUtils.appendLogEntries(body, items, log=>{
              const payload = { collection: log.collection, id: log.docId, path: log.path, value: pickNew(log), from: pickOld(log), doc: log.doc, label: log && log.doc ? pickUnique(log.doc) : '', sets: pickList(log, 'sets'), dels: pickList(log, 'dels') };
              const t = pickLogTime(log);
              if (t) payload.ts = t;
              return makeLine(log.type, payload);
            }, {
              entryOptions: log => ({
                deleted: !!(log && log.deleted),
                attrs: {
                  'data-log-id': log && log._id,
                  'data-log-deleted': log && log.deleted ? '1' : ''
                }
              })
            });
            try { body.scrollTop = 0; } catch(_){ }
            return;
          }
        }catch(_){ }
      })();
    }catch(_){ }
  }

  whenDOMReady().then(()=>{
    whenPartialsReady().then(()=>{ try{ hydrateLogs(); }catch(_){ } }).then(()=>{
      try{ LogUtils.startRelTimeRefresh('.log-time[data-ts]', '__tokensLogRelTimer'); }catch(_){ }
        try{ LogUtils.bindLogTimeHover(document.getElementById('tokens-log') || document); }catch(_){ }
    });

    function onI18nChanged(){
      try { const panel = document.getElementById('tokens-log-panel'); if (panel) window.i18n?.applySafe?.(panel); } catch (_){ }
      LogUtils.refreshLogTimes('.log-time[data-ts]');
    }
    try{ window.addEventListener && window.addEventListener('i18n:changed', onI18nChanged); }catch(_){ }
  });
})();

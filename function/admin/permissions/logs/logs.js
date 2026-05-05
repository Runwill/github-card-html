(function(){
  // permissions/logs/logs: 在权限页添加用户变更日志，沿用 tokens 日志样式与行为
  // API 层复用 permissions/api.js 中的 TokensPerm.API
  const { jsonGet: apiGet, jsonDelete: apiDelete } = window.TokensPerm.API;

  const MAX_LOGS = 200;
  // 预置全部已定义的日志类型（即使尚未产生，也可在下拉中选择并查看格式预览）
  const PRESET_LOG_TYPES = [
    'user-registered','user-approved','user-rejected',
    'password-change','role-changed',
    'avatar-submitted','avatar-approved','avatar-rejected',
    'username-submitted','username-approved','username-rejected','username-cancelled',
    'intro-submitted','intro-approved','intro-rejected','intro-cancelled',
    'permissions-granted','permissions-revoked','permissions-replaced'
  ];
  // 动态类型缓存（用于类型下拉与“结果”过滤映射），初始即包含全部预置类型
  let KNOWN_TYPES = new Set(PRESET_LOG_TYPES);

  const { isAnimating, isOpen, openCollapsible, closeCollapsible } = window.CollapsibleAnim;

  // 时间工具：复用全局 TimeFmt
  const { parseTimeValue, getLocaleFromI18n, formatAbsForLang, formatRel } = window.TimeFmt;
  // 让日期输入控件的地区跟随当前语言
  function setDateInputLang(container){
    try{
      const locale = getLocaleFromI18n();
      ['#perms-log-from', '#perms-log-to'].forEach(sel=>{
        const el = (container && container.querySelector) ? container.querySelector(sel) : document.querySelector(sel);
        if (el) el.setAttribute('lang', locale);
      });
    }catch(_){ }
  }

  // 获取当前 i18n 语言代码（zh/en/debug）
  function getI18nLang(){
    try{ const lang=(window.i18n&&window.i18n.getLang&&window.i18n.getLang())||'zh'; return (lang==='zh'||lang==='en'||lang==='debug')? lang : 'en'; }catch(_){ return 'en'; }
  }
  // 读取当前语言的原始 i18n 模板字符串
  function getI18nString(key){
    try{ if(!key) return ''; const lang=getI18nLang(); const dict=(window.I18N_STRINGS&&window.I18N_STRINGS[lang])||{}; const s=dict[key]; return (typeof s==='string')? s : (s==null? '' : String(s)); }catch(_){ return ''; }
  }
  // 提取模板占位符
  function extractPlaceholders(tmpl){
    try{ const out=[]; if(!tmpl) return out; tmpl.replace(/\{([\w]+)\}/g,(_,p)=>{ if(!out.includes(p)) out.push(p); return ''; }); return out; }catch(_){ return []; }
  }
  // 不兼容旧日志：仅返回同名字段，不做别名/推断兜底
  function paramFallback(key, data, _log){
    try { return (data && data[key]) ?? ''; } catch(_){ return ''; }
  }
  // 基于模板占位符构建消息参数（填补缺失字段）
  function buildMsgParamsForLog(log){
    try{
      const d = (log && log.data) || {};
      const k = msgKey(log && log.type);
      const tmpl = getI18nString(k) || '';
      const needs = extractPlaceholders(tmpl);
      if (!needs.length) return JSON.stringify(d||{});
      const out = { ...d };
      needs.forEach(key=>{
        const v = out[key];
        if (v===undefined || v===null || v==='') out[key] = paramFallback(key, d, log);
      });
      // 细化：角色变更日志中将 oldRole/newRole 从代码映射为本地化名称
      try {
        if (String(log && log.type) === 'role-changed') {
          const mapRole = (val)=>{
            try {
              const code = String(val || '');
              if (!code) return code;
              const key = 'role.' + code;
              const tr = (window.t && window.t(key)) || null;
              return tr || code;
            } catch(_) { return String(val||''); }
          };
          if (out.oldRole != null) out.oldRole = mapRole(out.oldRole);
          if (out.newRole != null) out.newRole = mapRole(out.newRole);
        }
      } catch(_){ }
      return JSON.stringify(out);
    }catch(_){ return JSON.stringify((log&&log.data)||{}); }
  }

  function ensureUserLogArea(){
    try{
      let body = document.getElementById('perms-log');
      if (body && body.__ready) return body;
      const parent = document.getElementById('panel_permissions');
      if (!parent) return null;

      let panel = document.getElementById('perms-log-panel');
      if (!panel){
        panel = document.createElement('div');
        panel.id = 'perms-log-panel';
        panel.className = 'tokens-log';
        const header = document.createElement('div');
        header.className = 'tokens-log__header';
        header.innerHTML = '<div class="tokens-log__title" data-i18n="permissions.log.title"></div><div class="tokens-log__ctrls"><button class="btn btn--secondary btn--sm expand-btn js-log-collapse is-expanded" data-i18n="common.collapse"></button><button class="btn btn--secondary btn--sm js-log-clear" data-i18n="permissions.log.clear"></button></div>';
        try { window.i18n && window.i18n.apply && window.i18n.apply(header); } catch(_){ }
        const wrap = document.createElement('div');
        wrap.className = 'tokens-log__wrap collapsible is-open';

    // 筛选工具条（布局样式移至 style/permissions.css）
        const filters = document.createElement('div');
        filters.className = 'tokens-log__filters admin-input-group';
        filters.innerHTML = [
          '<input id="perms-log-q" class="tokens-input" type="text" data-i18n-attr="placeholder" data-i18n-placeholder="permissions.log.filter.keyword" placeholder="按申请人/审核人/内容搜索" />',
          // 动态类型下拉：初始仅包含“全部类型”，后续由 hydrateUserLogs 基于后端返回补齐
          '<select id="perms-log-type" class="tokens-input">\
            <option value="all" data-i18n="permissions.log.filter.cat.all">全部类型</option>\
          </select>',
          '<select id="perms-log-outcome" class="tokens-input">\
            <option value="any" data-i18n="permissions.log.filter.outcome.any">全部结果</option>\
            <option value="submitted" data-i18n="permissions.log.filter.outcome.submitted">已提交</option>\
            <option value="approved" data-i18n="permissions.log.filter.outcome.approved">已通过</option>\
            <option value="rejected" data-i18n="permissions.log.filter.outcome.rejected">已拒绝</option>\
            <option value="cancelled" data-i18n="permissions.log.filter.outcome.cancelled">已撤回</option>\
          </select>',
          '<input id="perms-log-from" class="tokens-input" type="date" data-i18n-attr="placeholder" data-i18n-placeholder="permissions.log.filter.from" placeholder="起始日期" />',
          '<input id="perms-log-to" class="tokens-input" type="date" data-i18n-attr="placeholder" data-i18n-placeholder="permissions.log.filter.to" placeholder="结束日期" />',
          '<button id="perms-log-apply" class="btn btn--secondary tokens-btn tokens-refresh" data-i18n="permissions.log.filter.apply">筛选</button>',
          '<button id="perms-log-reset" class="btn btn--secondary tokens-btn" data-i18n="permissions.log.filter.reset">重置</button>'
        ].join('');
        try { window.i18n && window.i18n.apply && window.i18n.apply(filters); } catch(_){ }
  // 根据语言为日期输入设置地区
        try { setDateInputLang(filters); } catch(_){ }
        // 对齐/圆角等外观统一由 permissions.css 控制
  // 初始渲染类型下拉（预置类型）
  try { renderTypeOptions(Array.from(KNOWN_TYPES.values())); } catch(_){ }

        body = document.createElement('div');
        body.id = 'perms-log';
        body.className = 'tokens-log__body';
        wrap.appendChild(filters);
  // 预览行直接插入到日志体内的首个条目位置，无需单独容器
        wrap.appendChild(body);
        panel.appendChild(header);
        panel.appendChild(wrap);
        const container = parent.querySelector('padding') || parent; // 放在 panel 内
        container.appendChild(panel);

        // 绑定按钮
        header.querySelector('.js-log-collapse')?.addEventListener('click',(e)=>{
          const btn=e.currentTarget; const w=panel.querySelector('.tokens-log__wrap'); if(!w) return; if(isAnimating(w)) return; if(isOpen(w)){ closeCollapsible(w); if(btn){ try{ btn.setAttribute('data-i18n','common.expand'); window.i18n && window.i18n.apply && window.i18n.apply(btn);}catch(_){} btn.classList.remove('is-expanded'); } } else { openCollapsible(w); if(btn){ try{ btn.setAttribute('data-i18n','common.collapse'); window.i18n && window.i18n.apply && window.i18n.apply(btn);}catch(_){} btn.classList.add('is-expanded'); } }
        });
        header.querySelector('.js-log-clear')?.addEventListener('click', async ()=>{
          try { await apiDelete('/user/logs'); body.innerHTML=''; } catch(e){ alert((e&&e.message)||''); }
        });

        // 绑定筛选事件（hydrateUserLogs 在 logs_data.js 中定义，通过命名空间延迟绑定）
        const apply = ()=>{ try { window.TokensPerm.hydrateUserLogs(true); }catch(_){ } };
        filters.querySelector('#perms-log-apply')?.addEventListener('click', apply);
        filters.querySelector('#perms-log-reset')?.addEventListener('click', ()=>{
          try{
            const q = filters.querySelector('#perms-log-q'); if(q) q.value = '';
            const cat = filters.querySelector('#perms-log-type'); if(cat) cat.value = 'all';
            const oc = filters.querySelector('#perms-log-outcome'); if(oc) oc.value = 'any';
            const f = filters.querySelector('#perms-log-from'); if(f) f.value = '';
            const t = filters.querySelector('#perms-log-to'); if(t) t.value = '';
          }catch(_){ }
          apply();
        });
        ['change','keyup'].forEach(evt=>{
          filters.querySelector('#perms-log-q')?.addEventListener(evt, (e)=>{ if(evt==='keyup' && e.key!=='Enter') return; apply(); });
        });
        ['change'].forEach(evt=>{
          ['#perms-log-type','#perms-log-outcome','#perms-log-from','#perms-log-to'].forEach(sel=>{
            const el = filters.querySelector(sel);
            if (!el) return;
            el.addEventListener(evt, (e)=>{
              if (sel === '#perms-log-type') { try { updateFormatPreview(); } catch(_){ } }
              apply();
            });
          });
        });

        // Wrap filter selects with themed custom dropdown
        try { if (window.CustomSelect) window.CustomSelect.init(filters); } catch(_){ }
      }
      if (body) body.__ready = true;
      return body || null;
    }catch(_){ return null; }
  }

  function pill(key, cls){ return `<i class="log-pill ${cls||''}" data-i18n="${key}"></i>`; }

  // ── 日志类型 → CSS 类名 / i18n key / 消息 key 映射表 ──
  var TYPE_CLS = {
    'register':'is-green','user-registered':'is-green','user-approved':'is-green','user-rejected':'is-red',
    'password-change':'is-indigo','role-changed':'is-indigo',
    'avatar-submitted':'is-indigo','avatar-approved':'is-green','avatar-rejected':'is-red',
    'username-submitted':'is-indigo','username-approved':'is-green','username-rejected':'is-red','username-cancelled':'is-blue',
    'intro-submitted':'is-indigo','intro-approved':'is-green','intro-rejected':'is-red','intro-cancelled':'is-blue',
    'permissions-granted':'is-green','permissions-revoked':'is-red','permissions-replaced':'is-indigo'
  };
  var TYPE_KEY = {
    'register':'permissions.log.register','user-registered':'permissions.log.register',
    'password-change':'permissions.log.passwordChanged','role-changed':'permissions.log.roleChanged',
    'avatar-submitted':'permissions.log.avatarSubmitted','avatar-approved':'permissions.log.avatarApproved','avatar-rejected':'permissions.log.avatarRejected',
    'username-submitted':'permissions.log.usernameSubmitted','username-approved':'permissions.log.usernameApproved','username-rejected':'permissions.log.usernameRejected','username-cancelled':'permissions.log.usernameCancelled',
    'intro-submitted':'permissions.log.introSubmitted','intro-approved':'permissions.log.introApproved','intro-rejected':'permissions.log.introRejected','intro-cancelled':'permissions.log.introCancelled',
    'user-approved':'permissions.log.userApproved','user-rejected':'permissions.log.userRejected',
    'permissions-granted':'permissions.log.granted','permissions-revoked':'permissions.log.revoked','permissions-replaced':'permissions.log.replaced'
  };
  var MSG_KEY = {
    'user-registered':'permissions.msg.userRegistered','user-approved':'permissions.msg.userApproved','user-rejected':'permissions.msg.userRejected',
    'password-change':'permissions.msg.passwordChanged','role-changed':'permissions.msg.roleChanged',
    'avatar-submitted':'permissions.msg.avatarSubmitted','avatar-approved':'permissions.msg.avatarApproved','avatar-rejected':'permissions.msg.avatarRejected',
    'username-submitted':'permissions.msg.usernameSubmitted','username-approved':'permissions.msg.usernameApproved','username-rejected':'permissions.msg.usernameRejected','username-cancelled':'permissions.msg.usernameCancelled',
    'intro-submitted':'permissions.msg.introSubmitted','intro-approved':'permissions.msg.introApproved','intro-rejected':'permissions.msg.introRejected','intro-cancelled':'permissions.msg.introCancelled',
    'permissions-granted':'permissions.msg.granted','permissions-revoked':'permissions.msg.revoked','permissions-replaced':'permissions.msg.replaced'
  };

  function typeCls(t){ return TYPE_CLS[String(t||'')] || ''; }
  function typeKey(t){ return TYPE_KEY[String(t||'')] || ''; }
  function msgKey(t){ return MSG_KEY[String(t||'')] || ''; }

  function makeRow(log){
    try{
      const ts = log && log.createdAt;
      const t = parseTimeValue(ts) ?? Date.now();
      const iso = new Date(t).toISOString();
      const abs = formatAbsForLang(t);
      const rel = formatRel(t);
      const timeHtml = `<time class="log-time" datetime="${iso}" data-ts="${t}" data-rel="${rel}" data-abs="${abs}">${rel}</time>`;
      const k = typeKey(log && log.type);
      const cls = typeCls(log && log.type);
      const who = (log && log.actorName) ? log.actorName : '';
  const data = (log && log.data) || {};
  const msgK = msgKey(log && log.type);
  const msgParams = buildMsgParamsForLog(log);
  let msg = '';
  if (msgK) {
    // 若是角色变更，保留原始角色代码，便于语言切换时重新本地化
    if (String(log && log.type) === 'role-changed') {
      try {
        const rawParams = (log && log.data) ? { ...log.data } : {};
        const oldCode = rawParams.oldRole != null ? String(rawParams.oldRole) : '';
        const newCode = rawParams.newRole != null ? String(rawParams.newRole) : '';
        // msgParams 当前已是本地化版本，但我们仍保留代码以便后续重算
        msg = `<span data-i18n="${msgK}" data-i18n-params='${msgParams}' data-old-role-code='${oldCode}' data-new-role-code='${newCode}'></span>`;
      } catch(_) {
        msg = `<span data-i18n="${msgK}" data-i18n-params='${msgParams}'></span>`;
      }
    } else {
      msg = `<span data-i18n="${msgK}" data-i18n-params='${msgParams}'></span>`;
    }
  } else if (log && log.message) {
    msg = `<span>${String(log.message)}</span>`;
  }
  const detail = '';
    // 不显示用户ID；增加单条删除按钮（与词元日志一致的样式类名）
    const actions = `<div class="log-actions"><button class="btn-inline-action btn-copy" data-i18n="common.copy"></button><button class="btn-inline-action btn-del" data-i18n="common.delete"></button></div>`;
    return `<div class="log-row">${timeHtml}${k? pill(k, cls):''}<i class="log-ctx">${who? `[${who}]`:''}</i>${msg? `<i class=\"log-msg\">${msg}</i>`:''}${detail? `<i class=\"log-val\">${detail}</i>`:''}${actions}</div>`;
    }catch(_){ return ''; }
  }

  function outcomeMatches(type, outcome){
    try{
      if (!outcome || outcome==='any') return true;
      const t = String(type||'');
      if (outcome==='submitted') return t.endsWith('-submitted') || t==='user-registered';
      if (outcome==='approved')  return t.endsWith('-approved')  || t==='user-approved';
      if (outcome==='rejected')  return t.endsWith('-rejected')  || t==='user-rejected';
      if (outcome==='cancelled') return t.endsWith('-cancelled');
      return false;
    }catch(_){ return false; }
  }

  function buildQuery(){
    const panel = document.getElementById('perms-log-panel');
    const filters = panel ? panel.querySelector('.tokens-log__filters') : null;
    const p = new URLSearchParams();
    p.set('page','1'); p.set('pageSize', String(MAX_LOGS));
    if (filters){
      const q = filters.querySelector('#perms-log-q');
      const typeSel = filters.querySelector('#perms-log-type');
      const oc = filters.querySelector('#perms-log-outcome');
      const from = filters.querySelector('#perms-log-from');
      const to = filters.querySelector('#perms-log-to');
      const qv = q && q.value && q.value.trim(); if(qv) p.set('q', qv);
      const typeV = (typeSel && typeSel.value) || 'all';
      const ocV = (oc && oc.value) || 'any';
      // 按动态类型与结果构建 types 参数
      if (typeV === 'all'){
        if (ocV !== 'any'){
          const all = Array.from(KNOWN_TYPES.values());
          const subset = all.filter(t => outcomeMatches(t, ocV));
          if (subset.length) p.set('types', subset.join(',')); else p.set('types','__none__');
        }
      } else {
        // 指定了具体类型：直接按该类型查询；若结果不匹配，后端会返回空
        p.set('types', typeV);
      }
      const fv = from && from.value; if (fv) p.set('since', fv);
      const tv = to && to.value; if (tv) p.set('until', tv);
    }
    return p;
  }

  function renderTypeOptions(types){
    try{
      const panel = document.getElementById('perms-log-panel');
      const select = panel ? panel.querySelector('#perms-log-type') : null;
      if (!select) return;
      const prev = select.value || 'all';
      // 先清空，仅保留“全部类型”
      select.innerHTML = '';
      const optAll = document.createElement('option');
      optAll.value = 'all';
      optAll.setAttribute('data-i18n','permissions.log.filter.cat.all');
      optAll.textContent = '全部类型';
      select.appendChild(optAll);
      // 按字母序插入所有类型
  const base = (Array.isArray(types) ? types.slice() : []).concat(Array.from(KNOWN_TYPES.values()));
  const sorted = Array.from(new Set(base)).sort();
      sorted.forEach(t => {
        const opt = document.createElement('option');
        opt.value = String(t);
        // 若有已知映射则用 i18n key，否则直接显示类型名
        const key = typeKey(t);
        if (key) {
          opt.setAttribute('data-i18n', key);
          opt.textContent = key; // 先放 key，稍后 i18n.apply 会替换
        } else {
          opt.textContent = String(t);
        }
        select.appendChild(opt);
      });
      // 恢复之前选择
      try { select.value = prev; } catch(_){ }
      // 应用 i18n
      try { window.i18n && window.i18n.apply && window.i18n.apply(select); } catch(_){ }
      // 更新类型格式预览（保持与当前选择一致）
      try { updateFormatPreview(); } catch(_){ }
    }catch(_){ }
  }

  // 根据选择的日志类型，展示单行示例：用样式标示模板中的参数占位符
  function updateFormatPreview(){
    try{
      const panel = document.getElementById('perms-log-panel');
      if (!panel) return;
      const sel = panel.querySelector('#perms-log-type');
      const body = panel.querySelector('#perms-log');
      if (!sel || !body) return;
      const val = (sel.value||'all');
      // 查找或创建预览行节点
      let preview = body.querySelector('#perms-log-preview');
      const ensurePreview = ()=>{
        if (!preview) {
          preview = document.createElement('div');
          preview.className = 'tokens-log__entry tokens-log__entry--preview';
          preview.id = 'perms-log-preview';
          const row = document.createElement('div');
          row.className = 'log-row';
          const msg = document.createElement('i');
          msg.className = 'log-msg';
          const span = document.createElement('span');
          span.className = 'fmt-one';
          msg.appendChild(span);
          row.appendChild(msg);
          preview.appendChild(row);
          body.insertBefore(preview, body.firstChild || null);
        }
        return preview;
      };
      if (!val || val==='all') { if (preview) try{ preview.remove(); }catch(_){ } return; }
      const key = msgKey(val);
      if (!key) { if (preview) try{ preview.remove(); }catch(_){ } return; }
      const lang = getI18nLang();
      const tmpl = getI18nString(key) || '';
      if (!tmpl.trim()) { if (preview) try{ preview.remove(); }catch(_){ } return; }
      const esc = (s)=> String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
      // 构造 HTML：非占位符部分做 HTML 转义，占位符使用样式突出显示
      let html = '';
      let last = 0;
      const re = /\{([\w]+)\}/g;
      let m;
      while ((m = re.exec(tmpl))){
        const idx = m.index;
        const full = m[0];
        const name = m[1];
        if (idx > last) html += esc(tmpl.slice(last, idx));
        html += `<span class="fmt-param">{${esc(name)}}` + `</span>`;
        last = idx + full.length;
      }
      if (last < tmpl.length) html += esc(tmpl.slice(last));
      ensurePreview();
      const one = preview && preview.querySelector('.fmt-one');
      if (one) one.innerHTML = html;
    }catch(_){ }
  }


  // ── 暴露内部 API 供 logs_data.js 使用 ──
  window.TokensPerm._LogsUI = {
    ensureUserLogArea,
    renderTypeOptions,
    updateFormatPreview,
    makeRow,
    setDateInputLang,
    buildQuery,
    get KNOWN_TYPES() { return KNOWN_TYPES; },
    set KNOWN_TYPES(v) { KNOWN_TYPES = v; },
  };
})();

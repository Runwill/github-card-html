  // permissions/logs/logs: 在权限页添加用户变更日志，沿用 tokens 日志样式与行为
  // API 层复用 permissions/api.js 中的 TokensPerm.API

  const MAX_LOGS = 200;
  const TYPE_GROUPS = [
    { value: 'register', key: 'permissions.log.filter.cat.register', fallback: '注册', types: ['user-registered','user-approved','user-rejected','register'] },
    { value: 'username', key: 'permissions.log.filter.cat.username', fallback: '用户名', types: ['username-submitted','username-approved','username-rejected','username-cancelled'] },
    { value: 'intro', key: 'permissions.log.filter.cat.intro', fallback: '简介', types: ['intro-submitted','intro-approved','intro-rejected','intro-cancelled'] },
    { value: 'avatar', key: 'permissions.log.filter.cat.avatar', fallback: '头像', types: ['avatar-submitted','avatar-approved','avatar-rejected'] },
    { value: 'permissions', key: 'permissions.log.filter.cat.permissions', fallback: '权限', types: ['permissions-granted','permissions-revoked','permissions-replaced'] },
    { value: 'password', key: 'permissions.log.filter.cat.password', fallback: '密码', types: ['password-change'] },
    { value: 'role', key: 'permissions.log.filter.cat.role', fallback: '角色', types: ['role-changed'] },
    { value: 'other', key: 'permissions.log.filter.cat.other', fallback: '其他' }
  ];
  const TYPE_FILTERS = [{ value: 'all', key: 'permissions.log.filter.cat.all', fallback: '全部类型' }, ...TYPE_GROUPS];
  const OUTCOME_FILTERS = [
    { value: 'any', key: 'permissions.log.filter.outcome.any', fallback: '全部结果' },
    { value: 'submitted', key: 'permissions.log.filter.outcome.submitted', fallback: '已提交' },
    { value: 'approved', key: 'permissions.log.filter.outcome.approved', fallback: '已通过' },
    { value: 'rejected', key: 'permissions.log.filter.outcome.rejected', fallback: '已拒绝' },
    { value: 'cancelled', key: 'permissions.log.filter.outcome.cancelled', fallback: '已撤回' }
  ];
  const SCOPE_FILTERS = [
    { value: 'active', key: 'permissions.log.filter.scope.active', fallback: '当前' },
    { value: 'trash', key: 'permissions.log.filter.scope.trash', fallback: '回收站' }
  ];
  let KNOWN_TYPES = new Set(TYPE_GROUPS.flatMap(item => item.types || []));

  // 时间工具：复用全局 TimeFmt
  const getDateInputLocale = () => window.TimeFmt?.getLocaleFromI18n?.() || 'en-US';
  // 让日期输入控件的地区跟随当前语言
  function setDateInputLang(container){
    try{
      const locale = getDateInputLocale();
      const scope = (container && container.querySelector) ? container : document;
      ['#perms-log-from', '#perms-log-to'].forEach(sel=>{
        const el = scope.querySelector(sel);
        if (el) el.setAttribute('lang', locale);
      });
    }catch(_){ }
  }

  function getOtherTypes(){
    const grouped = new Set(TYPE_GROUPS.flatMap(item => item.types || []));
    return Array.from(KNOWN_TYPES.values()).filter(type => !grouped.has(String(type || '')));
  }

  function resolveTypeFilter(value){
    const raw = String(value || 'all');
    if (raw === 'all') return Array.from(KNOWN_TYPES.values());
    if (raw === 'other') return getOtherTypes();
    const item = TYPE_FILTERS.find(filter => filter.value === raw);
    if (item && Array.isArray(item.types)) return item.types.slice();
    return raw ? [raw] : [];
  }

  function choiceGroupHtml(kind, labelKey, labelFallback, ariaLabel, items, activeValue){
    const buttons = items.map(item => {
      const active = item.value === activeValue;
      return `<button type="button" class="ui-choice admin-segmented__btn perms-log-choice__btn${active ? ' is-active' : ''}" role="radio" aria-checked="${active ? 'true' : 'false'}" data-value="${item.value}"><span data-i18n="${item.key}">${item.fallback}</span></button>`;
    }).join('');
    return `<div class="ui-choice-group admin-segmented perms-log-choice perms-log-choice--${kind}" role="radiogroup" aria-label="${ariaLabel}"><span class="admin-segmented__label perms-log-choice__label" data-i18n="${labelKey}">${labelFallback}</span>${buttons}</div>`;
  }

  function choiceValue(root, kind, fallback){
    const group = root?.querySelector?.(`.perms-log-choice--${kind}`);
    const active = group && group.querySelector('.perms-log-choice__btn.is-active');
    return (active && active.getAttribute('data-value')) || fallback;
  }

  function setChoiceValue(root, kind, value){
    const group = root?.querySelector?.(`.perms-log-choice--${kind}`);
    if (!group) return;
    let found = false;
    group.querySelectorAll('.perms-log-choice__btn').forEach(btn => {
      const active = btn.getAttribute('data-value') === value;
      found = found || active;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });
    const fallback = kind === 'outcome' ? 'any' : 'all';
    if (!found && value !== fallback) setChoiceValue(root, kind, fallback);
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
    try{ return tmpl ? Array.from(new Set(Array.from(tmpl.matchAll(/\{([\w]+)\}/g), match => match[1]))) : []; }catch(_){ return []; }
  }
  function mapRoleLabel(val){ try { const code = String(val || ''); if (!code) return code; const key = 'role.' + code; const tr = (window.t && window.t(key)) || null; return tr || code; } catch(_) { return String(val||''); } }
  // 不兼容旧日志：仅返回同名字段，不做别名/推断兜底
  // 基于模板占位符构建消息参数（填补缺失字段）
  function buildMsgParamsForLog(log){
    try{
      const d = (log && log.data) || {};
      const k = metaForType(log && log.type).msgKey || '';
      const tmpl = getI18nString(k) || '';
      const needs = extractPlaceholders(tmpl);
      if (!needs.length) return JSON.stringify(d||{});
      const out = { ...d };
      needs.forEach(key=>{
        const v = out[key];
        if (v===undefined || v===null || v==='') out[key] = '';
      });
      // 细化：角色变更日志中将 oldRole/newRole 从代码映射为本地化名称
      if (String(log && log.type) === 'role-changed') {
        if (out.oldRole != null) out.oldRole = mapRoleLabel(out.oldRole);
        if (out.newRole != null) out.newRole = mapRoleLabel(out.newRole);
      }
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
        // 筛选工具条（布局样式移至 style/permissions.css）
        const filters = document.createElement('div');
        filters.className = 'tokens-log__filters';
        filters.innerHTML = [
          '<div class="tokens-log__filters-main ui-input-group admin-input-group">',
            '<input id="perms-log-q" class="ui-field ui-input-field admin-input" type="text" data-i18n-attr="placeholder" data-i18n-placeholder="permissions.log.filter.keyword" placeholder="按申请人/审核人/内容搜索" />',
            '<input id="perms-log-from" class="ui-field ui-input-field admin-input" type="date" data-i18n-attr="placeholder" data-i18n-placeholder="permissions.log.filter.from" placeholder="起始日期" />',
            '<input id="perms-log-to" class="ui-field ui-input-field admin-input" type="date" data-i18n-attr="placeholder" data-i18n-placeholder="permissions.log.filter.to" placeholder="结束日期" />',
            '<button id="perms-log-apply" class="btn btn--secondary ui-input-action admin-input-btn admin-toolbar-action" data-i18n="permissions.log.filter.apply">筛选</button>',
            '<button id="perms-log-reset" class="btn btn--secondary ui-input-action admin-input-btn" data-i18n="permissions.log.filter.reset">重置</button>',
          '</div>',
          choiceGroupHtml('type', 'permissions.log.filter.typeLabel', '类型', '日志类型', TYPE_FILTERS, 'all'),
          choiceGroupHtml('outcome', 'permissions.log.filter.outcomeLabel', '结果', '处理结果', OUTCOME_FILTERS, 'any'),
          choiceGroupHtml('scope', 'permissions.log.filter.scopeLabel', '范围', '日志范围', SCOPE_FILTERS, 'active')
        ].join('');
        window.i18n?.applySafe?.(filters);
  // 根据语言为日期输入设置地区
        try { setDateInputLang(filters); } catch(_){ }
        const container = parent.querySelector('padding') || parent; // 放在 panel 内
        body = LogUtils.ensureLogPanel({
          panelId: 'perms-log-panel',
          bodyId: 'perms-log',
          titleKey: 'permissions.log.title',
          mount: container,
          beforeBody: filters
        });
        panel = document.getElementById('perms-log-panel');
        try { syncKnownTypes(Array.from(KNOWN_TYPES.values())); } catch(_){ }

        // 绑定筛选事件（hydrateUserLogs 在 logs_data.js 中定义，通过命名空间延迟绑定）
        const apply = ()=>{ try { window.TokensPerm.hydrateUserLogs(); }catch(_){ } };
        filters.querySelector('#perms-log-apply')?.addEventListener('click', apply);
        filters.querySelector('#perms-log-reset')?.addEventListener('click', ()=>{
          try{
            ['#perms-log-q', '#perms-log-from', '#perms-log-to'].forEach(sel=>{ const el = filters.querySelector(sel); if(el) el.value = ''; });
            setChoiceValue(filters, 'type', 'all');
            setChoiceValue(filters, 'outcome', 'any');
            setChoiceValue(filters, 'scope', 'active');
          }catch(_){ }
          apply();
        });
        filters.addEventListener('click', (e)=>{
          const btn = e.target && e.target.closest ? e.target.closest('.perms-log-choice__btn') : null;
          if (!btn || !filters.contains(btn)) return;
          const group = btn.closest('.perms-log-choice');
          if (!group) return;
          group.querySelectorAll('.perms-log-choice__btn').forEach(item => {
            const active = item === btn;
            item.classList.toggle('is-active', active);
            item.setAttribute('aria-checked', active ? 'true' : 'false');
          });
          apply();
        });
        ['change','keyup'].forEach(evt=>{
          filters.querySelector('#perms-log-q')?.addEventListener(evt, (e)=>{ if(evt==='keyup' && e.key!=='Enter') return; apply(); });
        });
        ['#perms-log-from','#perms-log-to'].forEach(sel=> filters.querySelector(sel)?.addEventListener('change', apply));
      } else {
        body = document.getElementById('perms-log');
        LogUtils.bindLogCollapse(panel.querySelector('.tokens-log__header'), panel);
      }
      if (body) body.__ready = true;
      return body || null;
    }catch(_){ return null; }
  }

  // ── 日志类型 → CSS 类名 / i18n key / 消息 key 映射表 ──
  const logMeta = (cls, typeKey, msgKey) => ({ cls, typeKey, msgKey });
  const TYPE_META = {
    'register': logMeta('is-green','permissions.log.register',''),
    'user-registered': logMeta('is-green','permissions.log.register','permissions.msg.userRegistered'),
    'user-approved': logMeta('is-green','permissions.log.userApproved','permissions.msg.userApproved'),
    'user-rejected': logMeta('is-red','permissions.log.userRejected','permissions.msg.userRejected'),
    'password-change': logMeta('is-indigo','permissions.log.passwordChanged','permissions.msg.passwordChanged'),
    'role-changed': logMeta('is-indigo','permissions.log.roleChanged','permissions.msg.roleChanged'),
    'avatar-submitted': logMeta('is-indigo','permissions.log.avatarSubmitted','permissions.msg.avatarSubmitted'),
    'avatar-approved': logMeta('is-green','permissions.log.avatarApproved','permissions.msg.avatarApproved'),
    'avatar-rejected': logMeta('is-red','permissions.log.avatarRejected','permissions.msg.avatarRejected'),
    'username-submitted': logMeta('is-indigo','permissions.log.usernameSubmitted','permissions.msg.usernameSubmitted'),
    'username-approved': logMeta('is-green','permissions.log.usernameApproved','permissions.msg.usernameApproved'),
    'username-rejected': logMeta('is-red','permissions.log.usernameRejected','permissions.msg.usernameRejected'),
    'username-cancelled': logMeta('is-blue','permissions.log.usernameCancelled','permissions.msg.usernameCancelled'),
    'intro-submitted': logMeta('is-indigo','permissions.log.introSubmitted','permissions.msg.introSubmitted'),
    'intro-approved': logMeta('is-green','permissions.log.introApproved','permissions.msg.introApproved'),
    'intro-rejected': logMeta('is-red','permissions.log.introRejected','permissions.msg.introRejected'),
    'intro-cancelled': logMeta('is-blue','permissions.log.introCancelled','permissions.msg.introCancelled'),
    'permissions-granted': logMeta('is-green','permissions.log.granted','permissions.msg.granted'),
    'permissions-revoked': logMeta('is-red','permissions.log.revoked','permissions.msg.revoked'),
    'permissions-replaced': logMeta('is-indigo','permissions.log.replaced','permissions.msg.replaced')
  };

  function metaForType(type){ return TYPE_META[String(type||'')] || {}; }

  function roleCodeAttrs(log){
    if (String(log && log.type) !== 'role-changed') return '';
    const raw = (log && log.data) ? log.data : {};
    const esc = LogUtils.esc;
    return ` data-old-role-code='${esc(raw.oldRole != null ? raw.oldRole : '')}' data-new-role-code='${esc(raw.newRole != null ? raw.newRole : '')}'`;
  }

  function makeRow(log){
    try{
      const ts = log && log.createdAt;
      const timeHtml = LogUtils.timeHtml(ts);
      const meta = metaForType(log && log.type);
      const k = meta.typeKey || '';
      const cls = meta.cls || '';
      const who = (log && log.actorName) ? log.actorName : '';
      const msgK = meta.msgKey || '';
      const msgParams = buildMsgParamsForLog(log);
      let msg = msgK ? `<span data-i18n="${msgK}" data-i18n-params='${msgParams}'${roleCodeAttrs(log)}></span>` : '';
      if (!msg && log && log.message) msg = `<span>${String(log.message)}</span>`;
      const actions = LogUtils.actionsHtml();
      return `<div class="log-row">${timeHtml}${k? LogUtils.pill(k, cls):''}<i class="log-ctx">${who? `[${who}]`:''}</i>${msg? `<i class=\"log-msg\">${msg}</i>`:''}${actions}</div>`;
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

  function queryTypesForFilter(typeV, ocV){
    const matched = typeV === 'all' ? Array.from(KNOWN_TYPES.values()) : resolveTypeFilter(typeV);
    return ocV === 'any' ? matched : matched.filter(t => outcomeMatches(t, ocV));
  }

  function buildQuery(){
    const panel = document.getElementById('perms-log-panel');
    const filters = panel ? panel.querySelector('.tokens-log__filters') : null;
    const p = new URLSearchParams();
    p.set('page','1'); p.set('pageSize', String(MAX_LOGS));
    if (filters){
      const fieldValue = sel => filters.querySelector(sel)?.value || '';
      const qv = fieldValue('#perms-log-q').trim(); if(qv) p.set('q', qv);
      const typeV = choiceValue(filters, 'type', 'all');
      const ocV = choiceValue(filters, 'outcome', 'any');
      const scopeV = choiceValue(filters, 'scope', 'active');
      if (scopeV === 'trash') p.set('deletedOnly', 'true');
      // 按动态类型与结果构建 types 参数
      if (typeV !== 'all' || ocV !== 'any'){
        const subset = queryTypesForFilter(typeV, ocV);
        p.set('types', subset.length ? subset.join(',') : '__none__');
      }
      const fv = fieldValue('#perms-log-from'); if (fv) p.set('since', fv);
      const tv = fieldValue('#perms-log-to'); if (tv) p.set('until', tv);
    }
    return p;
  }

  function syncKnownTypes(types, options){
    try{
      if (Array.isArray(types)) types.forEach(type => { if (type) KNOWN_TYPES.add(String(type)); });
      if (!options || options.updatePreview !== false) { try { updateFormatPreview(); } catch(_){ } }
    }catch(_){ }
  }

  // 根据选择的日志类型，展示单行示例：用样式标示模板中的参数占位符
  function updateFormatPreview(){
    try{
      const panel = document.getElementById('perms-log-panel');
      if (!panel) return;
      const body = panel.querySelector('#perms-log');
      if (!body) return;
      const selected = choiceValue(panel, 'type', 'all');
      const val = selected === 'all' ? 'all' : (resolveTypeFilter(selected).find(type => metaForType(type).msgKey) || '');
      // 查找或创建预览行节点
      let preview = body.querySelector('#perms-log-preview');
      const ensurePreview = ()=>{
        if (!preview) {
          const span = LogUtils.elem('span', 'fmt-one');
          const msg = LogUtils.elem('i', 'log-msg', span);
          const row = LogUtils.elem('div', 'log-row', msg);
          preview = LogUtils.elem('div', { id: 'perms-log-preview', className: 'tokens-log__entry tokens-log__entry--preview' }, row);
          body.insertBefore(preview, body.firstChild || null);
        }
        return preview;
      };
      const key = val && val !== 'all' ? (metaForType(val).msgKey || '') : '';
      const tmpl = key ? getI18nString(key) || '' : '';
      if (!tmpl.trim()) { if (preview) try{ preview.remove(); }catch(_){ } return; }
      const esc = LogUtils.esc;
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
    syncKnownTypes,
    updateFormatPreview,
    makeRow,
    mapRoleLabel,
    setDateInputLang,
    buildQuery,
  };

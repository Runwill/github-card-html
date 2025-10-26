(function(){
  // permissions/logs: 在权限页添加用户变更日志，沿用 tokens 日志样式与行为

  const API = (endpoints && endpoints.base ? endpoints.base() : '').replace(/\/$/, '') + '/api';
  const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')||''}` });
  async function apiJson(path, options){
    const r = await fetch(`${API}${path}`, { headers: { 'Content-Type':'application/json', ...authHeader() }, ...(options||{}) });
    const out = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(out && out.message || `HTTP ${r.status}`);
    return out;
  }

  const MAX_LOGS = 200;

  function isAnimating(el){ return !!(el && (el.classList.contains('is-opening') || el.classList.contains('is-closing'))); }
  function isOpen(el){ return !!(el && el.classList.contains('is-open')); }
  function openCollapsible(el){
    try{ if (!el || isAnimating(el) || isOpen(el)) return; const startH = el.offsetHeight; el.classList.add('is-opening'); el.style.height = startH + 'px'; void el.offsetHeight; const targetH = el.scrollHeight; el.style.height = targetH + 'px'; const onEnd=(e)=>{ if(e&&e.target!==el) return; el.removeEventListener('transitionend', onEnd); el.classList.remove('is-opening'); el.classList.add('is-open'); el.style.height = 'auto'; }; el.addEventListener('transitionend', onEnd);}catch(_){}
  }
  function closeCollapsible(el){
    try{ if (!el || isAnimating(el) || !isOpen(el)) return; const startH = el.scrollHeight; el.style.height = startH + 'px'; void el.offsetHeight; el.classList.add('is-closing'); el.classList.remove('is-open'); el.style.height = '0px'; const onEnd=(e)=>{ if(e&&e.target!==el) return; el.removeEventListener('transitionend', onEnd); el.classList.remove('is-closing'); }; el.addEventListener('transitionend', onEnd);}catch(_){}
  }

  function parseTimeValue(v){ try{ if(v==null) return undefined; if(v instanceof Date) return v.getTime(); if(typeof v==='number') return v; if(typeof v==='string'){ const t=Date.parse(v); return isNaN(t)? undefined : t; } return undefined; }catch(_){ return undefined; } }
  function getLocaleFromI18n(){ try{ const lang=(window.i18n&&window.i18n.getLang&&window.i18n.getLang())||'zh'; if(lang==='zh') return 'zh-CN'; if(lang==='en') return 'en-US'; return 'en-US'; }catch(_){ return 'en-US'; } }
  function formatAbsForLang(v){ try{ const t = parseTimeValue(v) ?? Date.now(); const locale = getLocaleFromI18n(); return new Date(t).toLocaleString(locale); }catch(_){ return String(v||''); } }
  function formatRel(v){ try{ const now=Date.now(); const t=parseTimeValue(v) ?? now; let diff=Math.floor((now-t)/1000); if(diff < -5) return window.t('time.justNow'); if(diff<5) return window.t('time.justNow'); if(diff<60) return window.t('time.secondsAgo',{n:diff}); const m=Math.floor(diff/60); if(m<60) return window.t('time.minutesAgo',{n:m}); const h=Math.floor(m/60); if(h<24) return window.t('time.hoursAgo',{n:h}); const d=Math.floor(h/24); if(d<30) return window.t('time.daysAgo',{n:d}); const mo=Math.floor(d/30); if(mo<12) return window.t('time.monthsAgo',{n:mo}); const y=Math.floor(mo/12); return window.t('time.yearsAgo',{n:y}); }catch(_){ return ''; } }

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
        header.innerHTML = '<div class="tokens-log__title" data-i18n="permissions.log.title"></div><div class="tokens-log__ctrls"><button class="btn btn--secondary btn--sm expand-btn js-log-collapse is-expanded" data-i18n="common.collapse" data-i18n-attr="title" data-i18n-title="common.collapse"></button><button class="btn btn--secondary btn--sm js-log-clear" data-i18n="permissions.log.clear" data-i18n-attr="title" data-i18n-title="permissions.log.clear"></button></div>';
        try { window.i18n && window.i18n.apply && window.i18n.apply(header); } catch(_){ }
        const wrap = document.createElement('div');
        wrap.className = 'tokens-log__wrap collapsible is-open';
        body = document.createElement('div');
        body.id = 'perms-log';
        body.className = 'tokens-log__body';
        body.setAttribute('aria-live','polite');
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
          try { await apiJson('/user/logs', { method:'DELETE', headers: authHeader() }); body.innerHTML=''; } catch(e){ alert((e&&e.message)||''); }
        });
      }
      if (body) body.__ready = true;
      return body || null;
    }catch(_){ return null; }
  }

  function pill(key, cls){ return `<i class="log-pill ${cls||''}" data-i18n="${key}"></i>`; }

  // 与词元日志保持一致的色彩语义
  function typeCls(t){
    switch(String(t||'')){
      case 'register': return 'is-green'; // 兼容旧类型名
      case 'user-registered': return 'is-green';
      case 'password-change': return 'is-indigo';
      case 'avatar-submitted': return 'is-indigo';
      case 'avatar-approved': return 'is-green';
      case 'avatar-rejected': return 'is-red';
      case 'username-submitted': return 'is-indigo';
      case 'username-approved': return 'is-green';
      case 'username-rejected': return 'is-red';
      case 'username-cancelled': return 'is-blue';
      case 'intro-submitted': return 'is-indigo';
      case 'intro-approved': return 'is-green';
      case 'intro-rejected': return 'is-red';
      case 'intro-cancelled': return 'is-blue';
      case 'user-approved': return 'is-green';
      case 'user-rejected': return 'is-red';
      case 'permissions-granted': return 'is-green';
      case 'permissions-revoked': return 'is-red';
      case 'permissions-replaced': return 'is-indigo';
      default: return '';
    }
  }

  function typeKey(t){
    switch(String(t||'')){
      case 'register': return 'permissions.log.register'; // 兼容旧类型名
      case 'user-registered': return 'permissions.log.register';
      case 'password-change': return 'permissions.log.passwordChanged';
      case 'avatar-submitted': return 'permissions.log.avatarSubmitted';
      case 'avatar-approved': return 'permissions.log.avatarApproved';
      case 'avatar-rejected': return 'permissions.log.avatarRejected';
      case 'username-submitted': return 'permissions.log.usernameSubmitted';
      case 'username-approved': return 'permissions.log.usernameApproved';
      case 'username-rejected': return 'permissions.log.usernameRejected';
      case 'username-cancelled': return 'permissions.log.usernameCancelled';
      case 'intro-submitted': return 'permissions.log.introSubmitted';
      case 'intro-approved': return 'permissions.log.introApproved';
      case 'intro-rejected': return 'permissions.log.introRejected';
      case 'intro-cancelled': return 'permissions.log.introCancelled';
      case 'user-approved': return 'permissions.log.userApproved';
      case 'user-rejected': return 'permissions.log.userRejected';
      case 'permissions-granted': return 'permissions.log.granted';
      case 'permissions-revoked': return 'permissions.log.revoked';
      case 'permissions-replaced': return 'permissions.log.replaced';
      default: return '';
    }
  }

  // 根据日志类型返回消息 i18n key
  function msgKey(t){
    switch(String(t||'')){
      case 'user-registered': return 'permissions.msg.userRegistered';
      case 'user-approved': return 'permissions.msg.userApproved';
      case 'user-rejected': return 'permissions.msg.userRejected';
      case 'password-change': return 'permissions.msg.passwordChanged';
      case 'avatar-submitted': return 'permissions.msg.avatarSubmitted';
      case 'avatar-approved': return 'permissions.msg.avatarApproved';
      case 'avatar-rejected': return 'permissions.msg.avatarRejected';
      case 'username-submitted': return 'permissions.msg.usernameSubmitted';
      case 'username-approved': return 'permissions.msg.usernameApproved';
      case 'username-rejected': return 'permissions.msg.usernameRejected';
      case 'username-cancelled': return 'permissions.msg.usernameCancelled';
      case 'intro-submitted': return 'permissions.msg.introSubmitted';
      case 'intro-approved': return 'permissions.msg.introApproved';
      case 'intro-rejected': return 'permissions.msg.introRejected';
      case 'intro-cancelled': return 'permissions.msg.introCancelled';
      case 'permissions-granted': return 'permissions.msg.granted';
      case 'permissions-revoked': return 'permissions.msg.revoked';
      case 'permissions-replaced': return 'permissions.msg.replaced';
      default: return '';
    }
  }

  function makeRow(log){
    try{
      const ts = log && log.createdAt;
      const t = parseTimeValue(ts) ?? Date.now();
      const iso = new Date(t).toISOString();
      const abs = formatAbsForLang(t);
      const rel = formatRel(t);
      const timeHtml = `<time class="log-time" datetime="${iso}" title="${abs}" data-ts="${t}" data-rel="${rel}" data-abs="${abs}">${rel}</time>`;
      const k = typeKey(log && log.type);
      const cls = typeCls(log && log.type);
      const who = (log && log.actorName) ? log.actorName : '';
  const data = (log && log.data) || {};
  const msgK = msgKey(log && log.type);
  const msgParams = (function(d){ try { return JSON.stringify(d||{}); } catch(_){ return '{}'; } })(data);
  const msg = msgK ? `<span data-i18n="${msgK}" data-i18n-params='${msgParams}'></span>` : (log && log.message ? `<span>${String(log.message)}</span>` : '');
  const detail = '';
      // 不显示用户ID；增加单条删除按钮（与词元日志一致的样式类名）
  return `<div class="log-row">${timeHtml}${k? pill(k, cls):''}<i class="log-ctx">${who? `[${who}]`:''}</i>${msg? `<i class=\"log-msg\">${msg}</i>`:''}${detail? `<i class=\"log-val\">${detail}</i>`:''}<div class="log-actions"><button class="btn-del" data-i18n="common.delete" data-i18n-attr="aria-label" data-i18n-aria-label="common.delete"></button></div></div>`;
    }catch(_){ return ''; }
  }

  async function hydrateUserLogs(){
    try{
      const body = ensureUserLogArea();
      if (!body) return;
      const out = await apiJson('/user/logs', { method:'GET', headers: authHeader() });
      const list = (out && out.list) || [];
      const frag = document.createDocumentFragment();
      list.forEach(l => { const row = document.createElement('div'); row.className='tokens-log__entry'; if (l && l._id) { try { row.setAttribute('data-log-id', String(l._id)); }catch(_){ } } row.innerHTML = makeRow(l); try{ window.i18n && window.i18n.apply && window.i18n.apply(row);}catch(_){} frag.appendChild(row); });
      body.innerHTML=''; body.appendChild(frag);
      try { body.scrollTop = 0; } catch(_){ }
    }catch(_){ }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const ready = (window.partialsReady instanceof Promise) ? window.partialsReady : Promise.resolve();
    ready.then(()=>{ try{ hydrateUserLogs(); }catch(_){ } }).then(()=>{
      // 进入权限页时自动刷新：监听面板可见性变化
      try{
        const panel = document.getElementById('panel_permissions');
        if (panel && !panel.__permsLogObsBound){
          panel.__permsLogObsBound = true;
          const isVisible = (el)=>{
            try{
              if (!el) return false;
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0;
            }catch(_){ return !!(el && el.offsetParent); }
          };
          let wasVisible = isVisible(panel);
          const check = ()=>{
            try{
              const vis = isVisible(panel);
              if (vis && !wasVisible) { wasVisible = true; try{ hydrateUserLogs(); }catch(_){ } }
              else if (!vis && wasVisible) { wasVisible = false; }
            }catch(_){ }
          };
          // 初始检查
          try{ check(); }catch(_){ }
          // 监听 class/style 变化
          try{
            const obs = new MutationObserver(()=>{ check(); });
            obs.observe(panel, { attributes: true, attributeFilter: ['class','style'] });
            panel.__permsLogObserver = obs;
          }catch(_){ }
          // 兜底：hash 变化也检查一次
          try{ window.addEventListener('hashchange', check); }catch(_){ }
        }
      }catch(_){ }
    });

  // 每分钟刷新相对时间
    if (!window.__permsLogTimer){
      window.__permsLogTimer = setInterval(()=>{
        try{ document.querySelectorAll('#perms-log .log-time[data-ts]')?.forEach(el=>{ const ts=Number(el.getAttribute('data-ts'))||Date.now(); const rel=formatRel(ts); el.setAttribute('data-rel', rel); if(!el.matches(':hover')) el.textContent = rel; }); }catch(_){}
      }, 60000);
    }

    // 悬浮时切换为绝对时间，移开恢复相对时间（与词元日志一致）
    try{
      const root = document.getElementById('perms-log') || document;
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

    // 日志内“删除”按钮事件委托（单条删除）
    try{
      const root = document.getElementById('perms-log');
      if (root && !root.__delDelegationBound) {
        root.__delDelegationBound = true;
        root.addEventListener('click', (ev)=>{
          const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del') : null;
          if (!btn) return;
          const entry = btn.closest('.tokens-log__entry');
          if (!entry) return;
          (async ()=>{
            const id = entry.getAttribute('data-log-id');
            if (id) {
              try { await apiJson(`/user/logs/${encodeURIComponent(id)}`, { method:'DELETE', headers: authHeader() }); } catch(e){ alert((e && e.message) || ''); return; }
            }
            try { entry.remove(); } catch(_){ }
          })();
        });
      }
    }catch(_){ }

    // 语言切换：重渲染 i18n + 刷新时间格式
    const onLang = ()=>{
      try{ const panel=document.getElementById('perms-log-panel'); if(panel && window.i18n && window.i18n.apply) window.i18n.apply(panel);}catch(_){ }
      try{ document.querySelectorAll('#perms-log .log-time[data-ts]')?.forEach(el=>{ const ts=Number(el.getAttribute('data-ts'))||Date.now(); const rel=formatRel(ts); const abs=formatAbsForLang(ts); el.setAttribute('data-rel', rel); el.setAttribute('data-abs', abs); el.setAttribute('title', abs); el.textContent = el.matches(':hover')? abs : rel; }); }catch(_){ }
    };
    try{ document.addEventListener('i18n:changed', onLang);}catch(_){}
    try{ window.addEventListener && window.addEventListener('i18n:changed', onLang);}catch(_){}
  });
})();

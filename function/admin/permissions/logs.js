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

  function typeKey(t){
    switch(String(t||'')){
      case 'register': return 'permissions.log.register';
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

  function makeRow(log){
    try{
      const ts = log && log.createdAt;
      const t = parseTimeValue(ts) ?? Date.now();
      const iso = new Date(t).toISOString();
      const abs = formatAbsForLang(t);
      const rel = formatRel(t);
      const timeHtml = `<time class="log-time" datetime="${iso}" title="${abs}" data-ts="${t}" data-rel="${rel}" data-abs="${abs}">${rel}</time>`;
      const k = typeKey(log && log.type);
      const who = (log && log.actorName) ? log.actorName : '';
      const to = (log && log.userId) ? log.userId : '';
      const msg = (log && log.message) ? log.message : '';
      const detail = (log && log.data) ? `<code class="log-code">${JSON.stringify(log.data)}</code>` : '';
      return `<div class="log-row">${timeHtml}${k? pill(k):''}<i class="log-ctx">${who? `[${who}]`:''}${to? ` → #${to}`:''}</i>${msg? `<i class="log-msg">${msg}</i>`:''}${detail? `<i class="log-val">${detail}</i>`:''}</div>`;
    }catch(_){ return ''; }
  }

  async function hydrateUserLogs(){
    try{
      const body = ensureUserLogArea();
      if (!body) return;
      const out = await apiJson('/user/logs', { method:'GET', headers: authHeader() });
      const list = (out && out.list) || [];
      const frag = document.createDocumentFragment();
      list.forEach(l => { const row = document.createElement('div'); row.className='perms-log__entry'; row.innerHTML = makeRow(l); try{ window.i18n && window.i18n.apply && window.i18n.apply(row);}catch(_){} frag.appendChild(row); });
      body.innerHTML=''; body.appendChild(frag);
      try { body.scrollTop = 0; } catch(_){ }
    }catch(_){ }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const ready = (window.partialsReady instanceof Promise) ? window.partialsReady : Promise.resolve();
    ready.then(()=>{ try{ hydrateUserLogs(); }catch(_){ } });

    // 每分钟刷新相对时间
    if (!window.__permsLogTimer){
      window.__permsLogTimer = setInterval(()=>{
        try{ document.querySelectorAll('#perms-log .log-time[data-ts]')?.forEach(el=>{ const ts=Number(el.getAttribute('data-ts'))||Date.now(); const rel=formatRel(ts); el.setAttribute('data-rel', rel); if(!el.matches(':hover')) el.textContent = rel; }); }catch(_){}
      }, 60000);
    }

    // 语言切换：重渲染 i18n + 刷新时间格式
    const onLang = ()=>{
      try{ const panel=document.getElementById('perms-log-panel'); if(panel && window.i18n && window.i18n.apply) window.i18n.apply(panel);}catch(_){ }
      try{ document.querySelectorAll('#perms-log .log-time[data-ts]')?.forEach(el=>{ const ts=Number(el.getAttribute('data-ts'))||Date.now(); const rel=formatRel(ts); const abs=formatAbsForLang(ts); el.setAttribute('data-rel', rel); el.setAttribute('data-abs', abs); el.setAttribute('title', abs); el.textContent = el.matches(':hover')? abs : rel; }); }catch(_){ }
    };
    try{ document.addEventListener('i18n:changed', onLang);}catch(_){}
    try{ window.addEventListener && window.addEventListener('i18n:changed', onLang);}catch(_){}
  });
})();

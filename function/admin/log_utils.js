// admin/log_utils
// 日志面板共享工具：复制、删除、悬浮时间切换
// 消费者：tokens/ui/logger.js、permissions/logs.js
(function(){
  const { formatRel, formatAbsForLang } = window.TimeFmt;

  // V1 — 复制按钮事件委托
  function bindLogCopy(root){
    if (!root || root.__copyDelegationBound) return;
    root.__copyDelegationBound = true;
    root.addEventListener('click', (ev)=>{
      const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-copy') : null;
      if (!btn) return;
      const entry = btn.closest('.tokens-log__entry');
      if (!entry) return;
      const clone = entry.cloneNode(true);
      const actions = clone.querySelector('.log-actions');
      if (actions) actions.remove();
      const timeEl = clone.querySelector('.log-time');
      if (timeEl && timeEl.hasAttribute('data-abs')) timeEl.textContent = timeEl.getAttribute('data-abs') + ' ';
      const text = clone.innerText.replace(/\s+/g, ' ').trim();
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(()=>{
          const orig = btn.getAttribute('data-i18n');
          btn.setAttribute('data-i18n', 'common.copied');
          if (window.i18n && window.i18n.apply) window.i18n.apply(btn);
          setTimeout(()=>{ btn.setAttribute('data-i18n', orig || 'common.copy'); if (window.i18n && window.i18n.apply) window.i18n.apply(btn); }, 2000);
        }).catch(err=> console.error('Copy failed', err));
      }
    });
  }

  // V3 — 删除按钮事件委托
  function bindLogDelete(root, deleteFn){
    if (!root || root.__delDelegationBound) return;
    root.__delDelegationBound = true;
    root.addEventListener('click', (ev)=>{
      const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del') : null;
      if (!btn) return;
      const entry = btn.closest('.tokens-log__entry');
      if (!entry) return;
      (async ()=>{
        const id = entry.getAttribute('data-log-id');
        try { await deleteFn(id); } catch(e){ alert((e && e.message) || ''); return; }
        try { entry.remove(); } catch(_){}
      })();
    });
  }

  // V2 — 悬浮时间切换（绝对↔相对）+ 定时刷新
  function bindLogTimeHover(root){
    if (!root) return;
    const onOver = (e)=>{ const t = e.target && e.target.closest ? e.target.closest('.log-time') : null; if (t) { const abs = t.getAttribute('data-abs'); if (abs) t.textContent = abs; } };
    const onOut  = (e)=>{ const t = e.target && e.target.closest ? e.target.closest('.log-time') : null; if (t) { const rel = t.getAttribute('data-rel'); if (rel) t.textContent = rel; } };
    root.addEventListener('mouseover', onOver);
    root.addEventListener('mouseout', onOut);
  }

  function startRelTimeRefresh(selector, timerKey){
    if (window[timerKey]) return;
    window[timerKey] = setInterval(()=>{
      try{
        document.querySelectorAll(selector)?.forEach(el=>{
          const ts = Number(el.getAttribute('data-ts')) || Date.now();
          const rel = formatRel(ts);
          el.setAttribute('data-rel', rel);
          if (!el.matches(':hover')) el.textContent = rel;
        });
      }catch(_){}
    }, 60000);
  }

  function refreshLogTimes(selector){
    try{
      document.querySelectorAll(selector)?.forEach(el=>{
        const ts = Number(el.getAttribute('data-ts')) || Date.now();
        const rel = formatRel(ts);
        const abs = formatAbsForLang(ts);
        el.setAttribute('data-rel', rel);
        el.setAttribute('data-abs', abs);
        el.textContent = el.matches(':hover') ? abs : rel;
      });
    }catch(_){}
  }

  window.LogUtils = { bindLogCopy, bindLogDelete, bindLogTimeHover, startRelTimeRefresh, refreshLogTimes };
})();

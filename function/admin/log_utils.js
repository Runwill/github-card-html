// admin/log_utils
// 日志面板共享工具：复制、删除、悬浮时间切换
// 消费者：tokens/ui/logger.js、permissions/logs/logs.js
(function(){
  const { formatRel, formatAbsForLang } = window.TimeFmt;

  function esc(value){ return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function pill(key, cls){ return `<i class="log-pill ${esc(cls || '')}" data-i18n="${esc(key)}"></i>`; }

  function actionsHtml(){
    return '<div class="log-actions"><button class="btn-inline-action btn-copy" data-i18n="common.copy"></button><button class="btn-inline-action btn-del" data-i18n="common.delete"></button><button class="btn-inline-action btn-restore" data-i18n="common.restore"></button></div>';
  }

  function timeHtml(value, escapeFn){
    const escape = escapeFn || esc, parse = window.TimeFmt?.parseTimeValue;
    const ts = (parse ? parse(value) : Number(value)) ?? Date.now(), rel = formatRel(ts), abs = formatAbsForLang(ts);
    return `<time class="log-time" datetime="${escape(new Date(ts).toISOString())}" data-ts="${escape(String(ts))}" data-rel="${escape(rel)}" data-abs="${escape(abs)}">${escape(rel)}</time>`;
  }

  function elem(tag, props, children){
    const node = document.createElement(tag);
    const append = items => (Array.isArray(items) ? items : [items]).forEach(item => {
      if (item == null) return;
      node.appendChild(item.nodeType ? item : document.createTextNode(String(item)));
    });
    if (typeof props === 'string') {
      if (props) node.className = props;
      if (children != null) Array.isArray(children) || children.nodeType ? append(children) : node.textContent = children;
      return node;
    }
    Object.entries(props || {}).forEach(([key, value]) => {
      if (key === 'cls') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'style' && value && typeof value === 'object') Object.assign(node.style, value);
      else node[key] = value;
    });
    if (children) append(children);
    return node;
  }

  function bindLogCollapse(header, panel){
    if (!header || !panel) return;
    const btn = header.querySelector('.js-log-collapse');
    if (!btn || btn.__logCollapseBound) return;
    const anim = window.CollapsibleAnim || {};
    btn.__logCollapseBound = true;
    btn.addEventListener('click', (event)=>{
      const targetBtn = event.currentTarget;
      const wrap = panel.querySelector('.tokens-log__wrap');
      if (!wrap || (anim.isAnimating && anim.isAnimating(wrap))) return;
      const opened = anim.isOpen ? anim.isOpen(wrap) : wrap.classList.contains('is-open');
      (opened ? anim.closeCollapsible : anim.openCollapsible)?.(wrap);
      targetBtn.setAttribute('data-i18n', opened ? 'common.expand' : 'common.collapse');
      targetBtn.classList.toggle('is-expanded', !opened);
      window.i18n?.applySafe?.(targetBtn);
    });
  }

  function ensureLogPanel(options){
    const opts = options || {};
    let body = document.getElementById(opts.bodyId);
    if (body && body.__ready) return body;
    let panel = document.getElementById(opts.panelId);
    if (!panel) {
      panel = elem('div', { id: opts.panelId, className: opts.panelClass || 'tokens-log' });
      const header = elem('div', { className: 'tokens-log__header' });
      header.innerHTML = `<div class="tokens-log__title" data-i18n="${esc(opts.titleKey)}"></div><div class="tokens-log__ctrls"><button class="btn btn--secondary btn--sm expand-btn js-log-collapse is-expanded" data-i18n="common.collapse"></button></div>`;
      window.i18n?.applySafe?.(header);

      const wrap = elem('div', { className: 'tokens-log__wrap collapsible is-open' });
      if (opts.beforeBody) wrap.appendChild(opts.beforeBody);

      body = elem('div', { id: opts.bodyId, className: opts.bodyClass || 'tokens-log__body' });
      wrap.appendChild(body);
      panel.append(header, wrap);

      const mount = typeof opts.mount === 'function' ? opts.mount() : opts.mount;
      if (!mount) return null;
      if (opts.insertAfter && opts.insertAfter.parentElement === mount) mount.insertBefore(panel, opts.insertAfter.nextSibling);
      else mount.appendChild(panel);
    } else {
      body = document.getElementById(opts.bodyId);
    }
    bindLogCollapse(panel.querySelector('.tokens-log__header'), panel);
    if (body) body.__ready = true;
    return body || null;
  }

  function createLogEntry(html, options){
    const opts = options || {};
    const row = elem('div', { className: 'tokens-log__entry' + (opts.deleted ? ' is-deleted' : '') + (opts.extraClass ? ' ' + opts.extraClass : '') });
    Object.entries(opts.attrs || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') row.setAttribute(key, String(value));
    });
    row.innerHTML = html || '';
    window.i18n?.applySafe?.(row);
    return row;
  }

  function appendLogEntries(body, items, makeHtml, options){
    if (!body) return;
    const opts = options || {};
    const frag = document.createDocumentFragment();
    (items || []).forEach(item => frag.appendChild(createLogEntry(makeHtml(item), opts.entryOptions ? opts.entryOptions(item) : {})));
    if (opts.clear) body.innerHTML = '';
    body.appendChild(frag);
    try { body.scrollTop = 0; } catch(_){ }
  }

  function prependLogEntry(body, row, maxLogs){
    if (!body || !row) return;
    const prevTop = body.scrollTop || 0;
    const atTop = prevTop <= 5;
    body.insertBefore(row, body.firstChild || null);
    if (!atTop) {
      try {
        let delta = row.offsetHeight || 0;
        const cs = window.getComputedStyle(row);
        delta += (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
        body.scrollTop = prevTop + delta;
      } catch(_){ }
    } else {
      try { body.scrollTop = 0; } catch(_){ }
    }
    if (maxLogs) {
      try {
        while (body.children.length > maxLogs) body.removeChild(body.lastChild);
      } catch(_){ }
    }
  }

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
          window.i18n?.applySafe?.(btn);
          setTimeout(()=>{ btn.setAttribute('data-i18n', orig || 'common.copy'); window.i18n?.applySafe?.(btn); }, 2000);
        }).catch(err=> console.error('Copy failed', err));
      }
    });
  }

  function bindLogDelete(root, deleteFn, restoreFn){
    if (!root || root.__delDelegationBound) return;
    root.__delDelegationBound = true;
    root.addEventListener('click', (ev)=>{
      const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-del, .btn-restore') : null;
      if (!btn) return;
      const entry = btn.closest('.tokens-log__entry');
      if (!entry) return;
      (async ()=>{
        const id = entry.getAttribute('data-log-id');
        try {
          if (btn.classList.contains('btn-restore')) {
            if (restoreFn) await restoreFn(id);
            entry.remove();
          } else {
            await deleteFn(id);
            entry.remove();
          }
        } catch(e){ alert((e && e.message) || ''); }
      })();
    });
  }

  function bindLogTimeHover(root){
    if (!root) return;
    if (root.__logTimeHoverBound) return;
    root.__logTimeHoverBound = true;
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

  window.LogUtils = { esc, elem, pill, actionsHtml, timeHtml, bindLogCollapse, ensureLogPanel, createLogEntry, appendLogEntries, prependLogEntry, bindLogCopy, bindLogDelete, bindLogTimeHover, startRelTimeRefresh, refreshLogTimes };
})();

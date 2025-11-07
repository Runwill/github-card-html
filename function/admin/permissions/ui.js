(function(w){
  const ns = w.TokensPerm = w.TokensPerm || {};

  function showToast(message, type){
    const forceError = (type === 'error');
    if (forceError) {
      try{
        let container=document.querySelector('.tokens-toast-container');
        if(!container){ container=document.createElement('div'); container.className='tokens-toast-container'; document.body.appendChild(container); }
        const toast=document.createElement('div'); toast.className='tokens-toast tokens-toast--error';
        const NS='http://www.w3.org/2000/svg';
        const svg=document.createElementNS(NS,'svg'); svg.setAttribute('width','18'); svg.setAttribute('height','18'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none'); svg.setAttribute('aria-hidden','true');
        const path=document.createElementNS(NS,'path'); path.setAttribute('d','M18 6L6 18M6 6l12 12'); path.setAttribute('stroke','currentColor'); path.setAttribute('stroke-width','2.5'); path.setAttribute('stroke-linecap','round'); path.setAttribute('stroke-linejoin','round');
        svg.appendChild(path); toast.appendChild(svg);
        toast.appendChild(document.createTextNode(' ' + (message || '错误')));
        container.appendChild(toast);
        setTimeout(()=>{ try{ toast.remove(); }catch(_){} if(container && container.children.length===0){ try{ container.remove(); }catch(_){} } }, 2200);
        return;
      }catch(_){ }
    }
    try { if (w.tokensAdmin && typeof w.tokensAdmin.showToast === 'function') { w.tokensAdmin.showToast(message); return; } } catch(_){ }
    try {
      const toast = w.CardUI && w.CardUI.Manager && w.CardUI.Manager.Core && w.CardUI.Manager.Core.messages && w.CardUI.Manager.Core.messages.toast;
      if (typeof toast === 'function') { toast(message); return; }
    } catch(_){ }
    try { alert(message); } catch(_){ }
  }

  function bindPermTooltip(el, permName){
    try {
      if (!el) return;
      const specializedKey = 'perm.tooltip.' + String(permName);
      let keyForAttr = specializedKey;
      let params = null;
      try {
        const lang = (w.i18n && w.i18n.getLang && w.i18n.getLang()) || 'zh';
        const resolved = w.t ? w.t(specializedKey) : specializedKey;
        if (lang !== 'debug' && resolved === specializedKey) {
          keyForAttr = 'perm.tooltip.prefix';
          params = { name: String(permName) };
        }
      } catch(_) {
        keyForAttr = 'perm.tooltip.prefix';
        params = { name: String(permName) };
      }
      el.setAttribute('data-i18n-attr', 'data-tooltip');
      el.setAttribute('data-i18n-data-tooltip', keyForAttr);
      if (params) el.setAttribute('data-i18n-params-data-tooltip', JSON.stringify(params)); else el.removeAttribute('data-i18n-params-data-tooltip');
      try { el.setAttribute('data-tooltip', w.t ? w.t(keyForAttr, params) : (params ? (params.name||'') : keyForAttr)); } catch(_){ }
    } catch(_){ }
  }

  function makeEl(tag, cls, text){ const el=document.createElement(tag); if (cls) el.className=cls; if (text!=null) el.textContent=text; return el; }

  function tag(text, more=false, tip){
    const s = makeEl('span', 'perm-tag' + (more ? ' perm-tag--more' : ''), text);
    const tooltip = (tip || text);
    try { s.setAttribute('data-tooltip', tooltip); } catch { s.title = tooltip; }
    return s;
  }

  function spinnerBtn(btn, spinning){ if (!btn) return; btn.disabled=!!spinning; btn.classList.toggle('is-loading', !!spinning); }

  function toggleSection(panel, open){
    if (!panel) return;
    const DURATION = 220;
    const FALLBACK = DURATION + 160; // 兜底计时，防止 transitionend 未触发导致卡死
    if (panel.__animating) return;
    const isHidden = (panel.style.display === 'none') || panel.classList.contains('is-collapsed');
    const shouldOpen = (open == null) ? isHidden : !!open;
    panel.__animating = true;

    if (shouldOpen){
      panel.style.display = 'block';
      const prevTransition = panel.style.transition;
      panel.style.transition = 'none';
      const prevVisibility = panel.style.visibility;
      const prevPosition = panel.style.position;
      const prevPointer = panel.style.pointerEvents;
      panel.style.visibility = 'hidden';
      panel.style.position = 'absolute';
      panel.style.pointerEvents = 'none';
      panel.classList.remove('is-collapsed');
      panel.style.height = 'auto';
      let target = panel.scrollHeight;

      // 还原到起始收起状态
      panel.classList.add('is-collapsed');
      panel.style.height = '0px';
      panel.style.opacity = '0';
      panel.style.visibility = prevVisibility || '';
      panel.style.position = prevPosition || '';
      panel.style.pointerEvents = prevPointer || '';
      void panel.offsetHeight;

      // 若无法测得高度，直接无动画展开，避免卡死
      if (!target || target <= 0) {
        panel.classList.remove('is-collapsed');
        panel.style.transition = prevTransition || '';
        panel.style.height = '';
        panel.style.opacity = '';
        panel.__animating = false;
        return;
      }

      requestAnimationFrame(()=>{
        panel.style.transition = 'height 200ms ease, opacity 150ms ease, transform 200ms ease, padding-top 200ms ease, padding-bottom 200ms ease, margin-top 200ms ease, margin-bottom 200ms ease, border-width 200ms ease';
        panel.classList.remove('is-collapsed');
        panel.style.height = target + 'px';
        panel.style.opacity = '1';
        let timer = setTimeout(()=>done(), FALLBACK);
        const done = (e)=>{
          if (e && e.target !== panel) return;
          panel.removeEventListener('transitionend', done);
          if (timer) { clearTimeout(timer); timer = null; }
          panel.style.transition = prevTransition || '';
          panel.style.height = '';
          panel.style.opacity = '';
          panel.__animating = false;
        };
        panel.addEventListener('transitionend', done, { once: true });
      });
    } else {
      const start = panel.scrollHeight;
      panel.style.height = start + 'px';
      panel.style.opacity = '1';
      void panel.offsetHeight;
      panel.style.transition = 'height 200ms ease, opacity 150ms ease, transform 200ms ease, padding-top 200ms ease, padding-bottom 200ms ease, margin-top 200ms ease, margin-bottom 200ms ease, border-width 200ms ease';
      panel.style.height = '0px';
      panel.style.opacity = '0';
      panel.classList.add('is-collapsed');
      let timer = setTimeout(()=>done(), FALLBACK);
      const done = (e)=>{
        if (e && e.target !== panel) return;
        panel.removeEventListener('transitionend', done);
        if (timer) { clearTimeout(timer); timer = null; }
        panel.style.transition = '';
        panel.style.height = '';
        panel.style.opacity = '';
        panel.style.display = 'none';
        panel.__animating = false;
      };
      panel.addEventListener('transitionend', done, { once: true });
    }
  }

  ns.UI = { showToast, bindPermTooltip, makeEl, tag, spinnerBtn, toggleSection };
})(window);

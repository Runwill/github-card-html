// Lightweight tooltip manager using #lore-tooltip styles
  let tipEl = null; let currentTarget = null; const MARGIN = 8;
  function ensureTip(){
    if (!tipEl) {
      tipEl = document.getElementById('lore-tooltip');
      if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.id = 'lore-tooltip';
        document.body.appendChild(tipEl);
      }
    }
    return tipEl;
  }
  function place(el, anchor){
    const rect = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    let left = rect.left + rect.width/2 - w/2 + window.scrollX;
    left = Math.max(8 + window.scrollX, Math.min(left, window.scrollX + window.innerWidth - w - 8));
    const top = rect.bottom + MARGIN + window.scrollY;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    const center = rect.left + rect.width/2;
    el.classList.toggle('from-left', center < window.innerWidth/2);
    el.classList.toggle('from-right', center >= window.innerWidth/2);
  }
  function show(anchor){
    const text = anchor.getAttribute('data-tooltip') || '';
    if (!text) return;
    const el = ensureTip();
    if (currentTarget === anchor && el.classList.contains('show')) return;
    currentTarget = anchor;
    el.textContent = text;
    el.classList.remove('show');
    el.style.display = 'block';
    requestAnimationFrame(()=>{
      place(el, anchor);
      el.classList.add('show');
    });
  }
  function hide(anchor){
    const el = ensureTip();
    if (!anchor || anchor === currentTarget) { el.classList.remove('show'); currentTarget = null; }
  }
  document.addEventListener('mouseover', (e)=>{
    const t = e.target && (e.target.closest ? e.target.closest('[data-tooltip]') : null);
    if (t) show(t);
  });
  document.addEventListener('mouseout', (e)=>{
    const t = e.target && (e.target.closest ? e.target.closest('[data-tooltip]') : null);
    const to = e.relatedTarget;
    if (t && (!to || !(to.closest && to.closest('[data-tooltip]')))) hide(t);
  });
  window.addEventListener('resize', ()=>{ if (currentTarget && tipEl) place(tipEl, currentTarget); });
  window.addEventListener('scroll', ()=>{ if (currentTarget && tipEl) place(tipEl, currentTarget); }, { passive: true });

  function showLore(anchor, html){
    const el = ensureTip();
    currentTarget = anchor;
    el.classList.remove('show', 'from-left', 'from-right');
    el.innerHTML = html;
    el.style.cssText = 'visibility:hidden;display:block;left:-9999px;top:-9999px';
    const rect = anchor.getBoundingClientRect();
    const sx = window.scrollX, sy = window.scrollY, vw = window.innerWidth, m = 12;
    let tipW = el.offsetWidth, tipH = el.offsetHeight;
    let left = Math.min(Math.max(rect.left + sx + rect.width/2 - tipW*0.15, sx + m), sx + vw - tipW - m);
    const availW = vw - 2*m;
    if (tipW > availW){
      el.style.maxWidth = availW + 'px'; el.style.whiteSpace = 'normal';
      tipW = el.offsetWidth; tipH = el.offsetHeight;
      left = Math.min(Math.max(rect.left + sx + rect.width/2 - tipW*0.15, sx + m), sx + vw - tipW - m);
    }
    let top = rect.bottom + sy + 8, placement = 'bottom';
    if (top + tipH > window.innerHeight + sy - m){ top = rect.top + sy - tipH - 12; placement = 'top'; }
    const cx = left + tipW/2 - sx;
    el.setAttribute('data-placement', placement);
    el.style.cssText = 'left:' + left + 'px;top:' + top + 'px;visibility:visible';
    el.classList.add(cx > vw/2 ? 'from-left' : 'from-right', 'show');
  }
  window.LoreTooltip = { showLore, hide: ()=>{ if(tipEl){ tipEl.classList.remove('show','from-left','from-right'); currentTarget=null; } } };

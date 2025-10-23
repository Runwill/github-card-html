// Lightweight tooltip manager using #lore-tooltip styles
(function(){
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
    const w = el.offsetWidth; const h = el.offsetHeight; // eslint-disable-line no-unused-vars
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
})();

// admin/collapsible_anim
// 通用折叠/展开动画工具，配合 CSS .collapsible / .is-open 类使用
// 消费者：tokens/ui/logger.js、permissions/logs/logs.js
(function(){
  function isAnimating(el){ return !!(el && (el.classList.contains('is-opening') || el.classList.contains('is-closing'))); }
  function isOpen(el){ return !!(el && el.classList.contains('is-open')); }
  function onTransitionEnd(el, callback, timeoutMs, filter){
    if (!el) { if (callback) callback(); return function(){}; }
    let called = false;
    let timer = null;
    const done = (event)=>{
      if (called) return;
      if (filter && event && !filter(event)) return;
      called = true;
      el.removeEventListener('transitionend', done);
      if (timer) clearTimeout(timer);
      if (callback) callback(event);
    };
    el.addEventListener('transitionend', done);
    if (timeoutMs) timer = setTimeout(()=>done(), timeoutMs);
    return ()=>{ if (!called) { called = true; el.removeEventListener('transitionend', done); if (timer) clearTimeout(timer); } };
  }
  function openCollapsible(el){
    try{
      if (!el || isAnimating(el) || isOpen(el)) return;
      const startH = el.offsetHeight;
      el.classList.add('is-opening');
      el.style.height = startH + 'px';
      void el.offsetHeight;
      const targetH = el.scrollHeight;
      el.style.height = targetH + 'px';
      onTransitionEnd(el, ()=>{
        el.classList.remove('is-opening');
        el.classList.add('is-open');
        el.style.height = 'auto';
      }, 0, e => e.target === el);
    }catch(_){ }
  }
  function closeCollapsible(el){
    try{
      if (!el || isAnimating(el) || !isOpen(el)) return;
      const startH = el.scrollHeight;
      el.style.height = startH + 'px';
      void el.offsetHeight;
      el.classList.add('is-closing');
      el.classList.remove('is-open');
      el.style.height = '0px';
      onTransitionEnd(el, ()=>{
        el.classList.remove('is-closing');
      }, 0, e => e.target === el);
    }catch(_){ }
  }
  window.CollapsibleAnim = { isAnimating, isOpen, onTransitionEnd, openCollapsible, closeCollapsible };
})();

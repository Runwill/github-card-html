// admin/collapsible_anim
// 通用折叠/展开动画工具，配合 CSS .collapsible / .is-open 类使用
// 消费者：tokens/ui/logger.js、permissions/logs.js
(function(){
  function isAnimating(el){ return !!(el && (el.classList.contains('is-opening') || el.classList.contains('is-closing'))); }
  function isOpen(el){ return !!(el && el.classList.contains('is-open')); }
  function openCollapsible(el){
    try{
      if (!el || isAnimating(el) || isOpen(el)) return;
      const startH = el.offsetHeight;
      el.classList.add('is-opening');
      el.style.height = startH + 'px';
      void el.offsetHeight;
      const targetH = el.scrollHeight;
      el.style.height = targetH + 'px';
      const onEnd = (e)=>{
        if (e && e.target !== el) return;
        el.removeEventListener('transitionend', onEnd);
        el.classList.remove('is-opening');
        el.classList.add('is-open');
        el.style.height = 'auto';
      };
      el.addEventListener('transitionend', onEnd);
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
      const onEnd = (e)=>{
        if (e && e.target !== el) return;
        el.removeEventListener('transitionend', onEnd);
        el.classList.remove('is-closing');
      };
      el.addEventListener('transitionend', onEnd);
    }catch(_){ }
  }
  window.CollapsibleAnim = { isAnimating, isOpen, openCollapsible, closeCollapsible };
})();

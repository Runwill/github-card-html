;(function(){
  function createButton(){
    if (document.getElementById('back-to-top')) return null;
    var btn = document.createElement('button');
    btn.id = 'back-to-top';
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', '返回顶部');
    btn.title = '返回顶部';
    // 使用内联 SVG，避免额外请求
    btn.innerHTML = '<svg class="back-to-top__icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 19V5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 10l6-6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    document.body.appendChild(btn);
    return btn;
  }

  function smoothToTop(){
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(_) {
      window.scrollTo(0, 0);
    }
  }

  function bind(btn){
    if (!btn) return;
    var minY = 240; // 滚动超过此阈值显示按钮
    var ticking = false;

    function update(){
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y > minY) btn.classList.add('is-visible');
      else btn.classList.remove('is-visible');
    }

    function onScroll(){
      if (!ticking) {
        window.requestAnimationFrame(function(){ update(); });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    btn.addEventListener('click', function(e){ e.preventDefault(); smoothToTop(); });
    // 初始状态计算
    update();
  }

  function ready(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  // 若页面使用了 partials 异步插入，等待其完成再挂载，避免布局抖动
  var boot = function(){ bind(createButton()); };
  try {
    if (window.partialsReady && typeof window.partialsReady.then === 'function') {
      window.partialsReady.then(function(){ ready(boot); });
    } else {
      ready(boot);
    }
  } catch(_) { ready(boot); }
})();

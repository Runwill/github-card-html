(function() {
  const KEY_PREFIX = 'panelScroll:';
  let __ready = false;  // 页面初始化完成后才允许平滑滚动

  function getActivePanelId() {
    const el = document.querySelector('.tabs-panel.is-active');
    return el ? el.id : null;
  }

  function saveScroll(panelId, y) {
    try {
      sessionStorage.setItem(KEY_PREFIX + panelId, String(y || 0));
    } catch (e) {
      // ignore storage errors
    }
  }

  function readScroll(panelId) {
    try {
      const v = sessionStorage.getItem(KEY_PREFIX + panelId);
      return v ? Math.max(0, parseInt(v, 10) || 0) : 0;
    } catch (e) {
      return 0;
    }
  }

  function restoreFor(panelId) {
    if (!panelId) return;
    const targetY = readScroll(panelId);
    if (window.__scrollActionActive) {
      // 词元跨面板跳转中：performScroll 会接管滚动，此处跳过恢复
      return;
    }
    if (!__ready) {
      // 页面初始化期间：瞬时跳转
      window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });
    } else {
      // 手动面板切换：使用带距离上限的平滑滚动
      // 强制重排以确保新面板布局已完成
      void document.documentElement.scrollHeight;
      if (window.scrollActions && typeof window.scrollActions.cappedScrollTo === 'function') {
        window.scrollActions.cappedScrollTo(targetY, 'smooth');
      } else {
        window.scrollTo(0, targetY);
      }
    }
  }

  function bind() {
    // 1) Tab 点击前保存当前 panel 的滚动位置
    const tabLinks = document.querySelectorAll('#main-tabs a[href^="#panel_"]');
    tabLinks.forEach((a) => {
      a.addEventListener('click', function() {
        const currentId = getActivePanelId();
        if (currentId) saveScroll(currentId, window.scrollY);
        // 兜底：若 Foundation 事件未触发，切换后尝试恢复
        setTimeout(() => restoreFor(getActivePanelId()), 0);
      }, { passive: true });
    });

    // 2) Foundation Tabs 切换完成后恢复目标 panel 的滚动位置
    if (window.$ && $.fn && $.fn.foundation) {
      $(document).on('change.zf.tabs', '#main-tabs', function() {
        restoreFor(getActivePanelId());
      });
    }

    // 3) 在滚动时节流存储当前 panel 的位置（提升准确性）
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentId = getActivePanelId();
          if (currentId) saveScroll(currentId, window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // 4) 首次进入页面时，等待 partials 加载 + Foundation 初始化完成后恢复滚动位置
    //    bind() 在 DOMContentLoaded 执行，但面板 DOM 可能在 partialsReady 之后才存在，
    //    Foundation 的 is-active 在 $(document).foundation() 之后才设置
    const waitPartials = window.partialsReady && window.partialsReady.then
      ? window.partialsReady.catch(function(){})
      : Promise.resolve();
    waitPartials.then(function(){
      // partialsReady 之后 app_bootstrap 会同步调用 $(document).foundation()
      // 使用 setTimeout(0) 确保在同一微任务队列的 foundation() 之后执行
      setTimeout(function(){
        const initialId = getActivePanelId();
        if (initialId) {
          const y = readScroll(initialId);
          if (y) {
            window.scrollTo({ top: y, left: 0, behavior: 'instant' });
          }
        }
        // 初始化完成后标记就绪，后续面板切换可以使用平滑滚动
        requestAnimationFrame(function(){ __ready = true; });
      }, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();

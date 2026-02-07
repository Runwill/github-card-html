(function() {
  const KEY_PREFIX = 'panelScroll:';

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
    // 直接跳转至记录位置，避免动画影响布局抖动
    window.scrollTo(0, targetY);
  }

  function bind() {
    // 1) Tab 点击前保存当前 panel 的滚动位置
    const tabLinks = document.querySelectorAll('#example-tabs a[href^="#panel_"]');
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
      $(document).on('change.zf.tabs', '#example-tabs', function() {
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

    // 4) 首次进入页面时，如已有记录则恢复当前活动 panel 的位置
    const initialId = getActivePanelId();
    if (initialId) {
      const y = readScroll(initialId);
      if (y) window.scrollTo(0, y);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();

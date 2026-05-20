/**
 * force_landscape.js — 手机竖屏强制横屏显示
 *
 * 检测「触屏 + 无鼠标 + 竖屏 + 小屏」条件后：
 *   1. 添加 html.force-landscape class
 *   2. 创建 #fl-rotate 做旋转（不在 body 上 transform，避免触摸滚动失效）
 *   3. 内部 #fl-scroll 做触摸滚动
 *   4. 固定层（蒙版/弹窗/底栏）放在 #fl-rotate 但不在 #fl-scroll 中
 *   5. 用 visualViewport 计算精确尺寸，避开浏览器 UI
 */
;(function () {
  'use strict';

  /* ── 配置 ─────────────────────────────────────── */
  var MQ =
    '(orientation: portrait) and (pointer: coarse)' +
    ' and (max-width: 768px) and (max-height: 950px)';

  /** 留在 #fl-rotate 但不在 #fl-scroll 中的固定层选择器 */
  var FIXED_SEL = [
    '#loading-overlay',
    '#modal-backdrop',
    '.panel',
    '.modal',
    '.back-to-top',
    '.reveal-overlay',
    '.site-footer',       // 底栏固定在视口底部
    '.dragging-real',     // 拖拽幽灵元素
    '.card-move-ghost'    // 牌移动弧线飞行幽灵
  ];

  /* ── 状态 ─────────────────────────────────────── */
  var mql      = window.matchMedia(MQ);
  var active   = false;
  var rotateEl = null;   // #fl-rotate
  var scrollEl = null;   // #fl-scroll

  /* ── 工具 ─────────────────────────────────────── */
  function isFixed(el) {
    if (!el || el.nodeType !== 1 || !el.matches) return false;
    for (var i = 0; i < FIXED_SEL.length; i++) {
      if (el.matches(FIXED_SEL[i])) return true;
    }
    return false;
  }

  function offsetTopTo(elem, ancestor) {
    var top = 0;
    var el = elem;
    while (el && el !== ancestor && el !== document.body && el !== document.documentElement) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return top;
  }

  /* ── 用 visualViewport / innerWidth 计算精确尺寸 ── */
  function getPhysicalSize() {
    var vv = window.visualViewport;
    if (vv) return { w: vv.width, h: vv.height };
    return { w: screen.width, h: screen.height };
  }

  function updateDimensions() {
    if (!rotateEl) return;
    var s = getPhysicalSize();
    // 旋转后：视觉宽 = 物理高，视觉高 = 物理宽
    rotateEl.style.width  = s.h + 'px';
    rotateEl.style.height = s.w + 'px';
    rotateEl.style.transform =
      'translateX(' + s.w + 'px) rotate(90deg)';
  }

  /* ── 核心：创建 #fl-rotate + #fl-scroll 并分流子节点 ── */
  function restructure() {
    if (active) return;
    active = true;

    // 创建容器
    rotateEl = document.createElement('div');
    rotateEl.id = 'fl-rotate';

    scrollEl = document.createElement('div');
    scrollEl.id = 'fl-scroll';

    rotateEl.appendChild(scrollEl);

    // 将 body 子节点分流
    var nodes = Array.from(document.body.childNodes);
    nodes.forEach(function (n) {
      if (n.nodeType !== 1) { scrollEl.appendChild(n); return; }
      if (n.tagName === 'SCRIPT') return;           // 脚本留在 body
      if (isFixed(n)) { rotateEl.appendChild(n); return; }  // 固定层 → #fl-rotate
      scrollEl.appendChild(n);                       // 其余 → #fl-scroll
    });

    // 插入到 body 首位
    document.body.insertBefore(rotateEl, document.body.firstChild);

    // 设置精确尺寸
    updateDimensions();

    // 监听 visualViewport resize（地址栏收起/弹出）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions);
    }
    window.addEventListener('resize', updateDimensions);

    // 代理 scroll / viewport API
    proxyScrollAPIs();

    // 监听 body 新增子节点 → 转入 rotated 上下文
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n === rotateEl || n.nodeType !== 1) return;
          if (n.tagName === 'SCRIPT') return;
          if (isFixed(n)) rotateEl.appendChild(n);
          else scrollEl.appendChild(n);
        });
      });
    }).observe(document.body, { childList: true });

    // 暴露全局引用
    window.__flScroll      = scrollEl;
    window.__flRotate      = rotateEl;
    window.__flOffsetTopTo = offsetTopTo;

    // 坐标转换：物理屏幕坐标 → 旋转后的视觉坐标
    // 旋转 90° 后：视觉X = 物理Y, 视觉Y = 物理W - 物理X
    window.__flTransformPoint = function (physicalX, physicalY) {
      var s = getPhysicalSize();
      return { x: physicalY, y: s.w - physicalX };
    };
    // 矩形转换：物理 BoundingClientRect → 视觉坐标矩形
    window.__flTransformRect = function (rect) {
      var s = getPhysicalSize();
      var vLeft   = rect.top;
      var vTop    = s.w - rect.right;   // s.w - (rect.left + rect.width)
      var vWidth  = rect.height;
      var vHeight = rect.width;
      return {
        left:   vLeft,
        top:    vTop,
        width:  vWidth,
        height: vHeight,
        right:  vLeft + vWidth,
        bottom: vTop + vHeight,
        x:      vLeft,
        y:      vTop
      };
    };

    // 手动触摸滚动：部分手机浏览器在 transform 父元素内不支持原生触摸滚动
    if (window.TouchScrollManager) TouchScrollManager.install(scrollEl);
  }

  /* ── Scroll API 代理 ─────────────────────────── */
  function proxyScrollAPIs() {
    // scroll 事件转发
    scrollEl.addEventListener('scroll', function () {
      window.dispatchEvent(new Event('scroll'));
    }, { passive: true });

    // scrollTo / scrollBy
    var _scrollTo = window.scrollTo.bind(window);
    window.scrollTo = function (x, y) {
      if (!scrollEl) return _scrollTo(x, y);
      if (typeof x === 'object') scrollEl.scrollTo(x);
      else scrollEl.scrollTo(x || 0, y || 0);
    };
    var _scrollBy = window.scrollBy.bind(window);
    window.scrollBy = function (x, y) {
      if (!scrollEl) return _scrollBy(x, y);
      if (typeof x === 'object') scrollEl.scrollBy(x);
      else scrollEl.scrollBy(x || 0, y || 0);
    };

    // scrollY / pageYOffset
    function flScrollTop() { return scrollEl ? scrollEl.scrollTop : 0; }
    try { Object.defineProperty(window, 'scrollY',     { get: flScrollTop, configurable: true }); } catch (_) {}
    try { Object.defineProperty(window, 'pageYOffset',  { get: flScrollTop, configurable: true }); } catch (_) {}

    // document.documentElement.scrollTop
    try {
      Object.defineProperty(document.documentElement, 'scrollTop', {
        get: function () { return scrollEl ? scrollEl.scrollTop : 0; },
        set: function (v) { if (scrollEl) scrollEl.scrollTop = v; },
        configurable: true
      });
    } catch (_) {}

    // document.documentElement.scrollHeight
    try {
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        get: function () { return scrollEl ? scrollEl.scrollHeight : document.body.scrollHeight; },
        configurable: true
      });
    } catch (_) {}

    // innerWidth / innerHeight（旋转后交换）
    try {
      Object.defineProperty(window, 'innerWidth', {
        get: function () { return scrollEl ? scrollEl.clientWidth : screen.width; },
        configurable: true
      });
    } catch (_) {}
    try {
      Object.defineProperty(window, 'innerHeight', {
        get: function () { return scrollEl ? scrollEl.clientHeight : screen.height; },
        configurable: true
      });
    } catch (_) {}

    // document.documentElement.clientWidth / clientHeight
    try {
      Object.defineProperty(document.documentElement, 'clientWidth', {
        get: function () { return scrollEl ? scrollEl.clientWidth : 0; },
        configurable: true
      });
    } catch (_) {}
    try {
      Object.defineProperty(document.documentElement, 'clientHeight', {
        get: function () { return scrollEl ? scrollEl.clientHeight : 0; },
        configurable: true
      });
    } catch (_) {}
  }

  /* ── 启用 viewport-fit=cover ─────────────────── */
  function enableViewportFitCover() {
    var meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      var content = meta.getAttribute('content') || '';
      if (content.indexOf('viewport-fit') === -1) {
        meta.setAttribute('content', content + ', viewport-fit=cover');
      }
    }
  }

  /* ── 激活时序 ─────────────────────────────────── */
  function waitAndActivate() {
    if (window.partialsReady && typeof window.partialsReady.then === 'function') {
      window.partialsReady.then(function () { requestAnimationFrame(restructure); });
      return;
    }
    requestAnimationFrame(waitAndActivate);
  }

  /* ── 入口 ─────────────────────────────────────── */
  if (mql.matches) {
    document.documentElement.classList.add('force-landscape');
    enableViewportFitCover();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', waitAndActivate);
    } else {
      waitAndActivate();
    }
  }

  // 横 ↔ 竖 切换
  mql.addEventListener('change', function (e) {
    if (e.matches && !active) {
      document.documentElement.classList.add('force-landscape');
      enableViewportFitCover();
      waitAndActivate();
    } else if (!e.matches && active) {
      location.reload();
    }
  });
})();

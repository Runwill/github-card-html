/**
 * CollapsibleTransition — 折叠/展开过渡动画工具
 *
 * 提供 CSS height 过渡驱动的 expand/collapse 函数。
 * 展开完成后将 height 恢复为 auto 以适配内容动态变化。
 * 配合 .is-collapsed class 使用（区别于 admin/collapsible_anim.js 的 .is-open 模式）。
 *
 * 由 collapsible.js 调用。
 *
 * IIFE 模块，挂载到 window.CollapsibleTransition
 */
;(function () {
  'use strict';

  function onTransitionEnd(e, el) {
    if (e.propertyName !== 'height') return;
    // 展开完成后，将高度改为 auto 以适配内容动态变化
    if (!el.classList.contains('is-collapsed')) {
      el.style.height = 'auto';
      // 展开完成后允许可见溢出，避免内容被裁剪
      el.style.overflow = '';
    }
    el.removeEventListener('transitionend', el._collapseTEnd);
    el._collapseTEnd = null;
  }

  function prepareTransition(el, fromHeight) {
    el.style.height = fromHeight + 'px';
    void el.offsetHeight;
    el.style.overflow = 'hidden';
    el._collapseTEnd && el.removeEventListener('transitionend', el._collapseTEnd);
    el._collapseTEnd = function (ev) { onTransitionEnd(ev, el); };
    el.addEventListener('transitionend', el._collapseTEnd);
  }

  function collapse(el, btn) {
    prepareTransition(el, el.scrollHeight);
    el.style.height = '0px';
    el.classList.add('is-collapsed');
    btn.classList.add('is-collapsed');
  }

  function expand(el, btn) {
    el.classList.remove('is-collapsed');
    prepareTransition(el, 0);
    el.style.height = el.scrollHeight + 'px';
    btn.classList.remove('is-collapsed');
  }

  window.CollapsibleTransition = { expand: expand, collapse: collapse };
})();

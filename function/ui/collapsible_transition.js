/** CollapsibleTransition — CSS height 过渡驱动的折叠/展开动画。由 collapsible.js 调用。 */
  function finishTransition(el) {
    // 展开完成后，将高度改为 auto 以适配内容动态变化
    if (!el.classList.contains('is-collapsed')) {
      el.style.height = 'auto';
      // 展开完成后允许可见溢出，避免内容被裁剪
      el.style.overflow = '';
    }
    el._collapseTEnd = null;
  }

  function prepareTransition(el, fromHeight) {
    el.style.height = fromHeight + 'px';
    void el.offsetHeight;
    el.style.overflow = 'hidden';
    if (el._collapseTEnd) el._collapseTEnd();
    el._collapseTEnd = window.CollapsibleAnim.onTransitionEnd(el, function () { finishTransition(el); }, 0, function (e) { return e.target === el && e.propertyName === 'height'; });
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

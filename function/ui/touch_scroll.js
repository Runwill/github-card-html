/** TouchScrollManager — transform 容器内手动触摸滚动（含惯性）。由 force_landscape.js 调用。 */
'use strict';

  /**
   * @param {HTMLElement} scrollEl - 需要手动触摸滚动的容器
   */
  function install(scrollEl) {
    var startY = 0;
    var startScrollTop = 0;
    var isTouching = false;
    var lastY = 0;
    var velocity = 0;
    var momentumRaf = null;

    scrollEl.addEventListener('touchstart', function (e) {
      // 如果目标是可拖拽的（游戏牌），不拦截
      if (e.target.closest && e.target.closest('.draggable-item')) return;
      cancelMomentum();
      var touch = e.touches[0];
      // 旋转 90° 后：手指"纵向"滑动在物理屏幕上是 X 轴
      // 向右滑（physical X 增大）= 视觉向上滚
      startY = touch.clientX;
      startScrollTop = scrollEl.scrollTop;
      lastY = startY;
      velocity = 0;
      isTouching = true;
    }, { passive: true });

    scrollEl.addEventListener('touchmove', function (e) {
      if (!isTouching) return;
      var touch = e.touches[0];
      var currentY = touch.clientX;
      var delta = startY - currentY;  // 向右滑 = 负 delta = 向上滚
      velocity = lastY - currentY;    // 帧间速度
      lastY = currentY;
      scrollEl.scrollTop = startScrollTop + delta;
      // 如果确实在滚动，阻止默认行为（包括浏览器下拉刷新等）
      if (Math.abs(delta) > 2) {
        e.preventDefault();
      }
    }, { passive: false });

    scrollEl.addEventListener('touchend', function () {
      isTouching = false;
      // 惯性滚动
      if (Math.abs(velocity) > 1) startMomentum();
    }, { passive: true });

    scrollEl.addEventListener('touchcancel', function () {
      isTouching = false;
    }, { passive: true });

    function startMomentum() {
      cancelMomentum();
      var v = velocity * 8;  // 初始惯性速度
      var friction = 0.95;
      function step() {
        v *= friction;
        if (Math.abs(v) < 0.5) return;
        scrollEl.scrollTop += v;
        momentumRaf = requestAnimationFrame(step);
      }
      momentumRaf = requestAnimationFrame(step);
    }

    function cancelMomentum() {
      if (momentumRaf) {
        cancelAnimationFrame(momentumRaf);
        momentumRaf = null;
      }
    }

    // 鼠标滚轮：旋转 90° 后物理纵向（deltaY）对应视觉横向，需要交换
    scrollEl.addEventListener('wheel', function (e) {
      e.preventDefault();
      // 物理向下滚（deltaY>0）在旋转后应向视觉下方滚→scrollTop 增大
      // 物理向右滚（deltaX>0）也映射到 scrollTop
      scrollEl.scrollTop += e.deltaX - e.deltaY;
    }, { passive: false });
  }

window.TouchScrollManager = { install: install };

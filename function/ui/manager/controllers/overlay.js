// 统一覆盖层系统 - 用导航栈管理所有菜单和弹窗
// 替代原 modal.js + sidebar.js
(function(){
  'use strict';
  var w = window;
  var dom = w.CardUI.Manager.Core.dom || {};
  var userService = w.CardUI.Manager.Core.userService || {};
  var $ = dom.$ || function(id){ return document.getElementById(id); };

  // ─── 配置 ───
  // 每个可打开的面板/弹窗在这里注册
  var PANELS = {
    'sidebar-menu':       { type: 'menu' },
    'account-menu':       { type: 'menu' },
    'settings-menu':      { type: 'menu' },
    'update-account-modal':  { type: 'modal' },
    'approve-user-modal':    { type: 'modal' },
    'avatar-modal':          { type: 'modal' },
    'avatar-crop-modal':     { type: 'modal' },
    'account-info-modal':    { type: 'modal' },
    'announcements-modal':   { type: 'modal' },
    'key-settings-modal':    { type: 'modal' },
    'game-settings-modal':   { type: 'modal' }
  };

  var BACKDROP_ID = 'modal-backdrop';
  var ANIM_DURATION = 250; // ms, 与 CSS transition 匹配

  // ─── 导航栈 ───
  // 栈中每个元素是 panelId 字符串
  var stack = [];

  // ─── 核心函数 ───

  function getBackdrop() { return $(BACKDROP_ID); }

  /** 显示 backdrop */
  function showBackdrop() {
    var bd = getBackdrop();
    if (!bd) return;
    bd.style.display = 'block';
    void bd.offsetWidth; // 强制重绘
    bd.classList.add('show');
  }

  /** 隐藏 backdrop */
  function hideBackdrop() {
    var bd = getBackdrop();
    if (!bd) return;
    bd.classList.remove('show');
    setTimeout(function(){ 
      // 再次检查，防止在动画期间有新面板打开
      if (stack.length === 0) {
        bd.style.display = 'none'; 
      }
    }, ANIM_DURATION);
  }

  /**
   * 显示一个面板元素
   * - modal（CSS 用 display:none 隐藏）：需先设 display:block、强制重排，
   *   再在下一帧加 show，否则浏览器会合并操作跳过过渡动画
   * - panel（CSS 用 visibility:hidden 隐藏）：直接加 show 即可
   */
  function showElement(panelId) {
    var el = $(panelId);
    if (!el) return;
    var cfg = PANELS[panelId];
    if (cfg && cfg.type === 'modal') {
      // modal: display:none → block，再触发过渡
      el.style.display = 'block';
      void el.offsetWidth; // 强制重排，让浏览器先渲染 opacity:0 状态
      requestAnimationFrame(function(){ el.classList.add('show'); });
    } else {
      // panel/menu: visibility 控制，直接切换
      el.classList.add('show');
    }
  }

  /** 隐藏一个面板元素 */
  function hideElement(panelId) {
    var el = $(panelId);
    if (!el) return;
    el.classList.remove('show');
    var cfg = PANELS[panelId];
    if (cfg && cfg.type === 'modal') {
      // modal 需要延迟设 display:none，等过渡动画结束
      setTimeout(function(){ el.style.display = 'none'; }, ANIM_DURATION);
    }
  }

  /** 面板打开时的初始化逻辑 */
  function handleSpecialCases(panelId) {
    var el = $(panelId);
    if (!el) return;

    var refresh = userService.refreshCurrentUserFromServer;

    if (panelId === 'update-account-modal') {
      ['#oldPassword','#newPassword','#confirmPassword'].forEach(function(s){
        var input = el.querySelector(s); if (input) input.value = '';
      });
      var u = el.querySelector('#pwdUsername');
      if (u) u.value = localStorage.getItem('username') || localStorage.getItem('user') || '';
      var pwd = el.querySelector('#oldPassword'); if (pwd) pwd.focus();
    } else if (panelId === 'approve-user-modal') {
      if (typeof w.renderApprovals === 'function') w.renderApprovals();
      if (refresh) refresh();
    } else if (panelId === 'permissions-modal') {
      if (typeof w.renderPermissionsPanel === 'function') w.renderPermissionsPanel('');
    } else if (panelId === 'sidebar-menu' || panelId === 'account-menu') {
      if (refresh) refresh();
    }

    // 清除 responseMessage
    var msg = el.querySelector('#responseMessage');
    if (msg) { msg.textContent = ''; msg.className = 'modal-message'; }
  }

  /**
   * 打开面板。隐藏栈顶元素，push 新面板并显示。
   * @param {string} panelId - PANELS 中注册的面板 ID
   */
  function open(panelId) {
    if (!PANELS[panelId]) {
      console.warn('[Overlay] Unknown panel:', panelId);
      return;
    }

    // 已经是栈顶，不重复打开
    if (stack.length > 0 && stack[stack.length - 1] === panelId) return;

    // 隐藏当前栈顶元素（不从栈中移除，保留在栈中以便返回）
    if (stack.length > 0) {
      var currentTop = stack[stack.length - 1];
      hideElement(currentTop);
    }

    // 推入新面板
    stack.push(panelId);

    // 确保 backdrop 显示
    showBackdrop();

    showElement(panelId);
    handleSpecialCases(panelId);
  }

  /**
   * 返回上一级（ESC）：关闭栈顶，显示下一个
   */
  function back() {
    if (stack.length === 0) return;

    var closing = stack.pop();
    
    if (stack.length > 0) {
      // 还有上一级：关闭当前，显示上一级
      var parent = stack[stack.length - 1];
      hideElement(closing);
      showElement(parent);
    } else {
      // 栈空了：关闭一切
      hideElement(closing);
      hideBackdrop();
    }
  }

  /**
   * 关闭所有（背景点击）：清空整个栈
   */
  function closeAll() {
    // 隐藏所有栈中元素
    var all = stack.slice(); // 拷贝
    stack = [];
    
    all.forEach(function(panelId){
      hideElement(panelId);
    });

    hideBackdrop();
  }

  /**
   * 关闭指定面板（直接关闭，不返回上级）
   * 用于背景点击或特殊按钮
   */
  function close(panelId) {
    var idx = stack.indexOf(panelId);
    if (idx === -1) return;

    // 如果是栈顶，等同于 back()
    if (idx === stack.length - 1) {
      back();
      return;
    }

    // 不在栈顶，从栈中移除（它已经是隐藏的）
    stack.splice(idx, 1);
  }

  /** 获取当前栈顶 */
  function current() {
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }

  /** 检查是否有任何面板打开 */
  function isAnyOpen() {
    return stack.length > 0;
  }

  // ─── 导出统一 API ───
  w.CardUI.Manager.Controllers.overlay = {
    open: open,
    back: back,
    close: close,
    closeAll: closeAll,
    current: current,
    isAnyOpen: isAnyOpen,
    panelIds: Object.keys(PANELS)
  };
})();

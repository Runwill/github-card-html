// 账号菜单的显示/隐藏控制器，与侧边栏/遮罩联动。
// CardUI Manager Controllers - account menu controls
(function(){
  'use strict';
  var w = (typeof window !== 'undefined') ? window : this;
  w.CardUI = w.CardUI || {};
  w.CardUI.Manager = w.CardUI.Manager || {};
  w.CardUI.Manager.Core = w.CardUI.Manager.Core || {};
  w.CardUI.Manager.Controllers = w.CardUI.Manager.Controllers || {};

  var dom = (w.CardUI.Manager.Core.dom) || {};
  var state = (w.CardUI.Manager.Core.state) || { get: function(){ return {}; }, set: function(){} };
  var userService = (w.CardUI.Manager.Core.userService) || {};

  var $ = dom.$ || function(id){ return document.getElementById(id); };

  function showAccountMenu(){
    try { w.CardUI.Manager.Controllers.sidebar && w.CardUI.Manager.Controllers.sidebar.hideSidebar(); } catch(_){ }
    var st = state.get();
    if (st.accountMenuVisible) return;
    var menu = $('account-menu');
    var backdrop = $('sidebar-backdrop');
    if (!menu || !backdrop) return;
    state.set({ accountMenuVisible: true });
    backdrop.style.display = 'block';
    menu.style.display = '';
    menu.classList.add('show');
    requestAnimationFrame(function(){ backdrop.classList.add('show'); });
    try { if (typeof userService.refreshCurrentUserFromServer === 'function') userService.refreshCurrentUserFromServer(); } catch(_){ }
  }

  function hideAccountMenu(){
    var st = state.get();
    if (!st.accountMenuVisible) return;
    var menu = $('account-menu');
    var backdrop = $('sidebar-backdrop');
    if (!menu || !backdrop) return;
    state.set({ accountMenuVisible: false });
    backdrop.classList.remove('show');
    menu.classList.remove('show');
    setTimeout(function(){ var s = state.get(); if (!s.accountMenuVisible && !s.sidebarVisible) { backdrop.style.display = 'none'; } }, 300);
  }

  w.CardUI.Manager.Controllers.accountMenu = { showAccountMenu: showAccountMenu, hideAccountMenu: hideAccountMenu };
})();

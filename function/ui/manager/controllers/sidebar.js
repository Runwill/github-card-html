// 侧边栏显示/隐藏与遮罩联动控制器。
// CardUI Manager Controllers - sidebar controls
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

  function showSidebar(){
    var st = state.get();
    if (st.sidebarVisible) return;
    try { w.CardUI.Manager.Controllers.modal && w.CardUI.Manager.Controllers.modal.hideAllModals(); } catch(_){ }
    try { w.CardUI.Manager.Controllers.accountMenu && w.CardUI.Manager.Controllers.accountMenu.hideAccountMenu(); } catch(_){ }
    var menu = $('sidebar-menu');
    var backdrop = $('sidebar-backdrop');
    if (!menu || !backdrop) return;
    state.set({ sidebarVisible: true });
    backdrop.style.display = 'block';
    menu.style.display = '';
    menu.classList.add('show');
    requestAnimationFrame(function(){ backdrop.classList.add('show'); });
    try { if (typeof userService.refreshCurrentUserFromServer === 'function') userService.refreshCurrentUserFromServer(); } catch(_){ }
  }

  function hideSidebar(){
    var st = state.get();
    if (!st.sidebarVisible) return;
    var menu = $('sidebar-menu');
    var backdrop = $('sidebar-backdrop');
    if (!menu || !backdrop) return;
    state.set({ sidebarVisible: false });
    backdrop.classList.remove('show');
    menu.classList.remove('show');
    setTimeout(function(){ var s = state.get(); if (!s.sidebarVisible && !s.accountMenuVisible) { backdrop.style.display = 'none'; } }, 300);
  }

  function toggleSidebar(){ state.get().sidebarVisible ? hideSidebar() : showSidebar(); }

  w.CardUI.Manager.Controllers.sidebar = { showSidebar: showSidebar, hideSidebar: hideSidebar, toggleSidebar: toggleSidebar };
})();

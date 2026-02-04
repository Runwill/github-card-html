// 侧边栏/菜单面板通用显示/隐藏控制器。
// CardUI Manager Controllers - panel menu controls (sidebar, account, settings)
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

  // 所有面板菜单的配置
  var MENUS = {
    sidebar: { elementId: 'sidebar-menu', stateKey: 'sidebarVisible', backdrop: 'sidebar-backdrop' },
    accountMenu: { elementId: 'account-menu', stateKey: 'accountMenuVisible', backdrop: 'sidebar-backdrop' },
    settingsMenu: { elementId: 'settings-menu', stateKey: 'settingsMenuVisible', backdrop: 'sidebar-backdrop' }
  };

  // 通用：隐藏所有面板菜单
  function hideAllPanelMenus(except) {
    Object.keys(MENUS).forEach(function(key) {
      if (key !== except) {
        var cfg = MENUS[key];
        var menu = $(cfg.elementId);
        if (menu) menu.classList.remove('show');
        var st = {}; st[cfg.stateKey] = false;
        state.set(st);
      }
    });
  }

  // 通用：检查是否有任何面板菜单可见
  function isAnyPanelMenuVisible() {
    var st = state.get();
    return Object.keys(MENUS).some(function(key) {
      return st[MENUS[key].stateKey];
    });
  }

  // 工厂函数：创建面板菜单控制器
  function createMenuController(menuKey) {
    var cfg = MENUS[menuKey];
    if (!cfg) return {};

    function show() {
      var st = state.get();
      if (st[cfg.stateKey]) return;
      
      // 隐藏其他面板菜单
      hideAllPanelMenus(menuKey);
      // 隐藏所有弹窗
      try { w.CardUI.Manager.Controllers.modal && w.CardUI.Manager.Controllers.modal.hideAllModals(); } catch(_){ }
      
      var menu = $(cfg.elementId);
      var backdrop = $(cfg.backdrop);
      if (!menu || !backdrop) return;
      
      var update = {}; update[cfg.stateKey] = true;
      state.set(update);
      backdrop.style.display = 'block';
      menu.style.display = '';
      menu.classList.add('show');
      requestAnimationFrame(function(){ backdrop.classList.add('show'); });
      
      // 刷新用户信息（仅侧边栏和账号菜单需要）
      if (menuKey === 'sidebar' || menuKey === 'accountMenu') {
        try { if (typeof userService.refreshCurrentUserFromServer === 'function') userService.refreshCurrentUserFromServer(); } catch(_){ }
      }
    }

    function hide() {
      var st = state.get();
      if (!st[cfg.stateKey]) return;
      
      var menu = $(cfg.elementId);
      var backdrop = $(cfg.backdrop);
      if (!menu || !backdrop) return;
      
      var update = {}; update[cfg.stateKey] = false;
      state.set(update);
      backdrop.classList.remove('show');
      menu.classList.remove('show');
      
      setTimeout(function(){ 
        if (!isAnyPanelMenuVisible()) { 
          backdrop.style.display = 'none'; 
        } 
      }, 300);
    }

    function toggle() { 
      state.get()[cfg.stateKey] ? hide() : show(); 
    }

    return { show: show, hide: hide, toggle: toggle };
  }

  // 创建各个菜单的控制器
  var sidebarCtrl = createMenuController('sidebar');
  var accountMenuCtrl = createMenuController('accountMenu');
  var settingsMenuCtrl = createMenuController('settingsMenu');

  // 导出（保持向后兼容的 API）
  w.CardUI.Manager.Controllers.sidebar = { 
    showSidebar: sidebarCtrl.show, 
    hideSidebar: sidebarCtrl.hide, 
    toggleSidebar: sidebarCtrl.toggle 
  };
  w.CardUI.Manager.Controllers.accountMenu = { 
    showAccountMenu: accountMenuCtrl.show, 
    hideAccountMenu: accountMenuCtrl.hide 
  };
  w.CardUI.Manager.Controllers.settingsMenu = { 
    showSettingsMenu: settingsMenuCtrl.show, 
    hideSettingsMenu: settingsMenuCtrl.hide 
  };

  // 导出通用函数
  w.CardUI.Manager.Controllers.panelMenu = {
    hideAll: hideAllPanelMenus,
    isAnyVisible: isAnyPanelMenuVisible
  };
})();

// 共享 UI 状态管理（侧边栏、账号菜单、模态框等）。
// CardUI Manager Core - shared UI state
(function(){
  'use strict';
  var w = (typeof window !== 'undefined') ? window : this;
  w.CardUI = w.CardUI || {};
  w.CardUI.Manager = w.CardUI.Manager || {};
  w.CardUI.Manager.Core = w.CardUI.Manager.Core || {};
  var ns = w.CardUI.Manager.Core;

  var state = {
    sidebarVisible: false,
    accountMenuVisible: false,
    currentModal: null,
    returnToAccountMenuOnClose: false
  };

  function get(){ return state; }
  function set(patch){ if (patch && typeof patch === 'object') { Object.assign(state, patch); } }

  ns.state = { get: get, set: set, state: state };
})();

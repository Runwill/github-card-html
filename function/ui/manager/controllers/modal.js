// 模态框显示与隐藏控制器（支持特殊初始化逻辑）。
// CardUI Manager Controllers - modal controls
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
  var qs = dom.qs || function(s){ return document.querySelector(s); };

  function handleModalSpecialCases(modalId, modal){
    if (modalId === 'update-account-modal') {
      var oldPwd = modal.querySelector('#oldPassword');
      var newPwd = modal.querySelector('#newPassword');
      var confirmPwd = modal.querySelector('#confirmPassword');
      if (oldPwd) oldPwd.value = '';
      if (newPwd) newPwd.value = '';
      if (confirmPwd) confirmPwd.value = '';
      if (oldPwd) oldPwd.focus();
    } else if (modalId === 'approve-user-modal') {
      try { if (typeof w.renderApprovals === 'function') w.renderApprovals(); } catch(_){ }
      try { if (typeof userService.refreshCurrentUserFromServer === 'function') userService.refreshCurrentUserFromServer(); } catch(_){ }
    } else if (modalId === 'permissions-modal') {
      try { (typeof w.renderPermissionsPanel === 'function') && w.renderPermissionsPanel(''); } catch(_){ }
    }
  }

  function showModal(modalId){
    var st = state.get();
    if (st.currentModal === modalId) return;
    state.set({ returnToAccountMenuOnClose: st.returnToAccountMenuOnClose || st.accountMenuVisible });
    hideAllModals();
    try { w.CardUI.Manager.Controllers.accountMenu && w.CardUI.Manager.Controllers.accountMenu.hideAccountMenu(); } catch(_){ }
    try { w.CardUI.Manager.Controllers.sidebar && w.CardUI.Manager.Controllers.sidebar.hideSidebar(); } catch(_){ }

    var backdrop = $('modal-backdrop');
    var modal = $(modalId);
    if (!backdrop || !modal) return;
    state.set({ currentModal: modalId });
    backdrop.style.display = 'block';
    modal.style.display = 'block';
    backdrop.classList.remove('show');
    modal.classList.remove('show');
    try { void backdrop.offsetWidth; void modal.offsetWidth; } catch(_){ }
    var responseMessage = modal.querySelector('#responseMessage');
    if (responseMessage) { responseMessage.textContent = ''; responseMessage.className = 'modal-message'; }
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ backdrop.classList.add('show'); modal.classList.add('show'); }); });
    handleModalSpecialCases(modalId, modal);
  }

  function hideModal(modalId){
    var st = state.get();
    if (st.currentModal !== modalId) return;
    var backdrop = $('modal-backdrop');
    var modal = $(modalId);
    if (!backdrop || !modal) return;
    state.set({ currentModal: null });
    backdrop.classList.remove('show');
    modal.classList.remove('show');
    setTimeout(function(){ if (!state.get().currentModal) { backdrop.style.display = 'none'; } modal.style.display = 'none'; }, 300);
  }

  function hideAllModals(){
    var st = state.get();
    if (st.currentModal) hideModal(st.currentModal);
  }

  w.CardUI.Manager.Controllers.modal = {
    showModal: showModal,
    hideModal: hideModal,
    hideAllModals: hideAllModals,
    handleModalSpecialCases: handleModalSpecialCases
  };
})();

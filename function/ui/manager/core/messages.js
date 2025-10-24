// 核心消息与吐司提示工具函数。
// CardUI Manager Core - messages & toast helpers
(function(){
  'use strict';
  var w = (typeof window !== 'undefined') ? window : this;
  w.CardUI = w.CardUI || {};
  w.CardUI.Manager = w.CardUI.Manager || {};
  w.CardUI.Manager.Core = w.CardUI.Manager.Core || {};
  var ns = w.CardUI.Manager.Core;

  function showMessage(element, message, type){
    if (!element) return;
    element.textContent = message;
    element.className = 'modal-message ' + (type || '');
  }

  function toast(msg){
    try {
      if (w.tokensAdmin && typeof w.tokensAdmin.showToast === 'function') {
        w.tokensAdmin.showToast(msg);
        return;
      }
    } catch {}
    try { w.alert(msg); } catch {}
  }

  ns.messages = { showMessage: showMessage, toast: toast };
})();

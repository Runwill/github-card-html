// 核心消息与吐司提示工具函数。
// CardUI Manager Core - messages & toast helpers
(function(){
  'use strict';
  var w = window;
  var ns = w.CardUI.Manager.Core;

  function showMessage(element, message, type){
    if (!element) return;
    element.textContent = message;
    element.className = 'modal-message ' + (type || '');
  }

  ns.messages = { showMessage: showMessage };
})();

// 应用启动入口：等待局部片段加载后绑定事件并刷新当前用户数据。
(function(){
  'use strict';
  var w = window;
  function onReady(){
    try { var ready = (w.partialsReady instanceof Promise) ? w.partialsReady : Promise.resolve();
      ready.then(function(){
        try { var ctrls = w.CardUI && w.CardUI.Manager && w.CardUI.Manager.Controllers; ctrls && ctrls.bindings && typeof ctrls.bindings.init === 'function' && ctrls.bindings.init(); } catch(_){ }
        try { var core = w.CardUI && w.CardUI.Manager && w.CardUI.Manager.Core; core && core.userService && typeof core.userService.refreshCurrentUserFromServer === 'function' && core.userService.refreshCurrentUserFromServer(); } catch(_){ }
      });
    } catch(_){ }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') { onReady(); }
  else { document.addEventListener('DOMContentLoaded', onReady); }
})();

// 应用启动入口：等待局部片段加载后绑定事件并刷新当前用户数据。
(function(){
  'use strict';
  var w = window;
  whenDOMReady().then(()=> whenPartialsReady().then(function(){
      try { w.CardUI?.Manager?.Controllers?.bindings?.init?.(); } catch(_){ }
      try { w.CardUI?.Manager?.Core?.userService?.refreshCurrentUserFromServer?.(); } catch(_){ }
  })).catch(function(){});
})();

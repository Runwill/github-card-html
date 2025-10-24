// 会话控制器：处理登出并清理本地存储。
(function(){
  'use strict';
  var w = (typeof window !== 'undefined') ? window : this;
  w.CardUI = w.CardUI || {};
  w.CardUI.Manager = w.CardUI.Manager || {};
  w.CardUI.Manager.Controllers = w.CardUI.Manager.Controllers || {};

  function handleLogout(){ try { ['token','username','id'].forEach(function(k){ window.localStorage && window.localStorage.removeItem(k); }); } catch(_){} window.location.href = 'login.html'; }

  w.CardUI.Manager.Controllers.session = { handleLogout: handleLogout };
})();

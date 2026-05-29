// 会话控制器：处理登出并清理本地存储。
  'use strict';
  var w = window;

  function handleLogout(){ try { window.endpoints?.clearSession?.(); } catch(_){} window.location.href = 'login.html'; }

  w.CardUI.Manager.Controllers.session = { handleLogout: handleLogout };

// 用户数据刷新与本地同步服务（头像、用户名、简介、权限等）。
// CardUI Manager Core - user service
(function(){
  'use strict';
  var w = window;
  w.CardUI = w.CardUI || {};
  w.CardUI.Manager = w.CardUI.Manager || {};
  w.CardUI.Manager.Core = w.CardUI.Manager.Core || {};
  var ns = w.CardUI.Manager.Core;

  function _dom(){ return (ns && ns.dom) || {}; }

  async function refreshCurrentUserFromServer(){
    try {
      var id = w.localStorage ? w.localStorage.getItem('id') : '';
      if (!id) return;
      var d = _dom();
      var api = d.api || (function(u){ return u; });
      var resp = await fetch(api('/api/user/' + encodeURIComponent(id)));
      if (!resp) return;
      if (resp.status === 404) {
        if (w.localStorage) {
          try {
            w.localStorage.removeItem('id');
            w.localStorage.removeItem('username');
            w.localStorage.removeItem('avatar');
            w.localStorage.removeItem('intro');
            w.localStorage.removeItem('permissions');
          } catch(_){}
        }
        return;
      }
      if (!resp.ok) return;
      var data = await resp.json();
      if (!data) return;

      if (typeof data.intro === 'string' && w.localStorage) w.localStorage.setItem('intro', data.intro || '');
      if (data.createdAt && w.localStorage) w.localStorage.setItem('createdAt', data.createdAt);
      if (Array.isArray(data.permissions) && w.localStorage) {
        try { w.localStorage.setItem('permissions', JSON.stringify(data.permissions)); } catch(_){}
      }

      // username sync (do not change DOM here unless needed)
      if (typeof data.username === 'string' && w.localStorage) {
        var oldName = w.localStorage.getItem('username') || '';
        var nextName = data.username || '';
        if (oldName !== nextName) {
          w.localStorage.setItem('username', nextName);
          try {
            var ctrls = w.CardUI && w.CardUI.Manager && w.CardUI.Manager.Controllers;
            var pli = ctrls && ctrls.profileInlineEdit;
            if (pli && typeof pli.refreshUsernameUI === 'function') pli.refreshUsernameUI(nextName);
            if (pli && typeof pli.loadPendingUsernameBadge === 'function') pli.loadPendingUsernameBadge();
          } catch(_){ }
        }
      }

      var old = (w.localStorage && w.localStorage.getItem('avatar')) || '';
      var next = data.avatar || '';
      if (old !== next && w.localStorage) w.localStorage.setItem('avatar', next);
      var resolveAvatarUrl = d.resolveAvatarUrl || function(u){ return u || ''; };
      var resolved = resolveAvatarUrl(next);

      // Best-effort update of common avatar UIs
      try {
        var $ = d.$ || function(id){ return document.getElementById(id); };
        var sidebarPrev = $('sidebar-avatar-preview');
        var headerAvatar = $('header-avatar');
        var modalPrev = $('avatar-modal-preview');
        if (sidebarPrev && resolved) { sidebarPrev.src = resolved; sidebarPrev.style.display = 'inline-block'; }
        if (headerAvatar && resolved) { headerAvatar.src = resolved; headerAvatar.style.display = 'inline-block'; }
        if (modalPrev) {
          if (resolved) { modalPrev.src = resolved; modalPrev.style.display = 'inline-block'; }
          else { try { modalPrev.removeAttribute('src'); } catch(_){} modalPrev.style.display = 'none'; }
        }
      } catch(_){ }
    } catch(_){ }
  }

  ns.userService = { refreshCurrentUserFromServer: refreshCurrentUserFromServer };
})();

// 用户数据刷新与本地同步服务（头像、用户名、简介、权限等）。
// CardUI Manager Core - user service
  'use strict';
  var w = window;
  var ns = w.CardUI.Manager.Core;
  var USER_CACHE_KEYS = ['id','username','avatar','intro','permissions'];

  async function refreshCurrentUserFromServer(){
    try {
      var id = w.localStorage ? w.localStorage.getItem('id') : '';
      if (!id) return;
      var d = ns.dom || {};
      var requestJson = w.endpoints && w.endpoints.requestJson;
      if (!requestJson) return;
      var data;
      try { data = await requestJson('/user/' + encodeURIComponent(id), { auth: true }); }
      catch(e){ if (e && e.status === 404 && w.localStorage) try { USER_CACHE_KEYS.forEach(function(k){ w.localStorage.removeItem(k); }); } catch(_){}; return; }
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
            var pli = w.CardUI?.Manager?.Controllers?.profileInlineEdit;
            pli?.refreshUsernameUI?.(nextName);
            pli?.loadPendingUsernameBadge?.();
          } catch(_){ }
        }
      }

      var old = (w.localStorage && w.localStorage.getItem('avatar')) || '';
      var next = data.avatar || '';
      if (old !== next && w.localStorage) w.localStorage.setItem('avatar', next);
      var resolveAvatarUrl = d.resolveAvatarUrl || function(u){ return u || ''; };
      var setImageSrc = d.setImageSrc;
      var setImagesSrc = d.setImagesSrc;
      var resolved = resolveAvatarUrl(next);

      // Best-effort update of common avatar UIs
      try {
        var $ = d.$ || function(id){ return document.getElementById(id); };
        var modalPrev = $('avatar-modal-preview');
        if (resolved) setImagesSrc(['sidebar-avatar-preview', 'header-avatar'], resolved);
        setImageSrc(modalPrev, resolved);
      } catch(_){ }
    } catch(_){ }
  }

  ns.userService = { refreshCurrentUserFromServer: refreshCurrentUserFromServer };

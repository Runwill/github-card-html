(function(w){
  const ns = w.TokensPerm = w.TokensPerm || {};

  function handle401(r){
    if (r.status !== 401) return;
    try { console.warn('[permissions/api] 401 未授权（可能登录已过期）'); } catch(_){ }
    try { w.CardUI?.Manager?.Controllers?.session?.handleLogout?.(); } catch(_){ }
  }

  const request = (path, opts)=> w.endpoints.requestJson(path, Object.assign({ auth: 'always', onUnauthorized: handle401 }, opts || {}));

  const jsonGet = path => request(path, { preferJsonMessage: false });

  const jsonPost = (path, body)=> request(path, { method: 'POST', body: body || {} });

  const jsonDelete = path => request(path, { method: 'DELETE' });

  const jsonPatch = (path, body)=> request(path, { method: 'PATCH', body: body || {} });

  ns.API = {
    jsonGet,
    jsonPost,
    jsonDelete,
    jsonPatch,
    isAdmin(){ try { return localStorage.getItem('role') === 'admin'; } catch(_){ return false; } },
    hasToken(){ try { return !!localStorage.getItem('token'); } catch(_){ return false; } },
    setPassword(userId, newPassword){ return jsonPost('/user/password/set', { userId, newPassword }); },
    async fetchUsers(search){
      const q = search ? ('?search=' + encodeURIComponent(search)) : '';
      try {
        const arr = await jsonGet('/users/permissions' + q);
        return Array.isArray(arr) ? arr : [];
      } catch(e){
        try { if (w.t) console.error(w.t('permissions.fetchUsersFailedPrefix'), e); else console.error(e); } catch(_){ }
        return [];
      }
    },
    grant(userId, perm){ return jsonPost('/user/permissions/update', { userId, action: 'grant', permission: perm }); },
    revoke(userId, perm){ return jsonPost('/user/permissions/update', { userId, action: 'revoke', permission: perm }); },
    setRole(userId, role){ return jsonPost('/user/role/set', { userId, role }); },
    async getMasterPermissions(){
      const arr = await jsonGet('/permissions');
      return Array.isArray(arr) ? arr.map(String) : [];
    }
  };
})(window);

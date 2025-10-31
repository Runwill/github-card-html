(function(w){
  const ns = w.TokensPerm = w.TokensPerm || {};

  const endpointsBase = (w.endpoints && endpoints.base ? endpoints.base() : '');
  const API_ROOT = (endpointsBase || '').replace(/\/$/, '') + '/api';

  function authHeader(){ return { 'Authorization': `Bearer ${localStorage.getItem('token')||''}` }; }

  async function jsonGet(path){
    const r = await fetch(`${API_ROOT}${path}`, { headers: authHeader() });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function jsonPost(path, body){
    const r = await fetch(`${API_ROOT}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body||{})
    });
    const out = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error((out && out.message) || `HTTP ${r.status}`);
    return out;
  }

  ns.API = {
    authHeader,
    jsonGet,
    jsonPost,
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

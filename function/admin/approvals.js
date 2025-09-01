// 审核模块：统一管理注册与头像审核（管理员/版主）
(function(){
  const API = 'http://localhost:3000/api';
  const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')||''}` });

  async function jsonGet(path){
    const resp = await fetch(`${API}${path}`, { headers: authHeader() });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }
  async function jsonPost(path, body){
    const resp = await fetch(`${API}${path}`, { method:'POST', headers: { 'Content-Type':'application/json', ...authHeader() }, body: JSON.stringify(body||{}) });
    const out = await resp.json().catch(()=>({}));
    if (!resp.ok) throw new Error(out && out.message || `HTTP ${resp.status}`);
    return out;
  }

  window.fetchPendingUsers = async function(){
    try { const arr = await jsonGet('/pending-users'); return Array.isArray(arr) ? arr : []; } catch(e){ console.error('获取未激活用户失败:', e); return []; }
  };
  window.fetchPendingAvatars = async function(){
    try { const arr = await jsonGet('/avatar/pending'); return Array.isArray(arr) ? arr : []; } catch(e){ console.error('获取待审头像失败:', e); return []; }
  };

  window.handleUserApproval = async function(userId, action){
    try {
      await jsonPost('/approve', { userId, action });
      if (typeof renderApprovals === 'function') await renderApprovals();
      else if (typeof renderPendingUsers === 'function') await renderPendingUsers();
    } catch(e){ alert(e.message || '操作失败'); }
  };
  window.handleAvatarApproval = async function(recordId, action){
    try {
      await jsonPost('/avatar/approve', { recordId, action });
      if (typeof renderApprovals === 'function') await renderApprovals();
      try { window.MenuModalManager && window.MenuModalManager.refreshCurrentUserFromServer && window.MenuModalManager.refreshCurrentUserFromServer(); } catch(_){}
    } catch(e){ alert(e.message || '操作失败'); }
  };

  window.renderPendingUsers = async function(){
    const container = document.getElementById('pending-users-modal-content');
    if (!container) return;
    container.innerHTML = '';
    const users = await fetchPendingUsers();
    if (!users.length) { container.innerHTML = '<p style="text-align:center;color:gray;padding:20px;">空</p>'; return; }
    users.forEach(u => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;margin-bottom:10px;';
      row.innerHTML = `<div style="font-weight:500;color:#2d3748;">注册: ${u.username}</div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn--success btn--sm" onclick="handleUserApproval('${u._id}','approve')">通过</button>
          <button class="btn btn--danger btn--sm" onclick="handleUserApproval('${u._id}','reject')">取消</button>
        </div>`;
      container.appendChild(row);
    });
  };

  window.renderPendingAvatars = async function(){
    const container = document.getElementById('pending-avatars-modal-content');
    if (!container) return;
    container.innerHTML = '';
    const list = await fetchPendingAvatars();
    if (!list.length) { container.innerHTML = '<p style="text-align:center;color:gray;padding:20px;">空</p>'; return; }
    const abs = (u) => /^https?:\/\//.test(u) ? u : `http://localhost:3000${u}`;
    list.forEach(a => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;margin-bottom:10px;';
      row.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
          <img src="${abs(a.url)}" alt="avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;"/>
          <div>
            <div style="font-weight:500;color:#2d3748;">${a.user?.username || a.user}</div>
            <div style="font-size:12px;color:#718096;">${a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn--success btn--sm" onclick="handleAvatarApproval('${a._id}','approve')">通过</button>
          <button class="btn btn--danger btn--sm" onclick="handleAvatarApproval('${a._id}','reject')">拒绝</button>
        </div>`;
      container.appendChild(row);
    });
  };

  window.renderApprovals = async function(){
    const container = document.getElementById('pending-approvals-modal-content');
    if (!container) return;
    container.innerHTML = '';
    try {
      const [users, avatars] = await Promise.all([fetchPendingUsers(), fetchPendingAvatars()]);
      const items = [];
      (users||[]).forEach(u => items.push({ type:'register', id:u._id, createdAt: u.createdAt ? new Date(u.createdAt) : new Date(0), username: u.username }));
      (avatars||[]).forEach(a => items.push({ type:'avatar', id:a._id, createdAt: a.createdAt ? new Date(a.createdAt) : new Date(0), username: (a.user && a.user.username) ? a.user.username : (a.user || ''), url: a.url }));
      items.sort((a,b)=> b.createdAt - a.createdAt);
      if (!items.length) { container.innerHTML = '<p style="text-align:center;color:gray;padding:20px;">空</p>'; return; }
      const abs = (u) => /^https?:\/\//.test(u) ? u : (u ? `http://localhost:3000${u}` : '');
      items.forEach(it => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;margin-bottom:10px;';
        const left = document.createElement('div');
        left.style.cssText = 'display:flex;align-items:center;gap:10px;';
        if (it.type === 'avatar' && it.url) {
          const img = document.createElement('img');
          img.src = abs(it.url);
          img.alt = 'avatar';
          img.style.cssText = 'width:48px;height:48px;border-radius:50%;object-fit:cover;border:1px solid #e2e8f0;';
          left.appendChild(img);
        }
        const text = document.createElement('div');
        text.innerHTML = `<div style="font-weight:600;color:#2d3748;">${it.type === 'register' ? '注册' : '头像'}：${it.username || ''}</div>`+
                         `<div style="font-size:12px;color:#718096;">${it.createdAt.toLocaleString()}</div>`;
        left.appendChild(text);

        const right = document.createElement('div');
        right.style.cssText = 'display:flex; gap:8px;';
        const approveBtn = document.createElement('button');
        approveBtn.className = 'btn btn--success btn--sm';
        approveBtn.textContent = '通过';
        approveBtn.onclick = () => { if (it.type === 'register') handleUserApproval(it.id, 'approve'); else handleAvatarApproval(it.id, 'approve'); };
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn--danger btn--sm';
        rejectBtn.textContent = '拒绝';
        rejectBtn.onclick = () => { if (it.type === 'register') handleUserApproval(it.id, 'reject'); else handleAvatarApproval(it.id, 'reject'); };
        right.appendChild(approveBtn);
        right.appendChild(rejectBtn);

        row.appendChild(left);
        row.appendChild(right);
        container.appendChild(row);
      });
    } catch(e){
      console.error('渲染审核项失败:', e);
      container.innerHTML = '<p style="text-align:center;color:#e53e3e;padding:20px;">加载失败，请重试</p>';
    }
  };
})();

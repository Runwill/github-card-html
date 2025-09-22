// 审核模块：统一管理注册与头像审核（管理员/版主）
(function(){
  const API = (endpoints && endpoints.base ? endpoints.base() : '').replace(/\/$/, '') + '/api';
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
    if (!users.length) { container.innerHTML = '<p class="empty-hint">空</p>'; return; }
    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'approval-row';
      const left = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'approval-title';
      title.textContent = `注册: ${u.username}`;
      left.appendChild(title);
      const right = document.createElement('div');
      right.className = 'approval-right';
      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn btn--success btn--sm';
      approveBtn.textContent = '通过';
      approveBtn.onclick = () => handleUserApproval(u._id, 'approve');
      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn btn--danger btn--sm';
      rejectBtn.textContent = '取消';
      rejectBtn.onclick = () => handleUserApproval(u._id, 'reject');
      right.appendChild(approveBtn);
      right.appendChild(rejectBtn);
      row.appendChild(left);
      row.appendChild(right);
      container.appendChild(row);
    });
  };

  window.renderPendingAvatars = async function(){
    const container = document.getElementById('pending-avatars-modal-content');
    if (!container) return;
    container.innerHTML = '';
    const list = await fetchPendingAvatars();
    if (!list.length) { container.innerHTML = '<p class="empty-hint">空</p>'; return; }
    const abs = (u) => (endpoints && endpoints.abs ? endpoints.abs(u) : (u || ''));
    list.forEach(a => {
      const row = document.createElement('div');
      row.className = 'approval-row';
      const left = document.createElement('div');
      left.className = 'approval-left';
      const img = document.createElement('img');
      img.className = 'approval-img';
      img.src = abs(a.url);
      img.alt = 'avatar';
      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'approval-title';
      title.textContent = a.user?.username || a.user || '';
      const sub = document.createElement('div');
      sub.className = 'approval-sub';
      sub.textContent = a.createdAt ? new Date(a.createdAt).toLocaleString() : '';
      info.appendChild(title);
      info.appendChild(sub);
      left.appendChild(img);
      left.appendChild(info);
      const right = document.createElement('div');
      right.className = 'approval-right';
      const approveBtn = document.createElement('button');
      approveBtn.className = 'btn btn--success btn--sm';
      approveBtn.textContent = '通过';
      approveBtn.onclick = () => handleAvatarApproval(a._id, 'approve');
      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'btn btn--danger btn--sm';
      rejectBtn.textContent = '拒绝';
      rejectBtn.onclick = () => handleAvatarApproval(a._id, 'reject');
      right.appendChild(approveBtn);
      right.appendChild(rejectBtn);
      row.appendChild(left);
      row.appendChild(right);
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
      if (!items.length) { container.innerHTML = '<p class="empty-hint">空</p>'; return; }
      const abs = (u) => (endpoints && endpoints.abs ? endpoints.abs(u) : (u || ''));
      items.forEach(it => {
        const row = document.createElement('div'); row.className = 'approval-row';
        const left = document.createElement('div'); left.className = 'approval-left';
        if (it.type === 'avatar' && it.url) {
          const img = document.createElement('img');
          img.src = abs(it.url); img.alt = 'avatar'; img.className = 'approval-img';
          left.appendChild(img);
        }
        const text = document.createElement('div');
        const t1 = document.createElement('div'); t1.className = 'approval-title'; t1.textContent = `${it.type === 'register' ? '注册' : '头像'}：${it.username || ''}`;
        const t2 = document.createElement('div'); t2.className = 'approval-sub'; t2.textContent = it.createdAt.toLocaleString();
        text.appendChild(t1); text.appendChild(t2);
        left.appendChild(text);

        const right = document.createElement('div'); right.className = 'approval-right';
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
      container.innerHTML = '<p class="empty-hint error">加载失败，请重试</p>';
    }
  };
})();

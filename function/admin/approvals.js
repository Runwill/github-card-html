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

  // 用户名变更：待审列表
  window.fetchPendingUsernames = async function(){
    try { const arr = await jsonGet('/username/pending'); return Array.isArray(arr) ? arr : []; } catch(e){ console.error('获取待审用户名失败:', e); return []; }
  };

  // 简介变更：待审列表
  window.fetchPendingIntros = async function(){
    try { const arr = await jsonGet('/intro/pending'); return Array.isArray(arr) ? arr : []; } catch(e){ console.error('获取待审简介失败:', e); return []; }
  };

  function removeApprovalRowFromTrigger(trigger){
    try {
      const btn = trigger && (trigger.target || trigger);
      const row = btn && btn.closest ? btn.closest('.approval-row') : null;
      const container = document.getElementById('pending-approvals-modal-content');
      if (!row) return;

  // 平滑动画：先固定当前高度，再过渡到 0 高度与透明；保留外边距，避免容器高度“回弹”
      const startHeight = row.offsetHeight;
  row.style.boxSizing = 'border-box';
  row.style.height = startHeight + 'px';
  row.style.overflow = 'hidden';
  row.style.transition = 'height 200ms ease, opacity 200ms ease';
      // 触发回流，确保初始高度生效
      void row.offsetHeight;
      row.style.opacity = '0';
      row.style.height = '0px';
  // 不再强行将 margin/padding 过渡到 0，减少“先缩后长”的错觉

      const finish = () => {
        try { row.remove(); } catch{}
          // 若已无剩余项，展示“空”覆盖层（绝对定位），不影响容器高度
          if (container && !container.querySelector('.approval-row')) {
            container.style.position = 'relative';
            const empty = document.createElement('p');
            empty.className = 'empty-hint empty-overlay';
            Object.assign(empty.style, { position:'absolute', inset:'0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0', opacity:'0', transition:'opacity 180ms ease' });
            empty.textContent = '空';
            container.appendChild(empty);
            requestAnimationFrame(() => { requestAnimationFrame(() => { empty.style.opacity = '1'; }); });
          }
      };
      let done = false;
      const onEnd = () => { if (done) return; done = true; row.removeEventListener('transitionend', onEnd); finish(); };
      row.addEventListener('transitionend', onEnd);
      setTimeout(onEnd, 320); // 兜底
    } catch(_){}
  }

  window.handleUserApproval = async function(userId, action, trigger){
    try {
      // 禁用当前行按钮，避免重复提交
      const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
      row && row.querySelectorAll('button').forEach(b=>b.disabled=true);
      await jsonPost('/approve', { userId, action });
      removeApprovalRowFromTrigger(trigger);
      // 审批通过后，强制刷新权限页的用户列表，以便管理员能立即在权限页看到新用户
      try {
        if (window.TokensPerm) {
          if (window.TokensPerm.refreshUsers) window.TokensPerm.refreshUsers(true);
          if (window.TokensPerm.refreshLogs) window.TokensPerm.refreshLogs();
        }
      } catch(_){ }
    } catch(e){
      alert(e.message || '操作失败');
      const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
      row && row.querySelectorAll('button').forEach(b=>b.disabled=false);
    }
  };
  window.handleAvatarApproval = async function(recordId, action, trigger){
    try {
      const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
      row && row.querySelectorAll('button').forEach(b=>b.disabled=true);
      await jsonPost('/avatar/approve', { recordId, action });
      removeApprovalRowFromTrigger(trigger);
      try { window.MenuModalManager && window.MenuModalManager.refreshCurrentUserFromServer && window.MenuModalManager.refreshCurrentUserFromServer(); } catch(_){ }
      // 自动刷新日志
      try { if (window.TokensPerm && window.TokensPerm.refreshLogs) window.TokensPerm.refreshLogs(); } catch(_){ }
    } catch(e){
      alert(e.message || '操作失败');
      const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
      row && row.querySelectorAll('button').forEach(b=>b.disabled=false);
    }
  };

  // 用户名变更：审批
  window.handleUsernameApproval = async function(recordId, action, trigger){
    try {
      const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
      row && row.querySelectorAll('button').forEach(b=>b.disabled=true);
      await jsonPost('/username/approve', { recordId, action });
      removeApprovalRowFromTrigger(trigger);
      try { window.MenuModalManager && window.MenuModalManager.refreshCurrentUserFromServer && window.MenuModalManager.refreshCurrentUserFromServer(); } catch(_){ }
      // 自动刷新日志
      try { if (window.TokensPerm && window.TokensPerm.refreshLogs) window.TokensPerm.refreshLogs(); } catch(_){ }
    } catch(e){
      alert(e.message || '操作失败');
      const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
      row && row.querySelectorAll('button').forEach(b=>b.disabled=false);
    }
  };

  // 简介变更：审批
  window.handleIntroApproval = async function(recordId, action, trigger){
    try {
      const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
      row && row.querySelectorAll('button').forEach(b=>b.disabled=true);
      await jsonPost('/intro/approve', { recordId, action });
      // 自动刷新日志
      try { if (window.TokensPerm && window.TokensPerm.refreshLogs) window.TokensPerm.refreshLogs(); } catch(_){ }
      removeApprovalRowFromTrigger(trigger);
      try { window.MenuModalManager && window.MenuModalManager.refreshCurrentUserFromServer && window.MenuModalManager.refreshCurrentUserFromServer(); } catch(_){ }
    } catch(e){
      alert(e.message || '操作失败');
      const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
      row && row.querySelectorAll('button').forEach(b=>b.disabled=false);
    }
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
    container.style.position = 'relative';
    try {
  const [users, avatars, usernames, intros] = await Promise.all([fetchPendingUsers(), fetchPendingAvatars(), fetchPendingUsernames(), fetchPendingIntros()]);
      const items = [];
      (users||[]).forEach(u => items.push({ type:'register', id:u._id, createdAt: u.createdAt ? new Date(u.createdAt) : new Date(0), username: u.username }));
      (avatars||[]).forEach(a => items.push({ type:'avatar', id:a._id, createdAt: a.createdAt ? new Date(a.createdAt) : new Date(0), username: (a.user && a.user.username) ? a.user.username : (a.user || ''), url: a.url }));
  (usernames||[]).forEach(rec => items.push({ type:'username', id:rec._id, createdAt: rec.createdAt ? new Date(rec.createdAt) : new Date(0), username: (rec.user && rec.user.username) ? rec.user.username : '', newUsername: rec.newUsername || '' }));
  (intros||[]).forEach(rec => items.push({ type:'intro', id:rec._id, createdAt: rec.createdAt ? new Date(rec.createdAt) : new Date(0), username: (rec.user && rec.user.username) ? rec.user.username : '', newIntro: rec.newIntro || '' }));
      items.sort((a,b)=> b.createdAt - a.createdAt);
        if (!items.length) {
          const empty = document.createElement('p');
          empty.className = 'empty-hint empty-overlay';
          Object.assign(empty.style, { position:'absolute', inset:'0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0', opacity:'1' });
          empty.textContent = '空';
          container.appendChild(empty);
          return;
        }
      // 清理可能存在的空态覆盖
      const existEmpty = container.querySelector('.empty-overlay'); if (existEmpty) existEmpty.remove();
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
        const t1 = document.createElement('div'); t1.className = 'approval-title';
        if (it.type === 'register') t1.textContent = `注册：${it.username || ''}`;
        else if (it.type === 'avatar') t1.textContent = `头像：${it.username || ''}`;
        else if (it.type === 'username') t1.textContent = `用户名：${it.username || ''} → ${it.newUsername || ''}`;
        else if (it.type === 'intro') {
          const preview = (it.newIntro || '').replace(/\s+/g,' ').slice(0, 60);
          t1.textContent = `简介：${it.username || ''} → ${preview}${(it.newIntro && it.newIntro.length>60)?'…':''}`;
        }
        const t2 = document.createElement('div'); t2.className = 'approval-sub'; t2.textContent = it.createdAt.toLocaleString();
        text.appendChild(t1); text.appendChild(t2);
        left.appendChild(text);

        const right = document.createElement('div'); right.className = 'approval-right';
  const approveBtn = document.createElement('button');
        approveBtn.className = 'btn btn--success btn--sm';
        approveBtn.textContent = '通过';
  approveBtn.onclick = (e) => { if (it.type === 'register') handleUserApproval(it.id, 'approve', e.currentTarget); else if (it.type === 'avatar') handleAvatarApproval(it.id, 'approve', e.currentTarget); else if (it.type === 'username') handleUsernameApproval(it.id, 'approve', e.currentTarget); else handleIntroApproval(it.id, 'approve', e.currentTarget); };
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn--danger btn--sm';
        rejectBtn.textContent = '拒绝';
  rejectBtn.onclick = (e) => { if (it.type === 'register') handleUserApproval(it.id, 'reject', e.currentTarget); else if (it.type === 'avatar') handleAvatarApproval(it.id, 'reject', e.currentTarget); else if (it.type === 'username') handleUsernameApproval(it.id, 'reject', e.currentTarget); else handleIntroApproval(it.id, 'reject', e.currentTarget); };
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

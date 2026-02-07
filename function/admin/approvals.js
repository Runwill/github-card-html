// 审核模块：统一管理注册与头像审核（管理员/版主）
(function(){  const API = (endpoints && endpoints.base ? endpoints.base() : '').replace(/\/$/, '') + '/api';
  const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')||''}` });
  const refreshUser = () => { try { const us = window.CardUI && window.CardUI.Manager && window.CardUI.Manager.Core && window.CardUI.Manager.Core.userService; if (us && us.refreshCurrentUserFromServer) us.refreshCurrentUserFromServer(); } catch(_){} };

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

  // ── fetchPending 工厂 ──
  function makeFetchPending(path, label){
    return async function(){ try { const arr = await jsonGet(path); return Array.isArray(arr) ? arr : []; } catch(e){ console.error(label, e); return []; } };
  }
  window.fetchPendingUsers     = makeFetchPending('/pending-users',    '获取未激活用户失败:');
  window.fetchPendingAvatars   = makeFetchPending('/avatar/pending',   '获取待审头像失败:');
  window.fetchPendingUsernames = makeFetchPending('/username/pending', '获取待审用户名失败:');
  window.fetchPendingIntros    = makeFetchPending('/intro/pending',    '获取待审简介失败:');

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

  // ── 通用审批处理 ──
  async function handleApproval(apiPath, body, trigger, postSuccess){
    const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
    try {
      row && row.querySelectorAll('button').forEach(b=>b.disabled=true);
      await jsonPost(apiPath, body);
      removeApprovalRowFromTrigger(trigger);
      if (postSuccess) postSuccess();
      try { if (window.TokensPerm && window.TokensPerm.refreshLogs) window.TokensPerm.refreshLogs(); } catch(_){ }
    } catch(e){
      alert(e.message || '操作失败');
      row && row.querySelectorAll('button').forEach(b=>b.disabled=false);
    }
  }

  window.handleUserApproval = function(userId, action, trigger){
    return handleApproval('/approve', { userId, action }, trigger, () => {
      try { if (window.TokensPerm && window.TokensPerm.refreshUsers) window.TokensPerm.refreshUsers(true); } catch(_){ }
    });
  };
  window.handleAvatarApproval = function(recordId, action, trigger){
    return handleApproval('/avatar/approve', { recordId, action }, trigger, refreshUser);
  };
  window.handleUsernameApproval = function(recordId, action, trigger){
    return handleApproval('/username/approve', { recordId, action }, trigger, refreshUser);
  };
  window.handleIntroApproval = function(recordId, action, trigger){
    return handleApproval('/intro/approve', { recordId, action }, trigger, refreshUser);
  };

  const HANDLER = { register: handleUserApproval, avatar: handleAvatarApproval, username: handleUsernameApproval, intro: handleIntroApproval };

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
        approveBtn.onclick = (e) => HANDLER[it.type](it.id, 'approve', e.currentTarget);
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn--danger btn--sm';
        rejectBtn.textContent = '拒绝';
        rejectBtn.onclick = (e) => HANDLER[it.type](it.id, 'reject', e.currentTarget);
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

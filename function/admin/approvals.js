// 审核模块：统一管理注册与头像审核（管理员/版主）
(function(){
  const refreshUser = () => { try { window.CardUI?.Manager?.Core?.userService?.refreshCurrentUserFromServer?.(); } catch(_){} };

  const jsonGet = path => endpoints.requestJson(path, { auth: 'always', preferJsonMessage: false });
  const jsonPost = (path, body)=> endpoints.requestJson(path, { method:'POST', auth: 'always', body: body || {} });

  const createdAtDate = value => new Date((window.TimeFmt?.parseTimeValue?.(value) ?? Date.parse(value)) || 0);
  const el = window.LogUtils.elem;
  const emptyOverlay = opacity => el('p', { cls:'empty-hint empty-overlay', text:'空', style:{ position:'absolute', inset:'0', display:'flex', alignItems:'center', justifyContent:'center', margin:'0', opacity:String(opacity), transition: opacity ? '' : 'opacity 180ms ease' } });

  // ── fetchPending 工厂 ──
  function makeFetchPending(path, label){
    return async function(){ try { const arr = await jsonGet(path); return Array.isArray(arr) ? arr : []; } catch(e){ console.error(label, e); return []; } };
  }
  const fetchPendingUsers     = makeFetchPending('/pending-users',    '获取未激活用户失败:');
  const fetchPendingAvatars   = makeFetchPending('/avatar/pending',   '获取待审头像失败:');
  const fetchPendingUsernames = makeFetchPending('/username/pending', '获取待审用户名失败:');
  const fetchPendingIntros    = makeFetchPending('/intro/pending',    '获取待审简介失败:');

  let pendingApprovalGroupsCache = null;
  async function fetchPendingApprovalGroups(){
    const [users, avatars, usernames, intros] = await Promise.all([fetchPendingUsers(), fetchPendingAvatars(), fetchPendingUsernames(), fetchPendingIntros()]);
    return { users, avatars, usernames, intros };
  }
  function countPendingApprovalGroups(groups){
    groups = groups || {};
    return ['users', 'avatars', 'usernames', 'intros'].reduce((sum, key) => sum + (Array.isArray(groups[key]) ? groups[key].length : 0), 0);
  }
  function setPendingApprovalGroupsCache(groups){ pendingApprovalGroupsCache = groups || null; }

  function removeApprovalRowFromTrigger(trigger){
    try {
      const btn = trigger && (trigger.target || trigger);
      const row = btn && btn.closest ? btn.closest('.approval-row') : null;
      const container = document.getElementById('pending-approvals-modal-content');
      if (!row) return;

  // 平滑动画：先固定当前高度，再过渡到 0 高度与透明；保留外边距，避免容器高度“回弹”
      const startHeight = row.offsetHeight;
        Object.assign(row.style, { boxSizing:'border-box', height:startHeight + 'px', overflow:'hidden', transition:'height 200ms ease, opacity 200ms ease' });
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
            const empty = emptyOverlay(0);
            container.appendChild(empty);
            requestAnimationFrame(() => { requestAnimationFrame(() => { empty.style.opacity = '1'; }); });
          }
      };
      window.CollapsibleAnim.onTransitionEnd(row, finish, 320);
    } catch(_){}
  }

  // ── 通用审批处理 ──
  const setRowButtonsDisabled = (row, disabled)=> row?.querySelectorAll('button').forEach(button => { button.disabled = disabled; });

  async function handleApproval(apiPath, body, trigger, postSuccess){
    const row = trigger && trigger.closest ? trigger.closest('.approval-row') : null;
    try {
      setRowButtonsDisabled(row, true);
      await jsonPost(apiPath, body);
      removeApprovalRowFromTrigger(trigger);
      if (postSuccess) postSuccess();
      try { window.TokensPerm?.refreshLogs?.(); } catch(_){ }
    } catch(e){
      alert(e.message || '操作失败');
      setRowButtonsDisabled(row, false);
    }
  }

  const refreshPermissionUsers = () => { try { window.TokensPerm?.refreshUsers?.(true); } catch(_){ } };
  const makeApprovalHandler = (apiPath, idKey, postSuccess)=> (recordId, action, trigger)=> handleApproval(apiPath, { [idKey]: recordId, action }, trigger, postSuccess);
  const HANDLER = { register: makeApprovalHandler('/approve', 'userId', refreshPermissionUsers), avatar: makeApprovalHandler('/avatar/approve', 'recordId', refreshUser), username: makeApprovalHandler('/username/approve', 'recordId', refreshUser), intro: makeApprovalHandler('/intro/approve', 'recordId', refreshUser) };

  async function renderApprovals(){
    const container = document.getElementById('pending-approvals-modal-content');
    if (!container) return;
    container.innerHTML = '';
    container.style.position = 'relative';
    try {
      const cachedGroups = pendingApprovalGroupsCache;
      pendingApprovalGroupsCache = null;
      const groups = cachedGroups || await fetchPendingApprovalGroups();
      const { users, avatars, usernames, intros } = groups;
      const items = [];
      (users||[]).forEach(u => items.push({ type:'register', id:u._id, createdAt: createdAtDate(u.createdAt), username: u.username }));
      (avatars||[]).forEach(a => items.push({ type:'avatar', id:a._id, createdAt: createdAtDate(a.createdAt), username: (a.user && a.user.username) ? a.user.username : (a.user || ''), url: a.url }));
      (usernames||[]).forEach(rec => items.push({ type:'username', id:rec._id, createdAt: createdAtDate(rec.createdAt), username: (rec.user && rec.user.username) ? rec.user.username : '', newUsername: rec.newUsername || '' }));
      (intros||[]).forEach(rec => items.push({ type:'intro', id:rec._id, createdAt: createdAtDate(rec.createdAt), username: (rec.user && rec.user.username) ? rec.user.username : '', newIntro: rec.newIntro || '' }));
      items.sort((a,b)=> b.createdAt - a.createdAt);
        if (!items.length) {
          container.appendChild(emptyOverlay(1));
          return;
        }
      // 清理可能存在的空态覆盖
      const existEmpty = container.querySelector('.empty-overlay'); if (existEmpty) existEmpty.remove();
      const abs = (u) => (endpoints && endpoints.abs ? endpoints.abs(u) : (u || ''));
      items.forEach(it => {
        let titleText;
        if (it.type === 'register') titleText = `注册：${it.username || ''}`;
        else if (it.type === 'avatar') titleText = `头像：${it.username || ''}`;
        else if (it.type === 'username') titleText = `用户名：${it.username || ''} → ${it.newUsername || ''}`;
        else { const p = (it.newIntro || '').replace(/\s+/g,' ').slice(0,60); titleText = `简介：${it.username || ''} → ${p}${(it.newIntro&&it.newIntro.length>60)?'…':''}`;}

        const left = el('div', { cls:'approval-left' }, [
          it.type === 'avatar' && it.url
            ? el('img', { src: abs(it.url), alt: 'avatar', cls: 'approval-img' })
            : null,
          el('div', null, [
            el('div', { cls: 'approval-title', text: titleText }),
            el('div', { cls: 'approval-sub',   text: it.createdAt.toLocaleString() })
          ])
        ]);
        const right = el('div', { cls:'approval-right' }, [
          el('button', { cls: 'btn btn--success btn--lift btn--sm', text: '通过',
            onclick: (e) => HANDLER[it.type](it.id, 'approve', e.currentTarget) }),
          el('button', { cls: 'btn btn--danger btn--lift btn--sm',  text: '拒绝',
            onclick: (e) => HANDLER[it.type](it.id, 'reject', e.currentTarget) })
        ]);
        container.appendChild(el('div', { cls:'approval-row' }, [left, right]));
      });
    } catch(e){
      console.error('渲染审核项失败:', e);
      container.innerHTML = '<p class="empty-hint error">加载失败，请重试</p>';
    }
  }

  Object.assign(window, {
    fetchPendingApprovalGroups, countPendingApprovalGroups, setPendingApprovalGroupsCache,
    renderApprovals
  });
})();

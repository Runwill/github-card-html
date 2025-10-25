// 账户信息弹窗渲染与角色/权限徽章展示控制器。
(function(){
  'use strict';
  const root = (window.CardUI = window.CardUI || {});
  const M = (root.Manager = root.Manager || {});
  const Core = (M.Core = M.Core || {});
  const Ctrls = (M.Controllers = M.Controllers || {});

  const dom = Core.dom || {};
  const $ = dom.$ || ((id)=>document.getElementById(id));
  const qs = dom.qs || ((s)=>document.querySelector(s));
  const resolveAvatarUrl = dom.resolveAvatarUrl || (u=>u||'');

  const t = (typeof window.t === 'function') ? window.t : (k)=>k;

  function openAccountInfo(){
    try {
      const name = localStorage.getItem('username') || '';
      const id = localStorage.getItem('id') || '';
      const avatar = localStorage.getItem('avatar') || '';
      const intro = localStorage.getItem('intro') || '';
      const resolvedAvatar = resolveAvatarUrl(avatar);
      const role = (localStorage.getItem('role') || '').toLowerCase();
      const roleClsMap = { admin: 'badge-admin', moderator: 'badge-moderator', user: 'badge-user', guest: 'badge-guest' };
      const roleCls = roleClsMap[role] || 'badge-user';
      const nameMainEl = $('account-info-username-main'); const nameTextEl = $('account-info-username-text'); const roleEl = $('account-info-role'); const idEl = $('account-info-id'); const introEl = $('account-info-intro'); const avatarEl = $('account-info-avatar');
      if (nameMainEl) nameMainEl.textContent = name; if (nameTextEl) nameTextEl.textContent = name; if (idEl) idEl.textContent = id;
      if (introEl) {
        const ph = t('account.info.placeholder.intro');
        if (introEl.tagName === 'TEXTAREA') introEl.value = intro || '';
        else introEl.textContent = intro || ph;
      }
      if (avatarEl) { if (resolvedAvatar) { avatarEl.src = resolvedAvatar; avatarEl.style.display = 'inline-block'; } else { try { avatarEl.removeAttribute('src'); } catch {} avatarEl.style.display = 'none'; } }
      if (roleEl) {
        const roleText = t('role.'+role);
        roleEl.textContent = roleText;
        roleEl.className = 'badge ' + roleCls;
      }
      // 权限徽标（每个权限一个徽标，不合并）
      try {
        const permRaw = localStorage.getItem('permissions');
        const perms = permRaw ? JSON.parse(permRaw) : [];
        const container = roleEl && roleEl.parentElement;
        if (container) Array.from(container.querySelectorAll('.badge-permission')).forEach(n => n.remove());
        if (container && Array.isArray(perms) && perms.length) {
          const PERM_DESC = {
            '仪同三司': t('perm.tooltip.仪同三司'),
            '赞拜不名': t('perm.tooltip.赞拜不名')
          };
          perms.forEach(raw => {
            const p = String(raw);
            const badge = document.createElement('span');
            badge.className = 'badge badge-permission';
            badge.textContent = p;
            const tipPrefix = t('perm.tooltip.prefix', { name: p });
            const tip = PERM_DESC[p] || tipPrefix;
            try { badge.setAttribute('data-tooltip', tip); } catch { badge.title = tip; }
            container.appendChild(badge);
          });
        }
      } catch {}
      const msg = $('account-info-message'); if (msg) { msg.textContent = ''; msg.className = 'modal-message'; msg.classList.remove('msg-flash'); }
      // 绑定/刷新内联编辑
      try {
        const pli = Ctrls.profileInlineEdit;
        if (pli) {
          if (!window.__bindUsernameInlineEditOnce) { window.__bindUsernameInlineEditOnce = true; pli.setupUsernameInlineEdit && pli.setupUsernameInlineEdit(); }
          pli.loadPendingUsernameBadge && pli.loadPendingUsernameBadge();
          if (!window.__bindIntroInlineEditOnce) { window.__bindIntroInlineEditOnce = true; pli.setupIntroInlineEdit && pli.setupIntroInlineEdit(); }
          pli.loadPendingIntroBadge && pli.loadPendingIntroBadge();
        }
      } catch {}
    } catch {}
    // 打开弹窗
    try { const modal = Ctrls.modal; if (modal && modal.showModal) modal.showModal('account-info-modal'); } catch {}
  }

  Ctrls.accountInfo = { openAccountInfo };
})();

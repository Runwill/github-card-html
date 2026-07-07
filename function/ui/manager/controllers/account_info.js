// 账户信息弹窗渲染与角色/权限徽章展示控制器。
import { formatAbsOrRaw } from '../../../admin/time_fmt.js?v=202607072241';

  'use strict';
  const Core = window.CardUI.Manager.Core;
  const Ctrls = window.CardUI.Manager.Controllers;
  const dom = Core.dom;
  const $ = dom.$;
  const resolveAvatarUrl = dom.resolveAvatarUrl;
  const setImageSrc = dom.setImageSrc;

  const localValue = key => window.endpoints?.storageGet?.(key) || '';
  const ROLE_CLS_MAP = { admin: 'badge-admin', moderator: 'badge-moderator', user: 'badge-user', guest: 'badge-guest' };

  function setTextById(id, text){ const el = $(id); if (el) el.textContent = text; return el; }

  function openAccountInfo(){
    try {
      const name = localValue('username');
      const id = localValue('id');
      const avatar = localValue('avatar');
      const intro = localValue('intro');
      const resolvedAvatar = resolveAvatarUrl(avatar);
      const role = localValue('role').toLowerCase();
      const nameTextEl = setTextById('account-info-username-text', name);
      const roleEl = $('account-info-role'); const introEl = $('account-info-intro'); const avatarEl = $('account-info-avatar');
      setTextById('account-info-username-main', name); setTextById('account-info-id', id);
      const nameRow = nameTextEl && nameTextEl.closest('.info-row');
      if (nameRow && !nameRow.__copyBound) {
        nameRow.__copyBound = true;
        nameRow.style.cursor = 'pointer';
        nameRow.addEventListener('click', function() {
          const text = nameTextEl.textContent || '';
          if (text) navigator.clipboard.writeText(text).then(function() { if (window.showToast) window.showToast(window.t('common.copied')); }).catch(function() {});
        });
      }
      const createdAtEl = $('account-info-createdAt'), ca = localValue('createdAt');
      if (createdAtEl && ca) createdAtEl.textContent = formatAbsOrRaw(ca);
      else if (createdAtEl) { createdAtEl.textContent = '-'; Core.userService?.refreshCurrentUserFromServer?.()?.then(()=>{ const next = localValue('createdAt'); if (next) createdAtEl.textContent = formatAbsOrRaw(next); }); }
      if (introEl) {
        const ph = window.t('account.info.placeholder.intro');
        if (introEl.tagName === 'TEXTAREA') introEl.value = intro || '';
        else introEl.textContent = intro || ph;
      }
      if (avatarEl) setImageSrc(avatarEl, resolvedAvatar);
      if (roleEl) {
        const roleText = window.t('role.'+role);
        roleEl.textContent = roleText;
        roleEl.className = 'badge ' + (ROLE_CLS_MAP[role] || 'badge-user');
      }
      // 权限徽标（每个权限一个徽标，不合并）
      try {
        const badgeContainer = roleEl && roleEl.parentElement;
        if (badgeContainer) {
          Array.from(badgeContainer.querySelectorAll('.badge-permission')).forEach(n => n.remove());
          const permRaw = localValue('permissions');
          const perms = permRaw ? JSON.parse(permRaw) : [];
          if (Array.isArray(perms)) perms.forEach(raw => {
            const p = String(raw);
            const badge = document.createElement('span');
            badge.className = 'badge badge-permission';
            badge.textContent = p;
            badgeContainer.appendChild(badge);
          });
        }
      } catch {}
      const msg = $('account-info-message'); if (msg) { msg.textContent = ''; msg.className = 'modal-message'; msg.classList.remove('msg-flash'); }
      // 绑定/刷新内联编辑
      try {
        const pli = Ctrls.profileInlineEdit;
        if (pli) {
          pli.setupUsernameInlineEdit && pli.setupUsernameInlineEdit();
          pli.loadPendingUsernameBadge && pli.loadPendingUsernameBadge();
          pli.setupIntroInlineEdit && pli.setupIntroInlineEdit();
          pli.loadPendingIntroBadge && pli.loadPendingIntroBadge();
        }
      } catch {}
    } catch {}
    // 打开弹窗
    Ctrls.overlay.open('account-info-modal');
  }

  Ctrls.accountInfo = { openAccountInfo };

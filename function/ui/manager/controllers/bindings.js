// 全局事件绑定与界面交互初始化（菜单、遮罩、模态、角色可见性等）。
(function(){
  'use strict';
  const Core = window.CardUI.Manager.Core;
  const C = window.CardUI.Manager.Controllers;
  const dom = Core.dom || {};
  const $ = dom.$ || ((id)=>document.getElementById(id));
  const qs = dom.qs || ((s)=>document.querySelector(s));
  const resolveAvatarUrl = dom.resolveAvatarUrl || (u=>u||'');
  const userService = Core.userService || {};

  function init(){
    const OV = C.overlay; // 统一覆盖层系统

    // ── 全局交互 ──

    // 背景点击：返回上一级
    $('modal-backdrop')?.addEventListener('click', () => OV?.back?.());

    // ESC：关闭所有
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && OV?.isAnyOpen?.()) {
        e.preventDefault();
        OV.closeAll();
      }
    });

    // 所有面板和弹窗阻止点击穿透
    (OV?.panelIds || []).forEach(id => $(id)?.addEventListener('click', (e) => e.stopPropagation()));

    // ── 侧边栏主菜单 ──
    $('menu-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (OV?.isAnyOpen?.()) OV.closeAll(); else OV?.open?.('sidebar-menu');
    });
    $('header-avatar')?.addEventListener('click', (e) => { e.stopPropagation(); OV?.open?.('sidebar-menu'); });

    // ── 菜单导航按钮 ──
    $('open-account-menu-button')?.addEventListener('click', () => OV?.open?.('account-menu'));
    $('account-menu-back')?.addEventListener('click', () => OV?.back?.());
    $('settings-button')?.addEventListener('click', () => OV?.open?.('settings-menu'));
    $('settings-menu-back')?.addEventListener('click', () => OV?.back?.());

    // ── 弹窗打开按钮 ──
    $('update-account-button')?.addEventListener('click', () => OV?.open?.('update-account-modal'));
    $('account-info-button')?.addEventListener('click', () => C.accountInfo?.openAccountInfo?.());
    $('approve-request-button')?.addEventListener('click', () => C.approvals?.onApproveClick?.());
    $('announcements-button')?.addEventListener('click', () => {
      try { window.loadAnnouncements?.(); } catch(_){}
      OV?.open?.('announcements-modal');
    });
    $('logout-button')?.addEventListener('click', () => C.session?.handleLogout?.());

    // ── 头像弹窗 ──
    const fileInput = $('upload-avatar-input');
    $('avatar-modal-upload')?.addEventListener('click', () => fileInput?.click());
    $('avatar-modal-close')?.addEventListener('click', () => OV?.back?.());
    fileInput?.addEventListener('change', (e) => C.avatar?.openAvatarCropper?.(e));
    $('upload-avatar-button')?.addEventListener('click', async () => {
      try { await userService?.refreshCurrentUserFromServer?.(); } catch {}
      const preview = $('avatar-modal-preview');
      const resolved = resolveAvatarUrl(localStorage.getItem('avatar'));
      if (preview) {
        if (resolved) { preview.src = resolved; preview.style.display = 'inline-block'; }
        else { try { preview.removeAttribute('src'); } catch {} preview.style.display = 'none'; }
      }
      C.avatar?.loadPendingAvatarPreview?.();
      OV?.open?.('avatar-modal');
    });

    // ── 初始化头像显示 ──
    const resolved = resolveAvatarUrl(localStorage.getItem('avatar'));
    const sidebarPrev = $('sidebar-avatar-preview'); if (sidebarPrev && resolved) { sidebarPrev.src = resolved; sidebarPrev.style.display = 'inline-block'; }
    const headerAvatar = $('header-avatar'); if (headerAvatar && resolved) { headerAvatar.src = resolved; headerAvatar.style.display = 'inline-block'; }

    // ── 角色权限可见性 ──
    const role = localStorage.getItem('role');
    if (C.approvals && typeof C.approvals.updateVisibilityByRole === 'function') {
      C.approvals.updateVisibilityByRole(role);
    }

    // ── 表单 ──
    $('updateForm')?.addEventListener('submit', (e) => C.accountUpdateForm?.handleUpdateFormSubmit?.(e));
  }

  C.bindings = { init };
})();

// 全局事件绑定与界面交互初始化（菜单、遮罩、模态、角色可见性等）。
(function(){
  'use strict';
  const Core = window.CardUI.Manager.Core;
  const C = window.CardUI.Manager.Controllers;
  const dom = Core.dom;
  const $ = dom.$;
  const resolveAvatarUrl = dom.resolveAvatarUrl;
  const setImageSrc = dom.setImageSrc;
  const userService = Core.userService;

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
    [['open-account-menu-button', 'account-menu'], ['settings-button', 'settings-menu'], ['update-account-button', 'update-account-modal']]
      .forEach(([id, panelId]) => $(id)?.addEventListener('click', () => OV?.open?.(panelId)));
    ['account-menu-back', 'settings-menu-back', 'avatar-modal-close']
      .forEach(id => $(id)?.addEventListener('click', () => OV?.back?.()));
    $('help-button')?.addEventListener('click', () => window.openHelpPanel?.());

    // ── 弹窗打开按钮 ──
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
    fileInput?.addEventListener('change', (e) => C.avatar?.openAvatarCropper?.(e));
    $('upload-avatar-button')?.addEventListener('click', async () => {
      try { await userService?.refreshCurrentUserFromServer?.(); } catch {}
      const preview = $('avatar-modal-preview');
      const resolved = resolveAvatarUrl(localStorage.getItem('avatar'));
      setImageSrc(preview, resolved);
      C.avatar?.loadPendingAvatarPreview?.();
      OV?.open?.('avatar-modal');
    });

    // ── 初始化头像显示 ──
    const resolved = resolveAvatarUrl(localStorage.getItem('avatar'));
    if (resolved) { setImageSrc($('sidebar-avatar-preview'), resolved); setImageSrc($('header-avatar'), resolved); }

    // ── 角色权限可见性 ──
    const role = localStorage.getItem('role');
    if (C.approvals && typeof C.approvals.updateVisibilityByRole === 'function') {
      C.approvals.updateVisibilityByRole(role);
    }

    // ── 视口尺寸显示 ──
    const vpDisplay = $('viewport-size-display');
    if (vpDisplay) {
      const updateVP = () => {
        vpDisplay.textContent = window.innerWidth + ' × ' + window.innerHeight;
      };
      updateVP();
      window.addEventListener('resize', updateVP);
    }

    // ── 表单 ──
    $('updateForm')?.addEventListener('submit', (e) => C.accountUpdateForm?.handleUpdateFormSubmit?.(e));
  }

  C.bindings = { init };
})();

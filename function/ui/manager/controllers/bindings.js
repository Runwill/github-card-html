// 全局事件绑定与界面交互初始化（菜单、遮罩、模态、角色可见性等）。
(function(){
  'use strict';
  const Core = window.CardUI.Manager.Core;
  const C = window.CardUI.Manager.Controllers;
  const dom = Core.dom;
  const $ = dom.$;
  const resolveAvatarUrl = dom.resolveAvatarUrl;
  const setImageSrc = dom.setImageSrc;
  const setImagesSrc = dom.setImagesSrc;
  const userService = Core.userService;

  function init(){
    const OV = C.overlay; // 统一覆盖层系统
    const bindClick = (id, handler) => $(id)?.addEventListener('click', handler);
    const storedAvatarUrl = () => resolveAvatarUrl(localStorage.getItem('avatar'));

    // ── 全局交互 ──

    // 背景点击：返回上一级
    bindClick('modal-backdrop', () => OV?.back?.());

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
    bindClick('menu-toggle', (e) => {
      e.stopPropagation();
      if (OV?.isAnyOpen?.()) OV.closeAll(); else OV?.open?.('sidebar-menu');
    });
    bindClick('header-avatar', (e) => { e.stopPropagation(); OV?.open?.('sidebar-menu'); });

    // ── 菜单导航按钮 ──
    [['open-account-menu-button', 'account-menu'], ['settings-button', 'settings-menu'], ['update-account-button', 'update-account-modal']]
      .forEach(([id, panelId]) => bindClick(id, () => OV?.open?.(panelId)));
    ['account-menu-back', 'settings-menu-back', 'avatar-modal-close']
      .forEach(id => bindClick(id, () => OV?.back?.()));
    bindClick('help-button', () => window.openHelpPanel?.());

    // ── 弹窗打开按钮 ──
    bindClick('account-info-button', () => C.accountInfo?.openAccountInfo?.());
    bindClick('approve-request-button', () => C.approvals?.onApproveClick?.());
    bindClick('announcements-button', () => {
      OV?.open?.('announcements-modal');
      requestAnimationFrame(() => { try { window.loadAnnouncements?.({ afterOpen: true }); } catch(_){} });
    });
    bindClick('logout-button', () => C.session?.handleLogout?.());

    // ── 头像弹窗 ──
    const fileInput = $('upload-avatar-input');
    bindClick('avatar-modal-upload', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => C.avatar?.openAvatarCropper?.(e));
    bindClick('upload-avatar-button', async () => {
      try { await userService?.refreshCurrentUserFromServer?.(); } catch {}
      const preview = $('avatar-modal-preview');
      const resolved = storedAvatarUrl();
      setImageSrc(preview, resolved);
      C.avatar?.loadPendingAvatarPreview?.();
      OV?.open?.('avatar-modal');
    });

    // ── 初始化头像显示 ──
    const resolved = storedAvatarUrl();
    if (resolved) setImagesSrc(['sidebar-avatar-preview', 'header-avatar'], resolved);

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

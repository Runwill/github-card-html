// 全局事件绑定与界面交互初始化（菜单、遮罩、模态、角色可见性等）。
(function(){
  'use strict';
  const root = (window.CardUI = window.CardUI || {});
  const M = (root.Manager = root.Manager || {});
  const Core = (M.Core = M.Core || {});
  const C = (M.Controllers = M.Controllers || {});

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
    ['sidebar-menu','account-menu','settings-menu',
     'update-account-modal','approve-user-modal','avatar-modal','avatar-crop-modal',
     'account-info-modal','announcements-modal','key-settings-modal','game-settings-modal'
    ].forEach(id => $(id)?.addEventListener('click', (e) => e.stopPropagation()));

    // ── 侧边栏主菜单 ──
    $('menu-toggle')?.addEventListener('click', (e) => { e.stopPropagation(); C.sidebar?.toggleSidebar?.(); });
    $('header-avatar')?.addEventListener('click', (e) => { e.stopPropagation(); C.sidebar?.showSidebar?.(); });

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
    } else {
      const approveBtn = $('approve-request-button'); if (approveBtn) approveBtn.style.display = (role === 'admin' || role === 'moderator') ? '' : 'none';
      const permBtn = $('permissions-manage-button');
      if (permBtn) {
        permBtn.style.display = (role === 'admin') ? '' : 'none';
        permBtn.addEventListener('click', () => {
          OV?.closeAll?.();
          try {
            const a = document.querySelector('#example-tabs a[href="#panel_permissions"]');
            if (a) a.click();
            if (typeof window.renderPermissionsPanel === 'function') window.renderPermissionsPanel('');
          } catch {}
        });
      }
      const tokensTab = qs('a[href="#panel_tokens"]')?.parentElement; const tokensPanel = $('panel_tokens');
      const canViewTokens = (role === 'admin' || role === 'moderator');
      if (!canViewTokens) { if (tokensTab) tokensTab.style.display = 'none'; if (tokensPanel) tokensPanel.style.display = 'none'; }
      else { if (tokensTab) tokensTab.style.display = ''; if (tokensPanel) tokensPanel.style.display = ''; }
      const permTabEl = qs('a[href="#panel_permissions"]')?.parentElement; const permPanelEl = $('panel_permissions');
      const canViewPerms = (role === 'admin');
      if (!canViewPerms) { if (permTabEl) permTabEl.style.display = 'none'; if (permPanelEl) permPanelEl.style.display = 'none'; }
      else { if (permTabEl) permTabEl.style.display = ''; if (permPanelEl) permPanelEl.style.display = ''; }
    }

    // ── 表单 ──
    $('updateForm')?.addEventListener('submit', (e) => C.accountUpdateForm?.handleUpdateFormSubmit?.(e));
  }

  C.bindings = { init };
})();

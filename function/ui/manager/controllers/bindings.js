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
  const api = dom.api || (u=>u);
  const resolveAvatarUrl = dom.resolveAvatarUrl || (u=>u||'');
  const messages = Core.messages || {};
  const toast = messages.toast || (m=>{ try{ alert(m); }catch{} });
  const t = (typeof window.t==='function') ? window.t : (k)=>k;

  function init(){
    // Menu & overlays
  $('menu-toggle')?.addEventListener('click', (e) => { e.stopPropagation(); C.sidebar?.toggleSidebar?.(); });
  $('sidebar-backdrop')?.addEventListener('click', () => { C.accountMenu?.hideAccountMenu?.(); C.sidebar?.hideSidebar?.(); });
    $('modal-backdrop')?.addEventListener('click', () => {
      const st = (Core.state && Core.state.get && Core.state.get()) || {};
      if (st.currentModal && st.returnToAccountMenuOnClose) {
        C.modal?.hideModal?.(st.currentModal); C.accountMenu?.showAccountMenu?.(); Core.state?.set?.({ returnToAccountMenuOnClose: false });
      } else { C.modal?.hideAllModals?.(); }
    });
    $('sidebar-menu')?.addEventListener('click', (e) => e.stopPropagation());
    $('account-menu')?.addEventListener('click', (e) => e.stopPropagation());
    ;['update-account-modal','approve-user-modal','avatar-modal','avatar-crop-modal','account-info-modal'].forEach(id => $(id)?.addEventListener('click', (e)=>e.stopPropagation()));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const st = (Core.state && Core.state.get && Core.state.get()) || {};
        if (st.currentModal) {
          if (st.returnToAccountMenuOnClose) { const cur = st.currentModal; C.modal?.hideModal?.(cur); C.accountMenu?.showAccountMenu?.(); Core.state?.set?.({ returnToAccountMenuOnClose: false }); }
          else { C.modal?.hideAllModals?.(); }
        } else { C.accountMenu?.hideAccountMenu?.(); C.sidebar?.hideSidebar?.(); }
      }
    });

    // Menu actions
    $('open-account-menu-button')?.addEventListener('click', () => C.accountMenu?.showAccountMenu?.());
    $('account-menu-back')?.addEventListener('click', () => { C.accountMenu?.hideAccountMenu?.(); C.sidebar?.showSidebar?.(); });
    $('update-account-button')?.addEventListener('click', () => C.modal?.showModal?.('update-account-modal'));
    $('account-info-button')?.addEventListener('click', () => C.accountInfo?.openAccountInfo?.());

    $('approve-request-button')?.addEventListener('click', () => C.approvals?.onApproveClick?.());
  $('logout-button')?.addEventListener('click', () => C.session?.handleLogout?.());

    const fileInput = $('upload-avatar-input');
    $('avatar-modal-upload')?.addEventListener('click', ()=> fileInput?.click());
    $('avatar-modal-close')?.addEventListener('click', () => C.modal?.hideModal?.('avatar-modal'));
    fileInput?.addEventListener('change', (e) => C.avatar?.openAvatarCropper?.(e));
    $('upload-avatar-button')?.addEventListener('click', async () => {
      try { await Core.userService?.refreshCurrentUserFromServer?.(); } catch {}
      const preview = $('avatar-modal-preview');
      const resolved = resolveAvatarUrl(localStorage.getItem('avatar'));
      if (preview) {
        if (resolved) { preview.src = resolved; preview.style.display = 'inline-block'; }
        else { try { preview.removeAttribute('src'); } catch {} preview.style.display = 'none'; }
      }
      C.avatar?.loadPendingAvatarPreview?.();
      C.modal?.showModal?.('avatar-modal');
    });

    $('header-avatar')?.addEventListener('click', (e)=>{ e.stopPropagation(); C.sidebar?.showSidebar?.(); });

    const resolved = resolveAvatarUrl(localStorage.getItem('avatar'));
    const sidebarPrev = $('sidebar-avatar-preview'); if (sidebarPrev && resolved) { sidebarPrev.src = resolved; sidebarPrev.style.display = 'inline-block'; }
    const headerAvatar = $('header-avatar'); if (headerAvatar && resolved) { headerAvatar.src = resolved; headerAvatar.style.display = 'inline-block'; }

    // Role-based visibility
    const role = localStorage.getItem('role');
    if (C.approvals && typeof C.approvals.updateVisibilityByRole === 'function') {
      C.approvals.updateVisibilityByRole(role);
    } else {
      const approveBtn = $('approve-request-button'); if (approveBtn) approveBtn.style.display = (role === 'admin' || role === 'moderator') ? '' : 'none';
      const permBtn = $('permissions-manage-button');
      if (permBtn) {
        permBtn.style.display = (role === 'admin') ? '' : 'none';
        permBtn.addEventListener('click', () => {
          C.accountMenu?.hideAccountMenu?.(); C.sidebar?.hideSidebar?.(); C.modal?.hideAllModals?.();
          try {
            const a = document.querySelector('#example-tabs a[href="#panel_permissions"]');
            if (a) { a.click(); }
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

    // Forms
    $('updateForm')?.addEventListener('submit', (e) => C.accountUpdateForm?.handleUpdateFormSubmit?.(e));
  }

  C.bindings = { init };
})();

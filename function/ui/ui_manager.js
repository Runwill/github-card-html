// Fully rebuilt UIManager in an IIFE to avoid global scope leaks
(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);
  const qs = (s) => document.querySelector(s);
  const abs = (u) => (window.endpoints && window.endpoints.abs ? window.endpoints.abs(u) : u);
  const api = (u) => (window.endpoints && window.endpoints.api ? window.endpoints.api(u) : u);

  const UIManager = {
    state: { sidebarVisible: false, accountMenuVisible: false, currentModal: null, returnToAccountMenuOnClose: false },

    init() {
      this.bindEvents();
      this.bindMenuActions();
      this.bindFormEvents();
      this.refreshCurrentUserFromServer();
    },

    async parseErrorResponse(resp) {
      try { const data = await resp.clone().json(); return { message: (data && data.message) || '', data }; }
      catch(_) { try { const text = await resp.clone().text(); return { message: (text && text.length < 200 ? text : '服务器返回非 JSON 响应'), data: null }; } catch { return { message: '无法解析服务器响应', data: null }; } }
    },

    resolveAvatarUrl(u) { if (!u) return ''; if (/^https?:\/\//i.test(u)) return u; if (u.startsWith('/')) return abs(u); return u; },
    show(el, display){ if (el) el.style.display = display == null ? 'block' : display; },
    hide(el){ if (el) el.style.display = 'none'; },

    bindEvents() {
      $('menu-toggle')?.addEventListener('click', (e) => { e.stopPropagation(); this.toggleSidebar(); });
      $('sidebar-backdrop')?.addEventListener('click', () => { this.hideAccountMenu(); this.hideSidebar(); });
      $('modal-backdrop')?.addEventListener('click', () => {
        if (this.state.currentModal && this.state.returnToAccountMenuOnClose) {
          const cur = this.state.currentModal; this.hideModal(cur); this.showAccountMenu(); this.state.returnToAccountMenuOnClose = false;
        } else { this.hideAllModals(); }
      });
      $('sidebar-menu')?.addEventListener('click', (e) => e.stopPropagation());
      $('account-menu')?.addEventListener('click', (e) => e.stopPropagation());
      ;['update-account-modal','approve-user-modal','avatar-modal','avatar-crop-modal','account-info-modal'].forEach(id => $(id)?.addEventListener('click', (e)=>e.stopPropagation()));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (this.state.currentModal) {
            if (this.state.returnToAccountMenuOnClose) { const cur = this.state.currentModal; this.hideModal(cur); this.showAccountMenu(); this.state.returnToAccountMenuOnClose = false; }
            else { this.hideAllModals(); }
          } else { this.hideAccountMenu(); this.hideSidebar(); }
        }
      });
    },

    bindMenuActions() {
      $('open-account-menu-button')?.addEventListener('click', () => this.showAccountMenu());
      $('account-menu-back')?.addEventListener('click', () => { this.hideAccountMenu(); this.showSidebar(); });
      $('update-account-button')?.addEventListener('click', () => this.showModal('update-account-modal'));
      $('account-info-button')?.addEventListener('click', () => this.openAccountInfo());
      $('approve-request-button')?.addEventListener('click', () => this.showModal('approve-user-modal'));
      $('logout-button')?.addEventListener('click', () => this.handleLogout());

      const fileInput = $('upload-avatar-input');
      $('avatar-modal-upload')?.addEventListener('click', ()=> fileInput?.click());
      $('avatar-modal-close')?.addEventListener('click', () => this.hideModal('avatar-modal'));
      fileInput?.addEventListener('change', (e) => this.openAvatarCropper(e));
      $('upload-avatar-button')?.addEventListener('click', async () => {
        await this.refreshCurrentUserFromServer();
        const preview = $('avatar-modal-preview');
        const resolved = this.resolveAvatarUrl(localStorage.getItem('avatar'));
        if (preview) {
          if (resolved) { preview.src = resolved; preview.style.display = 'inline-block'; }
          else { try { preview.removeAttribute('src'); } catch {} preview.style.display = 'none'; }
        }
        this.loadPendingAvatarPreview();
        this.showModal('avatar-modal');
      });

      $('header-avatar')?.addEventListener('click', (e)=>{ e.stopPropagation(); this.showSidebar(); });

      const resolved = this.resolveAvatarUrl(localStorage.getItem('avatar'));
      const sidebarPrev = $('sidebar-avatar-preview'); if (sidebarPrev && resolved) { sidebarPrev.src = resolved; sidebarPrev.style.display = 'inline-block'; }
      const headerAvatar = $('header-avatar'); if (headerAvatar && resolved) { headerAvatar.src = resolved; headerAvatar.style.display = 'inline-block'; }

      const role = localStorage.getItem('role');
      const approveBtn = $('approve-request-button'); if (approveBtn) approveBtn.style.display = (role === 'admin' || role === 'moderator') ? '' : 'none';
      const tokensTab = qs('a[href="#panel_tokens"]')?.parentElement; const tokensPanel = $('panel_tokens');
      const canViewTokens = (role === 'admin' || role === 'moderator');
      if (!canViewTokens) { if (tokensTab) tokensTab.style.display = 'none'; if (tokensPanel) tokensPanel.style.display = 'none'; }
      else { if (tokensTab) tokensTab.style.display = ''; if (tokensPanel) tokensPanel.style.display = ''; }
    },

    async refreshCurrentUserFromServer() {
      try {
        const id = localStorage.getItem('id'); if (!id) return;
        const resp = await fetch(api('/api/user/' + encodeURIComponent(id)));
        if (!resp.ok) return;
        const data = await resp.json(); if (!data) return;
        if (typeof data.intro === 'string') localStorage.setItem('intro', data.intro || '');
        const old = localStorage.getItem('avatar') || ''; const next = data.avatar || '';
        if (old !== next) {
          localStorage.setItem('avatar', next);
          const resolved = this.resolveAvatarUrl(next);
          const sidebarPrev = $('sidebar-avatar-preview'); const headerAvatar = $('header-avatar'); const modalPrev = $('avatar-modal-preview');
          if (sidebarPrev && resolved) { sidebarPrev.src = resolved; sidebarPrev.style.display = 'inline-block'; }
          if (headerAvatar && resolved) { headerAvatar.src = resolved; headerAvatar.style.display = 'inline-block'; }
          if (modalPrev) { if (resolved) { modalPrev.src = resolved; modalPrev.style.display = 'inline-block'; } else { try { modalPrev.removeAttribute('src'); } catch {} modalPrev.style.display = 'none'; } }
        }
      } catch {}
    },

    openAvatarCropper(event) {
      const file = event?.target?.files?.[0]; if (!file) return;
      if (!/^image\//i.test(file.type)) { alert('请选择图片文件'); return; }
      const img = $('avatar-crop-image'); const modalId = 'avatar-crop-modal'; const cancelBtn = $('avatar-crop-cancel'); const confirmBtn = $('avatar-crop-confirm'); const msg = $('avatar-crop-message');
      if (!img || !cancelBtn || !confirmBtn) { this.handleCroppedUpload(file); return; }
      msg.textContent = ''; msg.className = 'modal-message';
      if (this._cropper) { try { this._cropper.destroy(); } catch {} this._cropper = null; }
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result;
        this.showModal(modalId);
        setTimeout(() => { this._cropper = new window.Cropper(img, { viewMode: 1, aspectRatio: 1, dragMode: 'move', autoCropArea: 1, background: false, guides: false, cropBoxResizable: false, cropBoxMovable: false, toggleDragModeOnDblclick: false, movable: true, zoomable: true, responsive: true, minContainerHeight: 320, ready: ()=>{ try { this._cropper && this._cropper.setDragMode('move'); } catch {} } }); }, 50);
      };
      reader.readAsDataURL(file);
      const cleanup = () => { if (this._cropper) { try { this._cropper.destroy(); } catch {} this._cropper = null; } const input = $('upload-avatar-input'); if (input) input.value = ''; };
      const onCancel = () => { cleanup(); this.hideModal(modalId); this.showModal('avatar-modal'); };
      const onConfirm = async () => {
        try {
          msg.textContent = '正在裁剪…';
          const canvas = this._cropper.getCroppedCanvas({ width: 512, height: 512, imageSmoothingQuality: 'high' });
          if (!canvas) throw new Error('裁剪失败');
          canvas.toBlob(async (blob) => { if (!blob) { msg.textContent = '导出失败'; msg.className = 'modal-message error'; return; } const croppedFile = new File([blob], 'avatar.png', { type: 'image/png' }); await this.handleCroppedUpload(croppedFile, msg); this.hideModal(modalId); cleanup(); this.showModal('avatar-modal'); }, 'image/png');
        } catch (e) { console.error(e); msg.textContent = e.message || '裁剪失败'; msg.className = 'modal-message error'; }
      };
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      confirmBtn.replaceWith(confirmBtn.cloneNode(true));
      $('avatar-crop-cancel').addEventListener('click', onCancel);
      $('avatar-crop-confirm').addEventListener('click', onConfirm);
    },

    async handleCroppedUpload(file, messageEl) {
      const id = localStorage.getItem('id'); if (!id) { alert('请先登录'); return; }
      const form = new FormData(); form.append('avatar', file); form.append('userId', id);
      try {
        messageEl && (messageEl.textContent = '正在上传…');
        const resp = await fetch(api('/api/upload/avatar'), { method: 'POST', body: form });
        let data = null; try { data = await resp.clone().json(); } catch {}
        if (!resp.ok) { const err = await this.parseErrorResponse(resp); throw new Error(err.message || (data && data.message) || '上传失败'); }
        this.showMessage($('avatar-modal-message'), '头像已提交审核，待管理员批准后生效。', 'success');
        messageEl && (messageEl.textContent = '已提交审核');
        await this.loadPendingAvatarPreview();
      } catch (err) { console.error('上传头像失败:', err); alert('上传失败：' + err.message); messageEl && (messageEl.textContent = '上传失败'); messageEl && (messageEl.className = 'modal-message error'); }
    },

    async loadPendingAvatarPreview() {
      try {
        const userId = localStorage.getItem('id'); const wrap = $('avatar-pending-wrap'); const img = $('avatar-pending-preview'); if (!userId || !wrap || !img) return;
        const resp = await fetch(api('/api/avatar/pending/me?userId=' + encodeURIComponent(userId)));
        if (!resp.ok) throw new Error('load pending failed');
        const data = await resp.json();
        if (data && data.url) { img.src = abs(data.url); wrap.style.display = 'block'; } else { wrap.style.display = 'none'; }
      } catch { const wrap = $('avatar-pending-wrap'); if (wrap) wrap.style.display = 'none'; }
    },

    bindFormEvents() { $('updateForm')?.addEventListener('submit', (e) => this.handleUpdateFormSubmit(e)); },

    toggleSidebar() { this.state.sidebarVisible ? this.hideSidebar() : this.showSidebar(); },

    openAccountInfo() {
      try {
        const name = localStorage.getItem('username') || '';
        const id = localStorage.getItem('id') || '';
        const avatar = localStorage.getItem('avatar') || '';
        const intro = localStorage.getItem('intro') || '';
        const resolvedAvatar = this.resolveAvatarUrl(avatar);
        const role = (localStorage.getItem('role') || '').toLowerCase();
        const roleMap = { admin: { text: '管理员', cls: 'badge-admin' }, moderator: { text: '版主', cls: 'badge-moderator' }, user: { text: '用户', cls: 'badge-user' }, guest: { text: '访客', cls: 'badge-guest' } };
        const roleInfo = roleMap[role] || { text: '用户', cls: 'badge-user' };
        const nameEl = $('account-info-username'); const nameTextEl = $('account-info-username-text'); const roleEl = $('account-info-role'); const idEl = $('account-info-id'); const introEl = $('account-info-intro'); const avatarEl = $('account-info-avatar');
        if (nameEl) nameEl.textContent = name; if (nameTextEl) nameTextEl.textContent = name; if (idEl) idEl.textContent = id;
        if (introEl) { if (introEl.tagName === 'TEXTAREA') introEl.value = intro || ''; else introEl.textContent = intro || '（暂无简介）'; }
        if (avatarEl) { if (resolvedAvatar) { avatarEl.src = resolvedAvatar; avatarEl.style.display = 'inline-block'; } else { try { avatarEl.removeAttribute('src'); } catch {} avatarEl.style.display = 'none'; } }
        if (roleEl) { roleEl.textContent = roleInfo.text; roleEl.className = 'badge ' + roleInfo.cls; }
        const msg = $('account-info-message'); if (msg) { msg.textContent = ''; msg.className = 'modal-message'; msg.classList.remove('msg-flash'); }
        if (!this._bindUsernameInlineEditOnce) { this._bindUsernameInlineEditOnce = true; this.setupUsernameInlineEdit(); }
        if (!this._bindIntroInlineEditOnce) { this._bindIntroInlineEditOnce = true; this.setupIntroInlineEdit(); }
      } catch {}
      this.showModal('account-info-modal');
    },

    refreshUsernameUI(newName) { const nameEl = $('account-info-username'); const nameTextEl = $('account-info-username-text'); if (nameEl) nameEl.textContent = newName || ''; if (nameTextEl) nameTextEl.textContent = newName || ''; },

    setupIntroInlineEdit() {
      const introEl = $('account-info-intro'); if (!introEl || introEl.tagName !== 'TEXTAREA') return; const msgEl = $('account-info-message'); let original = introEl.value || '';
      const showFlash = (type, text) => { if (!msgEl) return; msgEl.textContent = text; msgEl.className = 'modal-message ' + (type || ''); msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash'); const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); }; msgEl.addEventListener('animationend', onAnimEnd); };
      const doSave = async () => {
        const id = localStorage.getItem('id'); if (!id) { alert('未检测到登录信息'); return; }
        const newIntro = (introEl.value || '').trim();
        if (this._introSaveFailed && newIntro === this._introLastTried) { try { introEl.focus(); } catch {} return; }
        if (newIntro === original) { return; }
        if (newIntro.length > 500) { showFlash('error', '简介最多 500 个字符'); return; }
        this._savingIntro = true; introEl.setAttribute('aria-busy', 'true');
        try {
          const resp = await fetch(api('/api/update'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, newIntro }) });
          if (!resp.ok) { let msg = '更新失败'; try { const data = await resp.json(); msg = data && (data.message || msg); } catch {} showFlash('error', msg); this._introSaveFailed = true; this._introLastTried = newIntro; this._savingIntro = false; introEl.removeAttribute('aria-busy'); return; }
          localStorage.setItem('intro', newIntro); original = newIntro; this._introSaveFailed = false; this._introLastTried = ''; showFlash('success', '已更新'); this._savingIntro = false; introEl.removeAttribute('aria-busy');
        } catch (e) { console.error('更新简介失败:', e); showFlash('error', '网络异常，稍后再试'); this._introSaveFailed = true; this._introLastTried = newIntro; this._savingIntro = false; introEl.removeAttribute('aria-busy'); }
      };
      const onKeydown = (ev) => {
        if (ev.key === 'Enter' && !ev.ctrlKey && !ev.metaKey && !ev.shiftKey) { ev.preventDefault(); doSave(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); introEl.value = original; introEl.blur(); }
        // Ctrl/Cmd+Enter 与 Shift+Enter 走默认换行
      };
      introEl.addEventListener('focus', () => { original = introEl.value || ''; });
      introEl.addEventListener('keydown', onKeydown);
      introEl.addEventListener('blur', () => { if (!this._savingIntro) doSave(); });
    },

    setupUsernameInlineEdit() {
      const nameEl = $('account-info-username'); if (!nameEl) return; try { nameEl.classList.add('is-editable'); } catch {}
      const startEdit = () => {
        if (this._isEditingUsername) return; this._isEditingUsername = true;
        const oldName = nameEl.textContent || '';
        nameEl.setAttribute('contenteditable', 'true'); nameEl.classList.add('is-editing'); nameEl.setAttribute('role', 'textbox'); nameEl.setAttribute('aria-label', '编辑用户名');
        const sel = window.getSelection && window.getSelection(); const range = document.createRange(); range.selectNodeContents(nameEl); if (sel) { sel.removeAllRanges(); sel.addRange(range); } nameEl.focus();
        const cleanup = () => { nameEl.removeAttribute('contenteditable'); nameEl.classList.remove('is-editing'); nameEl.removeAttribute('role'); nameEl.removeAttribute('aria-label'); this._isEditingUsername = false; };
        const doSave = async () => {
          const newName = (nameEl.textContent || '').trim(); const msgEl = $('account-info-message');
          if (this._usernameSaveFailed && newName === this._usernameLastTried) { try { nameEl.focus(); } catch {} return; }
          if (!newName || newName === oldName) { cleanup(); return; }
          const id = localStorage.getItem('id'); if (!id) { alert('未检测到登录信息'); cleanup(); return; }
          this._savingUsername = true; nameEl.setAttribute('aria-busy', 'true');
          try {
            const resp = await fetch(api('/api/update'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, newUsername: newName }) });
            if (!resp.ok) {
              let msg = '更新失败'; try { const data = await resp.json(); msg = data && (data.message || msg); } catch {}
              if (msgEl) { msgEl.textContent = msg; msgEl.className = 'modal-message error'; msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash'); const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); }; msgEl.addEventListener('animationend', onAnimEnd); }
              this._usernameSaveFailed = true; this._usernameLastTried = newName; this._savingUsername = false; nameEl.removeAttribute('aria-busy'); return;
            }
            localStorage.setItem('username', newName); this.refreshUsernameUI(newName); this._usernameSaveFailed = false; this._usernameLastTried = '';
            if (msgEl) { msgEl.textContent = '已更新'; msgEl.className = 'modal-message success'; msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash'); const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); }; msgEl.addEventListener('animationend', onAnimEnd); }
            this._savingUsername = false; nameEl.removeAttribute('aria-busy'); cleanup();
          } catch (e) { console.error('更新用户名失败:', e); if (msgEl) { msgEl.textContent = '网络异常，稍后再试'; msgEl.className = 'modal-message error'; msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash'); const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); }; msgEl.addEventListener('animationend', onAnimEnd); } this._usernameSaveFailed = true; this._usernameLastTried = newName; this._savingUsername = false; nameEl.removeAttribute('aria-busy'); }
        };
        const onKey = (ev) => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey) { ev.preventDefault(); doSave(); } else if (ev.key === 'Escape') { ev.preventDefault(); cleanup(); } };
        const onBlur = () => { if (!this._savingUsername) cleanup(); };
        nameEl.addEventListener('keydown', onKey); nameEl.addEventListener('blur', onBlur, { once: true });
        const onInput = () => { if (this._usernameSaveFailed) { this._usernameSaveFailed = false; } };
        nameEl.addEventListener('input', onInput, { once: false });
      };
      nameEl.addEventListener('click', startEdit); nameEl.setAttribute('tabindex', '0'); nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); startEdit(); } });
    },

    showSidebar() {
      if (this.state.sidebarVisible) return; this.hideAllModals(); this.hideAccountMenu(); const menu = $('sidebar-menu'); const backdrop = $('sidebar-backdrop'); if (!menu || !backdrop) return; this.state.sidebarVisible = true; backdrop.style.display = 'block'; menu.style.display = ''; menu.classList.add('show'); requestAnimationFrame(() => backdrop.classList.add('show')); this.refreshCurrentUserFromServer();
    },

    hideSidebar() {
      if (!this.state.sidebarVisible) return; const menu = $('sidebar-menu'); const backdrop = $('sidebar-backdrop'); if (!menu || !backdrop) return; this.state.sidebarVisible = false; backdrop.classList.remove('show'); menu.classList.remove('show'); setTimeout(() => { if (!this.state.sidebarVisible && !this.state.accountMenuVisible) { backdrop.style.display = 'none'; } }, 300);
    },

    showAccountMenu() {
      this.hideSidebar(); if (this.state.accountMenuVisible) return; const menu = $('account-menu'); const backdrop = $('sidebar-backdrop'); if (!menu || !backdrop) return; this.state.accountMenuVisible = true; backdrop.style.display = 'block'; menu.style.display = ''; menu.classList.add('show'); requestAnimationFrame(() => backdrop.classList.add('show')); this.refreshCurrentUserFromServer();
    },

    hideAccountMenu() {
      if (!this.state.accountMenuVisible) return; const menu = $('account-menu'); const backdrop = $('sidebar-backdrop'); if (!menu || !backdrop) return; this.state.accountMenuVisible = false; backdrop.classList.remove('show'); menu.classList.remove('show'); setTimeout(() => { if (!this.state.accountMenuVisible && !this.state.sidebarVisible) { backdrop.style.display = 'none'; } }, 300);
    },

    showModal(modalId) {
      if (this.state.currentModal === modalId) return; this.state.returnToAccountMenuOnClose = this.state.returnToAccountMenuOnClose || this.state.accountMenuVisible; this.hideAllModals(); this.hideAccountMenu(); this.hideSidebar(); const backdrop = $('modal-backdrop'); const modal = $(modalId); if (!backdrop || !modal) return; this.state.currentModal = modalId; backdrop.style.display = 'block'; modal.style.display = 'block'; backdrop.classList.remove('show'); modal.classList.remove('show'); try { void backdrop.offsetWidth; void modal.offsetWidth; } catch {} const responseMessage = modal.querySelector('#responseMessage'); if (responseMessage) { responseMessage.textContent = ''; responseMessage.className = 'modal-message'; } requestAnimationFrame(() => { requestAnimationFrame(() => { backdrop.classList.add('show'); modal.classList.add('show'); }); }); this.handleModalSpecialCases(modalId, modal);
    },

    hideModal(modalId) {
      if (this.state.currentModal !== modalId) return; const backdrop = $('modal-backdrop'); const modal = $(modalId); if (!backdrop || !modal) return; this.state.currentModal = null; backdrop.classList.remove('show'); modal.classList.remove('show'); setTimeout(() => { if (!this.state.currentModal) { backdrop.style.display = 'none'; } modal.style.display = 'none'; }, 300);
    },

    hideAllModals() { if (this.state.currentModal) this.hideModal(this.state.currentModal); },

    handleModalSpecialCases(modalId, modal) {
      if (modalId === 'update-account-modal') { const oldPwd = modal.querySelector('#oldPassword'); const newPwd = modal.querySelector('#newPassword'); const confirmPwd = modal.querySelector('#confirmPassword'); if (oldPwd) oldPwd.value = ''; if (newPwd) newPwd.value = ''; if (confirmPwd) confirmPwd.value = ''; if (oldPwd) oldPwd.focus(); }
      else if (modalId === 'approve-user-modal') { if (typeof window.renderApprovals === 'function') window.renderApprovals(); this.refreshCurrentUserFromServer(); }
    },

    async handleUpdateFormSubmit(event) {
      event.preventDefault();
      const id = localStorage.getItem('id'); const token = localStorage.getItem('token'); const oldPassword = ($('oldPassword')?.value || '').trim(); const newPassword = ($('newPassword')?.value || '').trim(); const confirmPassword = ($('confirmPassword')?.value || '').trim(); const responseMessage = $('responseMessage');
      if (!id || !token) { this.showMessage(responseMessage, '未检测到登录信息，请重新登录。', 'error'); return; }
      if (!oldPassword || !newPassword || !confirmPassword) { this.showMessage(responseMessage, '请填写完整。', 'error'); return; }
      if (newPassword.length < 6) { this.showMessage(responseMessage, '新密码至少 6 位。', 'error'); return; }
      if (newPassword !== confirmPassword) { this.showMessage(responseMessage, '两次输入的新密码不一致。', 'error'); return; }
      try {
        this.showMessage(responseMessage, '正在更新...', '');
        const response = await fetch(api('/api/change-password'), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ id, oldPassword, newPassword }) });
        if (response.ok) { this.showMessage(responseMessage, '密码已更新！请使用新密码重新登录。', 'success'); setTimeout(() => { this.hideModal('update-account-modal'); this.handleLogout(); }, 2000); }
        else { const err = await this.parseErrorResponse(response); this.showMessage(responseMessage, err.message || '更新失败', 'error'); }
      } catch (error) { this.showMessage(responseMessage, '请求失败，请稍后重试。', 'error'); console.error('请求失败:', error); }
    },

    handleLogout() { ['token', 'username', 'id'].forEach(k=>localStorage.removeItem(k)); window.location.href = 'login.html'; },

    showMessage(element, message, type) { if (element) { element.textContent = message; element.className = `modal-message ${type}`; } },
  };

  document.addEventListener('DOMContentLoaded', () => { const ready = window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve(); ready.then(() => UIManager.init()); });
  window.MenuModalManager = UIManager;
})();

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
      $('approve-request-button')?.addEventListener('click', async () => {
        const token = localStorage.getItem('token') || '';
        const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
        try {
          // 并行检测四类待审
          const [u, a, n, i] = await Promise.all([
            fetch(api('/api/pending-users'), { headers }),
            fetch(api('/api/avatar/pending'), { headers }),
            fetch(api('/api/username/pending'), { headers }),
            fetch(api('/api/intro/pending'), { headers }),
          ]);
          const toJson = async (r) => (r && r.ok ? (await r.json()) : []);
          const [users, avatars, names, intros] = await Promise.all([toJson(u), toJson(a), toJson(n), toJson(i)]);
          const total = (Array.isArray(users)?users.length:0) + (Array.isArray(avatars)?avatars.length:0) + (Array.isArray(names)?names.length:0) + (Array.isArray(intros)?intros.length:0);
          if (total > 0) {
            this.showModal('approve-user-modal');
          } else {
            // 与“修改词元的已修改”一致的提示：使用 tokensAdmin.showToast
            const msg = (window.i18n && window.i18n.t) ? window.i18n.t('toast.noRequests') : '无申请';
            try { window.tokensAdmin && window.tokensAdmin.showToast && window.tokensAdmin.showToast(msg); }
            catch(_) { alert(msg); }
          }
        } catch (_) {
          // 网络或权限问题：仍提示无申请（或可提示错误）
          const msg = (window.i18n && window.i18n.t) ? window.i18n.t('toast.noRequests') : '无申请';
          try { window.tokensAdmin && window.tokensAdmin.showToast && window.tokensAdmin.showToast(msg); }
          catch(_) { alert(msg); }
        }
      });
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
      // 权限管理入口仅管理员可见
      const permBtn = $('permissions-manage-button');
      if (permBtn) {
        permBtn.style.display = (role === 'admin') ? '' : 'none';
        permBtn.addEventListener('click', () => {
          // 关闭面板/遮罩，并切换到“权限”标签页（仅管理员）
          this.hideAccountMenu(); this.hideSidebar(); this.hideAllModals();
          try {
            const a = document.querySelector('#example-tabs a[href="#panel_permissions"]');
            if (a) { a.click(); }
            // 渲染一次，确保首次进入有内容
            if (typeof window.renderPermissionsPanel === 'function') window.renderPermissionsPanel('');
          } catch {}
        });
      }
  const tokensTab = qs('a[href="#panel_tokens"]')?.parentElement; const tokensPanel = $('panel_tokens');
      const canViewTokens = (role === 'admin' || role === 'moderator');
      if (!canViewTokens) { if (tokensTab) tokensTab.style.display = 'none'; if (tokensPanel) tokensPanel.style.display = 'none'; }
      else { if (tokensTab) tokensTab.style.display = ''; if (tokensPanel) tokensPanel.style.display = ''; }
  // 权限面板仅管理员可见
  const permTabEl = qs('a[href="#panel_permissions"]')?.parentElement; const permPanelEl = $('panel_permissions');
  const canViewPerms = (role === 'admin');
  if (!canViewPerms) { if (permTabEl) permTabEl.style.display = 'none'; if (permPanelEl) permPanelEl.style.display = 'none'; }
  else { if (permTabEl) permTabEl.style.display = ''; if (permPanelEl) permPanelEl.style.display = ''; }
    },

  async refreshCurrentUserFromServer() {
      try {
        const id = localStorage.getItem('id'); if (!id) return;
        const resp = await fetch(api('/api/user/' + encodeURIComponent(id)));
        if (!resp.ok) return;
        const data = await resp.json(); if (!data) return;
        if (typeof data.intro === 'string') localStorage.setItem('intro', data.intro || '');
        if (Array.isArray(data.permissions)) {
          try { localStorage.setItem('permissions', JSON.stringify(data.permissions)); } catch {}
        }

        // 同步用户名（例如审核通过后），并立刻刷新已打开的名片弹窗
        if (typeof data.username === 'string') {
          const oldName = localStorage.getItem('username') || '';
          const nextName = data.username || '';
          if (oldName !== nextName) {
            localStorage.setItem('username', nextName);
            try { this.refreshUsernameUI(nextName); } catch {}
            try { this.loadPendingUsernameBadge(); } catch {}
          }
        }
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
  if (!/^image\//i.test(file.type)) { alert((window.i18n&&window.i18n.t)?window.i18n.t('alert.selectImage'):'请选择图片文件'); return; }
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
          msg.textContent = (window.i18n&&window.i18n.t)?window.i18n.t('status.cropping'):'正在裁剪…';
          const canvas = this._cropper.getCroppedCanvas({ width: 512, height: 512, imageSmoothingQuality: 'high' });
          if (!canvas) throw new Error((window.i18n&&window.i18n.t)?window.i18n.t('error.cropFailed'):'裁剪失败');
          canvas.toBlob(async (blob) => { if (!blob) { msg.textContent = (window.i18n&&window.i18n.t)?window.i18n.t('error.exportFailed'):'导出失败'; msg.className = 'modal-message error'; return; } const croppedFile = new File([blob], 'avatar.png', { type: 'image/png' }); await this.handleCroppedUpload(croppedFile, msg); this.hideModal(modalId); cleanup(); this.showModal('avatar-modal'); }, 'image/png');
        } catch (e) { console.error(e); msg.textContent = e.message || '裁剪失败'; msg.className = 'modal-message error'; }
      };
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
      confirmBtn.replaceWith(confirmBtn.cloneNode(true));
      $('avatar-crop-cancel').addEventListener('click', onCancel);
      $('avatar-crop-confirm').addEventListener('click', onConfirm);
    },

    async handleCroppedUpload(file, messageEl) {
  const id = localStorage.getItem('id'); if (!id) { alert((window.i18n&&window.i18n.t)?window.i18n.t('alert.loginFirst'):'请先登录'); return; }
      const form = new FormData(); form.append('avatar', file); form.append('userId', id);
      try {
  messageEl && (messageEl.textContent = (window.i18n&&window.i18n.t)?window.i18n.t('status.uploading'):'正在上传…');
        const resp = await fetch(api('/api/upload/avatar'), { method: 'POST', body: form });
        let data = null; try { data = await resp.clone().json(); } catch {}
        if (!resp.ok) { const err = await this.parseErrorResponse(resp); throw new Error(err.message || (data && data.message) || '上传失败'); }
        if (data && data.applied) {
          // 免审核：立即更新本地头像与 UI
          if (typeof data.relativeUrl === 'string') localStorage.setItem('avatar', data.relativeUrl);
          const resolved = this.resolveAvatarUrl(localStorage.getItem('avatar'));
          const preview = $('avatar-modal-preview'); if (preview) { if (resolved) { preview.src = resolved; preview.style.display = 'inline-block'; } }
          // 同步侧边栏与页头
          try {
            const sidebarPrev = $('sidebar-avatar-preview'); const headerAvatar = $('header-avatar');
            if (sidebarPrev && resolved) { sidebarPrev.src = resolved; sidebarPrev.style.display = 'inline-block'; }
            if (headerAvatar && resolved) { headerAvatar.src = resolved; headerAvatar.style.display = 'inline-block'; }
          } catch {}
          this.showMessage($('avatar-modal-message'), (window.i18n&&window.i18n.t)?window.i18n.t('success.avatarUpdatedImmediate'):'头像已更新（免审核）', 'success');
          messageEl && (messageEl.textContent = (window.i18n&&window.i18n.t)?window.i18n.t('status.updated'):'已更新');
          const wrap = $('avatar-pending-wrap'); if (wrap) wrap.style.display = 'none';
        } else {
          this.showMessage($('avatar-modal-message'), (window.i18n&&window.i18n.t)?window.i18n.t('success.avatarSubmitted'):'头像已提交审核，待管理员批准后生效。', 'success');
          messageEl && (messageEl.textContent = (window.i18n&&window.i18n.t)?window.i18n.t('status.submitted'):'已提交审核');
          await this.loadPendingAvatarPreview();
        }
  } catch (err) { console.error('上传头像失败:', err); const prefix=(window.i18n&&window.i18n.t)?window.i18n.t('error.uploadFailedPrefix'):'上传失败：'; alert(prefix + (err && err.message ? err.message : '')); messageEl && (messageEl.textContent = (window.i18n&&window.i18n.t)?window.i18n.t('error.uploadFailed'):'上传失败'); messageEl && (messageEl.className = 'modal-message error'); }
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
        const nameMainEl = $('account-info-username-main'); const nameTextEl = $('account-info-username-text'); const roleEl = $('account-info-role'); const idEl = $('account-info-id'); const introEl = $('account-info-intro'); const avatarEl = $('account-info-avatar');
        if (nameMainEl) nameMainEl.textContent = name; if (nameTextEl) nameTextEl.textContent = name; if (idEl) idEl.textContent = id;
        if (introEl) { if (introEl.tagName === 'TEXTAREA') introEl.value = intro || ''; else introEl.textContent = intro || '（暂无简介）'; }
        if (avatarEl) { if (resolvedAvatar) { avatarEl.src = resolvedAvatar; avatarEl.style.display = 'inline-block'; } else { try { avatarEl.removeAttribute('src'); } catch {} avatarEl.style.display = 'none'; } }
        if (roleEl) { roleEl.textContent = roleInfo.text; roleEl.className = 'badge ' + roleInfo.cls; }
        // 在角色徽标后追加“权限徽标”（深红），并提供悬浮说明
        try {
          const permRaw = localStorage.getItem('permissions');
          const perms = permRaw ? JSON.parse(permRaw) : [];
          const container = roleEl && roleEl.parentElement; // .account-info__role
          // 清理旧徽标
          if (container) Array.from(container.querySelectorAll('.badge-permission')).forEach(n => n.remove());
          if (container && Array.isArray(perms) && perms.length) {
            const PERM_DESC = { '仪同三司': '可免审直接生效（用户名/简介/头像）' };
            const badge = document.createElement('span');
            badge.className = 'badge badge-permission';
            if (perms.length === 1) {
              const p = String(perms[0]);
              badge.textContent = p;
              const tip = PERM_DESC[p] || ('权限：' + p); try { badge.setAttribute('data-tooltip', tip); } catch { badge.title = tip; }
            } else {
              badge.textContent = '权限×' + perms.length;
              const tip = perms.map(p => (PERM_DESC[p] ? (p + '：' + PERM_DESC[p]) : p)).join(' | ');
              try { badge.setAttribute('data-tooltip', tip); } catch { badge.title = tip; }
            }
            container.appendChild(badge);
          }
        } catch {}
        const msg = $('account-info-message'); if (msg) { msg.textContent = ''; msg.className = 'modal-message'; msg.classList.remove('msg-flash'); }
  if (!this._bindUsernameInlineEditOnce) { this._bindUsernameInlineEditOnce = true; this.setupUsernameInlineEdit(); }
  // 展示“用户名审核中”提示（若存在）
  this.loadPendingUsernameBadge();
  if (!this._bindIntroInlineEditOnce) { this._bindIntroInlineEditOnce = true; this.setupIntroInlineEdit(); }
  this.loadPendingIntroBadge();
      } catch {}
      this.showModal('account-info-modal');
    },

    refreshUsernameUI(newName) { const nameMainEl = $('account-info-username-main'); const nameTextEl = $('account-info-username-text'); if (nameMainEl) nameMainEl.textContent = newName || ''; if (nameTextEl) nameTextEl.textContent = newName || ''; },

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
          // 改为“提交审核”流程
          const resp = await fetch(api('/api/intro/change'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, newIntro }) });
          const respJson = await resp.clone().json().catch(()=>null);
          if (!resp.ok) { let msg = '提交失败'; try { const data = await resp.json(); msg = data && (data.message || msg); } catch {} showFlash('error', msg); this._introSaveFailed = true; this._introLastTried = newIntro; this._savingIntro = false; introEl.removeAttribute('aria-busy'); return; }
          // 根据是否免审核作出不同处理
          this._introSaveFailed = false; this._introLastTried = '';
          if (respJson && respJson.applied) {
            // 免审核：直接更新本地值
            localStorage.setItem('intro', newIntro);
            original = newIntro;
            introEl.value = newIntro;
            showFlash('success', '简介已更新（免审核）');
            // 隐藏/清空待审提示
            try { const wrap = document.getElementById('account-info-intro-pending'); if (wrap) { wrap.style.display='none'; wrap.innerHTML=''; } } catch {}
          } else {
            // 正常审核流程
            showFlash('success', '简介变更已提交审核，待通过后生效。');
            introEl.value = original; // 恢复旧简介
            await this.loadPendingIntroBadge();
          }
          this._savingIntro = false; introEl.removeAttribute('aria-busy');
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

    async loadPendingIntroBadge(){
      try {
        const id = localStorage.getItem('id'); if (!id) return;
        const container = $('account-info-intro-pending'); if (!container) return;
        const resp = await fetch(api('/api/intro/pending/me?userId=' + encodeURIComponent(id)));
        if (!resp.ok) { container.style.display = 'none'; return; }
        const data = await resp.json();
        const show = !!(data && typeof data.newIntro === 'string');
        if (!show) { container.style.display = 'none'; container.innerHTML=''; return; }
        const full = (data.newIntro || '').replace(/\s+/g,' ');
        container.innerHTML = '';
        const span = document.createElement('span');
        span.id = 'account-info-intro-pending-inline';
        span.textContent = '审核中：' + full;
        span.title = full; // 悬停可查看完整内容
        const btn = document.createElement('button'); btn.id = 'account-info-intro-cancel-inline'; btn.textContent = '撤回'; btn.addEventListener('click', () => this.cancelPendingIntroChange());
        container.appendChild(span); container.appendChild(btn); container.style.display = '';
      } catch { const container = $('account-info-intro-pending'); if (container) { container.style.display = 'none'; container.innerHTML=''; } }
    },

    async cancelPendingIntroChange(){
      try {
        const id = localStorage.getItem('id'); if (!id) return;
        const resp = await fetch(api('/api/intro/cancel'), { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ userId: id }) });
        if (!resp.ok) { try { const e = await resp.json(); alert(e && e.message ? e.message : '撤回失败'); } catch { alert('撤回失败'); } return; }
        await this.loadPendingIntroBadge();
      } catch (_) { alert('网络异常，撤回失败'); }
    },

    setupUsernameInlineEdit() {
      const nameEl = $('account-info-username-main'); if (!nameEl) return; try { nameEl.classList.add('is-editable'); } catch {}
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
          if (newName.length > 12) { if (msgEl) { msgEl.textContent = '用户名最多 12 个字符'; msgEl.className = 'modal-message error'; msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash'); const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); }; msgEl.addEventListener('animationend', onAnimEnd); } try { nameEl.focus(); } catch {} return; }
          const id = localStorage.getItem('id'); if (!id) { alert('未检测到登录信息'); cleanup(); return; }
          this._savingUsername = true; nameEl.setAttribute('aria-busy', 'true');
          try {
            // 新流程：提交用户名变更审核（若具备“仪同三司”将免审核直接生效）
            const resp = await fetch(api('/api/username/change'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: id, newUsername: newName }) });
            const respJson = await resp.clone().json().catch(()=>null);
            if (!resp.ok) {
              let msg = '更新失败'; try { const data = await resp.json(); msg = data && (data.message || msg); } catch {}
              if (msgEl) { msgEl.textContent = msg; msgEl.className = 'modal-message error'; msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash'); const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); }; msgEl.addEventListener('animationend', onAnimEnd); }
              this._usernameSaveFailed = true; this._usernameLastTried = newName; this._savingUsername = false; nameEl.removeAttribute('aria-busy'); return;
            }
            // 根据是否免审核作出不同处理
            this._usernameSaveFailed = false; this._usernameLastTried = '';
            if (respJson && respJson.applied) {
              // 免审核：直接更新本地用户名与 UI
              localStorage.setItem('username', newName);
              this.refreshUsernameUI(newName);
              if (msgEl) { msgEl.textContent = '用户名已更新（免审核）'; msgEl.className = 'modal-message success'; msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash'); const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); }; msgEl.addEventListener('animationend', onAnimEnd); }
              // 隐藏待审提示
              try { const tag = $('account-info-username-pending-inline'); if (tag) { tag.style.display = 'none'; tag.textContent = ''; } const btn = $('account-info-username-cancel-inline'); if (btn) btn.style.display = 'none'; } catch {}
            } else {
              // 正常提交审核：恢复旧名并提示
              if (msgEl) { msgEl.textContent = '用户名变更已提交审核，待通过后生效。'; msgEl.className = 'modal-message success'; msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash'); const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); }; msgEl.addEventListener('animationend', onAnimEnd); }
              nameEl.textContent = oldName; // 恢复显示旧名
              this.loadPendingUsernameBadge();
            }
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

    async loadPendingUsernameBadge(){
      try {
        const id = localStorage.getItem('id'); if (!id) return;
        const tag = $('account-info-username-pending-inline');
        const cancelBtn = $('account-info-username-cancel-inline');
        const resp = await fetch(api('/api/username/pending/me?userId=' + encodeURIComponent(id)));
        if (!resp.ok) return;
        const data = await resp.json();
        const show = !!(data && data.newUsername);
        if (tag) { tag.textContent = show ? ('审核中：' + data.newUsername) : ''; tag.style.display = show ? '' : 'none'; }
        if (cancelBtn) {
          cancelBtn.style.display = show ? '' : 'none';
          cancelBtn.replaceWith(cancelBtn.cloneNode(true));
          const freshBtn = $('account-info-username-cancel-inline');
          freshBtn && freshBtn.addEventListener('click', () => this.cancelPendingUsernameChange());
        }
      } catch {}
    },

    async cancelPendingUsernameChange(){
      try {
        const id = localStorage.getItem('id'); if (!id) return;
        const resp = await fetch(api('/api/username/cancel'), { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ userId: id }) });
        // 不强依赖返回内容，成功/无记录都刷新 UI
        if (!resp.ok) { try { const e = await resp.json(); alert(e && e.message ? e.message : '撤回失败'); } catch { alert('撤回失败'); } return; }
        // 刷新待审提示
        this.loadPendingUsernameBadge();
      } catch (_) { alert('网络异常，撤回失败'); }
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
      else if (modalId === 'permissions-modal') { try { typeof window.renderPermissionsPanel === 'function' && window.renderPermissionsPanel(''); } catch {} }
    },

    async handleUpdateFormSubmit(event) {
      event.preventDefault();
      const id = localStorage.getItem('id'); const token = localStorage.getItem('token'); const oldPassword = ($('oldPassword')?.value || '').trim(); const newPassword = ($('newPassword')?.value || '').trim(); const confirmPassword = ($('confirmPassword')?.value || '').trim(); const responseMessage = $('responseMessage');
      const t = (k)=> (window.i18n&&window.i18n.t)?window.i18n.t(k):null;
      if (!id || !token) { this.showMessage(responseMessage, t('error.noLogin') || '未检测到登录信息，请重新登录。', 'error'); return; }
      if (!oldPassword || !newPassword || !confirmPassword) { this.showMessage(responseMessage, t('error.fillAll') || '请填写完整。', 'error'); return; }
      if (newPassword.length < 6) { this.showMessage(responseMessage, t('error.pwdMin') || '新密码至少 6 位。', 'error'); return; }
      if (newPassword !== confirmPassword) { this.showMessage(responseMessage, t('error.pwdNotMatch') || '两次输入的新密码不一致。', 'error'); return; }
      try {
        this.showMessage(responseMessage, t('status.updating') || '正在更新...', '');
        const response = await fetch(api('/api/change-password'), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ id, oldPassword, newPassword }) });
        if (response.ok) { this.showMessage(responseMessage, t('success.pwdUpdated') || '密码已更新！请使用新密码重新登录。', 'success'); setTimeout(() => { this.hideModal('update-account-modal'); this.handleLogout(); }, 2000); }
        else { const err = await this.parseErrorResponse(response); this.showMessage(responseMessage, err.message || t('error.updateFailed') || '更新失败', 'error'); }
      } catch (error) { this.showMessage(responseMessage, t('error.requestFailed') || '请求失败，请稍后重试。', 'error'); console.error('请求失败:', error); }
    },

  handleLogout() { ['token', 'username', 'id'].forEach(k=>localStorage.removeItem(k)); window.location.href = 'login.html'; },

    showMessage(element, message, type) { if (element) { element.textContent = message; element.className = `modal-message ${type}`; } },
  };

  document.addEventListener('DOMContentLoaded', () => { const ready = window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve(); ready.then(() => UIManager.init()); });
  window.MenuModalManager = UIManager;
})();

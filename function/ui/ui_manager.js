const UIManager = {
  state: { sidebarVisible: false, accountMenuVisible: false, currentModal: null, returnToAccountMenuOnClose: false },
  $: (s)=>document.getElementById(s),
  qs: (s)=>document.querySelector(s),
  show:(el,display)=>{ if(el){ el.style.display = display==null? 'block' : display; } },
  hide:(el)=>{ if(el){ el.style.display='none'; } },
  abs:(u)=> (endpoints && endpoints.abs ? endpoints.abs(u) : u),
  api:(u)=> (endpoints && endpoints.api ? endpoints.api(u) : u),
  // 安全解析后端错误响应：优先 json，失败则退回 text
  async parseErrorResponse(resp) {
    try {
      const data = await resp.clone().json();
      return { message: data?.message || '', data };
    } catch (_) {
      try {
        const text = await resp.clone().text();
        return { message: (text && text.length < 200 ? text : '服务器返回非 JSON 响应'), data: null };
      } catch (e) {
        return { message: '无法解析服务器响应', data: null };
      }
    }
  },

  init() {
    this.bindEvents();
    this.bindMenuActions();
    this.bindFormEvents();
    this.refreshCurrentUserFromServer();
  },

  bindEvents() {
    // 菜单切换
    this.$('menu-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSidebar();
    });

  this.$('sidebar-backdrop')?.addEventListener('click', () => { this.hideAccountMenu(); this.hideSidebar(); });
    this.$('modal-backdrop')?.addEventListener('click', () => {
      // 若弹窗来自账号菜单，则点击空白处仅关闭弹窗并回到账号菜单
      if (this.state.currentModal && this.state.returnToAccountMenuOnClose) {
        const cur = this.state.currentModal;
        this.hideModal(cur);
        // 回到账号菜单
        this.showAccountMenu();
        this.state.returnToAccountMenuOnClose = false;
      } else {
        this.hideAllModals();
      }
    });

  this.$('sidebar-menu')?.addEventListener('click', (e) => e.stopPropagation());
  this.$('account-menu')?.addEventListener('click', (e) => e.stopPropagation());
  ['update-account-modal', 'approve-user-modal'].forEach(id => { this.$(id)?.addEventListener('click', (e) => e.stopPropagation()); });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.state.currentModal) {
          if (this.state.returnToAccountMenuOnClose) {
            const cur = this.state.currentModal;
            this.hideModal(cur);
            this.showAccountMenu();
            this.state.returnToAccountMenuOnClose = false;
          } else {
            this.hideAllModals();
          }
        } else {
          // 未打开弹窗时，ESC 关闭菜单
          this.hideAccountMenu();
          this.hideSidebar();
        }
      }
    });
  },

  bindMenuActions() {
  // 账号菜单入口（主侧边栏 -> 账号菜单）
  this.$('open-account-menu-button')?.addEventListener('click', () => this.showAccountMenu());
  // 账号菜单内返回
  this.$('account-menu-back')?.addEventListener('click', () => { this.hideAccountMenu(); this.showSidebar(); });

  // 账号菜单内功能
  this.$('update-account-button')?.addEventListener('click', () => this.showModal('update-account-modal'));
  this.$('account-info-button')?.addEventListener('click', () => this.openAccountInfo());
    this.$('approve-request-button')?.addEventListener('click', () => this.showModal('approve-user-modal'));
    this.$('logout-button')?.addEventListener('click', () => this.handleLogout());

    // 头像上传
  const fileInput = this.$('upload-avatar-input');
  const uploadBtn = this.$('upload-avatar-button');
    // 打开头像弹窗
  uploadBtn?.addEventListener('click', async () => {
      // 打开前先尝试从服务器刷新一次头像（防止审核通过后本地仍旧是旧值）
      await this.refreshCurrentUserFromServer();
  const modal = this.$('avatar-modal');
  const preview = this.$('avatar-modal-preview');
      const saved = localStorage.getItem('avatar');
      if (preview) {
        const resolved = this.resolveAvatarUrl(saved);
        if (resolved) {
          preview.src = resolved;
          preview.style.display = 'inline-block';
        } else {
          try { preview.removeAttribute('src'); } catch (_) {}
          preview.style.display = 'none';
        }
      }
  // 加载个人待审核头像并显示在小预览
  this.loadPendingAvatarPreview();
      this.showModal('avatar-modal');
    });
    // 弹窗中的“上传头像”按钮
  this.$('avatar-modal-upload')?.addEventListener('click', () => fileInput?.click());
  this.$('avatar-modal-close')?.addEventListener('click', () => this.hideModal('avatar-modal'));
    // 文件选择后进入裁剪
    fileInput?.addEventListener('change', (e) => this.openAvatarCropper(e));

    // 头像点击：打开侧边菜单
    document.getElementById('header-avatar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSidebar();
    });

    // 初始化预览（账号菜单内）
    const preview = this.$('sidebar-avatar-preview');
    const saved = localStorage.getItem('avatar');
    const resolved = this.resolveAvatarUrl(saved);
    if (preview && resolved) {
      preview.src = resolved;
      preview.style.display = 'inline-block';
    }
    const headerAvatar = this.$('header-avatar');
    if (resolved && headerAvatar) {
      headerAvatar.src = resolved;
      headerAvatar.style.display = 'inline-block';
    }

  // 按角色显示/隐藏“审核”入口（moderator / admin 可见）
    const role = localStorage.getItem('role');
    const approveBtn = this.$('approve-request-button');
    if (approveBtn) {
      const canReview = role === 'admin' || role === 'moderator';
      approveBtn.style.display = canReview ? '' : 'none';
    }

  // 仅非 admin/moderator 隐藏“词元”页入口与面板（admin 与 moderator 可见）
    const tokensTab = this.qs('a[href="#panel_tokens"]')?.parentElement;
    const tokensPanel = this.$('panel_tokens');
    const canViewTokens = (role === 'admin' || role === 'moderator');
    if (!canViewTokens) {
      if (tokensTab) tokensTab.style.display = 'none';
      if (tokensPanel) tokensPanel.style.display = 'none';
    } else {
      if (tokensTab) tokensTab.style.display = '';
      if (tokensPanel) tokensPanel.style.display = '';
    }
  },

  // 统一解析头像地址（相对 -> 绝对）
  resolveAvatarUrl(u) {
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u; // 已是绝对地址
    if (u.startsWith('/')) return this.abs(u);
    return u;
  },

  // 从服务端拉取当前用户资料，若头像变更则更新本地与 UI
  async refreshCurrentUserFromServer() {
    try {
      const id = localStorage.getItem('id');
      if (!id) return;
    const resp = await fetch(this.api('/api/user/' + encodeURIComponent(id)));
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data) return;
      const old = localStorage.getItem('avatar') || '';
      const next = data.avatar || '';
      if (old !== next) {
        localStorage.setItem('avatar', next);
        // 立即刷新两处头像
  const resolved = this.resolveAvatarUrl(next);
  const preview = this.$('sidebar-avatar-preview');
  const headerAvatar = this.$('header-avatar');
        if (preview && resolved) { preview.src = resolved; preview.style.display = 'inline-block'; }
        if (headerAvatar && resolved) { headerAvatar.src = resolved; headerAvatar.style.display = 'inline-block'; }
        // 若头像弹窗开着，也同步一下
  const avatarModalPreview = this.$('avatar-modal-preview');
        if (avatarModalPreview) {
          if (resolved) {
            avatarModalPreview.src = resolved;
            avatarModalPreview.style.display = 'inline-block';
          } else {
            try { avatarModalPreview.removeAttribute('src'); } catch (_) {}
            avatarModalPreview.style.display = 'none';
          }
        }
      }
    } catch (_) { /* 忽略错误 */ }
  },

  // 打开裁剪器
  openAvatarCropper(event) {
  const file = event?.target?.files?.[0];
    if (!file) return;
    if (!/^image\//i.test(file.type)) {
      alert('请选择图片文件');
      return;
    }
  const img = this.$('avatar-crop-image');
    const modalId = 'avatar-crop-modal';
  const cancelBtn = this.$('avatar-crop-cancel');
  const confirmBtn = this.$('avatar-crop-confirm');
  const msg = this.$('avatar-crop-message');
    if (!img || !cancelBtn || !confirmBtn) {
      // 回退：直接上传原图
      this.handleCroppedUpload(file);
      return;
    }
    msg.textContent = '';
    msg.className = 'modal-message';
    // 销毁旧实例
    if (this._cropper) {
      try { this._cropper.destroy(); } catch (_) {}
      this._cropper = null;
    }
    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      // 打开弹窗
      this.showModal(modalId);
      // 等待图片渲染
      setTimeout(() => {
        this._cropper = new window.Cropper(img, {
          viewMode: 1,
          aspectRatio: 1,
          dragMode: 'move',
          autoCropArea: 1,
          background: false,
          guides: false,
          cropBoxResizable: false,
          cropBoxMovable: false,
          toggleDragModeOnDblclick: false,
          movable: true,
          zoomable: true,
          responsive: true,
          minContainerHeight: 320,
          ready: () => {
            try { this._cropper && this._cropper.setDragMode('move'); } catch (_) {}
          }
        });
      }, 50);
    };
    reader.readAsDataURL(file);

    const cleanup = () => {
      if (this._cropper) { try { this._cropper.destroy(); } catch (_) {} this._cropper = null; }
  const input = this.$('upload-avatar-input');
      if (input) input.value = '';
    };
    const onCancel = () => { cleanup(); this.hideModal(modalId); this.showModal('avatar-modal'); };
    const onConfirm = async () => {
      try {
        msg.textContent = '正在裁剪…';
        // 导出 512x512 PNG，若源小则按源尺寸
        const canvas = this._cropper.getCroppedCanvas({ width: 512, height: 512, imageSmoothingQuality: 'high' });
        if (!canvas) throw new Error('裁剪失败');
        canvas.toBlob(async (blob) => {
          if (!blob) { msg.textContent = '导出失败'; msg.className = 'modal-message error'; return; }
          const croppedFile = new File([blob], 'avatar.png', { type: 'image/png' });
          await this.handleCroppedUpload(croppedFile, msg);
          this.hideModal(modalId); cleanup(); this.showModal('avatar-modal');
        }, 'image/png');
      } catch (e) {
        console.error(e);
        msg.textContent = e.message || '裁剪失败';
        msg.className = 'modal-message error';
      }
    };
    // 先移除旧监听，避免叠加
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
  const newCancel = this.$('avatar-crop-cancel');
  const newConfirm = this.$('avatar-crop-confirm');
    newCancel.addEventListener('click', onCancel);
    newConfirm.addEventListener('click', onConfirm);
  },

  // 上传裁剪结果
  async handleCroppedUpload(file, messageEl) {
  const id = localStorage.getItem('id');
    if (!id) {
      alert('请先登录');
      return;
    }
    const form = new FormData();
    form.append('avatar', file);
    form.append('userId', id);
    try {
    messageEl && (messageEl.textContent = '正在上传…');
    const resp = await fetch(this.api('/api/upload/avatar'), { method: 'POST', body: form });
      let data = null;
      try { data = await resp.clone().json(); } catch(_) { /* 忽略，走下方通用错误解析 */ }
      if (!resp.ok) {
        const err = await this.parseErrorResponse(resp);
        throw new Error(err.message || (data && data.message) || '上传失败');
      }
  // 审核流程：不立即替换“当前头像”预览，避免误以为已生效
  // 在“头像”弹窗中提示
    this.showMessage(this.$('avatar-modal-message'), '头像已提交审核，待管理员批准后生效。', 'success');
      messageEl && (messageEl.textContent = '已提交审核');
  // 刷新“审核中头像”预览
  await this.loadPendingAvatarPreview();
    } catch (err) {
      console.error('上传头像失败:', err);
      alert('上传失败：' + err.message);
      messageEl && (messageEl.textContent = '上传失败');
      messageEl && (messageEl.className = 'modal-message error');
    }
  },

  // 拉取并显示个人“审核中头像”
  async loadPendingAvatarPreview() {
    try {
  const userId = localStorage.getItem('id');
  const wrap = this.$('avatar-pending-wrap');
  const img = this.$('avatar-pending-preview');
      if (!userId || !wrap || !img) return;
    const resp = await fetch(this.api('/api/avatar/pending/me?userId=' + encodeURIComponent(userId)));
      if (!resp.ok) throw new Error('load pending failed');
      const data = await resp.json();
      if (data && data.url) {
        img.src = this.abs(data.url);
        wrap.style.display = 'block';
      } else {
        wrap.style.display = 'none';
      }
    } catch (_) {
      const wrap = this.$('avatar-pending-wrap');
      if (wrap) wrap.style.display = 'none';
    }
  },

  bindFormEvents() {
    this.$('updateForm')?.addEventListener('submit', (e) => this.handleUpdateFormSubmit(e));
  },

  toggleSidebar() {
    this.state.sidebarVisible ? this.hideSidebar() : this.showSidebar();
  },

  // 打开账号信息弹窗
  openAccountInfo() {
    try {
      const name = localStorage.getItem('username') || '';
      const id = localStorage.getItem('id') || '';
      const avatar = localStorage.getItem('avatar') || '';
      const resolvedAvatar = this.resolveAvatarUrl(avatar);
      const role = (localStorage.getItem('role') || '').toLowerCase();
      const roleMap = {
        'admin': { text: '管理员', cls: 'badge-admin' },
        'moderator': { text: '版主', cls: 'badge-moderator' },
        'user': { text: '用户', cls: 'badge-user' },
        'guest': { text: '访客', cls: 'badge-guest' }
      };
      const roleInfo = roleMap[role] || { text: '用户', cls: 'badge-user' };
  const nameEl = this.$('account-info-username');
      const nameTextEl = this.$('account-info-username-text');
      const roleEl = this.$('account-info-role');
      const idEl = this.$('account-info-id');
      const avatarEl = this.$('account-info-avatar');
      if (nameEl) nameEl.textContent = name;
      if (nameTextEl) nameTextEl.textContent = name;
      if (idEl) idEl.textContent = id;
      if (avatarEl) {
        if (resolvedAvatar) { avatarEl.src = resolvedAvatar; avatarEl.style.display = 'inline-block'; }
        else { try { avatarEl.removeAttribute('src'); } catch(_){}; avatarEl.style.display = 'none'; }
      }
      if (roleEl) {
        roleEl.textContent = roleInfo.text;
        roleEl.className = 'badge ' + roleInfo.cls;
      }
  // 清空账号信息提示区
  const msg = this.$('account-info-message');
  if (msg) { msg.textContent = ''; msg.className = 'modal-message'; msg.classList.remove('msg-flash'); }
      // 仅绑定一次内联编辑行为
      if (!this._bindUsernameInlineEditOnce) {
        this._bindUsernameInlineEditOnce = true;
        this.setupUsernameInlineEdit();
      }
    } catch(_) {}
    this.showModal('account-info-modal');
  },

  // 统一更新两个用户名显示位置
  refreshUsernameUI(newName) {
    const nameEl = this.$('account-info-username');
    const nameTextEl = this.$('account-info-username-text');
    if (nameEl) nameEl.textContent = newName || '';
    if (nameTextEl) nameTextEl.textContent = newName || '';
  },

  // 账号信息弹窗：用户名内联编辑
  setupUsernameInlineEdit() {
    const nameEl = this.$('account-info-username');
    if (!nameEl) return;
    try { nameEl.classList.add('is-editable'); nameEl.setAttribute('title', '点击编辑用户名'); } catch(_){}

    const startEdit = () => {
      if (this._isEditingUsername) return;
      this._isEditingUsername = true;
      const oldName = nameEl.textContent || '';
      nameEl.setAttribute('contenteditable', 'true');
      nameEl.classList.add('is-editing');
      nameEl.setAttribute('role', 'textbox');
      nameEl.setAttribute('aria-label', '编辑用户名');
      // 聚焦并选中文本
      const sel = window.getSelection && window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(nameEl);
      if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      nameEl.focus();

      const cleanup = () => {
        nameEl.removeAttribute('contenteditable');
        nameEl.classList.remove('is-editing');
        nameEl.removeAttribute('role');
        nameEl.removeAttribute('aria-label');
        this._isEditingUsername = false;
      };

      const doSave = async () => {
        const newName = (nameEl.textContent || '').trim();
  const msgEl = this.$('account-info-message');
        // 若上次失败且内容未变，则不再重复提交
        if (this._usernameSaveFailed && newName === this._usernameLastTried) {
          // 聚焦保持编辑，让用户修改后再尝试
          try { nameEl.focus(); } catch(_){}
          return;
        }
        if (!newName || newName === oldName) { cleanup(); return; }
        const id = localStorage.getItem('id');
        if (!id) { alert('未检测到登录信息'); cleanup(); return; }
        this._savingUsername = true; nameEl.setAttribute('aria-busy', 'true');
        try {
          const resp = await fetch(this.api('/api/update'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, newUsername: newName })
          });
          if (!resp.ok) {
            let msg = '更新失败';
            try { const data = await resp.json(); msg = data && (data.message || msg); } catch(_){}
            // 显示内联错误并记录失败的提交，防止无变化的重复提交
            if (msgEl) {
              msgEl.textContent = msg;
              msgEl.className = 'modal-message error';
              msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash');
              const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); };
              msgEl.addEventListener('animationend', onAnimEnd);
            }
            this._usernameSaveFailed = true; this._usernameLastTried = newName;
            this._savingUsername = false; nameEl.removeAttribute('aria-busy');
            return; // 保持编辑态，允许用户修正
          }
          // 成功：更新本地与 UI
          localStorage.setItem('username', newName);
          this.refreshUsernameUI(newName);
          // 清除失败标记
          this._usernameSaveFailed = false; this._usernameLastTried = '';
          if (msgEl) {
            msgEl.textContent = '已更新';
            msgEl.className = 'modal-message success';
            msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash');
            const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); };
            msgEl.addEventListener('animationend', onAnimEnd);
          }
          this._savingUsername = false; nameEl.removeAttribute('aria-busy');
          cleanup();
        } catch (e) {
          console.error('更新用户名失败:', e);
          if (msgEl) {
            msgEl.textContent = '网络异常，稍后再试';
            msgEl.className = 'modal-message error';
            msgEl.classList.remove('msg-flash'); void msgEl.offsetWidth; msgEl.classList.add('msg-flash');
            const onAnimEnd = () => { msgEl.classList.remove('msg-flash'); msgEl.removeEventListener('animationend', onAnimEnd); };
            msgEl.addEventListener('animationend', onAnimEnd);
          }
          this._usernameSaveFailed = true; this._usernameLastTried = newName;
          this._savingUsername = false; nameEl.removeAttribute('aria-busy');
        }
      };

      const onKey = (ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey) { ev.preventDefault(); doSave(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); cleanup(); }
      };
      const onBlur = () => { if (!this._savingUsername) cleanup(); };
      nameEl.addEventListener('keydown', onKey);
      nameEl.addEventListener('blur', onBlur, { once: true });

      // 文本变更后，移除“重复失败抑制”状态，允许再次提交
      const onInput = () => { if (this._usernameSaveFailed) { this._usernameSaveFailed = false; } };
      nameEl.addEventListener('input', onInput, { once: false });
    };

    // 点击用户名开始编辑
    nameEl.addEventListener('click', startEdit);
    // 键盘可访问：回车开始编辑
    nameEl.setAttribute('tabindex', '0');
    nameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); startEdit(); }
    });
  },

  showSidebar() {
    if (this.state.sidebarVisible) return;
    this.hideAllModals();
    // 打开主菜单前，若账号菜单打开则先关闭
    this.hideAccountMenu();

    const [menu, backdrop] = [this.$('sidebar-menu'), this.$('sidebar-backdrop')];
    if (!menu || !backdrop) return;

    this.state.sidebarVisible = true;
    backdrop.style.display = 'block';
    // 清除可能遗留的 display:none，交给 visibility 控制
    menu.style.display = '';
    menu.classList.add('show');
    requestAnimationFrame(() => backdrop.classList.add('show'));

    // 展开时尝试刷新一次当前用户信息，带动头像更新
    this.refreshCurrentUserFromServer();
  },

  hideSidebar() {
    if (!this.state.sidebarVisible) return;

    const [menu, backdrop] = [this.$('sidebar-menu'), this.$('sidebar-backdrop')];
    if (!menu || !backdrop) return;

    this.state.sidebarVisible = false;
    backdrop.classList.remove('show');
    menu.classList.remove('show');
    setTimeout(() => {
      if (!this.state.sidebarVisible && !this.state.accountMenuVisible) {
        backdrop.style.display = 'none';
        // 不再写入 menu 的 display，避免二次打开不可见
      }
    }, 300);
  },

  // 账号菜单开关
  showAccountMenu() {
    // 打开账号菜单前隐藏主侧边栏（保持单一浮层）
    this.hideSidebar();
    if (this.state.accountMenuVisible) return;
    const [menu, backdrop] = [this.$('account-menu'), this.$('sidebar-backdrop')];
    if (!menu || !backdrop) return;
    this.state.accountMenuVisible = true;
    backdrop.style.display = 'block';
    menu.style.display = '';
    menu.classList.add('show');
    requestAnimationFrame(() => backdrop.classList.add('show'));
    // 确保进入账号菜单时头像最新
    this.refreshCurrentUserFromServer();
  },

  hideAccountMenu() {
    if (!this.state.accountMenuVisible) return;
    const [menu, backdrop] = [this.$('account-menu'), this.$('sidebar-backdrop')];
    if (!menu || !backdrop) return;
    this.state.accountMenuVisible = false;
    backdrop.classList.remove('show');
    menu.classList.remove('show');
    setTimeout(() => {
      if (!this.state.accountMenuVisible && !this.state.sidebarVisible) {
        backdrop.style.display = 'none';
      }
    }, 300);
  },

  showModal(modalId) {
    if (this.state.currentModal === modalId) return;
    // 在整个账户流程中维持“回退到账号菜单”的标记：
    // 若此前已为 true 则保持；否则当打开弹窗时账号菜单可见则置为 true。
    this.state.returnToAccountMenuOnClose = this.state.returnToAccountMenuOnClose || this.state.accountMenuVisible;
    this.hideAllModals();
    this.hideAccountMenu();
    this.hideSidebar();

  const [backdrop, modal] = [this.$('modal-backdrop'), this.$(modalId)];
    if (!backdrop || !modal) return;

    this.state.currentModal = modalId;
    backdrop.style.display = 'block';
    modal.style.display = 'block';

    // 确保每次打开都能触发过渡：移除 show，强制 reflow，再添加
    backdrop.classList.remove('show');
    modal.classList.remove('show');
    try { void backdrop.offsetWidth; void modal.offsetWidth; } catch (_) {}

  const responseMessage = modal.querySelector('#responseMessage');
    if (responseMessage) {
      responseMessage.textContent = '';
      responseMessage.className = 'modal-message';
    }

    // 双 rAF，避免样式合并导致过渡不触发
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        backdrop.classList.add('show');
        modal.classList.add('show');
      });
    });

    this.handleModalSpecialCases(modalId, modal);
  },

  hideModal(modalId) {
    if (this.state.currentModal !== modalId) return;

  const [backdrop, modal] = [this.$('modal-backdrop'), this.$(modalId)];
    if (!backdrop || !modal) return;

    this.state.currentModal = null;
    backdrop.classList.remove('show');
    modal.classList.remove('show');

    setTimeout(() => {
      // 若当前没有其它弹窗，则隐藏遮罩
      if (!this.state.currentModal) {
        backdrop.style.display = 'none';
      }
      // 无论是否有其它弹窗，关闭的这个弹窗都应彻底隐藏
      modal.style.display = 'none';
    }, 300);
  },

  hideAllModals() {
    if (this.state.currentModal) this.hideModal(this.state.currentModal);
  },

  handleModalSpecialCases(modalId, modal) {
    if (modalId === 'update-account-modal') {
      // 清空并聚焦旧密码输入框
      const oldPwd = modal.querySelector('#oldPassword');
      const newPwd = modal.querySelector('#newPassword');
      const confirmPwd = modal.querySelector('#confirmPassword');
      if (oldPwd) oldPwd.value = '';
      if (newPwd) newPwd.value = '';
      if (confirmPwd) confirmPwd.value = '';
      if (oldPwd) oldPwd.focus();
    } else if (modalId === 'approve-user-modal') {
  if (typeof renderApprovals === 'function') renderApprovals();
  // 审核面板打开时，后台可能会修改头像，尝试刷新一次本地缓存
  this.refreshCurrentUserFromServer();
    }
  },

  async handleUpdateFormSubmit(event) {
    event.preventDefault();
    const id = localStorage.getItem('id');
    const token = localStorage.getItem('token');
    const oldPassword = (this.$('oldPassword')?.value || '').trim();
    const newPassword = (this.$('newPassword')?.value || '').trim();
    const confirmPassword = (this.$('confirmPassword')?.value || '').trim();
    const responseMessage = this.$('responseMessage');

    if (!id || !token) { this.showMessage(responseMessage, '未检测到登录信息，请重新登录。', 'error'); return; }
    if (!oldPassword || !newPassword || !confirmPassword) { this.showMessage(responseMessage, '请填写完整。', 'error'); return; }
    if (newPassword.length < 6) { this.showMessage(responseMessage, '新密码至少 6 位。', 'error'); return; }
    if (newPassword !== confirmPassword) { this.showMessage(responseMessage, '两次输入的新密码不一致。', 'error'); return; }

    try {
      this.showMessage(responseMessage, '正在更新...', '');

  const response = await fetch(this.api('/api/change-password'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ id, oldPassword, newPassword })
      });

      if (response.ok) {
        this.showMessage(responseMessage, '密码已更新！请使用新密码重新登录。', 'success');
        setTimeout(() => {
          this.hideModal('update-account-modal');
          this.handleLogout();
        }, 2000);
      } else {
        const err = await this.parseErrorResponse(response);
        this.showMessage(responseMessage, err.message || '更新失败', 'error');
      }
    } catch (error) {
      this.showMessage(responseMessage, '请求失败，请稍后重试。', 'error');
      console.error('请求失败:', error);
    }
  },

  handleLogout() {
    ['token', 'username', 'id'].forEach(key => localStorage.removeItem(key));
    window.location.href = 'login.html';
  },

  showMessage(element, message, type) {
    if (element) {
      element.textContent = message;
      element.className = `modal-message ${type}`;
    }
  }
};

// 初始化：等待 partialsReady 再初始化，避免在拆分后元素尚未插入
document.addEventListener('DOMContentLoaded', () => {
  const ready = window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve();
  ready.then(() => UIManager.init());
});
// 兼容旧引用
window.MenuModalManager = UIManager;

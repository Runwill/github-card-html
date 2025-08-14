// 统一弹窗和菜单管理器
const UIManager = {
  state: { sidebarVisible: false, currentModal: null },

  init() {
    this.bindEvents();
    this.bindMenuActions();
    this.bindFormEvents();
  // 初始化时尝试从服务端刷新一次用户信息（可能刚被管理员通过头像审核）
  this.refreshCurrentUserFromServer();
  },

  bindEvents() {
    // 菜单切换
    document.getElementById('menu-toggle')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSidebar();
    });

    // 背景遮罩点击关闭
    document.getElementById('sidebar-backdrop')?.addEventListener('click', () => this.hideSidebar());
    document.getElementById('modal-backdrop')?.addEventListener('click', () => this.hideAllModals());

    // 阻止内部点击冒泡
    document.getElementById('sidebar-menu')?.addEventListener('click', (e) => e.stopPropagation());
    ['update-account-modal', 'approve-user-modal'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', (e) => e.stopPropagation());
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAllModals();
        this.hideSidebar();
      }
    });
  },

  bindMenuActions() {
    document.getElementById('update-account-button')?.addEventListener('click', () =>
      this.showModal('update-account-modal'));
    document.getElementById('approve-request-button')?.addEventListener('click', () =>
      this.showModal('approve-user-modal'));
    document.getElementById('logout-button')?.addEventListener('click', () => this.handleLogout());

    // 头像上传
    const fileInput = document.getElementById('upload-avatar-input');
    const uploadBtn = document.getElementById('upload-avatar-button');
    // 打开头像弹窗
    uploadBtn?.addEventListener('click', async () => {
      // 打开前先尝试从服务器刷新一次头像（防止审核通过后本地仍旧是旧值）
      await this.refreshCurrentUserFromServer();
      const modal = document.getElementById('avatar-modal');
      const preview = document.getElementById('avatar-modal-preview');
      const saved = localStorage.getItem('avatar');
      if (preview) {
        const resolved = this.resolveAvatarUrl(saved);
        preview.src = resolved || '';
      }
  // 加载个人待审核头像并显示在小预览
  this.loadPendingAvatarPreview();
      this.showModal('avatar-modal');
    });
    // 弹窗中的“上传头像”按钮
    document.getElementById('avatar-modal-upload')?.addEventListener('click', () => fileInput?.click());
    document.getElementById('avatar-modal-close')?.addEventListener('click', () => this.hideModal('avatar-modal'));
    // 文件选择后进入裁剪
    fileInput?.addEventListener('change', (e) => this.openAvatarCropper(e));

    // 头像点击：打开侧边菜单
    document.getElementById('header-avatar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showSidebar();
    });

    // 初始化预览
    const preview = document.getElementById('sidebar-avatar-preview');
    const saved = localStorage.getItem('avatar');
    const resolved = this.resolveAvatarUrl(saved);
    if (preview && resolved) {
      preview.src = resolved;
      preview.style.display = 'inline-block';
    }
    const headerAvatar = document.getElementById('header-avatar');
    if (resolved && headerAvatar) {
      headerAvatar.src = resolved;
      headerAvatar.style.display = 'inline-block';
    }

    // 按角色显示/隐藏“审核”入口（moderator / admin 可见）
    const role = localStorage.getItem('role');
    const approveBtn = document.getElementById('approve-request-button');
    if (approveBtn) {
      const canReview = role === 'admin' || role === 'moderator';
      approveBtn.style.display = canReview ? '' : 'none';
    }

    // 非 admin 隐藏“词元”页入口与面板
    const tokensTab = document.querySelector('a[href="#panel_tokens"]')?.parentElement;
    const tokensPanel = document.getElementById('panel_tokens');
    if (role !== 'admin') {
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
    if (u.startsWith('/uploads/')) return `http://localhost:3000${u}`;
    return u;
  },

  // 从服务端拉取当前用户资料，若头像变更则更新本地与 UI
  async refreshCurrentUserFromServer() {
    try {
      const id = localStorage.getItem('id');
      if (!id) return;
      const resp = await fetch(`http://localhost:3000/api/user/${encodeURIComponent(id)}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data) return;
      const old = localStorage.getItem('avatar') || '';
      const next = data.avatar || '';
      if (old !== next) {
        localStorage.setItem('avatar', next);
        // 立即刷新两处头像
        const resolved = this.resolveAvatarUrl(next);
        const preview = document.getElementById('sidebar-avatar-preview');
        const headerAvatar = document.getElementById('header-avatar');
        if (preview && resolved) { preview.src = resolved; preview.style.display = 'inline-block'; }
        if (headerAvatar && resolved) { headerAvatar.src = resolved; headerAvatar.style.display = 'inline-block'; }
        // 若头像弹窗开着，也同步一下
        const avatarModalPreview = document.getElementById('avatar-modal-preview');
        if (avatarModalPreview && resolved) avatarModalPreview.src = resolved;
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
    const img = document.getElementById('avatar-crop-image');
    const modalId = 'avatar-crop-modal';
    const cancelBtn = document.getElementById('avatar-crop-cancel');
    const confirmBtn = document.getElementById('avatar-crop-confirm');
    const msg = document.getElementById('avatar-crop-message');
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
      const input = document.getElementById('upload-avatar-input');
      if (input) input.value = '';
    };
    const onCancel = () => {
      cleanup();
    this.hideModal(modalId);
    // 返回“头像”弹窗
    this.showModal('avatar-modal');
    };
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
          this.hideModal(modalId);
          cleanup();
      // 返回“头像”弹窗
      this.showModal('avatar-modal');
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
    const newCancel = document.getElementById('avatar-crop-cancel');
    const newConfirm = document.getElementById('avatar-crop-confirm');
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
      const resp = await fetch('http://localhost:3000/api/upload/avatar', { method: 'POST', body: form });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || '上传失败');
  // 审核流程：不立即替换“当前头像”预览，避免误以为已生效
  // 在“头像”弹窗中提示
  this.showMessage(document.getElementById('avatar-modal-message'), '头像已提交审核，待管理员批准后生效。', 'success');
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
      const wrap = document.getElementById('avatar-pending-wrap');
      const img = document.getElementById('avatar-pending-preview');
      if (!userId || !wrap || !img) return;
      const resp = await fetch(`http://localhost:3000/api/avatar/pending/me?userId=${encodeURIComponent(userId)}`);
      if (!resp.ok) throw new Error('load pending failed');
      const data = await resp.json();
      if (data && data.url) {
        const abs = /^https?:\/\//i.test(data.url) ? data.url : `http://localhost:3000${data.url}`;
        img.src = abs;
        wrap.style.display = 'block';
      } else {
        wrap.style.display = 'none';
      }
    } catch (_) {
      const wrap = document.getElementById('avatar-pending-wrap');
      if (wrap) wrap.style.display = 'none';
    }
  },

  bindFormEvents() {
    document.getElementById('updateForm')?.addEventListener('submit', (e) => this.handleUpdateFormSubmit(e));
  },

  toggleSidebar() {
    this.state.sidebarVisible ? this.hideSidebar() : this.showSidebar();
  },

  showSidebar() {
    if (this.state.sidebarVisible) return;
    this.hideAllModals();

    const [menu, backdrop] = [document.getElementById('sidebar-menu'), document.getElementById('sidebar-backdrop')];
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

    const [menu, backdrop] = [document.getElementById('sidebar-menu'), document.getElementById('sidebar-backdrop')];
    if (!menu || !backdrop) return;

    this.state.sidebarVisible = false;
    backdrop.classList.remove('show');
    menu.classList.remove('show');
    setTimeout(() => {
      if (!this.state.sidebarVisible) {
        backdrop.style.display = 'none';
        // 不再写入 menu 的 display，避免二次打开不可见
      }
    }, 300);
  },

  showModal(modalId) {
    if (this.state.currentModal === modalId) return;
    this.hideAllModals();
    this.hideSidebar();

    const [backdrop, modal] = [document.getElementById('modal-backdrop'), document.getElementById(modalId)];
    if (!backdrop || !modal) return;

    this.state.currentModal = modalId;
    backdrop.style.display = 'block';
    modal.style.display = 'block';

    const responseMessage = modal.querySelector('#responseMessage');
    if (responseMessage) {
      responseMessage.textContent = '';
      responseMessage.className = 'modal-message';
    }

    requestAnimationFrame(() => {
      backdrop.classList.add('show');
      modal.classList.add('show');
    });

    this.handleModalSpecialCases(modalId, modal);
  },

  hideModal(modalId) {
    if (this.state.currentModal !== modalId) return;

    const [backdrop, modal] = [document.getElementById('modal-backdrop'), document.getElementById(modalId)];
    if (!backdrop || !modal) return;

    this.state.currentModal = null;
    backdrop.classList.remove('show');
    modal.classList.remove('show');

    setTimeout(() => {
      if (!this.state.currentModal) {
        backdrop.style.display = 'none';
        modal.style.display = 'none';
      }
    }, 300);
  },

  hideAllModals() {
    if (this.state.currentModal) this.hideModal(this.state.currentModal);
  },

  handleModalSpecialCases(modalId, modal) {
    if (modalId === 'update-account-modal') {
      const input = modal.querySelector('#newUsername');
      if (input) {
        input.value = localStorage.getItem('username') || '';
        input.focus();
      }
    } else if (modalId === 'approve-user-modal') {
      if (typeof renderApprovals === 'function') renderApprovals();
  // 审核面板打开时，后台可能会修改头像，尝试刷新一次本地缓存
  this.refreshCurrentUserFromServer();
    }
  },

  async handleUpdateFormSubmit(event) {
    event.preventDefault();
    const [id, username, password] = [
      localStorage.getItem('id'),
      document.getElementById('newUsername').value.trim(),
      document.getElementById('newPassword').value.trim()
    ];
    const responseMessage = document.getElementById('responseMessage');

    if (!username || !password) {
      this.showMessage(responseMessage, '用户名和密码不能为空。', 'error');
      return;
    }
    if (!id) {
      this.showMessage(responseMessage, '未检测到登录信息，请重新登录。', 'error');
      return;
    }

    try {
      this.showMessage(responseMessage, '正在更新...', '');

      const response = await fetch('http://localhost:3000/api/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newUsername: username, newPassword: password })
      });

      if (response.ok) {
        this.showMessage(responseMessage, '更新成功！', 'success');
        localStorage.setItem('username', username);
        setTimeout(() => this.hideModal('update-account-modal'), 3000);
      } else {
        const errorData = await response.json();
        this.showMessage(responseMessage, errorData.message || '更新失败', 'error');
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

// 初始化
document.addEventListener('DOMContentLoaded', () => UIManager.init());
// 兼容旧引用
window.MenuModalManager = UIManager;

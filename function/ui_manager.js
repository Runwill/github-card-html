// 统一弹窗和菜单管理器
const UIManager = {
  state: { sidebarVisible: false, currentModal: null },

  init() {
    this.bindEvents();
    this.bindMenuActions();
    this.bindFormEvents();
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
    uploadBtn?.addEventListener('click', () => {
      const modal = document.getElementById('avatar-modal');
      const preview = document.getElementById('avatar-modal-preview');
      const saved = localStorage.getItem('avatar');
      if (preview) {
        preview.src = saved || '';
        if (saved && saved.startsWith('/uploads/')) {
          preview.src = `http://localhost:3000${saved}`;
        }
      }
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
    // 将旧的相对路径头像转换为绝对 URL
    const resolveAvatarUrl = (u) => {
      if (!u) return '';
      if (/^https?:\/\//i.test(u)) return u; // 已是绝对地址
      if (u.startsWith('/uploads/')) return `http://localhost:3000${u}`;
      return u;
    };
    const resolved = resolveAvatarUrl(saved);
    if (preview && resolved) {
      preview.src = resolved;
      preview.style.display = 'inline-block';
    }
    const headerAvatar = document.getElementById('header-avatar');
    if (resolved && headerAvatar) {
      headerAvatar.src = resolved;
      headerAvatar.style.display = 'inline-block';
    }
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
      const url = data.url; // 服务端返回绝对 URL
      localStorage.setItem('avatar', url);
      const preview = document.getElementById('sidebar-avatar-preview');
      const headerAvatar = document.getElementById('header-avatar');
  const modalPreview = document.getElementById('avatar-modal-preview');
      if (preview) { preview.src = url; preview.style.display = 'inline-block'; }
      if (headerAvatar) { headerAvatar.src = url; headerAvatar.style.display = 'inline-block'; }
  if (modalPreview) { modalPreview.src = url; }
      this.showMessage(document.getElementById('responseMessage'), '头像已更新', 'success');
      messageEl && (messageEl.textContent = '完成');
    } catch (err) {
      console.error('上传头像失败:', err);
      alert('上传失败：' + err.message);
      messageEl && (messageEl.textContent = '上传失败');
      messageEl && (messageEl.className = 'modal-message error');
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
    } else if (modalId === 'approve-user-modal' && typeof renderPendingUsers === 'function') {
      renderPendingUsers();
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

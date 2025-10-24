// 头像裁剪、上传与待审预览控制器（集成 Cropper 及上传流程）。
// CardUI Manager Controllers - avatar upload & crop
(function(){
  'use strict';
  var w = (typeof window !== 'undefined') ? window : this;
  w.CardUI = w.CardUI || {};
  w.CardUI.Manager = w.CardUI.Manager || {};
  w.CardUI.Manager.Core = w.CardUI.Manager.Core || {};
  w.CardUI.Manager.Controllers = w.CardUI.Manager.Controllers || {};

  var dom = (w.CardUI.Manager.Core.dom) || {};
  var errors = (w.CardUI.Manager.Core.errors) || {};
  var messages = (w.CardUI.Manager.Core.messages) || {};

  var $ = dom.$ || function(id){ return document.getElementById(id); };
  var abs = dom.abs || function(u){ return u; };
  var api = dom.api || function(u){ return u; };
  var resolveAvatarUrl = dom.resolveAvatarUrl || function(u){ return u || ''; };
  var showMessage = messages.showMessage || function(el, msg, type){ if(el){ el.textContent = msg; el.className = 'modal-message ' + (type||''); } };
  var parseErrorResponse = errors.parseErrorResponse || (async function(resp){ try{ var d = await resp.clone().json(); return { message: (d && d.message) || '', data: d }; } catch(_){ return { message: 'error', data: null }; }});

  var cropper = null;

  function openAvatarCropper(event){
    var file = (event && event.target && event.target.files && event.target.files[0]) || null;
    if (!file) return;
    if (!/^image\//i.test(file.type)) { alert(t('alert.selectImage')); return; }
    var img = $('avatar-crop-image');
    var modalId = 'avatar-crop-modal';
    var cancelBtn = $('avatar-crop-cancel');
    var confirmBtn = $('avatar-crop-confirm');
    var msg = $('avatar-crop-message');
    if (!img || !cancelBtn || !confirmBtn) { return handleCroppedUpload(file); }
    msg.textContent = '';
    msg.className = 'modal-message';
    if (cropper) { try { cropper.destroy(); } catch(_){ } cropper = null; }
    var reader = new FileReader();
    reader.onload = function(){
      img.src = reader.result;
      try { w.CardUI.Manager.Controllers.modal && w.CardUI.Manager.Controllers.modal.showModal(modalId); } catch(_){ }
      setTimeout(function(){
        try {
          cropper = new w.Cropper(img, { viewMode: 1, aspectRatio: 1, dragMode: 'move', autoCropArea: 1, background: false, guides: false, cropBoxResizable: false, cropBoxMovable: false, toggleDragModeOnDblclick: false, movable: true, zoomable: true, responsive: true, minContainerHeight: 320, ready: function(){ try { cropper && cropper.setDragMode('move'); } catch(_){ } } });
        } catch(_){ }
      }, 50);
    };
    reader.readAsDataURL(file);
    var cleanup = function(){ if (cropper) { try { cropper.destroy(); } catch(_){ } cropper = null; } var input = $('upload-avatar-input'); if (input) input.value = ''; };
    var onCancel = function(){ cleanup(); try { w.CardUI.Manager.Controllers.modal && w.CardUI.Manager.Controllers.modal.hideModal(modalId); } catch(_){ } try { w.CardUI.Manager.Controllers.modal && w.CardUI.Manager.Controllers.modal.showModal('avatar-modal'); } catch(_){ } };
    var onConfirm = function(){
      try {
        msg.textContent = t('status.cropping');
        var canvas = cropper && cropper.getCroppedCanvas({ width: 512, height: 512, imageSmoothingQuality: 'high' });
        if (!canvas) throw new Error(t('error.cropFailed'));
        canvas.toBlob(function(blob){
          if (!blob) { msg.textContent = t('error.exportFailed'); msg.className = 'modal-message error'; return; }
          var croppedFile = new File([blob], 'avatar.png', { type: 'image/png' });
          handleCroppedUpload(croppedFile, msg).then(function(){
            try { w.CardUI.Manager.Controllers.modal && w.CardUI.Manager.Controllers.modal.hideModal(modalId); } catch(_){ }
            cleanup();
            try { w.CardUI.Manager.Controllers.modal && w.CardUI.Manager.Controllers.modal.showModal('avatar-modal'); } catch(_){ }
          });
        }, 'image/png');
      } catch (e) {
        console.error(e);
        msg.textContent = e.message || t('error.cropFailed');
        msg.className = 'modal-message error';
      }
    };
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    $('avatar-crop-cancel').addEventListener('click', onCancel);
    $('avatar-crop-confirm').addEventListener('click', onConfirm);
  }

  async function handleCroppedUpload(file, messageEl){
    var id = (w.localStorage && w.localStorage.getItem('id')) || '';
    if (!id) { alert(t('alert.loginFirst')); return; }
    var form = new FormData();
    form.append('avatar', file);
    form.append('userId', id);
    try {
      if (messageEl) messageEl.textContent = t('status.uploading');
      var resp = await fetch(api('/api/upload/avatar'), { method: 'POST', body: form });
      var data = null; try { data = await resp.clone().json(); } catch(_){ }
      if (!resp.ok) { var err = await parseErrorResponse(resp); throw new Error(err.message || (data && data.message) || t('error.uploadFailed')); }
      if (data && data.applied) {
        if (typeof data.relativeUrl === 'string' && w.localStorage) w.localStorage.setItem('avatar', data.relativeUrl);
        var resolved = resolveAvatarUrl(w.localStorage ? w.localStorage.getItem('avatar') : '');
        var preview = $('avatar-modal-preview'); if (preview && resolved) { preview.src = resolved; preview.style.display = 'inline-block'; }
        try {
          var sidebarPrev = $('sidebar-avatar-preview'); var headerAvatar = $('header-avatar');
          if (sidebarPrev && resolved) { sidebarPrev.src = resolved; sidebarPrev.style.display = 'inline-block'; }
          if (headerAvatar && resolved) { headerAvatar.src = resolved; headerAvatar.style.display = 'inline-block'; }
        } catch(_){ }
        showMessage($('avatar-modal-message'), t('success.avatarUpdatedImmediate'), 'success');
        if (messageEl) messageEl.textContent = t('status.updated');
        var wrap = $('avatar-pending-wrap'); if (wrap) wrap.style.display = 'none';
      } else {
        showMessage($('avatar-modal-message'), t('success.avatarSubmitted'), 'success');
        if (messageEl) messageEl.textContent = t('status.submitted');
        await loadPendingAvatarPreview();
      }
    } catch(err){
      console.error(t('error.uploadFailedPrefix'), err);
      var prefix = t('error.uploadFailedPrefix');
      try { alert(prefix + (err && err.message ? err.message : '')); } catch(_){ }
      if (messageEl) { messageEl.textContent = t('error.uploadFailed'); messageEl.className = 'modal-message error'; }
    }
  }

  async function loadPendingAvatarPreview(){
    try {
      var userId = w.localStorage ? w.localStorage.getItem('id') : '';
      var wrap = $('avatar-pending-wrap');
      var img = $('avatar-pending-preview');
      if (!userId || !wrap || !img) return;
      var resp = await fetch(api('/api/avatar/pending/me?userId=' + encodeURIComponent(userId)));
      if (!resp.ok) throw new Error('load pending failed');
      var data = await resp.json();
      if (data && data.url) { img.src = abs(data.url); wrap.style.display = 'block'; }
      else { wrap.style.display = 'none'; }
    } catch(_){ var wrap2 = $('avatar-pending-wrap'); if (wrap2) wrap2.style.display = 'none'; }
  }

  w.CardUI.Manager.Controllers.avatar = {
    openAvatarCropper: openAvatarCropper,
    handleCroppedUpload: handleCroppedUpload,
    loadPendingAvatarPreview: loadPendingAvatarPreview
  };
})();

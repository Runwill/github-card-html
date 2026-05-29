// 头像裁剪、上传与待审预览控制器（集成 Cropper 及上传流程）。
// CardUI Manager Controllers - avatar upload & crop
  'use strict';
  var w = window;
  var dom = w.CardUI.Manager.Core.dom;
  var errors = w.CardUI.Manager.Core.errors;
  var messages = w.CardUI.Manager.Core.messages;

  var $ = dom.$;
  var abs = dom.abs;
  var api = dom.api;
  var resolveAvatarUrl = dom.resolveAvatarUrl;
  var setImageSrc = dom.setImageSrc;
  var setImagesSrc = dom.setImagesSrc;
  var showMessage = messages.showMessage;
  var parseErrorResponse = errors.parseErrorResponse;
  var requestJson = w.endpoints && w.endpoints.requestJson;

  var cropper = null;
  var storageValue = key => w.endpoints?.storageGet?.(key) || '';

  function openAvatarCropper(event){
    var file = (event && event.target && event.target.files && event.target.files[0]) || null;
    if (!file) return;
    /* 立即清空 input，使选择同一文件时 change 仍能触发 */
    if (event.target) event.target.value = '';
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
      try { w.CardUI.Manager.Controllers.overlay.open(modalId); } catch(_){ }
      setTimeout(function(){
        try {
          cropper = new w.Cropper(img, { viewMode: 1, aspectRatio: 1, dragMode: 'move', autoCropArea: 1, background: false, guides: false, cropBoxResizable: false, cropBoxMovable: false, toggleDragModeOnDblclick: false, movable: true, zoomable: true, responsive: true, minContainerHeight: 320, ready: function(){ try { cropper && cropper.setDragMode('move'); } catch(_){ } } });
        } catch(_){ }
      }, 50);
    };
    reader.readAsDataURL(file);
    var cleanup = function(){ if (cropper) { try { cropper.destroy(); } catch(_){ } cropper = null; } var input = $('upload-avatar-input'); if (input) input.value = ''; };
    var onCancel = function(){ cleanup(); try { w.CardUI.Manager.Controllers.overlay.back(); } catch(_){ } };
    var onConfirm = function(){
      try {
        msg.textContent = t('status.cropping');
        var canvas = cropper && cropper.getCroppedCanvas({ width: 512, height: 512, imageSmoothingQuality: 'high' });
        if (!canvas) throw new Error(t('error.cropFailed'));
        canvas.toBlob(function(blob){
          if (!blob) { msg.textContent = t('error.exportFailed'); msg.className = 'modal-message error'; return; }
          var croppedFile = new File([blob], 'avatar.png', { type: 'image/png' });
          handleCroppedUpload(croppedFile, msg).then(function(){
            cleanup();
            try { w.CardUI.Manager.Controllers.overlay.back(); } catch(_){ }
          });
        }, 'image/png');
      } catch (e) {
        console.error(e);
        msg.textContent = e.message || t('error.cropFailed');
        msg.className = 'modal-message error';
      }
    };
    cancelBtn.onclick = onCancel;
    confirmBtn.onclick = onConfirm;
  }

  async function handleCroppedUpload(file, messageEl){
    var id = storageValue('id');
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
        var resolved = resolveAvatarUrl(storageValue('avatar'));
        if (resolved) setImagesSrc(['avatar-modal-preview', 'sidebar-avatar-preview', 'header-avatar'], resolved);
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
      var userId = storageValue('id');
      var wrap = $('avatar-pending-wrap');
      var img = $('avatar-pending-preview');
      if (!userId || !wrap || !img) return;
      var data = await requestJson('/avatar/pending/me?userId=' + encodeURIComponent(userId));
      if (data && data.url) { setImageSrc(img, abs(data.url)); wrap.style.display = 'flex'; }
      else { wrap.style.display = 'none'; }
    } catch(_){ var wrap2 = $('avatar-pending-wrap'); if (wrap2) wrap2.style.display = 'none'; }
  }

  w.CardUI.Manager.Controllers.avatar = {
    openAvatarCropper: openAvatarCropper,
    handleCroppedUpload: handleCroppedUpload,
    loadPendingAvatarPreview: loadPendingAvatarPreview
  };

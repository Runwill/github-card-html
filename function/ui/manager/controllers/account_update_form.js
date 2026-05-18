// 账户更新（修改密码）表单提交流程控制器。
// CardUI Manager Controllers - account update form (change password)
(function(){
  'use strict';
  var w = window;
  var dom = w.CardUI.Manager.Core.dom;
  var messages = w.CardUI.Manager.Core.messages;
  var $ = dom.$;
  var requestJson = w.endpoints && w.endpoints.requestJson;
  var showMessage = messages.showMessage;

  function fieldValue(id){ var el = $(id); return ((el && el.value) || '').trim(); }

  async function handleUpdateFormSubmit(event){
    event.preventDefault();
    var id = (w.localStorage && w.localStorage.getItem('id')) || '';
    var token = (w.localStorage && w.localStorage.getItem('token')) || '';
    var oldPassword = fieldValue('oldPassword'), newPassword = fieldValue('newPassword'), confirmPassword = fieldValue('confirmPassword');
    var responseMessage = $('response-message');
    if (!id || !token) { showMessage(responseMessage, t('error.noLogin'), 'error'); return; }
    if (!oldPassword || !newPassword || !confirmPassword) { showMessage(responseMessage, t('error.fillAll'), 'error'); return; }
    if (newPassword.length < 6) { showMessage(responseMessage, t('error.pwdMin'), 'error'); return; }
    if (newPassword !== confirmPassword) { showMessage(responseMessage, t('error.pwdNotMatch'), 'error'); return; }
    try {
      showMessage(responseMessage, t('status.updating'), '');
      await requestJson('/change-password', { method: 'PUT', auth: true, body: { id: id, oldPassword: oldPassword, newPassword: newPassword }, defaultMessage: t('error.updateFailed') });
      showMessage(responseMessage, t('success.pwdUpdated'), 'success');
      setTimeout(function(){ try { w.CardUI.Manager.Controllers.overlay.closeAll(); } catch(_){ } w.location.href = 'login.html'; }, 2000);
    } catch(error){
      showMessage(responseMessage, error && error.status ? (error.message || t('error.updateFailed')) : t('error.requestFailed'), 'error');
      if (!(error && error.status)) console.error(t('error.requestFailedPrefix'), error);
    }
  }

  w.CardUI.Manager.Controllers.accountUpdateForm = { handleUpdateFormSubmit: handleUpdateFormSubmit };
})();

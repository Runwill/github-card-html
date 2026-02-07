// 账户更新（修改密码）表单提交流程控制器。
// CardUI Manager Controllers - account update form (change password)
(function(){
  'use strict';
  var w = window;
  var dom = (w.CardUI.Manager.Core.dom) || {};
  var messages = (w.CardUI.Manager.Core.messages) || {};
  var $ = dom.$ || function(id){ return document.getElementById(id); };
  var api = dom.api || function(u){ return u; };
  var showMessage = messages.showMessage || function(el, msg, type){ if(el){ el.textContent = msg; el.className = 'modal-message ' + (type||''); } };

  async function handleUpdateFormSubmit(event){
    event.preventDefault();
    var id = (w.localStorage && w.localStorage.getItem('id')) || '';
    var token = (w.localStorage && w.localStorage.getItem('token')) || '';
    var oldPassword = (($('oldPassword') && $('oldPassword').value) || '').trim();
    var newPassword = (($('newPassword') && $('newPassword').value) || '').trim();
    var confirmPassword = (($('confirmPassword') && $('confirmPassword').value) || '').trim();
    var responseMessage = $('responseMessage');
    if (!id || !token) { showMessage(responseMessage, t('error.noLogin'), 'error'); return; }
    if (!oldPassword || !newPassword || !confirmPassword) { showMessage(responseMessage, t('error.fillAll'), 'error'); return; }
    if (newPassword.length < 6) { showMessage(responseMessage, t('error.pwdMin'), 'error'); return; }
    if (newPassword !== confirmPassword) { showMessage(responseMessage, t('error.pwdNotMatch'), 'error'); return; }
    try {
      showMessage(responseMessage, t('status.updating'), '');
      var response = await fetch(api('/api/change-password'), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ id: id, oldPassword: oldPassword, newPassword: newPassword }) });
      if (response.ok) {
        showMessage(responseMessage, t('success.pwdUpdated'), 'success');
        setTimeout(function(){ try { w.CardUI.Manager.Controllers.overlay.closeAll(); } catch(_){ } w.location.href = 'login.html'; }, 2000);
      } else {
        var errMsg = '';
        try { var data = await response.json(); errMsg = (data && data.message) || ''; } catch(_){ }
        showMessage(responseMessage, errMsg || t('error.updateFailed'), 'error');
      }
    } catch(error){
      showMessage(responseMessage, t('error.requestFailed'), 'error');
      console.error(t('error.requestFailedPrefix'), error);
    }
  }

  w.CardUI.Manager.Controllers.accountUpdateForm = { handleUpdateFormSubmit: handleUpdateFormSubmit };
})();

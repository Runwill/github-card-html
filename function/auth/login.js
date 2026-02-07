// 登录与注册页逻辑（独立于首页）
document.addEventListener('DOMContentLoaded', () => {
  // 入场动画：与首页 panel/modal 一致
  const panel = document.getElementById('login-container');
  requestAnimationFrame(() => panel && panel.classList.add('show'));
});

function applyMessageType(el, type) {
  el.className = 'modal-message';
  if (type) { try { el.classList.add(type); } catch(_){ el.className = `modal-message ${type}`; } }
}

function setMessage(text, type) {
  const el = document.getElementById('login-message');
  if (!el) return;
  try { delete el.dataset.i18nKey; delete el.dataset.i18nParams; } catch(_){}
  el.textContent = text || '';
  applyMessageType(el, type);
}

function setMessageKey(key, params, type){
  const el = document.getElementById('login-message');
  if (!el) return;
  try {
    el.dataset.i18nKey = String(key || '');
    if (params) { el.dataset.i18nParams = JSON.stringify(params); } else { delete el.dataset.i18nParams; }
  } catch(_){}
  try { el.textContent = window.t(key, params); } catch(_) { el.textContent = String(key || ''); }
  applyMessageType(el, type);
}

// 监听语言切换，若当前消息基于 i18n 键，则自动刷新
try{
  window.addEventListener('i18n:changed', ()=>{
    const el = document.getElementById('login-message');
    if (!el) return;
    const key = el.dataset && el.dataset.i18nKey;
    if (!key) return;
    let params = undefined;
    try { if (el.dataset.i18nParams) params = JSON.parse(el.dataset.i18nParams); } catch(_){}
    try { el.textContent = window.t(key, params); } catch(_){}
  });
}catch(_){}

function apiUrl(path) { return (typeof endpoints !== 'undefined' && endpoints && endpoints.api) ? endpoints.api(path) : path; }

function shakePanel() {
  const panel = document.getElementById('login-container');
  if (panel) { panel.classList.remove('shake'); void panel.offsetWidth; panel.classList.add('shake'); }
}

// 通用表单提交：发送 POST 请求，处理成功/失败/异常/shake
async function postForm(path, body, onOk, failKey, errorKey) {
  const loginBtn = document.getElementById('login-button');
  const registerBtn = document.getElementById('register-button');
  loginBtn.disabled = true; registerBtn.disabled = true;
  try {
    const response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (response.ok) {
      await onOk(data);
    } else {
      if (data && data.message) { setMessage(data.message, 'error'); }
      else { setMessageKey(failKey, null, 'error'); }
      shakePanel();
    }
  } catch (err) {
    console.error(err);
    setMessageKey(errorKey, null, 'error');
  } finally {
    loginBtn.disabled = false; registerBtn.disabled = false;
  }
}

// 登录功能
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    setMessageKey('login.loggingIn');
    await postForm('/api/login', { username, password }, async (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('id', data.user.id);
      localStorage.setItem('username', data.user.username);
      localStorage.setItem('role', data.user.role);
      if (data.user.createdAt) { localStorage.setItem('createdAt', data.user.createdAt); }
      if (data.user.intro !== undefined) { localStorage.setItem('intro', data.user.intro || ''); }
      if (data.user.avatar !== undefined) { localStorage.setItem('avatar', data.user.avatar || ''); }
      setMessageKey('login.success', null, 'success');
      try { await new Promise(r => setTimeout(r, 60)); } catch(_){}
      window.location.href = 'index.html';
    }, 'login.failed', 'login.failedRetry');
  });
}

// 注册功能
const registerBtn = document.getElementById('register-button');
if (registerBtn) {
  registerBtn.addEventListener('click', async function () {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (!username || !password) { setMessageKey('register.needUserPass', null, 'error'); return; }
    await postForm('/api/register', { username, password }, (data) => {
      if (data && data.message) { setMessage(data.message, 'success'); }
      else { setMessageKey('register.success', null, 'success'); }
    }, 'register.fail', 'register.failRetry');
  });
}

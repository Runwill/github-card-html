// 登录与注册页逻辑（独立于首页）
document.addEventListener('DOMContentLoaded', () => {
  // 入场动画：与首页 panel/modal 一致
  const panel = document.getElementById('login-container');
  requestAnimationFrame(() => panel && panel.classList.add('show'));
});

function setMessage(text, type) {
  const el = document.getElementById('login-message');
  if (!el) return;
  // 清除已存的 i18n 键，转而显示原始文本
  try { delete el.dataset.i18nKey; delete el.dataset.i18nParams; } catch(_){}
  el.textContent = text || '';
  // 统一先重置样式再赋予类型，避免残留 error/success
  el.className = 'modal-message';
  try { el.classList.remove('error','success'); } catch(_){}
  if (type) {
    try { el.classList.add(type); } catch(_){ el.className = `modal-message ${type}`; }
  }
}

// 使用 i18n 键设置消息，并在语言切换时自动更新
function setMessageKey(key, params, type){
  const el = document.getElementById('login-message');
  if (!el) return;
  try {
    el.dataset.i18nKey = String(key || '');
    if (params) { el.dataset.i18nParams = JSON.stringify(params); } else { delete el.dataset.i18nParams; }
  } catch(_){}
  try { el.textContent = window.t(key, params); } catch(_) { el.textContent = String(key || ''); }
  // 统一先重置样式再赋予类型
  el.className = 'modal-message';
  try { el.classList.remove('error','success'); } catch(_){}
  if (type) {
    try { el.classList.add(type); } catch(_){ el.className = `modal-message ${type}`; }
  }
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

// 登录功能
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-button');
    const registerBtn = document.getElementById('register-button');
    loginBtn.disabled = true; registerBtn.disabled = true;
  setMessageKey('login.loggingIn');

    try {
  const response = await fetch((endpoints && endpoints.api ? endpoints.api('/api/login') : '/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
  if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('id', data.user.id);
        localStorage.setItem('username', data.user.username);
  localStorage.setItem('role', data.user.role);
  if (data.user.intro !== undefined) { localStorage.setItem('intro', data.user.intro || ''); }
        if (data.user.avatar !== undefined) { localStorage.setItem('avatar', data.user.avatar || ''); }
  setMessageKey('login.success', null, 'success');
    // 给予浏览器一次重绘机会，避免上一条错误样式残留（与注册成功的视觉一致）
    try { await new Promise(r => setTimeout(r, 60)); } catch(_){}
    window.location.href = 'index.html';
      } else {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          setMessage(errorData.message, 'error');
        } else {
          setMessageKey('login.failed', null, 'error');
        }
        const panel = document.getElementById('login-container');
        if (panel) { panel.classList.remove('shake'); void panel.offsetWidth; panel.classList.add('shake'); }
      }
    } catch (err) {
  console.error('登录失败:', err);
  setMessageKey('login.failedRetry', null, 'error');
    } finally {
      loginBtn.disabled = false; registerBtn.disabled = false;
    }
  });
}

// 注册功能
const registerBtn = document.getElementById('register-button');
if (registerBtn) {
  registerBtn.addEventListener('click', async function () {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (!username || !password) { setMessageKey('register.needUserPass', null, 'error'); return; }
    try {
  const response = await fetch((endpoints && endpoints.api ? endpoints.api('/api/register') : '/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        if (data && data.message) {
          setMessage(data.message, 'success');
        } else {
          setMessageKey('register.success', null, 'success');
        }
      } else {
        if (data && data.message) {
          setMessage(data.message, 'error');
        } else {
          setMessageKey('register.fail', null, 'error');
        }
        const panel = document.getElementById('login-container');
        if (panel) { panel.classList.remove('shake'); void panel.offsetWidth; panel.classList.add('shake'); }
      }
    } catch (error) {
  console.error('注册请求失败:', error);
  setMessageKey('register.failRetry', null, 'error');
    }
  });
}

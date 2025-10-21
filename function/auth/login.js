// 登录与注册页逻辑（独立于首页）
document.addEventListener('DOMContentLoaded', () => {
  // 入场动画：与首页 panel/modal 一致
  const panel = document.getElementById('login-container');
  requestAnimationFrame(() => panel && panel.classList.add('show'));
});

function setMessage(text, type) {
  const el = document.getElementById('login-message');
  if (!el) return;
  el.textContent = text || '';
  el.className = `modal-message${type ? ' ' + type : ''}`;
}

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
    setMessage('正在登录…');

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
        setMessage('登录成功！', 'success');
        window.location.href = 'index.html';
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || '登录失败', 'error');
        const panel = document.getElementById('login-container');
        if (panel) { panel.classList.remove('shake'); void panel.offsetWidth; panel.classList.add('shake'); }
      }
    } catch (err) {
      console.error('登录失败:', err);
      setMessage('登录失败，请稍后再试', 'error');
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
    if (!username || !password) { setMessage('请输入用户名和密码进行注册', 'error'); return; }
    try {
  const response = await fetch((endpoints && endpoints.api ? endpoints.api('/api/register') : '/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(data.message || '注册成功', 'success');
      } else {
        setMessage(data.message || '注册失败', 'error');
        const panel = document.getElementById('login-container');
        if (panel) { panel.classList.remove('shake'); void panel.offsetWidth; panel.classList.add('shake'); }
      }
    } catch (error) {
      console.error('注册请求失败:', error);
      setMessage('注册失败，请稍后重试。', 'error');
    }
  });
}

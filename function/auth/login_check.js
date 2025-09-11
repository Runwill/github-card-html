// 页面加载时检查登录状态（非登录页）
document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem('token');
  // 无 token 直接跳转
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // 简易 JWT 过期检查（不校验签名，仅读取 exp）
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload && payload.exp) {
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec >= Number(payload.exp)) {
          // 过期：清理并跳转
          localStorage.removeItem('token');
          localStorage.removeItem('id');
          localStorage.removeItem('username');
          localStorage.removeItem('role');
          localStorage.removeItem('avatar');
          window.location.href = 'login.html';
          return;
        }
      }
    }
  } catch (_) {
    // 解析异常，视为未登录
    window.location.href = 'login.html';
  }
});

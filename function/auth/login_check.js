// 页面加载时检查登录状态（非登录页）
document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem('token');
  if (!token) {
    // 如果没有登录令牌，跳转到登录页面
    window.location.href = 'login.html';
  }
});

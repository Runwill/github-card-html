// 轻量入口：将老式 <script src=".../permissions.js"> 替换为一次性加载 ES Module 聚合文件
// 不再逐个 <script> 动态插入子文件，避免“这种引用方法”带来的维护和 CSP 风险。
// 现状：保持对现有 HTML 的兼容（仍可引用 permissions.js），内部会自动注入一次模块文件。
(function (w) {
  if (w.__TokensPermModuleBootstrapLoaded) return;
  w.__TokensPermModuleBootstrapLoaded = true;

  try {
    const cur = document.currentScript;
    // 计算模块聚合文件路径：permissions.module.js 与本文件同目录
    const base = (cur && cur.src) || 'function/admin/permissions.js';
    const moduleSrc = base.replace(/permissions\.js(\?.*)?$/, 'permissions.module.js');

    const s = document.createElement('script');
    s.type = 'module';
    s.src = moduleSrc;
    s.onerror = () => console.error('[permissions] 模块入口加载失败：', s.src);
    document.head.appendChild(s);
  } catch (e) {
    console.error('[permissions] 启动模块入口异常：', e);
  }
})(window);

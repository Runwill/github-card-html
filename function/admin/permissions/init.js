const w = window;
  const ns = w.TokensPerm = w.TokensPerm || {};

  const API = ns.API || {};
  // 事件绑定已在 render.js 内部完成，这里不再重复绑定，避免重复触发

  // 提前在后台渲染一次权限列表：
  // 1) 等待 HTML 分片加载完成，确保 #panel_permissions/#perm-list 已存在
  // 2) 仅在用户为管理员时执行
  // 3) 这样点击“权限”页签时，用户行已在 DOM 中，避免“先空白再突然出现”的体验
  whenReady(()=>{
    if (!API.isAdmin?.()) return;
    const panel = document.getElementById('panel_permissions');
    const list = document.getElementById('perm-list');
    if (panel && list && typeof ns.renderPermissionsPanel === 'function') {
      try { ns.renderPermissionsPanel(''); } catch(_){ }
    }
  }).catch(()=>{});

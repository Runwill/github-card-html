(function(){
  // permissions/logs/logs_data — 数据层: 日志获取、事件绑定、语言切换
  // UI factory 在 logs.js 中，通过 TokensPerm._LogsUI 共享
  const { jsonGet: apiGet, jsonDelete: apiDelete, jsonPatch: apiPatch, isAdmin, hasToken } = window.TokensPerm.API;
  const UI = window.TokensPerm._LogsUI;
  const RenderUI = window.TokensPerm._RenderUI || {};

  async function hydrateUserLogs(){
    try{
      const body = UI.ensureUserLogArea();
      if (!body) return;
      const qs = UI.buildQuery();
      const url = '/user/logs' + (qs.toString() ? ('?' + qs.toString()) : '');
      const out = await apiGet(url);
      const list = (out && out.list) || [];
      // 同步后端新增日志类型，供分类筛选的“其他”集合使用
      try {
        const types = Array.from(new Set(list.map(l => l && l.type).filter(Boolean)));
        UI.syncKnownTypes(types, { updatePreview: false });
      } catch(_){ }
      LogUtils.appendLogEntries(body, list, l => UI.makeRow(l), {
        clear: true,
        entryOptions: l => ({
          deleted: !!(l && l.deleted),
          attrs: {
            'data-log-id': l && l._id,
            'data-log-deleted': l && l.deleted ? '1' : '',
            'data-user-id': l && l.userId,
            'data-type': l && l.type
          }
        })
      });
      // 渲染（或恢复）预览行到列表顶部
      try { UI.updateFormatPreview(); } catch(_){ }
    }catch(_){ }
  }

  // 暴露给 logs.js 中 filter apply 按钮的延迟绑定
  window.TokensPerm.hydrateUserLogs = hydrateUserLogs;

  document.addEventListener('DOMContentLoaded', function(){
    const ready = (window.partialsReady instanceof Promise) ? window.partialsReady : Promise.resolve();
    // 封装一次性绑定：在 #perms-log 出现后再绑定事件委托，避免绑定时机早于 DOM 创建
    function bindDeleteDelegation(){
      try{
        const root = document.getElementById('perms-log');
        if (!root) return;
        LogUtils.bindLogCopy(root);
        LogUtils.bindLogDelete(root, async (id)=>{
          if (id) await apiDelete(`/user/logs/${encodeURIComponent(id)}`);
        }, async (id)=>{
          if (id) await apiPatch(`/user/logs/${encodeURIComponent(id)}/restore`);
          await hydrateUserLogs();
        });
      }catch(_){ }
    }

    // 首次分片就绪后渲染日志，并在渲染后绑定删除委托（仅管理员且已登录）
    ready.then(()=>{ try{ if (hasToken() && isAdmin()) hydrateUserLogs(); }catch(_){ } }).then(()=>{
      try { bindDeleteDelegation(); } catch(_){ }
      // 进入权限页时自动刷新：监听面板可见性变化
      try{
        const panel = document.getElementById('panel_permissions');
        if (panel && !panel.__permsLogObsBound){
          panel.__permsLogObsBound = true;
          const isVisible = (el)=> RenderUI.isVisible ? RenderUI.isVisible(el, false) : !!(el && el.offsetParent);
          let wasVisible = isVisible(panel);
          const check = ()=>{
            try{
              const vis = isVisible(panel);
              if (vis && !wasVisible) { wasVisible = true; if (hasToken() && isAdmin()) { try{ hydrateUserLogs(); }catch(_){ } try { bindDeleteDelegation(); } catch(_){ } } }
              else if (!vis && wasVisible) { wasVisible = false; }
            }catch(_){ }
          };
          // 初始检查
          try{ check(); }catch(_){ }
          // 监听 class/style 变化
          try{
            const obs = new MutationObserver(()=>{ check(); });
            obs.observe(panel, { attributes: true, attributeFilter: ['class','style'] });
            panel.__permsLogObserver = obs;
          }catch(_){ }
          // 兜底：hash 变化也检查一次
          try{ window.addEventListener('hashchange', check); }catch(_){ }
        }
      }catch(_){ }
    });

  // 相对时间刷新 + 悬浮切换
    LogUtils.startRelTimeRefresh('#perms-log .log-time[data-ts]', '__permsLogTimer');
    try{ LogUtils.bindLogTimeHover(document.getElementById('perms-log') || document); }catch(_){ }

    // 兜底绑定删除/复制委托
    try { bindDeleteDelegation(); } catch(_){ }

    // 语言切换：重渲染 i18n + 刷新时间格式
    const onLang = ()=>{
      // 语言变化时同步更新日期输入的地区
      try{ const panel=document.getElementById('perms-log-panel'); const filters = panel ? panel.querySelector('.tokens-log__filters') : null; UI.setDateInputLang(filters||panel); }catch(_){ }
      LogUtils.refreshLogTimes('#perms-log .log-time[data-ts]');
      // 语言变化时更新类型格式预览
      try{ UI.updateFormatPreview(); }catch(_){ }
      // 语言变化时重新本地化角色变更消息中的角色名
      try{
        const rows = document.querySelectorAll('#perms-log .tokens-log__entry[data-type="role-changed"] .log-msg span[data-old-role-code]');
        rows.forEach(span=>{
          try{
            const oldCode = span.getAttribute('data-old-role-code')||'';
            const newCode = span.getAttribute('data-new-role-code')||'';
            const raw = span.getAttribute('data-i18n-params');
            let params = {};
            try { params = raw ? JSON.parse(raw) : {}; } catch(_) { params = {}; }
            params.oldRole = UI.mapRoleLabel(oldCode);
            params.newRole = UI.mapRoleLabel(newCode);
            span.setAttribute('data-i18n-params', JSON.stringify(params));
          }catch(_){ }
        });
        try{ const panel=document.getElementById('perms-log-panel'); if(panel) window.i18n?.applySafe?.(panel);}catch(_){ }
      }catch(_){ }
    };
    try{ window.addEventListener?.('i18n:changed', onLang);}catch(_){}

    // 暴露刷新方法供外部调用（如权限变更后自动刷新日志）
    try {
      window.TokensPerm = window.TokensPerm || {};
      window.TokensPerm.refreshLogs = hydrateUserLogs;
    } catch(_){ }
  });
})();

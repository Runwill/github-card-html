// 权限管理（仅管理员可见入口）
(function(){
  const API = (endpoints && endpoints.base ? endpoints.base() : '').replace(/\/$/, '') + '/api';
  const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')||''}` });

  async function jsonGet(path){ const r = await fetch(`${API}${path}`, { headers: authHeader() }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  async function jsonPost(path, body){ const r = await fetch(`${API}${path}`, { method:'POST', headers: { 'Content-Type':'application/json', ...authHeader() }, body: JSON.stringify(body||{}) }); const out = await r.json().catch(()=>({})); if (!r.ok) throw new Error(out && out.message || `HTTP ${r.status}`); return out; }
  async function setPassword(userId, newPassword){ return jsonPost('/user/password/set', { userId, newPassword }); }

  // 统一吐司：可强制 error 样式
  function showToast(message, type){
    const forceError = (type === 'error');
    // 若需强制错误样式，走本地构造，避免外部 API 无法指定样式的问题
    if (forceError) {
      try{
        let container=document.querySelector('.tokens-toast-container');
        if(!container){ container=document.createElement('div'); container.className='tokens-toast-container'; document.body.appendChild(container); }
        const toast=document.createElement('div'); toast.className='tokens-toast tokens-toast--error';
        const NS='http://www.w3.org/2000/svg';
        const svg=document.createElementNS(NS,'svg'); svg.setAttribute('width','18'); svg.setAttribute('height','18'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none'); svg.setAttribute('aria-hidden','true');
        const path=document.createElementNS(NS,'path'); path.setAttribute('d','M18 6L6 18M6 6l12 12'); path.setAttribute('stroke','currentColor'); path.setAttribute('stroke-width','2.5'); path.setAttribute('stroke-linecap','round'); path.setAttribute('stroke-linejoin','round');
        svg.appendChild(path); toast.appendChild(svg);
        toast.appendChild(document.createTextNode(' ' + (message || '错误')));
        container.appendChild(toast);
        setTimeout(()=>{ try{ toast.remove(); }catch(_){} if(container && container.children.length===0){ try{ container.remove(); }catch(_){} } }, 2200);
        return;
      }catch(_){ /* ignore and fallback */ }
    }
    // 非强制错误样式：优先通用 Admin Toast，其次 CardUI 消息
    try { if (window.tokensAdmin && typeof window.tokensAdmin.showToast === 'function') { window.tokensAdmin.showToast(message); return; } } catch(_){ }
    try {
      const toast = window.CardUI && window.CardUI.Manager && window.CardUI.Manager.Core && window.CardUI.Manager.Core.messages && window.CardUI.Manager.Core.messages.toast;
      if (typeof toast === 'function') { toast(message); return; }
    } catch(_){ }
    try { alert(message); } catch(_){ }
  }

  function badge(text, cls){ const s = document.createElement('span'); s.className = 'badge ' + (cls||''); s.textContent = text; return s; }

  async function fetchUsers(search){
    const q = search ? ('?search=' + encodeURIComponent(search)) : '';
    try { const arr = await jsonGet('/users/permissions' + q); return Array.isArray(arr) ? arr : []; } catch(e){
      try { if (window.t) console.error(window.t('permissions.fetchUsersFailedPrefix'), e); else console.error(e); } catch(_){ }
      return [];
    }
  }
  async function grant(userId, perm){ return jsonPost('/user/permissions/update', { userId, action:'grant', permission: perm }); }
  async function revoke(userId, perm){ return jsonPost('/user/permissions/update', { userId, action:'revoke', permission: perm }); }

  // 仅从后端获取统一清单（不再在前端维护基线）
  // 注意：如请求失败将抛出异常，调用方自行降级为“仅展示用户已拥有的历史权限”
  async function getMasterPermissions(){
    const arr = await jsonGet('/permissions');
    return Array.isArray(arr) ? arr.map(String) : [];
  }
  // 使用 i18n 提示，不再写死中文描述
  function bindPermTooltip(el, permName){
    try {
      if (!el) return;
      const specializedKey = 'perm.tooltip.' + String(permName);
      let keyForAttr = specializedKey;
      let params = null;
      try {
        const lang = (window.i18n && window.i18n.getLang && window.i18n.getLang()) || 'zh';
        const resolved = window.t ? window.t(specializedKey) : specializedKey;
        // 若当前语言不是 debug 且未提供专用翻译，则回退到通用前缀文案
        if (lang !== 'debug' && resolved === specializedKey) {
          keyForAttr = 'perm.tooltip.prefix';
          params = { name: String(permName) };
        }
      } catch(_) {
        keyForAttr = 'perm.tooltip.prefix';
        params = { name: String(permName) };
      }
      el.setAttribute('data-i18n-attr', 'data-tooltip');
      el.setAttribute('data-i18n-data-tooltip', keyForAttr);
      if (params) el.setAttribute('data-i18n-params-data-tooltip', JSON.stringify(params)); else el.removeAttribute('data-i18n-params-data-tooltip');
      // 立即设置一次，以便初次渲染就有正确提示
      try { el.setAttribute('data-tooltip', window.t ? window.t(keyForAttr, params) : (params ? (params.name||'') : keyForAttr)); } catch(_){}
    } catch(_){}
  }
  const MAX_TAGS_SHOWN = 4; // 每行最多展示的权限标签数，超出用 +N 折叠

  function makeEl(tag, cls, text){ const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; }
  function tag(text, more=false, tip){
    const s = makeEl('span', 'perm-tag' + (more ? ' perm-tag--more' : ''), text);
    const tooltip = (tip || text);
    try { s.setAttribute('data-tooltip', tooltip); } catch { s.title = tooltip; }
    return s;
  }
  function spinnerBtn(btn, spinning){
    if (!btn) return;
    btn.disabled = !!spinning;
    btn.classList.toggle('is-loading', !!spinning);
  }

  // 模式：partial=部分（当搜索为空时仅显示有权限的用户），all=全部
  let permMode = 'partial';
  // 渲染并发保护：仅处理最后一次调用的结果
  let renderSeq = 0;
  window.renderPermissionsPanel = async function(search){
    const thisSeq = ++renderSeq;
    const box = document.getElementById('perm-list'); const msg = document.getElementById('perm-message'); if (!box) return;
    // 确保搜索事件已绑定（面板通过 include 异步注入，可能比 DOMContentLoaded 更晚）
    try {
      const searchBtn = document.getElementById('perm-search-btn');
      const input = document.getElementById('perm-search-input');
      const toggle = document.getElementById('perm-mode-toggle');
      if (searchBtn && !searchBtn.__permBound) {
        searchBtn.__permBound = true;
        searchBtn.addEventListener('click', ()=> window.renderPermissionsPanel((input?.value||'').trim()));
      }
      if (input && !input.__permBound) {
        input.__permBound = true;
        input.addEventListener('keydown', (e)=>{ if (e.key==='Enter') window.renderPermissionsPanel((input.value||'').trim()); });
      }
      if (toggle && !toggle.__permBound) {
        toggle.__permBound = true;
        toggle.addEventListener('click', ()=>{
          permMode = (permMode === 'partial') ? 'all' : 'partial';
          try {
            // 同步 i18n key，确保语言切换后文案与当前模式一致
            const key = (permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all';
            toggle.setAttribute('data-i18n', key);
            window.i18n && window.i18n.apply && window.i18n.apply(toggle);
          } catch {
            try { toggle.textContent = (window.t && window.t((permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all')) || ((permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all'); } catch(_){ }
          }
          window.renderPermissionsPanel((input?.value||'').trim());
        });
      }
      // 同步按钮 UI 文案/激活态
      if (toggle) {
        try {
          const key = (permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all';
          toggle.setAttribute('data-i18n', key);
          window.i18n && window.i18n.apply && window.i18n.apply(toggle);
        } catch {
          try { toggle.textContent = (window.t && window.t((permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all')) || ((permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all'); } catch(_){}
        }
        toggle.classList.toggle('is-active', permMode === 'all');
      }
    } catch {}
  // 不要立即清空，避免高度瞬间塌陷导致上方/下方区域跳动（日志面板闪烁）
  msg && (msg.textContent='');
  let users = await fetchUsers(search);
    // 若期间有新的渲染请求进来，则丢弃本次结果，避免双倍追加
    if (thisSeq !== renderSeq) return;
    // 当搜索为空且模式为“部分”时，仅显示有至少一个权限的用户
    const s = (search||'').trim();
    if (!s && permMode === 'partial') {
      users = users.filter(u => Array.isArray(u.permissions) && u.permissions.length > 0);
    }
    // 预先构建新内容到片段，准备替换
    const frag = document.createDocumentFragment();
    if (!users.length){
      const p = document.createElement('p');
      p.className = 'empty-hint';
      try { p.setAttribute('data-i18n', 'common.empty'); } catch(_){ }
      frag.appendChild(p);
    }

    // 使用后端清单为主，并补入用户已有的历史权限，避免“看不见但已拥有”的情况
    let master = [];
    try {
      master = await getMasterPermissions();
    } catch(e) {
      try { if (window.t) console.error(window.t('permissions.fetchMasterFailedPrefix'), e); else console.error(e); } catch(_) { console.error(e); }
    }
    const allPermsSet = new Set(master);
    users.forEach(u => (Array.isArray(u.permissions)?u.permissions:[]).forEach(p => { if (p) allPermsSet.add(String(p)); }));
    const allPerms = Array.from(allPermsSet).sort();

  users.forEach(u => {
      const userId = u._id || u.id;
      const current = Array.isArray(u.permissions) ? [...u.permissions] : [];

      const row = makeEl('div', 'approval-row');
      const left = makeEl('div', 'approval-left');
      const meta = makeEl('div');
      const title = makeEl('div', 'approval-title', u.username || '');
      const sub = makeEl('div', 'approval-sub');
      try {
        sub.setAttribute('data-i18n', 'permissions.user.role');
        sub.setAttribute('data-i18n-params', JSON.stringify({ role: (u.role || '-') }));
  } catch(_){ try { if (window.t) sub.textContent = window.t('permissions.user.role', { role: (u.role || '-') }); } catch(__){} }
      meta.appendChild(title); meta.appendChild(sub);

      // 权限标签区域
      const tagsWrap = makeEl('div', 'perm-tags');
      const shown = current.slice(0, MAX_TAGS_SHOWN);
      shown.forEach(p => { const el = tag(p, false); bindPermTooltip(el, p); tagsWrap.appendChild(el); });
      const extra = current.slice(MAX_TAGS_SHOWN);
      if (extra.length){
        tagsWrap.appendChild(tag('+' + extra.length, true, extra.join('、')));
      }

      left.appendChild(meta);
      left.appendChild(tagsWrap);

    // 右侧：编辑按钮 + 修改密码按钮
      const right = makeEl('div', 'approval-right');
  const editBtn = makeEl('button', 'btn btn--secondary btn--sm');
  try { editBtn.setAttribute('data-i18n', 'permissions.edit'); } catch(_){ try { if (window.t) editBtn.textContent = window.t('permissions.edit'); } catch(__){} }
    const pwdBtn = makeEl('button', 'btn btn--secondary btn--sm');
    try { pwdBtn.setAttribute('data-i18n', 'permissions.changePassword'); } catch(_){ try { if (window.t) pwdBtn.textContent = window.t('permissions.changePassword'); } catch(__){} }
    right.appendChild(editBtn);
    right.appendChild(pwdBtn);

      row.appendChild(left); row.appendChild(right);
  frag.appendChild(row);

  // 行内编辑器（默认隐藏）
      const editor = makeEl('div', 'perm-editor');
      editor.style.display = 'none';

      // 工具栏：全选/清空（不需要权限筛选）
      const toolbar = makeEl('div', 'perm-editor__toolbar');
  const btnSelectAll = makeEl('button', 'btn btn--secondary btn--sm tokens-refresh');
  try { btnSelectAll.setAttribute('data-i18n', 'permissions.selectAll'); } catch(_){ try { if (window.t) btnSelectAll.textContent = window.t('permissions.selectAll'); } catch(__){} }
      toolbar.appendChild(btnSelectAll);
      

      // 列表
      const list = makeEl('div', 'perm-editor__list');

      function renderChecklist(){
        list.innerHTML = '';
        allPerms.forEach(p => {
          const item = makeEl('label', 'perm-editor__item');
          bindPermTooltip(item, p);
          const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = p; cb.checked = current.includes(p);
          const text = makeEl('span', 'perm-editor__item-text', p);
          item.appendChild(cb); item.appendChild(text);
          list.appendChild(item);
        });
      }
      renderChecklist();

      // 底部操作：取消/保存
      const actions = makeEl('div', 'perm-editor__actions');
  const btnCancel = makeEl('button', 'btn btn--secondary');
  const btnSave = makeEl('button', 'btn btn--primary');
  try { btnCancel.setAttribute('data-i18n', 'common.cancel'); } catch(_){ try { if (window.t) btnCancel.textContent = window.t('common.cancel'); } catch(__){} }
  try { btnSave.setAttribute('data-i18n', 'common.save'); } catch(_){ try { if (window.t) btnSave.textContent = window.t('common.save'); } catch(__){} }
      actions.appendChild(btnCancel); actions.appendChild(btnSave);

      editor.appendChild(toolbar);
      editor.appendChild(list);
      editor.appendChild(actions);
  frag.appendChild(editor);

    // 密码编辑器（默认隐藏）
  const pwdEditor = makeEl('div', 'perm-editor perm-editor--plain');
    pwdEditor.style.display = 'none';
    const pwdList = makeEl('div', 'perm-editor__list');
    const rowNew = makeEl('div', 'perm-editor__item');
    const inputNew = document.createElement('input'); inputNew.type = 'password'; inputNew.className = 'tokens-input';
    try { inputNew.setAttribute('placeholder', (window.t && window.t('modal.password.new')) || '新密码'); } catch(_){ inputNew.placeholder = '新密码'; }
    rowNew.appendChild(inputNew);
    const rowConfirm = makeEl('div', 'perm-editor__item');
    const inputConfirm = document.createElement('input'); inputConfirm.type = 'password'; inputConfirm.className = 'tokens-input';
    try { inputConfirm.setAttribute('placeholder', (window.t && window.t('modal.password.confirm')) || '确认新密码'); } catch(_){ inputConfirm.placeholder = '确认新密码'; }
    rowConfirm.appendChild(inputConfirm);
    pwdList.appendChild(rowNew);
    pwdList.appendChild(rowConfirm);
    const pwdActions = makeEl('div', 'perm-editor__actions');
    const btnPwdCancel = makeEl('button', 'btn btn--secondary');
    const btnPwdSave = makeEl('button', 'btn btn--primary');
    try { btnPwdCancel.setAttribute('data-i18n', 'common.cancel'); } catch(_){ try { if (window.t) btnPwdCancel.textContent = window.t('common.cancel'); } catch(__){} }
    try { btnPwdSave.setAttribute('data-i18n', 'common.save'); } catch(_){ try { if (window.t) btnPwdSave.textContent = window.t('common.save'); } catch(__){} }
    pwdActions.appendChild(btnPwdCancel);
    pwdActions.appendChild(btnPwdSave);
    pwdEditor.appendChild(pwdList);
    pwdEditor.appendChild(pwdActions);
    frag.appendChild(pwdEditor);

      // 交互绑定
      editBtn.addEventListener('click', () => {
        const visible = editor.style.display !== 'none';
        editor.style.display = visible ? 'none' : 'block';
      });
      btnSelectAll.addEventListener('click', () => {
        const cbs = Array.from(list.querySelectorAll('input[type="checkbox"]').values());
        const total = cbs.length;
        const checkedCount = cbs.filter(cb => cb.checked).length;
        const shouldSelectAll = checkedCount < total; // 不是全选 -> 全选；已全选 -> 清空
        cbs.forEach(cb => { cb.checked = shouldSelectAll; });
      });
      btnCancel.addEventListener('click', () => { editor.style.display = 'none'; });
      btnSave.addEventListener('click', async () => {
        // 采集勾选并与 current 求差集
        const selected = Array.from(list.querySelectorAll('input[type="checkbox"]'))
          .filter(cb => cb.checked).map(cb => cb.value);
        const curSet = new Set(current);
        const selSet = new Set(selected);
        const toGrant = selected.filter(p => !curSet.has(p));
        const toRevoke = current.filter(p => !selSet.has(p));

        if (!toGrant.length && !toRevoke.length) { editor.style.display = 'none'; return; }

        spinnerBtn(btnSave, true);
        try {
          for (const p of toGrant) { await grant(userId, p); }
          for (const p of toRevoke) { await revoke(userId, p); }
          // 保存成功后重新渲染列表
          await window.renderPermissionsPanel((document.getElementById('perm-search-input')?.value||'').trim());
  } catch(e){ try { showToast((e && e.message) ? e.message : (window.t && window.t('permissions.saveFailed')), 'error'); } catch(_){ showToast('', 'error'); } }
        finally { spinnerBtn(btnSave, false); editor.style.display = 'none'; }
      });

      // 修改密码交互
      pwdBtn.addEventListener('click', () => {
        const visible = pwdEditor.style.display !== 'none';
        pwdEditor.style.display = visible ? 'none' : 'block';
      });
      btnPwdCancel.addEventListener('click', () => { pwdEditor.style.display = 'none'; });
      btnPwdSave.addEventListener('click', async () => {
        const p1 = (inputNew.value || '').trim();
        const p2 = (inputConfirm.value || '').trim();
        if (!p1 || !p2) { try { showToast((window.t && window.t('error.fillAll')) || '请填写完整。', 'error'); } catch(_){} return; }
        if (p1.length < 6) { try { showToast((window.t && window.t('error.pwdMin')) || '新密码至少 6 位。', 'error'); } catch(_){} return; }
        if (p1 !== p2) { try { showToast((window.t && window.t('error.pwdNotMatch')) || '两次输入的新密码不一致。', 'error'); } catch(_){} return; }
        spinnerBtn(btnPwdSave, true);
        try {
          await setPassword(userId, p1);
          // 成功改为 toast 提示
          try { showToast((window.t && window.t('status.updated')) || '已更新'); } catch(_){ }
          // 清空并收起
          inputNew.value = '';
          inputConfirm.value = '';
          pwdEditor.style.display = 'none';
        } catch(e) {
          try { showToast(e && e.message ? e.message : ((window.t && window.t('error.updateFailed')) || '更新失败'), 'error'); } catch(_){ showToast('', 'error'); }
        } finally { spinnerBtn(btnPwdSave, false); }
      });
    });

    // 使用高度过渡替换内容，避免列表高度瞬间变为 0 造成页面布局跳动
    const oldH = box.offsetHeight;
    // 若期间有新的渲染请求进来，则丢弃本次结果
    if (thisSeq !== renderSeq) return;
    // 设置起始高度并启用过渡
    try {
      box.style.height = oldH + 'px';
      box.style.transition = 'height .25s ease';
      // 触发一次重排，确保起始高度生效
      void box.offsetHeight;
    } catch(_){ }
    // 替换内容
    box.innerHTML = '';
    box.appendChild(frag);
    // 应用 i18n 到新内容
    try { window.i18n && window.i18n.apply && window.i18n.apply(box); } catch(_){ }
    // 目标高度
    const newH = box.scrollHeight;
    if (newH === oldH) {
      // 高度未变化，直接清理行内样式
      box.style.transition = '';
      box.style.height = '';
      return;
    }
    // 过渡到新高度
    try {
      box.style.height = newH + 'px';
      const onEnd = (e)=>{
        if (e && e.target !== box) return;
        box.removeEventListener('transitionend', onEnd);
        box.style.transition = '';
        box.style.height = '';
      };
      box.addEventListener('transitionend', onEnd);
    } catch(_){ box.style.transition = ''; box.style.height = ''; }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('perm-search-btn'); const input = document.getElementById('perm-search-input');
    if (searchBtn && input) {
      searchBtn.addEventListener('click', ()=> window.renderPermissionsPanel(input.value.trim()));
      input.addEventListener('keydown', (e)=>{ if (e.key==='Enter') window.renderPermissionsPanel(input.value.trim()); });
    }
  });
})();

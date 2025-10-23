// 权限管理（仅管理员可见入口）
(function(){
  const API = (endpoints && endpoints.base ? endpoints.base() : '').replace(/\/$/, '') + '/api';
  const authHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')||''}` });

  async function jsonGet(path){ const r = await fetch(`${API}${path}`, { headers: authHeader() }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }
  async function jsonPost(path, body){ const r = await fetch(`${API}${path}`, { method:'POST', headers: { 'Content-Type':'application/json', ...authHeader() }, body: JSON.stringify(body||{}) }); const out = await r.json().catch(()=>({})); if (!r.ok) throw new Error(out && out.message || `HTTP ${r.status}`); return out; }

  function badge(text, cls){ const s = document.createElement('span'); s.className = 'badge ' + (cls||''); s.textContent = text; return s; }

  async function fetchUsers(search){
    const q = search ? ('?search=' + encodeURIComponent(search)) : '';
    try { const arr = await jsonGet('/users/permissions' + q); return Array.isArray(arr) ? arr : []; } catch(e){ console.error('获取用户失败:', e); return []; }
  }
  async function grant(userId, perm){ return jsonPost('/user/permissions/update', { userId, action:'grant', permission: perm }); }
  async function revoke(userId, perm){ return jsonPost('/user/permissions/update', { userId, action:'revoke', permission: perm }); }

  const PERM = '仪同三司';
  const PERM_DESC = { '仪同三司': '可免审直接生效（用户名/简介/头像）' };
  const MAX_TAGS_SHOWN = 4; // 每行最多展示的权限标签数，超出用 +N 折叠

  function makeEl(tag, cls, text){ const el = document.createElement(tag); if (cls) el.className = cls; if (text != null) el.textContent = text; return el; }
  function tag(text, more=false, title){
    const s = makeEl('span', 'perm-tag' + (more ? ' perm-tag--more' : ''), text);
    if (title) s.title = title; else s.title = text;
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
          window.renderPermissionsPanel((input?.value||'').trim());
        });
      }
      // 同步按钮 UI 文案/激活态
      if (toggle) {
        toggle.textContent = (permMode === 'partial') ? '部分' : '全部';
        toggle.classList.toggle('is-active', permMode === 'all');
      }
    } catch {}
    box.innerHTML = ''; msg && (msg.textContent='');
    let users = await fetchUsers(search);
    // 若期间有新的渲染请求进来，则丢弃本次结果，避免双倍追加
    if (thisSeq !== renderSeq) return;
    // 当搜索为空且模式为“部分”时，仅显示有至少一个权限的用户
    const s = (search||'').trim();
    if (!s && permMode === 'partial') {
      users = users.filter(u => Array.isArray(u.permissions) && u.permissions.length > 0);
    }
    if (!users.length){ box.innerHTML = '<p class="empty-hint">空</p>'; return; }

    // 汇总可用权限（来自所有用户已有权限的并集，并确保包含基础权限 PERM）
    const allPermsSet = new Set();
    users.forEach(u => (Array.isArray(u.permissions)?u.permissions:[]).forEach(p => { if (p) allPermsSet.add(p); }));
    allPermsSet.add(PERM);
    const allPerms = Array.from(allPermsSet).sort();

    users.forEach(u => {
      const userId = u._id || u.id;
      const current = Array.isArray(u.permissions) ? [...u.permissions] : [];

      const row = makeEl('div', 'approval-row');
      const left = makeEl('div', 'approval-left');
      const meta = makeEl('div');
      const title = makeEl('div', 'approval-title', u.username || '');
      const sub = makeEl('div', 'approval-sub', '角色: ' + (u.role || '-'));
      meta.appendChild(title); meta.appendChild(sub);

      // 权限标签区域
      const tagsWrap = makeEl('div', 'perm-tags');
  const shown = current.slice(0, MAX_TAGS_SHOWN);
  shown.forEach(p => tagsWrap.appendChild(tag(p, false, PERM_DESC[p] || p)));
      const extra = current.slice(MAX_TAGS_SHOWN);
      if (extra.length){
        tagsWrap.appendChild(tag('+' + extra.length, true, extra.join('、')));
      }

      left.appendChild(meta);
      left.appendChild(tagsWrap);

      // 右侧：编辑按钮
      const right = makeEl('div', 'approval-right');
      const editBtn = makeEl('button', 'btn btn--secondary btn--sm', '编辑权限');
      right.appendChild(editBtn);

      row.appendChild(left); row.appendChild(right);
      box.appendChild(row);

      // 行内编辑器（默认隐藏）
      const editor = makeEl('div', 'perm-editor');
      editor.style.display = 'none';

      // 工具栏：全选/清空（不需要权限筛选）
      const toolbar = makeEl('div', 'perm-editor__toolbar');
  const btnSelectAll = makeEl('button', 'btn btn--secondary btn--sm tokens-refresh', '全选');
      toolbar.appendChild(btnSelectAll);
      

      // 列表
      const list = makeEl('div', 'perm-editor__list');

      function renderChecklist(){
        list.innerHTML = '';
        allPerms.forEach(p => {
          const item = makeEl('label', 'perm-editor__item'); item.title = PERM_DESC[p] || p;
          const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = p; cb.checked = current.includes(p);
          const text = makeEl('span', 'perm-editor__item-text', p); text.title = PERM_DESC[p] || p;
          item.appendChild(cb); item.appendChild(text);
          list.appendChild(item);
        });
      }
      renderChecklist();

      // 底部操作：取消/保存
      const actions = makeEl('div', 'perm-editor__actions');
      const btnCancel = makeEl('button', 'btn btn--secondary', '取消');
      const btnSave = makeEl('button', 'btn btn--primary', '保存');
      actions.appendChild(btnCancel); actions.appendChild(btnSave);

      editor.appendChild(toolbar);
      editor.appendChild(list);
      editor.appendChild(actions);
      box.appendChild(editor);

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
        } catch(e){ alert(e.message || '保存失败'); }
        finally { spinnerBtn(btnSave, false); editor.style.display = 'none'; }
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('perm-search-btn'); const input = document.getElementById('perm-search-input');
    if (searchBtn && input) {
      searchBtn.addEventListener('click', ()=> window.renderPermissionsPanel(input.value.trim()));
      input.addEventListener('keydown', (e)=>{ if (e.key==='Enter') window.renderPermissionsPanel(input.value.trim()); });
    }
  });
})();

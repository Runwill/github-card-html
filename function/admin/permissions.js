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
    users.forEach(u => {
      const row = document.createElement('div'); row.className = 'approval-row';
      const left = document.createElement('div'); left.className = 'approval-left';
      const title = document.createElement('div'); title.className = 'approval-title'; title.textContent = u.username || '';
      const sub = document.createElement('div'); sub.className = 'approval-sub';
      const has = Array.isArray(u.permissions) && u.permissions.includes(PERM);
      sub.textContent = '角色: ' + (u.role || '-') + ' | 权限: ' + (has ? PERM : '无');
      left.appendChild(title); left.appendChild(sub);
      const right = document.createElement('div'); right.className = 'approval-right';
      const btn = document.createElement('button'); btn.className = has ? 'btn btn--danger btn--sm' : 'btn btn--primary btn--sm'; btn.textContent = has ? ('移除“'+PERM+'”') : ('授予“'+PERM+'”');
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          const fn = has ? revoke : grant;
          await fn(u._id || u.id, PERM);
          await window.renderPermissionsPanel(search||'');
        } catch(e){ alert(e.message||'操作失败'); }
        finally { btn.disabled=false; }
      };
      right.appendChild(btn);
      row.appendChild(left); row.appendChild(right);
      box.appendChild(row);
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

(function(w){
  const ns = w.TokensPerm = w.TokensPerm || {};
  ns.state = ns.state || { permMode: 'partial', renderSeq: 0 };
  const S = ns.state;
  const UI = ns.UI || {};
  const API = ns.API || {};

  const { makeEl, tag, bindPermTooltip, spinnerBtn, toggleSection, showToast } = UI;

  ns.renderPermissionsPanel = async function(search){
    const thisSeq = ++S.renderSeq;
    const box = document.getElementById('perm-list'); const msg = document.getElementById('perm-message'); if (!box) return;

    // 确保搜索事件已绑定（面板通过 include 异步注入，可能比 DOMContentLoaded 更晚）
    try {
      const searchBtn = document.getElementById('perm-search-btn');
      const input = document.getElementById('perm-search-input');
      const toggle = document.getElementById('perm-mode-toggle');
      if (searchBtn && !searchBtn.__permBound) {
        searchBtn.__permBound = true;
        searchBtn.addEventListener('click', ()=> w.renderPermissionsPanel((input?.value||'').trim()));
      }
      if (input && !input.__permBound) {
        input.__permBound = true;
        input.addEventListener('keydown', (e)=>{ if (e.key==='Enter') w.renderPermissionsPanel((input.value||'').trim()); });
      }
      if (toggle && !toggle.__permBound) {
        toggle.__permBound = true;
        toggle.addEventListener('click', ()=>{
          S.permMode = (S.permMode === 'partial') ? 'all' : 'partial';
          try {
            const key = (S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all';
            toggle.setAttribute('data-i18n', key);
            w.i18n && w.i18n.apply && w.i18n.apply(toggle);
          } catch {
            try { toggle.textContent = (w.t && w.t((S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all')) || ((S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all'); } catch(_){ }
          }
          w.renderPermissionsPanel((input?.value||'').trim());
        });
      }
      if (toggle) {
        try {
          const key = (S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all';
          toggle.setAttribute('data-i18n', key);
          w.i18n && w.i18n.apply && w.i18n.apply(toggle);
        } catch {
          try { toggle.textContent = (w.t && w.t((S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all')) || ((S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all'); } catch(_){}
        }
        toggle.classList.toggle('is-active', S.permMode === 'all');
      }
    } catch {}

    // 不要立即清空，避免高度瞬间塌陷导致上方/下方区域跳动（日志面板闪烁）
    msg && (msg.textContent='');
    let users = await API.fetchUsers(search);
    if (thisSeq !== S.renderSeq) return;

    // 当搜索为空且模式为“部分”时，仅显示有至少一个权限的用户
    const s = (search||'').trim();
    if (!s && S.permMode === 'partial') {
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
    try { master = await API.getMasterPermissions(); } catch(e) {
      try { if (w.t) console.error(w.t('permissions.fetchMasterFailedPrefix'), e); else console.error(e); } catch(_) { console.error(e); }
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
      // 拆分为“标签 + 值”，以便让角色值可点击进入编辑
      const subLabel = makeEl('span', 'approval-sub__label');
      try { subLabel.setAttribute('data-i18n', 'permissions.user.roleLabel'); } catch(_){ try { if (w.t) subLabel.textContent = w.t('permissions.user.roleLabel'); } catch(__){} }
      const roleValue = makeEl('span', 'approval-role', u.role || '-');
      try { roleValue.classList.add('is-editable'); roleValue.setAttribute('tabindex', '0'); roleValue.setAttribute('role', 'button'); } catch(_){ }
      sub.appendChild(subLabel);
      sub.appendChild(roleValue);
      meta.appendChild(title); meta.appendChild(sub);

      // 权限标签区域
      const tagsWrap = makeEl('div', 'perm-tags');
      const shown = current.slice(0, ns.constants.MAX_TAGS_SHOWN);
      shown.forEach(p => { const el = tag(p, false); bindPermTooltip(el, p); tagsWrap.appendChild(el); });
      const extra = current.slice(ns.constants.MAX_TAGS_SHOWN);
      if (extra.length){
        tagsWrap.appendChild(tag('+' + extra.length, true, extra.join('、')));
      }

      left.appendChild(meta);
      left.appendChild(tagsWrap);

      // 右侧：编辑权限按钮 + 修改密码按钮（角色改为点击“角色值”进入编辑，不再使用按钮）
      const right = makeEl('div', 'approval-right');
      const editBtn = makeEl('button', 'btn btn--secondary btn--sm');
      try { editBtn.setAttribute('data-i18n', 'permissions.edit'); } catch(_){ try { if (w.t) editBtn.textContent = w.t('permissions.edit'); } catch(__){} }
      const pwdBtn = makeEl('button', 'btn btn--secondary btn--sm');
      try { pwdBtn.setAttribute('data-i18n', 'permissions.changePassword'); } catch(_){ try { if (w.t) pwdBtn.textContent = w.t('permissions.changePassword'); } catch(__){} }
      right.appendChild(editBtn);
      right.appendChild(pwdBtn);

      row.appendChild(left); row.appendChild(right);
      frag.appendChild(row);

      // 行内编辑器（默认隐藏）
      const editor = makeEl('div', 'perm-editor');
      editor.style.display = 'none';
      editor.classList.add('is-collapsed');

      // 工具栏：全选/清空（不需要权限筛选）
      const toolbar = makeEl('div', 'perm-editor__toolbar');
      const btnSelectAll = makeEl('button', 'btn btn--secondary btn--sm tokens-refresh');
      try { btnSelectAll.setAttribute('data-i18n', 'permissions.selectAll'); } catch(_){ try { if (w.t) btnSelectAll.textContent = w.t('permissions.selectAll'); } catch(__){} }
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
      try { btnCancel.setAttribute('data-i18n', 'common.cancel'); } catch(_){ try { if (w.t) btnCancel.textContent = w.t('common.cancel'); } catch(__){} }
      try { btnSave.setAttribute('data-i18n', 'common.save'); } catch(_){ try { if (w.t) btnSave.textContent = w.t('common.save'); } catch(__){} }
      actions.appendChild(btnCancel); actions.appendChild(btnSave);

      editor.appendChild(toolbar);
      editor.appendChild(list);
      editor.appendChild(actions);
      frag.appendChild(editor);

      // 密码编辑器（默认隐藏）
      const pwdEditor = makeEl('div', 'perm-editor perm-editor--plain');
      pwdEditor.style.display = 'none';
      pwdEditor.classList.add('is-collapsed');
      const pwdList = makeEl('div', 'perm-editor__list');
      const rowNew = makeEl('div', 'perm-editor__item');
      const inputNew = document.createElement('input'); inputNew.type = 'password'; inputNew.className = 'tokens-input';
      try { inputNew.setAttribute('placeholder', (w.t && w.t('modal.password.new')) || '新密码'); } catch(_){ inputNew.placeholder = '新密码'; }
      rowNew.appendChild(inputNew);
      const rowConfirm = makeEl('div', 'perm-editor__item');
      const inputConfirm = document.createElement('input'); inputConfirm.type = 'password'; inputConfirm.className = 'tokens-input';
      try { inputConfirm.setAttribute('placeholder', (w.t && w.t('modal.password.confirm')) || '确认新密码'); } catch(_){ inputConfirm.placeholder = '确认新密码'; }
      rowConfirm.appendChild(inputConfirm);
      pwdList.appendChild(rowNew);
      pwdList.appendChild(rowConfirm);
      const pwdActions = makeEl('div', 'perm-editor__actions');
      const btnPwdCancel = makeEl('button', 'btn btn--secondary');
      const btnPwdSave = makeEl('button', 'btn btn--primary');
      try { btnPwdCancel.setAttribute('data-i18n', 'common.cancel'); } catch(_){ try { if (w.t) btnPwdCancel.textContent = w.t('common.cancel'); } catch(__){} }
      try { btnPwdSave.setAttribute('data-i18n', 'common.save'); } catch(_){ try { if (w.t) btnPwdSave.textContent = w.t('common.save'); } catch(__){} }
      pwdActions.appendChild(btnPwdCancel);
      pwdActions.appendChild(btnPwdSave);
      pwdEditor.appendChild(pwdList);
      pwdEditor.appendChild(pwdActions);
      frag.appendChild(pwdEditor);

      // 角色编辑器（默认隐藏）
      const roleEditor = makeEl('div', 'perm-editor perm-editor--plain');
      roleEditor.style.display = 'none';
      roleEditor.classList.add('is-collapsed');
      const roleList = makeEl('div', 'perm-editor__list');
      const roleRow = makeEl('div', 'perm-editor__item');
      const select = document.createElement('select');
      select.className = 'tokens-input';
      const ROLES = [
        { v: 'admin', k: 'role.admin' },
        { v: 'moderator', k: 'role.moderator' },
        { v: 'user', k: 'role.user' },
        { v: 'guest', k: 'role.guest' }
      ];
      ROLES.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.v;
        try { opt.textContent = (w.t && w.t(r.k)) || r.v; } catch(_){ opt.textContent = r.v; }
        if (String(u.role) === r.v) opt.selected = true;
        select.appendChild(opt);
      });
      roleRow.appendChild(select);
      roleList.appendChild(roleRow);
      const roleActions = makeEl('div', 'perm-editor__actions');
      const btnRoleCancel = makeEl('button', 'btn btn--secondary');
      const btnRoleSave = makeEl('button', 'btn btn--primary');
      try { btnRoleCancel.setAttribute('data-i18n', 'common.cancel'); } catch(_){ try { if (w.t) btnRoleCancel.textContent = w.t('common.cancel'); } catch(__){} }
      try { btnRoleSave.setAttribute('data-i18n', 'common.save'); } catch(_){ try { if (w.t) btnRoleSave.textContent = w.t('common.save'); } catch(__){} }
      roleActions.appendChild(btnRoleCancel);
      roleActions.appendChild(btnRoleSave);
      roleEditor.appendChild(roleList);
      roleEditor.appendChild(roleActions);
      frag.appendChild(roleEditor);

      // 交互绑定
      editBtn.addEventListener('click', () => {
        const visible = editor.style.display !== 'none' && !editor.classList.contains('is-collapsed');
        toggleSection(editor, !visible);
      });
      btnSelectAll.addEventListener('click', () => {
        const cbs = Array.from(list.querySelectorAll('input[type="checkbox"]').values());
        const total = cbs.length;
        const checkedCount = cbs.filter(cb => cb.checked).length;
        const shouldSelectAll = checkedCount < total; // 不是全选 -> 全选；已全选 -> 清空
        cbs.forEach(cb => { cb.checked = shouldSelectAll; });
      });
      btnCancel.addEventListener('click', () => { toggleSection(editor, false); });
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
          for (const p of toGrant) { await API.grant(userId, p); }
          for (const p of toRevoke) { await API.revoke(userId, p); }
          // 保存成功后重新渲染列表
          await w.renderPermissionsPanel((document.getElementById('perm-search-input')?.value||'').trim());
        } catch(e){ try { showToast((e && e.message) ? e.message : (w.t && w.t('permissions.saveFailed')), 'error'); } catch(_){ showToast('', 'error'); } }
        finally { spinnerBtn(btnSave, false); toggleSection(editor, false); }
      });

      // 修改密码交互
      pwdBtn.addEventListener('click', () => {
        const visible = pwdEditor.style.display !== 'none' && !pwdEditor.classList.contains('is-collapsed');
        toggleSection(pwdEditor, !visible);
      });
      btnPwdCancel.addEventListener('click', () => { toggleSection(pwdEditor, false); });
      btnPwdSave.addEventListener('click', async () => {
        const p1 = (inputNew.value || '').trim();
        const p2 = (inputConfirm.value || '').trim();
        if (!p1 || !p2) { try { showToast((w.t && w.t('error.fillAll')) || '请填写完整。', 'error'); } catch(_){} return; }
        if (p1.length < 6) { try { showToast((w.t && w.t('error.pwdMin')) || '新密码至少 6 位。', 'error'); } catch(_){} return; }
        if (p1 !== p2) { try { showToast((w.t && w.t('error.pwdNotMatch')) || '两次输入的新密码不一致。', 'error'); } catch(_){} return; }
        spinnerBtn(btnPwdSave, true);
        try {
          await API.setPassword(userId, p1);
          // 成功改为 toast 提示
          try { showToast((w.t && w.t('status.updated')) || '已更新'); } catch(_){ }
          // 清空并收起
          inputNew.value = '';
          inputConfirm.value = '';
          toggleSection(pwdEditor, false);
        } catch(e) {
          try { showToast(e && e.message ? e.message : ((w.t && w.t('error.updateFailed')) || '更新失败'), 'error'); } catch(_){ showToast('', 'error'); }
        } finally { spinnerBtn(btnPwdSave, false); }
      });

      // 修改角色交互：点击“角色值”进入编辑
      const openRoleEditor = () => {
        const visible = roleEditor.style.display !== 'none' && !roleEditor.classList.contains('is-collapsed');
        if (!visible) {
          toggleSection(roleEditor, true);
          try { select.focus(); } catch(_){ }
        }
      };
      roleValue.addEventListener('click', openRoleEditor);
      roleValue.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRoleEditor(); } });
      // 在下拉框内：Enter 保存，Escape 取消；变更不自动保存，仍走显式保存
      select.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter') { e.preventDefault(); btnRoleSave.click(); }
        else if (e.key === 'Escape') { e.preventDefault(); btnRoleCancel.click(); }
      });
      btnRoleCancel.addEventListener('click', () => { toggleSection(roleEditor, false); });
      btnRoleSave.addEventListener('click', async () => {
        const newRole = select.value;
        if (!newRole) { toggleSection(roleEditor, false); return; }
        spinnerBtn(btnRoleSave, true);
        try {
          await API.setRole(userId, newRole);
          try { showToast((w.t && w.t('status.updated')) || '已更新'); } catch(_){ }
          // 刷新列表以反映新角色
          await w.renderPermissionsPanel((document.getElementById('perm-search-input')?.value||'').trim());
        } catch(e) {
          try { showToast(e && e.message ? e.message : ((w.t && w.t('error.updateFailed')) || '更新失败'), 'error'); } catch(_){ showToast('', 'error'); }
        } finally {
          spinnerBtn(btnRoleSave, false);
          toggleSection(roleEditor, false);
        }
      });
    });

    // 使用高度过渡替换内容，避免列表高度瞬间变为 0 造成页面布局跳动
    const oldH = box.offsetHeight;
    if (thisSeq !== S.renderSeq) return;
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
    try { w.i18n && w.i18n.apply && w.i18n.apply(box); } catch(_){ }
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
})(window);

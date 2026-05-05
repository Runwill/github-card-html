((w)=>{
  // permissions/render/render_content — 内容渲染: 用户权限块 + 主渲染入口
  // 动效与绑定在 render.js 中，通过 TokensPerm._RenderUI 共享
  const ns = w.TokensPerm;
  const S = ns.state;
  const API = ns.API || {};
  const { makeEl, tag, bindPermTooltip, spinnerBtn, toggleSection } = ns.UI || {};
  const { t, setI18nAttr, setText, toast, ensureSearchBindings, measureNewHeight, animateExitRows, animateEnterRows, getUsersData, getMasterData, searchKeyFromInput, DEFAULT_SEARCH_KEY } = ns._RenderUI;

  // 单个用户块（行 + 三个编辑器）
  function createUserBlocks(u, allPerms){
    const block = document.createDocumentFragment();
    const userId = u._id || u.id;
    const current = Array.isArray(u.permissions) ? [...u.permissions] : [];

    // 行
    const row = makeEl('div', 'approval-row');
    const left = makeEl('div', 'approval-left');
    const meta = makeEl('div');
    const title = makeEl('div', 'approval-title', u.username || '');
    const sub = makeEl('div', 'approval-sub');
    // const subLabel = makeEl('span', 'approval-sub__label');
    // setI18nAttr(subLabel, 'permissions.user.roleLabel', t('permissions.user.roleLabel', 'role'));
    // 初始化角色显示时使用 i18n 名称，而不是原始英文代码
    const roleValue = makeEl('span', 'approval-role');
    try {
      const code = (u && u.role) ? String(u.role) : '';
      if (code) {
        setI18nAttr(roleValue, 'role.' + code, code);
      } else {
        roleValue.textContent = '-';
      }
    } catch(_) { roleValue.textContent = (u && u.role) || '-'; }
  try { meta.classList.add('is-editable'); meta.setAttribute('tabindex', '0'); meta.setAttribute('data-perm-trigger',''); meta.style.cursor='pointer'; } catch {}
    /* sub.appendChild(subLabel); */ sub.appendChild(roleValue);
    
    // 注册时间
    if (u.createdAt) {
      const dateSpan = makeEl('span', 'approval-sub__date');
      try { dateSpan.textContent = new Date(u.createdAt).toLocaleString(); } catch { dateSpan.textContent = u.createdAt; }
      sub.appendChild(dateSpan);
    }

    meta.appendChild(title); meta.appendChild(sub);

    const tagsWrap = makeEl('div', 'perm-tags');
    const shown = current.slice(0, ns.constants.MAX_TAGS_SHOWN);
    shown.forEach(p => { const el = tag(p, false); bindPermTooltip(el, p); tagsWrap.appendChild(el); });
    const extra = current.slice(ns.constants.MAX_TAGS_SHOWN);
    if (extra.length) tagsWrap.appendChild(tag('+' + extra.length, true, extra.join('、')));
    left.appendChild(meta); left.appendChild(tagsWrap);

    const right = makeEl('div', 'approval-right');
  const editBtn = makeEl('button', 'btn btn--secondary btn--sm');
    setI18nAttr(editBtn, 'permissions.edit', t('permissions.edit', '编辑权限'));
  const pwdBtn = makeEl('button', 'btn btn--secondary btn--sm');
    setI18nAttr(pwdBtn, 'permissions.changePassword', t('permissions.changePassword', '修改密码'));
  try { editBtn.setAttribute('data-perm-trigger', ''); pwdBtn.setAttribute('data-perm-trigger', ''); } catch {}
    right.appendChild(editBtn); right.appendChild(pwdBtn);
    row.appendChild(left); row.appendChild(right);
    block.appendChild(row);

    const editorStack = makeEl('div', 'perm-editor-stack');
    editorStack.style.display = 'none';
    editorStack.classList.add('is-collapsed');

    const makeEditorHead = (titleKey, fallback, tool)=>{
      const head = makeEl('div', 'perm-editor__head');
      const main = makeEl('div', 'perm-editor__head-main');
      const titleEl = makeEl('div', 'perm-editor__title');
      setI18nAttr(titleEl, titleKey, fallback);
      main.appendChild(titleEl);
      head.appendChild(main);
      if (tool) {
        const tools = makeEl('div', 'perm-editor__tools');
        tools.appendChild(tool);
        head.appendChild(tools);
      }
      return { head, main };
    };

    const makeEditorField = (labelKey, fallback, input)=>{
      const field = makeEl('label', 'perm-editor__field');
      const label = makeEl('span', 'perm-editor__field-label');
      setI18nAttr(label, labelKey, fallback);
      field.appendChild(label);
      field.appendChild(input);
      return field;
    };

    // 权限编辑器
    const editor = makeEl('div', 'perm-editor perm-editor--permissions'); editor.style.display = 'none'; editor.classList.add('is-collapsed');
    const selectedCounter = makeEl('div', 'perm-editor__counter');
    const btnSelectAll = makeEl('button', 'btn btn--secondary btn--sm admin-toolbar-action');
    setI18nAttr(btnSelectAll, 'permissions.selectAll', t('permissions.selectAll', '全选'));
    const editorHead = makeEditorHead('permissions.editor.permissionsTitle', t('permissions.edit', '编辑权限'), btnSelectAll);
    editorHead.main.appendChild(selectedCounter);
    const list = makeEl('div', 'perm-editor__list perm-editor__list--permissions');
    const updatePermissionSummary = ()=>{
      const total = allPerms.length;
      const selected = Array.from(list.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.checked).length;
      selectedCounter.textContent = (t('permissions.editor.selectedCount', '已选 {selected}/{total}') || '')
        .replace('{selected}', String(selected))
        .replace('{total}', String(total));
      setText(btnSelectAll, selected === total && total > 0 ? 'permissions.clearAll' : 'permissions.selectAll', selected === total && total > 0 ? '清空' : '全选');
    };
    const renderChecklist = ()=>{
      list.innerHTML = '';
      allPerms.forEach(p => {
        const item = makeEl('label', 'perm-editor__option');
        bindPermTooltip(item, p);
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = p; cb.checked = current.includes(p);
        cb.addEventListener('change', updatePermissionSummary);
        const text = makeEl('span', 'perm-editor__item-text', p);
        item.appendChild(cb); item.appendChild(text); list.appendChild(item);
      });
      updatePermissionSummary();
    };
    renderChecklist();

    const refreshTags = ()=>{
      tagsWrap.innerHTML = '';
      const shown2 = current.slice(0, ns.constants.MAX_TAGS_SHOWN);
      shown2.forEach(p => { const el = tag(p, false); bindPermTooltip(el, p); tagsWrap.appendChild(el); });
      const extra2 = current.slice(ns.constants.MAX_TAGS_SHOWN);
      if (extra2.length) tagsWrap.appendChild(tag('+' + extra2.length, true, extra2.join('、')));
    };
    const actions = makeEl('div', 'perm-editor__actions');
    const btnCancel = makeEl('button', 'btn btn--secondary');
    const btnSave = makeEl('button', 'btn btn--primary');
    setI18nAttr(btnCancel, 'common.cancel', t('common.cancel', '取消'));
    setI18nAttr(btnSave, 'common.save', t('common.save', '保存'));
    actions.appendChild(btnCancel); actions.appendChild(btnSave);
    editor.appendChild(editorHead.head); editor.appendChild(list); editor.appendChild(actions);
    editorStack.appendChild(editor);

    // 密码编辑器（用 <form> 包裹以满足浏览器 DOM 规范要求）
    const pwdEditor = makeEl('div', 'perm-editor perm-editor--form'); pwdEditor.style.display='none'; pwdEditor.classList.add('is-collapsed');
    const pwdForm = document.createElement('form'); pwdForm.autocomplete='off'; pwdForm.addEventListener('submit', e => e.preventDefault());
    const pwdHead = makeEditorHead('permissions.editor.passwordTitle', t('permissions.changePassword', '修改密码'));
    const pwdList = makeEl('div', 'perm-editor__form-grid');
    const inputNew = document.createElement('input'); inputNew.type='password'; inputNew.className='admin-input'; inputNew.autocomplete='new-password'; inputNew.placeholder = t('modal.password.new','新密码');
    const inputConfirm = document.createElement('input'); inputConfirm.type='password'; inputConfirm.className='admin-input'; inputConfirm.autocomplete='new-password'; inputConfirm.placeholder = t('modal.password.confirm','确认新密码');
    pwdList.appendChild(makeEditorField('modal.password.new', t('modal.password.new','新密码'), inputNew));
    pwdList.appendChild(makeEditorField('modal.password.confirm', t('modal.password.confirm','确认新密码'), inputConfirm));
    const pwdActions = makeEl('div', 'perm-editor__actions');
    const btnPwdCancel = makeEl('button', 'btn btn--secondary');
    const btnPwdSave = makeEl('button', 'btn btn--primary');
    setI18nAttr(btnPwdCancel, 'common.cancel', t('common.cancel','取消'));
    setI18nAttr(btnPwdSave, 'common.save', t('common.save','保存'));
    pwdActions.appendChild(btnPwdCancel); pwdActions.appendChild(btnPwdSave);
    pwdForm.appendChild(pwdHead.head); pwdForm.appendChild(pwdList); pwdForm.appendChild(pwdActions);
    pwdEditor.appendChild(pwdForm);
    editorStack.appendChild(pwdEditor);

    // 角色编辑器
    const roleEditor = makeEl('div', 'perm-editor perm-editor--form'); roleEditor.style.display='none'; roleEditor.classList.add('is-collapsed');
    const roleHead = makeEditorHead('permissions.editor.roleTitle', t('permissions.changeRole', '修改角色'));
    const roleList = makeEl('div', 'perm-editor__form-grid');
    const select = document.createElement('select'); select.className='admin-input';
    const ROLES = [ { v: 'admin', k: 'role.admin' }, { v: 'moderator', k: 'role.moderator' }, { v: 'user', k: 'role.user' }, { v: 'guest', k: 'role.guest' } ];
    ROLES.forEach(r => { const opt = document.createElement('option'); opt.value = r.v; setText(opt, r.k, r.v); if (String(u.role) === r.v) opt.selected = true; select.appendChild(opt); });
    roleList.appendChild(makeEditorField('permissions.user.roleLabel', t('permissions.user.roleLabel', '角色：'), select));
    const roleActions = makeEl('div', 'perm-editor__actions');
    const btnRoleCancel = makeEl('button', 'btn btn--secondary');
    const btnRoleSave = makeEl('button', 'btn btn--primary');
    setI18nAttr(btnRoleCancel, 'common.cancel', t('common.cancel','取消'));
    setI18nAttr(btnRoleSave, 'common.save', t('common.save','保存'));
    roleActions.appendChild(btnRoleCancel); roleActions.appendChild(btnRoleSave);
    roleEditor.appendChild(roleHead.head); roleEditor.appendChild(roleList); roleEditor.appendChild(roleActions);
    editorStack.appendChild(roleEditor);
    block.appendChild(editorStack);

    const editors = [editor, pwdEditor, roleEditor];
    const STACK_TRANSITION = 'height 220ms ease, opacity 150ms ease, transform 220ms ease';
    const STACK_FALLBACK = 380;
    const isStackOpen = ()=> editorStack.style.display !== 'none' && !editorStack.classList.contains('is-collapsed');
    const isEditorOpen = (target)=> isStackOpen() && editorStack.__activeEditor === target;
    const syncTriggers = (target)=>{
      const expanded = !!target && isStackOpen();
      editBtn.classList.toggle('is-active', expanded && target === editor);
      pwdBtn.classList.toggle('is-active', expanded && target === pwdEditor);
      meta.classList.toggle('is-active', expanded && target === roleEditor);
      editBtn.setAttribute('aria-expanded', expanded && target === editor ? 'true' : 'false');
      pwdBtn.setAttribute('aria-expanded', expanded && target === pwdEditor ? 'true' : 'false');
      meta.setAttribute('aria-expanded', expanded && target === roleEditor ? 'true' : 'false');
    };
    const setEditorVisible = (target)=>{
      editors.forEach(ed => {
        const active = ed === target;
        ed.style.display = active ? 'block' : 'none';
        ed.classList.toggle('is-collapsed', !active);
        ed.style.height = '';
        ed.style.opacity = '';
      });
    };
    const measureEditor = (target)=>{
      if (!target) return 0;
      const prevDisplay = target.style.display;
      const prevVisibility = target.style.visibility;
      const wasCollapsed = target.classList.contains('is-collapsed');
      target.style.display = 'block';
      target.style.visibility = 'hidden';
      target.classList.remove('is-collapsed');
      target.style.height = '';
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      const margin = (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
      target.style.display = prevDisplay;
      target.style.visibility = prevVisibility;
      target.classList.toggle('is-collapsed', wasCollapsed);
      return rect.height + margin;
    };
    const finishStack = (target, focusEl)=>{
      editorStack.removeEventListener('transitionend', editorStack.__onTransitionEnd || (()=>{}));
      if (editorStack.__timer) { clearTimeout(editorStack.__timer); editorStack.__timer = null; }
      editorStack.style.transition = '';
      editorStack.style.height = '';
      editorStack.style.opacity = '';
      editorStack.__animating = false;
      editorStack.__activeEditor = target || null;
      syncTriggers(target || null);
      if (target && focusEl) setTimeout(()=>{ try { focusEl.focus(); } catch{} }, 60);
    };
    const openEditorStack = (target, focusEl)=>{
      if (!target || editorStack.__animating) return;
      const startHeight = isStackOpen() ? editorStack.getBoundingClientRect().height : 0;
      editorStack.__animating = true;
      editorStack.style.display = 'block';
      editorStack.classList.remove('is-collapsed');
      editorStack.style.transition = 'none';
      editorStack.style.height = startHeight + 'px';
      editorStack.style.opacity = '1';
      const targetHeight = measureEditor(target);
      setEditorVisible(target);
      syncTriggers(target);
      void editorStack.offsetHeight;
      const done = (e)=>{
        if (e && e.target !== editorStack) return;
        if (e && e.propertyName !== 'height') return;
        finishStack(target, focusEl);
      };
      editorStack.__onTransitionEnd = done;
      editorStack.addEventListener('transitionend', done);
      editorStack.__timer = setTimeout(()=>done(), STACK_FALLBACK);
      editorStack.style.transition = STACK_TRANSITION;
      editorStack.style.height = targetHeight + 'px';
      editorStack.style.opacity = '1';
    };
    const closeEditorStack = ()=>{
      if (!isStackOpen() || editorStack.__animating) return;
      editorStack.__animating = true;
      editorStack.style.transition = 'none';
      editorStack.style.height = editorStack.getBoundingClientRect().height + 'px';
      editorStack.style.opacity = '1';
      void editorStack.offsetHeight;
      const done = (e)=>{
        if (e && e.target !== editorStack) return;
        if (e && e.propertyName !== 'height') return;
        editorStack.removeEventListener('transitionend', done);
        if (editorStack.__timer) { clearTimeout(editorStack.__timer); editorStack.__timer = null; }
        editorStack.style.transition = '';
        editorStack.style.height = '';
        editorStack.style.opacity = '';
        editorStack.style.display = 'none';
        editorStack.classList.add('is-collapsed');
        editorStack.__activeEditor = null;
        editorStack.__animating = false;
        setEditorVisible(null);
        syncTriggers(null);
      };
      editorStack.addEventListener('transitionend', done);
      editorStack.__timer = setTimeout(()=>done(), STACK_FALLBACK);
      editorStack.style.transition = STACK_TRANSITION;
      editorStack.style.height = '0px';
      editorStack.style.opacity = '0';
    };
    editorStack.__closeEditorStack = closeEditorStack;
    const openEditor = (target, focusEl)=>{
      const nextOpen = !isEditorOpen(target);
      if (nextOpen) openEditorStack(target, focusEl);
      else closeEditorStack();
    };

    // 交互绑定 —— 权限
    editBtn.addEventListener('click', ()=>{
      openEditor(editor);
    });
    btnSelectAll.addEventListener('click', ()=>{
      const cbs = Array.from(list.querySelectorAll('input[type="checkbox"]').values());
      const shouldSelectAll = cbs.some(cb => !cb.checked);
      cbs.forEach(cb => { cb.checked = shouldSelectAll; });
      updatePermissionSummary();
    });
    btnCancel.addEventListener('click', closeEditorStack);
    btnSave.addEventListener('click', async ()=>{
      const selected = Array.from(list.querySelectorAll('input[type="checkbox"]')).filter(cb=>cb.checked).map(cb=>cb.value);
      const curSet = new Set(current); const selSet = new Set(selected);
      const toGrant = selected.filter(p => !curSet.has(p));
      const toRevoke = current.filter(p => !selSet.has(p));
      if (!toGrant.length && !toRevoke.length) { closeEditorStack(); return; }
      spinnerBtn(btnSave, true);
      try {
        for (const p of toGrant) { await API.grant(userId, p); if (!curSet.has(p)) { curSet.add(p); current.push(p); } }
        for (const p of toRevoke) { await API.revoke(userId, p); if (curSet.has(p)) { curSet.delete(p); const idx = current.indexOf(p); if (idx>-1) current.splice(idx,1); } }
        // 局部更新标签展示，不刷新整页
        refreshTags();
        // 自动刷新日志
        if (ns.refreshLogs) ns.refreshLogs();
      } catch(e) { toast((e && e.message) ? e.message : 'permissions.saveFailed', 'error'); }
      finally { spinnerBtn(btnSave, false); closeEditorStack(); }
    });

    // 交互绑定 —— 密码
    pwdBtn.addEventListener('click', ()=>{
      openEditor(pwdEditor, inputNew);
    });
    btnPwdCancel.addEventListener('click', closeEditorStack);
    btnPwdSave.addEventListener('click', async ()=>{
      const p1 = (inputNew.value || '').trim(); const p2 = (inputConfirm.value || '').trim();
      if (!p1 || !p2) { toast('error.fillAll', 'error'); return; }
      if (p1.length < 6) { toast('error.pwdMin', 'error'); return; }
      if (p1 !== p2) { toast('error.pwdNotMatch', 'error'); return; }
      spinnerBtn(btnPwdSave, true);
      try {
        await API.setPassword(userId, p1);
        toast('status.updated'); inputNew.value=''; inputConfirm.value=''; closeEditorStack();
        // 自动刷新日志
        if (ns.refreshLogs) ns.refreshLogs();
      } catch(e) { toast(e && e.message ? e.message : 'error.updateFailed', 'error'); }
      finally { spinnerBtn(btnPwdSave, false); }
    });

    // 交互绑定 —— 角色
    const toggleRoleEditor = ()=>{
      openEditor(roleEditor, select);
    };
    meta.addEventListener('click', toggleRoleEditor);
    meta.addEventListener('keydown', (e)=>{ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggleRoleEditor(); }});
    select.addEventListener('keydown', (e)=>{ if (e.key==='Enter') { e.preventDefault(); btnRoleSave.click(); } else if (e.key==='Escape') { e.preventDefault(); btnRoleCancel.click(); }});
    btnRoleCancel.addEventListener('click', closeEditorStack);
    btnRoleSave.addEventListener('click', async ()=>{
      const newRole = select.value; if (!newRole) { closeEditorStack(); return; }
      spinnerBtn(btnRoleSave, true);
      try {
        await API.setRole(userId, newRole); toast('status.updated');
        // 自动刷新日志
        if (ns.refreshLogs) ns.refreshLogs();
        // 局部更新角色文本，不刷新整页
        try { roleValue.textContent = select.options[select.selectedIndex]?.textContent || newRole; } catch { roleValue.textContent = newRole; }
      } catch(e) { toast(e && e.message ? e.message : 'error.updateFailed', 'error'); }
      finally { spinnerBtn(btnRoleSave, false); closeEditorStack(); }
    });

  return block;
  }

  // 主渲染入口
  ns.renderPermissionsPanel = async function(search, options){
    const opts = options && typeof options === 'object' ? options : {};
    const forceRefresh = !!opts.forceRefresh;
    const thisSeq = ++S.renderSeq;
    const box = document.getElementById('perm-list');
    const msg = document.getElementById('perm-message');
    if (!box) return;

    ensureSearchBindings();
    if (msg) msg.textContent = '';

    // 加载数据
  const s = (search || '').trim();
  const searchKey = searchKeyFromInput(s);
  const usersRaw = await getUsersData(searchKey, forceRefresh || !!s);
    if (thisSeq !== S.renderSeq) return;
  let users = Array.isArray(usersRaw) ? usersRaw.slice() : [];
  if (!s && S.permMode === 'partial') users = users.filter(u => Array.isArray(u.permissions) && u.permissions.length > 0);

    // 全量权限集合
  let master = [];
  try { master = await getMasterData(forceRefresh); }
  catch(e) { try { console.error(t('permissions.fetchMasterFailedPrefix', '获取权限清单失败：'), e); } catch { console.error(e); } }
    const allPermsSet = new Set(master);
    users.forEach(u => (Array.isArray(u.permissions) ? u.permissions : []).forEach(p => { if (p) allPermsSet.add(String(p)); }));
    const allPerms = Array.from(allPermsSet).sort();

    // 构建新内容
    const frag = document.createDocumentFragment();
    if (!users.length){
      const p = document.createElement('p'); p.className = 'empty-hint'; setI18nAttr(p, 'common.empty', t('common.empty','暂无数据'));
      frag.appendChild(p);
    } else {
      users.forEach(u => frag.appendChild(createUserBlocks(u, allPerms)));
    }

    // 若面板当前不可见（如首次后台预渲染）或无旧内容，跳过进出场动画以提升首屏响应
    const panelEl = document.getElementById('panel_permissions');
    const isVisible = (el)=>{
      try{
        if (!el) return true; // 保守认为可见
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }catch(_){ return true; }
    };
    const noOldContent = !box.hasChildNodes();
    const skipAnim = !isVisible(panelEl) || noOldContent;
    if (skipAnim){
      box.innerHTML = '';
      box.appendChild(frag);
      try { w.i18n && w.i18n.apply && w.i18n.apply(box); } catch {}
      return;
    }

    // 过渡：旧行淡出 + 容器高度过渡
    const oldH = box.offsetHeight;
    if (thisSeq !== S.renderSeq) return;
    const measuredNewH = measureNewHeight(box, frag, oldH);
    const oldRows = Array.from(box.children || []).filter(el => el?.classList?.contains('approval-row'));

    try {
      box.style.height = oldH + 'px';
      box.style.transition = 'height 300ms cubic-bezier(0.22, 1, 0.36, 1)';
      box.style.overflow = 'hidden';
      // 强制回流
      void box.offsetHeight;
      if (measuredNewH !== oldH) box.style.height = measuredNewH + 'px';
    } catch {}

    await animateExitRows(oldRows);
    if (thisSeq !== S.renderSeq) return;

    // 替换内容并淡入新行
    box.innerHTML = '';
    box.appendChild(frag);
  try { w.i18n && w.i18n.apply && w.i18n.apply(box); } catch {}
    const newRows = Array.from(box.children || []).filter(el => el?.classList?.contains('approval-row'));
    animateEnterRows(newRows);

    // 清理容器内联样式
    try { box.style.transition=''; box.style.height=''; box.style.overflow=''; } catch {}
  };


  // 兼容：在 window 级别暴露
  w.renderPermissionsPanel = ns.renderPermissionsPanel;
})(window);

const w = window;
  // permissions/render/render_content — 内容渲染: 用户权限块 + 主渲染入口
  // 动效与绑定在 render.js 中，通过 TokensPerm._RenderUI 共享
  const ns = w.TokensPerm;
  const S = ns.state;
  const API = ns.API || {};
  const { makeEl, tag, bindPermTooltip, spinnerBtn, toggleSection } = ns.UI || {};
  const { t, setI18nAttr, setText, toast, ensureSearchBindings, measureNewHeight, isVisible, animateExitRows, animateEnterRows, getUsersData, getMasterData, searchKeyFromInput } = ns._RenderUI;

  // 单个用户块（行 + 三个编辑器）
  function createUserBlocks(u, allPerms){
    const block = document.createDocumentFragment();
    const userId = u._id || u.id;
    const current = Array.isArray(u.permissions) ? [...u.permissions] : [];
    const refreshLogs = ()=>{ if (ns.refreshLogs) ns.refreshLogs(); };

    // 行
    const row = makeEl('div', 'approval-row');
    const left = makeEl('div', 'approval-left');
    const meta = makeEl('div');
    const title = makeEl('div', 'approval-title', u.username || '');
    const sub = makeEl('div', 'approval-sub');
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
    sub.append(roleValue);
    
    // 注册时间
    if (u.createdAt) {
      const dateSpan = makeEl('span', 'approval-sub__date');
      dateSpan.textContent = w.TimeFmt.formatAbsOrRaw(u.createdAt);
      sub.append(dateSpan);
    }

    meta.append(title, sub);

    const tagsWrap = makeEl('div', 'perm-tags');
    left.append(meta, tagsWrap);
    const renderPermissionTags = ()=>{
      const tags = current.slice(0, ns.constants.MAX_TAGS_SHOWN).map(p => { const el = tag(p, false); bindPermTooltip(el, p); return el; });
      const extra = current.slice(ns.constants.MAX_TAGS_SHOWN);
      if (extra.length) tags.push(tag('+' + extra.length, true, extra.join('、')));
      tagsWrap.replaceChildren(...tags);
    };
    renderPermissionTags();

    const right = makeEl('div', 'approval-right');
  const editBtn = makeEl('button', 'btn btn--secondary btn--sm');
    setI18nAttr(editBtn, 'permissions.edit', t('permissions.edit', '编辑权限'));
  const pwdBtn = makeEl('button', 'btn btn--secondary btn--sm');
    setI18nAttr(pwdBtn, 'permissions.changePassword', t('permissions.changePassword', '修改密码'));
  try { editBtn.setAttribute('data-perm-trigger', ''); pwdBtn.setAttribute('data-perm-trigger', ''); } catch {}
    right.append(editBtn, pwdBtn);
    row.append(left, right);
    block.append(row);

    const editorStack = makeEl('div', 'perm-editor-stack');
    editorStack.style.display = 'none';
    editorStack.classList.add('is-collapsed');

    const makeEditorHead = (titleKey, fallback, tool)=>{
      const head = makeEl('div', 'perm-editor__head');
      const main = makeEl('div', 'perm-editor__head-main');
      const titleEl = makeEl('div', 'perm-editor__title');
      setI18nAttr(titleEl, titleKey, fallback);
      main.append(titleEl);
      head.append(main);
      if (tool) {
        const tools = makeEl('div', 'perm-editor__tools');
        tools.append(tool);
        head.append(tools);
      }
      return { head, main };
    };

    const makeEditorField = (labelKey, fallback, input)=>{
      const field = makeEl('label', 'perm-editor__field');
      try {
        input.setAttribute('aria-label', fallback || labelKey || '');
        input.setAttribute('data-i18n-attr', 'aria-label');
        input.setAttribute('data-i18n-aria-label', labelKey);
      } catch(_) {}
      field.append(input);
      return field;
    };

    const makeHiddenEditor = (className)=>{
      const el = makeEl('div', className);
      el.style.display = 'none';
      el.classList.add('is-collapsed');
      return el;
    };

    const makeEditorActions = ()=>{
      const actions = makeEl('div', 'perm-editor__actions');
      const cancel = makeEl('button', 'btn btn--secondary');
      const save = makeEl('button', 'btn btn--primary btn--lift');
      setI18nAttr(cancel, 'common.cancel', t('common.cancel', '取消'));
      setI18nAttr(save, 'common.save', t('common.save', '保存'));
      actions.append(cancel, save);
      return { actions, cancel, save };
    };

    const saveWithSpinner = async (button, fallback, task, closeAfter)=>{
      spinnerBtn(button, true);
      try { await task(); }
      catch(e) { toast((e && e.message) ? e.message : fallback, 'error'); }
      finally { spinnerBtn(button, false); if (closeAfter) closeEditorStack(); }
    };

    // 权限编辑器
    const editor = makeHiddenEditor('perm-editor perm-editor--permissions');
    const selectedCounter = makeEl('div', 'perm-editor__counter');
    const btnSelectAll = makeEl('button', 'btn btn--secondary btn--sm admin-toolbar-action');
    setI18nAttr(btnSelectAll, 'permissions.selectAll', t('permissions.selectAll', '全选'));
    const editorHead = makeEditorHead('permissions.editor.permissionsTitle', t('permissions.edit', '编辑权限'), btnSelectAll);
    editorHead.main.append(selectedCounter);
    const list = makeEl('div', 'perm-editor__list perm-editor__list--permissions');
    const permissionCheckboxes = ()=> Array.from(list.querySelectorAll('input[type="checkbox"]'));
    const checkedPermissionValues = ()=> permissionCheckboxes().filter(cb => cb.checked).map(cb => cb.value);
    const updatePermissionSummary = ()=>{
      const total = allPerms.length;
      const selected = checkedPermissionValues().length;
      selectedCounter.textContent = (t('permissions.editor.selectedCount', '已选 {selected}/{total}') || '')
        .replace('{selected}', String(selected))
        .replace('{total}', String(total));
      setText(btnSelectAll, selected === total && total > 0 ? 'permissions.clearAll' : 'permissions.selectAll', selected === total && total > 0 ? '清空' : '全选');
    };
    const renderChecklist = ()=>{
      list.replaceChildren(...allPerms.map(p => {
        const item = makeEl('label', 'perm-editor__option');
        bindPermTooltip(item, p);
        const cb = makeEl('input', { type:'checkbox', value:p, checked:current.includes(p) });
        cb.addEventListener('change', updatePermissionSummary);
        const text = makeEl('span', 'perm-editor__item-text', p);
        item.append(cb, text);
        return item;
      }));
      updatePermissionSummary();
    };
    renderChecklist();

    const { actions, cancel: btnCancel, save: btnSave } = makeEditorActions();
    editor.append(editorHead.head, list, actions);
    editorStack.append(editor);

    // 密码编辑器（用 <form> 包裹以满足浏览器 DOM 规范要求）
    const pwdEditor = makeHiddenEditor('perm-editor perm-editor--form');
    const pwdForm = makeEl('form', { autocomplete:'off' }); pwdForm.addEventListener('submit', e => e.preventDefault());
    const pwdHead = makeEditorHead('permissions.editor.passwordTitle', t('permissions.changePassword', '修改密码'));
    const pwdList = makeEl('div', 'perm-editor__form-grid');
    const inputNew = makeEl('input', { type:'password', className:'ui-field admin-input', autocomplete:'new-password', placeholder:t('modal.password.new','新密码') });
    const inputConfirm = makeEl('input', { type:'password', className:'ui-field admin-input', autocomplete:'new-password', placeholder:t('modal.password.confirm','确认新密码') });
    pwdList.append(
      makeEditorField('modal.password.new', t('modal.password.new','新密码'), inputNew),
      makeEditorField('modal.password.confirm', t('modal.password.confirm','确认新密码'), inputConfirm)
    );
    const { actions: pwdActions, cancel: btnPwdCancel, save: btnPwdSave } = makeEditorActions();
    pwdForm.append(pwdHead.head, pwdList, pwdActions);
    pwdEditor.append(pwdForm);
    editorStack.append(pwdEditor);

    // 角色编辑器
    const roleEditor = makeHiddenEditor('perm-editor perm-editor--form');
    const roleHead = makeEditorHead('permissions.editor.roleTitle', t('permissions.changeRole', '修改角色'));
    const roleList = makeEl('div', 'perm-editor__form-grid');
    const select = makeEl('select', 'ui-field admin-input');
    const ROLES = [ { v: 'admin', k: 'role.admin' }, { v: 'moderator', k: 'role.moderator' }, { v: 'user', k: 'role.user' }, { v: 'guest', k: 'role.guest' } ];
    select.replaceChildren(...ROLES.map(r => { const opt = makeEl('option', { value:r.v, selected:String(u.role) === r.v }); setText(opt, r.k, r.v); return opt; }));
    roleList.append(makeEditorField('permissions.user.roleLabel', t('permissions.user.roleLabel', '角色：'), select));
    const { actions: roleActions, cancel: btnRoleCancel, save: btnRoleSave } = makeEditorActions();
    roleEditor.append(roleHead.head, roleList, roleActions);
    editorStack.append(roleEditor);
    block.append(editorStack);

    const editors = [editor, pwdEditor, roleEditor];
    let hideEditorsTimer = null;
    const isStackOpen = ()=> editorStack.style.display !== 'none' && !editorStack.classList.contains('is-collapsed');
    const isEditorOpen = (target)=> isStackOpen() && editorStack.__activeEditor === target;
    const syncTriggers = (target)=>{
      const expanded = !!target && isStackOpen();
      [[editBtn, editor], [pwdBtn, pwdEditor], [meta, roleEditor]].forEach(([trigger, editorEl])=>{
        const active = expanded && target === editorEl;
        trigger.classList.toggle('is-active', active);
        trigger.setAttribute('aria-expanded', active ? 'true' : 'false');
      });
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
    const openEditorStack = (target, focusEl)=>{
      if (!target) return;
      if (hideEditorsTimer) { clearTimeout(hideEditorsTimer); hideEditorsTimer = null; }
      setEditorVisible(target);
      editorStack.__activeEditor = target;
      toggleSection(editorStack, true);
      syncTriggers(target);
      if (focusEl) setTimeout(()=>{ try { focusEl.focus(); } catch{} }, 60);
    };
    const closeEditorStack = ()=>{
      if (!isStackOpen()) return;
      editorStack.__activeEditor = null;
      syncTriggers(null);
      toggleSection(editorStack, false);
      hideEditorsTimer = setTimeout(()=>{
        hideEditorsTimer = null;
        if (!isStackOpen()) setEditorVisible(null);
      }, 390);
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
      const cbs = permissionCheckboxes();
      const shouldSelectAll = cbs.some(cb => !cb.checked);
      cbs.forEach(cb => { cb.checked = shouldSelectAll; });
      updatePermissionSummary();
    });
    btnCancel.addEventListener('click', closeEditorStack);
    btnSave.addEventListener('click', async ()=>{
      const selected = checkedPermissionValues();
      const curSet = new Set(current); const selSet = new Set(selected);
      const toGrant = selected.filter(p => !curSet.has(p));
      const toRevoke = current.filter(p => !selSet.has(p));
      if (!toGrant.length && !toRevoke.length) { closeEditorStack(); return; }
      await saveWithSpinner(btnSave, 'permissions.saveFailed', async ()=>{
        for (const p of toGrant) { await API.grant(userId, p); if (!curSet.has(p)) { curSet.add(p); current.push(p); } }
        for (const p of toRevoke) { await API.revoke(userId, p); if (curSet.has(p)) { curSet.delete(p); const idx = current.indexOf(p); if (idx>-1) current.splice(idx,1); } }
        renderPermissionTags();
        refreshLogs();
      }, true);
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
      await saveWithSpinner(btnPwdSave, 'error.updateFailed', async ()=>{
        await API.setPassword(userId, p1);
        toast('status.updated'); inputNew.value=''; inputConfirm.value=''; closeEditorStack();
        refreshLogs();
      }, false);
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
      await saveWithSpinner(btnRoleSave, 'error.updateFailed', async ()=>{
        await API.setRole(userId, newRole); toast('status.updated');
        refreshLogs();
        try { roleValue.textContent = select.options[select.selectedIndex]?.textContent || newRole; } catch { roleValue.textContent = newRole; }
      }, true);
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
      const p = makeEl('p', 'empty-hint'); setI18nAttr(p, 'common.empty', t('common.empty','暂无数据'));
      frag.appendChild(p);
    } else {
      users.forEach(u => frag.appendChild(createUserBlocks(u, allPerms)));
    }

    // 若面板当前不可见（如首次后台预渲染）或无旧内容，跳过进出场动画以提升首屏响应
    const panelEl = document.getElementById('panel_permissions');
    const noOldContent = !box.hasChildNodes();
    const skipAnim = !isVisible(panelEl, true) || noOldContent;
    if (skipAnim){
      box.replaceChildren(frag);
      w.i18n?.applySafe?.(box);
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
    box.replaceChildren(frag);
    w.i18n?.applySafe?.(box);
    const newRows = Array.from(box.children || []).filter(el => el?.classList?.contains('approval-row'));
    animateEnterRows(newRows);

    // 清理容器内联样式
    try { box.style.transition=''; box.style.height=''; box.style.overflow=''; } catch {}
  };

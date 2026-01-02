((w)=>{
  // 命名空间与状态
  const ns = (w.TokensPerm = w.TokensPerm || {});
  ns.state = ns.state || { permMode: 'partial', renderSeq: 0 };
  const S = ns.state;

  // 依赖
  const UI = ns.UI || {};
  const API = ns.API || {};
  const { makeEl, tag, bindPermTooltip, spinnerBtn, toggleSection, showToast } = UI;

  // 工具：i18n/文本/提示
  const t = (key, fallback) => {
    try { return (w.t && w.t(key)) || fallback; } catch { return fallback; }
  };
  const setI18nAttr = (el, key, fallbackText) => {
    if (!el) return;
    try {
      el.setAttribute('data-i18n', key);
      w.i18n && w.i18n.apply && w.i18n.apply(el);
    } catch { if (fallbackText != null) el.textContent = fallbackText; }
  };
  const setText = (el, key, fallback) => {
    if (!el) return;
    try { el.textContent = (w.t && w.t(key)) || fallback || ''; }
    catch { el.textContent = fallback || ''; }
  };
  const toast = (keyOrText, type) => {
    try { showToast((w.t && w.t(keyOrText)) || keyOrText || '', type); }
    catch { showToast('', type); }
  };

  // 预加载用户列表与权限清单，避免面板首次打开时短暂空白导致布局抖动
  const DEFAULT_SEARCH_KEY = '__default__';
  const prefetchState = S.prefetch = S.prefetch || { users: new Map(), master: {} };
  if (!(prefetchState.users instanceof Map)) prefetchState.users = new Map();
  if (!prefetchState.master || typeof prefetchState.master !== 'object') prefetchState.master = {};
  const searchKeyFromInput = (raw)=>{
    try {
      const trimmed = (raw == null ? '' : String(raw)).trim();
      return trimmed ? trimmed : DEFAULT_SEARCH_KEY;
    } catch { return DEFAULT_SEARCH_KEY; }
  };
  const searchValueFromKey = (key)=> key === DEFAULT_SEARCH_KEY ? '' : key;
  const getUsersData = (key, forceRefresh)=>{
    try {
      const store = prefetchState.users;
      const entry = store.get(key) || {};
      if (!forceRefresh) {
        if (entry.data) return Promise.resolve(entry.data);
        if (entry.promise) return entry.promise;
      }
      const query = searchValueFromKey(key);
      const promise = (API.fetchUsers ? API.fetchUsers(query) : Promise.resolve([])).then(users => {
        const list = Array.isArray(users) ? users : [];
        store.set(key, { data: list });
        return list;
      }).catch(()=>{
        store.set(key, { data: [] });
        return [];
      });
      store.set(key, { ...entry, promise });
      return promise;
    } catch {
      prefetchState.users.set(key, { data: [] });
      return Promise.resolve([]);
    }
  };
  const getMasterData = (forceRefresh)=>{
    try {
      const entry = prefetchState.master || {};
      if (!forceRefresh) {
        if (entry.data) return Promise.resolve(entry.data);
        if (entry.promise) return entry.promise;
      }
      const promise = (API.getMasterPermissions ? API.getMasterPermissions() : Promise.resolve([])).then(perms => {
        const list = Array.isArray(perms) ? perms.map(String) : [];
        prefetchState.master = { data: list };
        return list;
      }).catch(()=>{
        prefetchState.master = { data: [] };
        return [];
      });
      prefetchState.master = { ...entry, promise };
      return promise;
    } catch {
      prefetchState.master = { data: [] };
      return Promise.resolve([]);
    }
  };

  // 暴露刷新用户列表的方法（供审批通过后调用）
  ns.refreshUsers = (force) => getUsersData(DEFAULT_SEARCH_KEY, force !== false);

  // 提前启动默认查询的预加载
  try { getUsersData(DEFAULT_SEARCH_KEY, false); } catch {}
  try { getMasterData(false); } catch {}

  // 动效能力缓存
  const CAN_WAAPI = !!(Element.prototype && Element.prototype.animate);
  const PREFERS_REDUCED = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const STAGGER_EXIT = 18; // ms
  const STAGGER_ENTER = 14; // ms

  // 绑定搜索/切换模式控件（仅一次）
  function ensureSearchBindings(){
    try {
      const btn = document.getElementById('perm-search-btn');
      const input = document.getElementById('perm-search-input');
      const toggle = document.getElementById('perm-mode-toggle');
      if (btn && !btn.__permBound) {
        btn.__permBound = true;
        btn.addEventListener('click', ()=> w.renderPermissionsPanel((input?.value || '').trim(), { forceRefresh: true }));
      }
      if (input && !input.__permBound) {
        input.__permBound = true;
        input.addEventListener('keydown', (e)=>{
          if (e.key === 'Enter') w.renderPermissionsPanel((input.value || '').trim(), { forceRefresh: true });
        });
      }
      if (toggle && !toggle.__permBound) {
        toggle.__permBound = true;
        toggle.addEventListener('click', ()=>{
          S.permMode = (S.permMode === 'partial') ? 'all' : 'partial';
          setI18nAttr(toggle, (S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all', (S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all');
          toggle.classList.toggle('is-active', S.permMode === 'all');
          w.renderPermissionsPanel((input?.value || '').trim(), { forceRefresh: true });
        });
      }
      if (toggle) {
        setI18nAttr(toggle, (S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all', (S.permMode === 'partial') ? 'permissions.mode.partial' : 'permissions.mode.all');
        toggle.classList.toggle('is-active', S.permMode === 'all');
      }

      // 点击空白处：收起全部编辑器（仅绑定一次）
      if (!S.__docClickBound) {
        S.__docClickBound = true;
        document.addEventListener('click', (e)=>{
          const panel = document.getElementById('perm-list');
          if (!panel) return;
          const target = e.target;
          // 如果点击在任一编辑器内部，忽略
          if (target && (target.closest && (target.closest('.perm-editor')))) return;
          // 如果点击在触发器上（编辑按钮/修改密码按钮/角色值），忽略，避免立刻被折叠
          if (target && (target.closest && target.closest('[data-perm-trigger]'))) return;
          // 其它区域（包括面板外部或行空白处）则收起全部编辑器
          const editors = panel.querySelectorAll('.perm-editor');
          editors.forEach(ed => { try { toggleSection(ed, false); } catch {} });
        });

        
      }
    } catch {}
  }
  

  // 计算新内容高度（用于高度过渡）
  function measureNewHeight(container, fragment, fallbackH){
    try {
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.left = '-10000px';
      probe.style.top = '0';
      probe.style.visibility = 'hidden';
      probe.style.pointerEvents = 'none';
      probe.style.width = container.clientWidth + 'px';
      probe.className = container.className || '';
      const parent = container.parentNode || document.body;
      parent.appendChild(probe);
      probe.appendChild(fragment.cloneNode(true));
      const h = probe.scrollHeight;
      parent.removeChild(probe);
      return h;
    } catch { return fallbackH; }
  }

  // 旧行淡出
  function animateExitRows(rows){
    return new Promise(resolve => {
      if (!rows.length) return resolve();
      if (CAN_WAAPI && !PREFERS_REDUCED) {
        const animations = [];
        rows.forEach((el, idx)=>{
          try {
            el.style.willChange = 'opacity, transform';
            el.style.pointerEvents = 'none';
            const anim = el.animate([
              { opacity: 1, transform: 'translateY(0px)' },
              { opacity: 0, transform: 'translateY(-4px)' }
            ], { duration: 220, easing: 'cubic-bezier(0.39, 0.575, 0.565, 1)', delay: idx * STAGGER_EXIT, fill: 'forwards' });
            animations.push(anim.finished.catch(()=>{}).then(()=>{ try { el.style.willChange = ''; } catch{} }));
          } catch {}
        });
        const fallback = 220 + (rows.length > 0 ? (rows.length - 1) * STAGGER_EXIT : 0) + 80;
        const timer = new Promise(r => setTimeout(r, fallback));
        Promise.race([Promise.all(animations), timer]).then(resolve);
      } else {
        let pending = rows.length;
        const done = ()=>{ if (!--pending) resolve(); };
        rows.forEach((el, idx)=>{
          try {
            el.style.transitionDelay = (idx * STAGGER_EXIT) + 'ms';
            el.classList.add('perm-row-exit');
            const onEnd = (e)=>{ if (e && e.target !== el) return; el.removeEventListener('transitionend', onEnd); try { el.style.transitionDelay=''; } catch{} done(); };
            el.addEventListener('transitionend', onEnd);
          } catch { done(); }
        });
        const fallback = 220 + (rows.length > 0 ? (rows.length - 1) * STAGGER_EXIT : 0) + 80;
        setTimeout(resolve, fallback);
      }
    });
  }

  // 新行淡入
  function animateEnterRows(rows){
    if (CAN_WAAPI && !PREFERS_REDUCED) {
      rows.forEach((el, idx)=>{
        try {
          el.style.willChange = 'opacity, transform';
          const anim = el.animate([
            { opacity: 0, transform: 'translateY(6px)' },
            { opacity: 1, transform: 'translateY(0px)' }
          ], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', delay: idx * STAGGER_ENTER, fill: 'both' });
          anim.finished.catch(()=>{}).then(()=>{ try { el.style.willChange=''; } catch{} });
        } catch {}
      });
    } else {
      rows.forEach((el, idx)=>{ try { el.classList.add('perm-row-enter'); el.style.transitionDelay = (idx * STAGGER_ENTER) + 'ms'; } catch{} });
      requestAnimationFrame(()=>{
        rows.forEach(el => { try { el.classList.add('perm-row-enter-active'); } catch{} });
        const maxDelay = (rows.length > 0 ? (rows.length - 1) * STAGGER_ENTER : 0);
        const tidy = ()=> rows.forEach(el => { try { el.classList.remove('perm-row-enter'); el.classList.remove('perm-row-enter-active'); el.style.transitionDelay=''; } catch{} });
        setTimeout(tidy, 260 + maxDelay);
      });
    }
  }

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
  try { meta.classList.add('is-editable'); meta.setAttribute('tabindex', '0'); meta.setAttribute('role', 'button'); meta.setAttribute('data-perm-trigger',''); meta.style.cursor='pointer'; } catch {}
    /* sub.appendChild(subLabel); */ sub.appendChild(roleValue);
    
    // 注册时间
    if (u.createdAt) {
      const dateSpan = makeEl('span', 'approval-sub__date');
      dateSpan.style.marginLeft = '10px';
      dateSpan.style.fontSize = '12px';
      dateSpan.style.color = '#a0aec0';
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

    // 权限编辑器
    const editor = makeEl('div', 'perm-editor'); editor.style.display = 'none'; editor.classList.add('is-collapsed');
    const toolbar = makeEl('div', 'perm-editor__toolbar');
    const btnSelectAll = makeEl('button', 'btn btn--secondary btn--sm tokens-refresh');
    setI18nAttr(btnSelectAll, 'permissions.selectAll', t('permissions.selectAll', '全选/清空'));
    toolbar.appendChild(btnSelectAll);
    const list = makeEl('div', 'perm-editor__list');
    const renderChecklist = ()=>{
      list.innerHTML = '';
      allPerms.forEach(p => {
        const item = makeEl('label', 'perm-editor__item');
        bindPermTooltip(item, p);
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = p; cb.checked = current.includes(p);
        const text = makeEl('span', 'perm-editor__item-text', p);
        item.appendChild(cb); item.appendChild(text); list.appendChild(item);
      });
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
    editor.appendChild(toolbar); editor.appendChild(list); editor.appendChild(actions);
    block.appendChild(editor);

    // 密码编辑器
    const pwdEditor = makeEl('div', 'perm-editor perm-editor--plain'); pwdEditor.style.display='none'; pwdEditor.classList.add('is-collapsed');
    const pwdList = makeEl('div', 'perm-editor__list');
    const rowNew = makeEl('div', 'perm-editor__item');
    const inputNew = document.createElement('input'); inputNew.type='password'; inputNew.className='tokens-input'; inputNew.autocomplete='new-password'; inputNew.placeholder = t('modal.password.new','新密码'); rowNew.appendChild(inputNew);
    const rowConfirm = makeEl('div', 'perm-editor__item');
    const inputConfirm = document.createElement('input'); inputConfirm.type='password'; inputConfirm.className='tokens-input'; inputConfirm.autocomplete='new-password'; inputConfirm.placeholder = t('modal.password.confirm','确认新密码'); rowConfirm.appendChild(inputConfirm);
    pwdList.appendChild(rowNew); pwdList.appendChild(rowConfirm);
    const pwdActions = makeEl('div', 'perm-editor__actions');
    const btnPwdCancel = makeEl('button', 'btn btn--secondary');
    const btnPwdSave = makeEl('button', 'btn btn--primary');
    setI18nAttr(btnPwdCancel, 'common.cancel', t('common.cancel','取消'));
    setI18nAttr(btnPwdSave, 'common.save', t('common.save','保存'));
    pwdActions.appendChild(btnPwdCancel); pwdActions.appendChild(btnPwdSave);
    pwdEditor.appendChild(pwdList); pwdEditor.appendChild(pwdActions);
    block.appendChild(pwdEditor);

    // 角色编辑器
    const roleEditor = makeEl('div', 'perm-editor perm-editor--plain'); roleEditor.style.display='none'; roleEditor.classList.add('is-collapsed');
    const roleList = makeEl('div', 'perm-editor__list');
    const roleRow = makeEl('div', 'perm-editor__item');
    const select = document.createElement('select'); select.className='tokens-input';
    const ROLES = [ { v: 'admin', k: 'role.admin' }, { v: 'moderator', k: 'role.moderator' }, { v: 'user', k: 'role.user' }, { v: 'guest', k: 'role.guest' } ];
    ROLES.forEach(r => { const opt = document.createElement('option'); opt.value = r.v; setText(opt, r.k, r.v); if (String(u.role) === r.v) opt.selected = true; select.appendChild(opt); });
    roleRow.appendChild(select); roleList.appendChild(roleRow);
    const roleActions = makeEl('div', 'perm-editor__actions');
    const btnRoleCancel = makeEl('button', 'btn btn--secondary');
    const btnRoleSave = makeEl('button', 'btn btn--primary');
    setI18nAttr(btnRoleCancel, 'common.cancel', t('common.cancel','取消'));
    setI18nAttr(btnRoleSave, 'common.save', t('common.save','保存'));
    roleActions.appendChild(btnRoleCancel); roleActions.appendChild(btnRoleSave);
    roleEditor.appendChild(roleList); roleEditor.appendChild(roleActions);
    block.appendChild(roleEditor);

    // 交互绑定 —— 权限
    editBtn.addEventListener('click', ()=>{
      const visible = editor.style.display !== 'none' && !editor.classList.contains('is-collapsed');
      toggleSection(editor, !visible);
    });
    btnSelectAll.addEventListener('click', ()=>{
      const cbs = Array.from(list.querySelectorAll('input[type="checkbox"]').values());
      const shouldSelectAll = cbs.some(cb => !cb.checked);
      cbs.forEach(cb => { cb.checked = shouldSelectAll; });
    });
  btnCancel.addEventListener('click', ()=> toggleSection(editor, false));
  btnSave.addEventListener('click', async ()=>{
      const selected = Array.from(list.querySelectorAll('input[type="checkbox"]')).filter(cb=>cb.checked).map(cb=>cb.value);
      const curSet = new Set(current); const selSet = new Set(selected);
      const toGrant = selected.filter(p => !curSet.has(p));
      const toRevoke = current.filter(p => !selSet.has(p));
      if (!toGrant.length && !toRevoke.length) { editor.style.display = 'none'; return; }
      spinnerBtn(btnSave, true);
      try {
        for (const p of toGrant) { await API.grant(userId, p); if (!curSet.has(p)) { curSet.add(p); current.push(p); } }
        for (const p of toRevoke) { await API.revoke(userId, p); if (curSet.has(p)) { curSet.delete(p); const idx = current.indexOf(p); if (idx>-1) current.splice(idx,1); } }
        // 局部更新标签展示，不刷新整页
        refreshTags();
        // 自动刷新日志
        if (ns.refreshLogs) ns.refreshLogs();
      } catch(e) { toast((e && e.message) ? e.message : 'permissions.saveFailed', 'error'); }
      finally { spinnerBtn(btnSave, false); toggleSection(editor, false); }
    });

    // 交互绑定 —— 密码
    pwdBtn.addEventListener('click', ()=>{
      const visible = pwdEditor.style.display !== 'none' && !pwdEditor.classList.contains('is-collapsed');
      toggleSection(pwdEditor, !visible);
    });
    btnPwdCancel.addEventListener('click', ()=> toggleSection(pwdEditor, false));
    btnPwdSave.addEventListener('click', async ()=>{
      const p1 = (inputNew.value || '').trim(); const p2 = (inputConfirm.value || '').trim();
      if (!p1 || !p2) { toast('error.fillAll', 'error'); return; }
      if (p1.length < 6) { toast('error.pwdMin', 'error'); return; }
      if (p1 !== p2) { toast('error.pwdNotMatch', 'error'); return; }
      spinnerBtn(btnPwdSave, true);
      try {
        await API.setPassword(userId, p1);
        toast('status.updated'); inputNew.value=''; inputConfirm.value=''; toggleSection(pwdEditor, false);
        // 自动刷新日志
        if (ns.refreshLogs) ns.refreshLogs();
      } catch(e) { toast(e && e.message ? e.message : 'error.updateFailed', 'error'); }
      finally { spinnerBtn(btnPwdSave, false); }
    });

    // 交互绑定 —— 角色
    const toggleRoleEditor = ()=>{
      const visible = roleEditor.style.display !== 'none' && !roleEditor.classList.contains('is-collapsed');
      toggleSection(roleEditor, !visible);
      if (!visible) { try { select.focus(); } catch{} }
    };
    meta.addEventListener('click', toggleRoleEditor);
    meta.addEventListener('keydown', (e)=>{ if (e.key==='Enter' || e.key===' ') { e.preventDefault(); toggleRoleEditor(); }});
    select.addEventListener('keydown', (e)=>{ if (e.key==='Enter') { e.preventDefault(); btnRoleSave.click(); } else if (e.key==='Escape') { e.preventDefault(); btnRoleCancel.click(); }});
    btnRoleCancel.addEventListener('click', ()=> toggleSection(roleEditor, false));
    btnRoleSave.addEventListener('click', async ()=>{
      const newRole = select.value; if (!newRole) { toggleSection(roleEditor, false); return; }
      spinnerBtn(btnRoleSave, true);
      try {
        await API.setRole(userId, newRole); toast('status.updated');
        // 自动刷新日志
        if (ns.refreshLogs) ns.refreshLogs();
        // 局部更新角色文本，不刷新整页
        try { roleValue.textContent = select.options[select.selectedIndex]?.textContent || newRole; } catch { roleValue.textContent = newRole; }
      } catch(e) { toast(e && e.message ? e.message : 'error.updateFailed', 'error'); }
      finally { spinnerBtn(btnRoleSave, false); toggleSection(roleEditor, false); }
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

  // 兼容：在 window 级别暴露，文件内部也通过 w.renderPermissionsPanel 调用
  w.renderPermissionsPanel = ns.renderPermissionsPanel;
})(window);

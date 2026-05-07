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
      w.i18n?.applySafe?.(el);
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
          if (target && (target.closest && (target.closest('.perm-editor, .perm-editor-stack')))) return;
          // 如果点击在触发器上（编辑按钮/修改密码按钮/角色值），忽略，避免立刻被折叠
          if (target && (target.closest && target.closest('[data-perm-trigger]'))) return;
          // 其它区域（包括面板外部或行空白处）则收起全部编辑器
          const stacks = panel.querySelectorAll('.perm-editor-stack');
          stacks.forEach(stack => {
            try {
              if (typeof stack.__closeEditorStack === 'function') stack.__closeEditorStack();
              else toggleSection(stack, false);
            } catch {}
          });
          const editors = panel.querySelectorAll('.perm-editor');
          editors.forEach(ed => {
            if (ed.closest && ed.closest('.perm-editor-stack')) return;
            try { toggleSection(ed, false); } catch {}
          });
        });

        
      }
    } catch {}
  }
  

  // 计算新内容高度（用于高度过渡）
  function measureNewHeight(container, fragment, fallbackH){
    try {
      const probe = document.createElement('div');
      Object.assign(probe.style, { position:'absolute', left:'-10000px', top:'0', visibility:'hidden', pointerEvents:'none', width:container.clientWidth + 'px' });
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


  // ── 暴露内部 API 供 render_content.js 使用 ──
  ns._RenderUI = {
    ensureSearchBindings,
    measureNewHeight,
    animateExitRows,
    animateEnterRows,
    t, setI18nAttr, setText, toast,
    getUsersData, getMasterData,
    searchKeyFromInput, DEFAULT_SEARCH_KEY,
  };
})(window);

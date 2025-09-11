// tokens/ui/render
// 渲染统计瓦片、各集合区块与卡片；绑定操作；对接搜索/收起/展开状态
(function(){
  const T = window.tokensAdmin;
  const { state } = T;
  const { esc, getAccent, computeTint } = T;
  const { apiJson, COLLECTIONS, getAuth } = T;
  const { filterByQuery, HIDE_KEYS } = T;

  // 类型摘要卡（type-tile）的浅色基色映射（与 CSS 中保持一致）
  const TYPE_TILE_BASE_BG = Object.freeze({
    'term-fixed':   '#EDF2F7',
    'term-dynamic': '#E6FFFA',
    'card':         '#FEF3C7',
    'character':    '#E9D8FD',
    'skill':        '#C6F6D5'
  });

  function isDarkTheme(){
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  // 根据当前主题为 #tokens-summary 内的 .type-tile 应用背景色；深色时反转亮度
  function applyTypeTileTheme(){
    try{
      const list = document.querySelectorAll('#tokens-summary .type-tile');
      if(!list || list.length===0) return;
      const invert = (col)=>{
        try{
          if(window.ColorUtils && typeof ColorUtils.invertColor === 'function'){
            // 仅反转亮度，保持色相/饱和度；输出使用 rgb/rgba
            return ColorUtils.invertColor(col, { mode:'luma', amount:1, output:'rgb' });
          }
        }catch(_){ }
        return col; // 兜底：原色
      };
      const dark = isDarkTheme();
      list.forEach(tile=>{
        const tp = tile.getAttribute('data-type') || '';
        const base = TYPE_TILE_BASE_BG[tp];
        if(!base) return;
        // 仅设置 backgroundColor，避免干扰边框/阴影等
        const color = dark ? invert(base) : base;
        // 使用 !important 覆盖主题中对背景的强制设定
        try { tile.style.setProperty('background-color', color, 'important'); }
        catch(_) { tile.style.backgroundColor = color; }
      });
    }catch(_){ }
  }

  // 绑定主题切换监听，主题变化时重新应用
  function ensureThemeObserverForTiles(){
    const host = document.getElementById('tokens-summary');
    if(!host) return;
    if(host.__tileThemeObserverBound) return;
    host.__tileThemeObserverBound = true;
    try{
      const mo = new MutationObserver(()=> applyTypeTileTheme());
      mo.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
      host.__tileThemeObserver = mo;
    }catch(_){ }
  }

  // 以键值对树形形式渲染对象；支持缩略模式
  function renderKV(obj, level=0, accent=null, basePath=''){
    const isObj=(v)=> v && typeof v==='object' && !Array.isArray(v);
    if(!obj || typeof obj!=='object'){
      const bp=esc(basePath);
      return `<div class="kv-row" data-path="${bp}"><div class="kv-key">value</div><div class="kv-val" data-path="${bp}" data-type="${typeof obj}" title="单击编辑">${esc(obj)}</div><div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div></div>`;
    }
    const parts=[];
    for(const k of Object.keys(obj)){
      if(HIDE_KEYS.has(k)) continue;
      const v=obj[k];
      const curPath = basePath? `${basePath}.${k}`: k;
      if(Array.isArray(v)){
        if(state.compactMode){
          const summary = `Array(${v.length})`;
          parts.push(`<div class="kv-row" data-path="${esc(curPath)}"><div class="kv-key">${esc(k)}</div><div class="kv-val" data-path="${esc(curPath)}" data-type="array" title="数组">${esc(summary)}</div><div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div></div>`);
        } else {
          const items = v.map((it, idx)=>{
            if(isObj(it) || Array.isArray(it)){
              const style = accent? ` style=\"--token-accent:${esc(accent)}\"`: '';
              return `<div class="arr-item"><div class="arr-index">#${idx}</div><div class="token-card"${style}>${renderKV(it, level+1, accent, `${curPath}.${idx}`)}</div></div>`;
            }
            return `<div class="kv-row" data-path="${esc(curPath)}.${idx}"><div class="kv-key">[${idx}]</div><div class="kv-val" data-path="${esc(curPath)}.${idx}" data-type="${typeof it}" title="单击编辑">${esc(it)}</div><div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div></div>`;
          }).join('');
          const style = accent? ` style=\"--token-accent:${esc(accent)}\"`: '';
          const emptyHtml = '<div class="kv-row"><div class="kv-key">(空)</div><div class="kv-val"></div></div>';
          parts.push(`<div class="nest-block"${style}><div class="nest-title">${esc(k)} [${v.length}]</div><div class="nest-body">${items || emptyHtml}</div></div>`);
        }
      } else if (isObj(v)){
        if(state.compactMode){
          const keysCount = Object.keys(v||{}).filter(x=> !HIDE_KEYS.has(x)).length;
          const summary = `Object(${keysCount})`;
          parts.push(`<div class="kv-row" data-path="${esc(curPath)}"><div class="kv-key">${esc(k)}</div><div class="kv-val" data-path="${esc(curPath)}" data-type="object" title="对象">${esc(summary)}</div><div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div></div>`);
        } else {
          const style = accent? ` style=\"--token-accent:${esc(accent)}\"`: '';
          parts.push(`<div class="nest-block"${style}><div class="nest-title">${esc(k)}</div><div class="nest-body">${renderKV(v, level+1, accent, curPath)}</div></div>`);
        }
      } else {
        parts.push(`<div class="kv-row" data-path="${esc(curPath)}"><div class="kv-key">${esc(k)}</div><div class="kv-val" data-path="${esc(curPath)}" data-type="${typeof v}" title="单击编辑">${esc(v)}</div><div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div></div>`);
      }
    }
    return parts.join('');
  }
  const tagAttrs=(coll, obj)=>` data-coll="${coll}" data-id="${esc(obj&&obj._id||'')}"`;
  // 卡片包装：左侧色带、工具栏（跳转/编辑/删除）+ 内部键值树
  function cardShell(coll, obj, innerHtml){
    const col=getAccent(obj);
    const style= col? ` style="--token-accent:${esc(col)}; --token-bg:${esc(computeTint(col))}; border-left:3px solid ${esc(col)}"`: '';
    const { canEdit }=getAuth();
    const toolbar = `<div class="token-card__toolbar" role="工具栏" aria-label="对象操作">
      <button class="btn btn--secondary btn--xs btn-go-doc" title="跳转" aria-label="跳转">跳转</button>
      <button class="btn btn--secondary btn--xs btn-edit-doc" title="编辑对象" aria-label="编辑对象">编辑对象</button>
      <button class="btn btn--danger btn--xs btn-del-doc${canEdit? '':' is-disabled'}" title="删除对象" aria-label="删除对象">删除对象</button>
    </div>`;
    return `<div class="token-card"${style}${tagAttrs(coll,obj)}>${toolbar}${innerHtml}</div>`;
  }
  const termFixedItem=(t)=> cardShell('term-fixed', t, renderKV(t,0,getAccent(t),'') );
  const termDynamicItem=(t)=> cardShell('term-dynamic', t, renderKV(t,0,getAccent(t),'') );
  const cardItem=(c)=> cardShell('card', c, renderKV(c,0,getAccent(c),'') );
  const characterItem=(ch)=> cardShell('character', ch, renderKV(ch,0,getAccent(ch),'') );
  const skillItem=(s)=> cardShell('skill', s, renderKV(s,0,getAccent(s),'') );
  // 拉取集合数据（含技能三强度合并）并缓存于 state
  async function getCollectionData(collection){
    try{
      if(!state.data) state.data={};
      const conf=COLLECTIONS[collection];
      if(!conf) return [];
      if(collection==='skill'){
        if(!state.data.s0 || !state.data.s1 || !state.data.s2){
          const [s0,s1,s2] = await Promise.all(conf.urls.map(u=> apiJson(u)));
          state.data.s0=s0||[]; state.data.s1=s1||[]; state.data.s2=s2||[];
        }
        return [].concat(state.data.s0||[], state.data.s1||[], state.data.s2||[]);
      }
      if(!state.data[conf.key]){ const arr= await apiJson(conf.url); state.data[conf.key]=arr||[]; }
      return state.data[conf.key]||[];
    }catch(_){ return []; }
  }
  // 区段：抬头（数量、展开按钮）+ 列表（首屏+更多）
  function section(type,title,items,renderItem, canEdit){
    const id='sec-'+Math.random().toString(36).slice(2,8);
    const total=Array.isArray(items)? items.length: 0;
    const markedOpen = !!(state.openTypes && state.openTypes.has && state.openTypes.has(type));
    const shouldPreOpen= ((state.activeType===type) || markedOpen) && total>1;
    const allItemsHtml=(items||[]).map(renderItem).join('');
    const collapsedAreaHtml = (total>1)? '': (allItemsHtml || '<div class="tokens-empty">空</div>');
  return `<div class="tokens-section" data-type="${type}"><div class="tokens-section__header"><div class=\"tokens-section__title\">${title} <span class=\"count-badge\">(${total})</span></div><div class=\"tokens-section__ops\"><button class=\"btn btn--secondary btn--sm\" onclick=\"tokensOpenCreate('${type}')\">新增</button>${total>1? `<button id=\"btn-${id}\" class=\"btn btn--secondary btn--sm expand-btn${shouldPreOpen? ' is-expanded':''}\" aria-expanded=\"${shouldPreOpen? 'true':'false'}\" onclick=\"toggleTokensSection('${id}')\">${shouldPreOpen? '收起':'展开'}</button>`: ''}</div></div><div id="${id}" data-type="${type}" data-expanded="${shouldPreOpen? '1':'0'}" class="tokens-section__body"><div class="token-list">${collapsedAreaHtml}</div>${total>1? `<div id=\"more-${id}\" class=\"js-more token-list collapsible tokens-section__more${shouldPreOpen? ' is-open':''}\">${allItemsHtml}</div>`: ''}</div></div>`;
  }
  async function renderTokensDashboard(forceReload=false){
    const summaryEl=document.getElementById('tokens-summary');
    const contentEl=document.getElementById('tokens-content');
    if(!summaryEl||!contentEl) return;
    if(!summaryEl.__initialized||forceReload){ summaryEl.innerHTML='<div class="tokens-status tokens-status--loading">加载中…</div>'; }
    contentEl.innerHTML='';
    const { canEdit }=getAuth();
    try{
      // 需要时并行拉取所有集合
      if(!state.data || forceReload){
        const [termFixed, termDynamic, cards, characters, s0, s1, s2] = await Promise.all([
          apiJson('/term-fixed'), apiJson('/term-dynamic'), apiJson('/card'), apiJson('/character'), apiJson('/skill0'), apiJson('/skill1'), apiJson('/skill2')
        ]);
        state.data={ termFixed, termDynamic, cards, characters, s0, s1, s2 };
      }
      const { termFixed, termDynamic, cards, characters, s0, s1, s2 } = state.data; const skills=[].concat(s0||[], s1||[], s2||[]); const tiles=[ { type:'term-fixed', key:'静态术语', value:Array.isArray(termFixed)? termFixed.length: 0 }, { type:'term-dynamic', key:'动态术语', value:Array.isArray(termDynamic)? termDynamic.length: 0 }, { type:'card', key:'牌', value:Array.isArray(cards)? cards.length: 0 }, { type:'character', key:'武将', value:Array.isArray(characters)? characters.length: 0 }, { type:'skill', key:'技能', value:Array.isArray(skills)? skills.length: 0 } ]; if(!summaryEl.__initialized || forceReload){ summaryEl.innerHTML = tiles.map(t=>{ const isActive= state.activeType===t.type; const active=isActive? ' is-active': ''; const dim= state.activeType && !isActive? ' is-dim': ''; return `<div class="type-tile${active}${dim}" data-type="${t.type}" role="button" tabindex="0" aria-pressed="${isActive}"><div class="type-tile__label">${t.key}</div><div class="type-tile__value">${t.value}</div></div>`; }).join(''); summaryEl.__initialized=true; 
        // 初次渲染后应用主题色，并绑定主题观察者
        applyTypeTileTheme();
        ensureThemeObserverForTiles();
      } else { const map=new Map(tiles.map(t=>[t.type,t])); summaryEl.querySelectorAll('.type-tile').forEach(node=>{ const tp=node.getAttribute('data-type'); const conf=map.get(tp); if(!conf) return; const isActive= state.activeType===tp; node.classList.toggle('is-active',!!isActive); node.classList.toggle('is-dim',!!(state.activeType && !isActive)); node.setAttribute('aria-pressed', isActive? 'true':'false'); const valEl=node.querySelector('.type-tile__value'); if(valEl) valEl.textContent=String(conf.value); }); 
        // 更新统计值后也重新应用（防止列表被重建导致样式丢失）
        applyTypeTileTheme();
      }
      const q=state.q; const sections=[ { type:'term-fixed', title:'静态术语', items:Array.isArray(termFixed)? filterByQuery(termFixed,q): [], render: termFixedItem }, { type:'term-dynamic', title:'动态术语', items:Array.isArray(termDynamic)? filterByQuery(termDynamic,q): [], render: termDynamicItem }, { type:'card', title:'牌', items:Array.isArray(cards)? filterByQuery(cards,q): [], render: cardItem }, { type:'character', title:'武将', items:Array.isArray(characters)? filterByQuery(characters,q): [], render: characterItem }, { type:'skill', title:'技能', items:Array.isArray(skills)? filterByQuery(skills,q): [], render: skillItem } ]; const filtered= state.activeType? sections.filter(s=> s.type===state.activeType): sections; contentEl.innerHTML = filtered.map(s=> section(s.type,s.title,s.items,s.render, canEdit)).join(''); try{ contentEl.querySelectorAll('.token-card').forEach((el,i)=>{ const d=Math.min(i,12)*40; el.style.setProperty('--enter-delay', d+'ms'); }); }catch(_){ }
  // 搜索区初始化（刷新按钮和“详细/缩略”开关）
  window.tokensAdmin.setupSearch && window.tokensAdmin.setupSearch();
  if(!summaryEl.__bindTypeFilter){ summaryEl.__bindTypeFilter=true; const handler=(ev)=>{ const t= ev.target && ev.target.closest? ev.target.closest('.type-tile'): null; if(!t) return; const tp=t.getAttribute('data-type'); if(!tp) return; state.activeType = (state.activeType===tp)? null: tp; renderTokensDashboard(false); }; summaryEl.addEventListener('click', handler); summaryEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handler(e); } }); }
  // 行内删除、整卡删除（仅管理员）
  if(canEdit){
        if(!contentEl.__inlineDeleteBound){ window.tokensAdmin.bindInlineDelete && window.tokensAdmin.bindInlineDelete(contentEl); contentEl.__inlineDeleteBound=true; }
        if(!contentEl.__deleteDocBound){ window.tokensAdmin.bindDeleteDoc && window.tokensAdmin.bindDeleteDoc(contentEl); contentEl.__deleteDocBound=true; }
      }
  // 行内编辑、Jump 与 编辑弹窗对所有角色开放
  if(!contentEl.__inlineEditBound){ window.tokensAdmin.bindInlineEdit && window.tokensAdmin.bindInlineEdit(contentEl); contentEl.__inlineEditBound=true; }
      if(!contentEl.__goDocBound){ window.tokensAdmin.bindGo && window.tokensAdmin.bindGo(contentEl); contentEl.__goDocBound=true; }
    if(!contentEl.__editDocBound){ window.tokensAdmin.bindEditDoc && window.tokensAdmin.bindEditDoc(contentEl); contentEl.__editDocBound=true; }

    // 只读角色点击删除时给出提示（编辑允许打开但无法保存）
      if(!canEdit && !contentEl.__readonlyToolbarBound){
        contentEl.__readonlyToolbarBound = true;
        contentEl.addEventListener('click', (ev)=>{
          const delBtn = ev.target && ev.target.closest ? ev.target.closest('.btn-del-doc') : null;
      const inlineDel = ev.target && ev.target.closest ? ev.target.closest('.btn-del') : null;
      if(delBtn || inlineDel){
            ev.preventDefault();
              try{ window.tokensAdmin.showToast && window.tokensAdmin.showToast('无权限'); }catch(_){ }
          }
        });
      }
    }catch(e){ console.error('加载词元数据失败:', e); summaryEl.innerHTML='<div class="tokens-status tokens-status--error">加载失败，请点击“刷新”重试</div>'; }
  }
  // 区段展开/收起（带动画 + 状态记忆）
  function toggleTokensSection(baseId){
    try{
      const root=document.getElementById(baseId);
      if(!root) return;
      const type = root.getAttribute('data-type') || (root.closest('.tokens-section') && root.closest('.tokens-section').getAttribute('data-type')) || '';
      const btn=document.getElementById('btn-'+baseId);
      const more=document.getElementById('more-'+baseId) || root.querySelector('.js-more');
      if(!more) return;
      const expanded=root.getAttribute('data-expanded')==='1';
      const transitionMs=400;
      const setBtn=(isOpen)=>{ if(btn){ btn.textContent=isOpen? '收起':'展开'; btn.setAttribute('aria-expanded', isOpen? 'true':'false'); btn.classList.toggle('is-expanded', isOpen); } };
      const onEnd=(cb)=>{ let called=false; const handler=()=>{ if(called) return; called=true; more.removeEventListener('transitionend',handler); cb&&cb(); }; more.addEventListener('transitionend', handler, { once:true }); setTimeout(handler, transitionMs+50); };
      if(!expanded){
        more.style.display='block';
        more.classList.add('is-opening');
        more.style.height='0px';
        void more.offsetHeight;
        const target=more.scrollHeight;
        more.style.height=target+'px';
        onEnd(()=>{ more.classList.remove('is-opening'); more.classList.add('is-open'); more.style.height='auto'; });
        root.setAttribute('data-expanded','1');
        setBtn(true);
        if(type){ try{ state.openTypes.add(type); }catch(_){ } }
      } else {
        const from=more.scrollHeight;
        more.style.height=from+'px';
        void more.offsetHeight;
        more.classList.remove('is-open');
        more.classList.add('is-closing');
        more.style.height='0px';
        onEnd(()=>{ more.classList.remove('is-closing'); more.style.display='none'; more.style.height='0px'; });
        root.setAttribute('data-expanded','0');
        setBtn(false);
        if(type){ try{ state.openTypes.delete(type); }catch(_){ } }
      }
    }catch(_){ }
  }
  function tokensRefresh(){ state.data=null; renderTokensDashboard(true); }
  async function tokensOpenCreate(collection){ try{ const dataArr= await getCollectionData(collection); const variants= computeCollectionVariants(collection, dataArr||[]); if(variants && variants.length>0){ window.tokensAdmin.showCreateModal(collection, null, variants[0].tpl, variants); return; } const shape = await apiJson(`/tokens/shape?collection=${encodeURIComponent(collection)}`, { auth:true }); const tpl = window.tokensAdmin.buildTemplate(collection, shape); window.tokensAdmin.showCreateModal(collection, shape, tpl, null); }catch(e){ alert(e.message || '获取结构失败'); } }
  function computeCollectionVariants(collection, arr){ const map=new Map(); for(const doc of (Array.isArray(arr)? arr:[])){ const schema=window.tokensAdmin.deriveSchema(doc||{}); const sig=window.tokensAdmin.schemaSignature(schema); let cur=map.get(sig); if(!cur){ cur={schema, count:0, samples:[]}; map.set(sig, cur); } cur.count+=1; if(cur.samples.length<3) cur.samples.push(doc); } const list= Array.from(map.values()).map((it,idx)=>{ const base=window.tokensAdmin.skeletonFromSchema(it.schema); const tpl=base; const hints= window.tokensAdmin.flattenHintsFromSchema(it.schema); return { id:`scheme-${idx+1}`, count:it.count, schema:it.schema, tpl, hints, samples:it.samples }; }); list.sort((a,b)=>{ const ak=a.hints.length, bk=b.hints.length; if(bk!==ak) return bk-ak; return b.count-a.count; }); return list; }
  Object.assign(window, { renderTokensDashboard, toggleTokensSection, tokensRefresh, tokensOpenCreate });
})();

// 词元仪表盘（重构版，修复作用域/引用/语法错误）
(function(){
  // 状态
  const state = { data: null, q: '', timer: null, activeType: null, openTypes: new Set(), compactMode: false };
  // 搜索输入防抖间隔（毫秒）
  const SEARCH_DELAY_MS = 350;

  // 鉴权
  function getAuth(){
    try {
      const role = localStorage.getItem('role');
      const token = localStorage.getItem('token');
      return { role, token, canEdit: !!token && role === 'admin' };
    } catch(_) { return { role: null, token: null, canEdit: false }; }
  }
  // 转义
  function esc(s){ return (s==null? '' : String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))); }

  // API
  const API_BASE = 'http://localhost:3000/api';
  async function apiJson(endpoint, opts){
    const { method = 'GET', headers = {}, body, auth = false } = opts || {};
    const { token } = getAuth();
    const h = Object.assign({}, headers);
    if (auth && token) h['Authorization'] = `Bearer ${token}`;
    let payload = body;
    if (body != null && typeof body !== 'string') { h['Content-Type'] = h['Content-Type'] || 'application/json'; payload = JSON.stringify(body); }
    const url = endpoint.startsWith('http') ? endpoint : (API_BASE + endpoint);
    const resp = await fetch(url, { method, headers: h, body: payload });
    const out = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(out && out.message || '请求失败');
    return out;
  }

  // 集合
  const COLLECTIONS = Object.freeze({
    'term-fixed':   { key: 'termFixed',   url: API_BASE + '/term-fixed' },
    'term-dynamic': { key: 'termDynamic', url: API_BASE + '/term-dynamic' },
    'card':         { key: 'cards',       url: API_BASE + '/card' },
    'character':    { key: 'characters',  url: API_BASE + '/character' },
    'skill':        { key: null,          url: null, urls: [API_BASE + '/skill0', API_BASE + '/skill1', API_BASE + '/skill2'] },
  });

  // 工具：dot path set/delete
  function setByPath(obj, path, value){ if (!obj||!path) return; const segs=String(path).split('.'); let cur=obj; for(let i=0;i<segs.length;i++){ const k=segs[i]; const last=i===segs.length-1; const isIdx=/^\d+$/.test(k); if(last){ if(isIdx){ if(!Array.isArray(cur)) return; cur[Number(k)]=value; } else { cur[k]=value; } }else{ const nextKey=segs[i+1]; const nextIsIdx=/^\d+$/.test(nextKey); if(isIdx){ const idx=Number(k); if(!Array.isArray(cur)) return; if(cur[idx]==null) cur[idx]= nextIsIdx?[]:{}; cur=cur[idx]; } else { if(cur[k]==null) cur[k]= nextIsIdx?[]:{}; cur=cur[k]; } } } }
  function deleteFieldInDocByPath(obj, path){ if(!obj||!path) return; const segs=String(path).split('.'); let cur=obj; for(let i=0;i<segs.length-1;i++){ const k=segs[i]; const isIdx=/^\d+$/.test(k); cur = isIdx? cur[Number(k)] : cur[k]; if(cur==null) return; } const last=segs[segs.length-1]; if(/^\d+$/.test(last)){ if(Array.isArray(cur)) cur.splice(Number(last),1); } else { if(cur && Object.prototype.hasOwnProperty.call(cur,last)) delete cur[last]; } }

  // 本地缓存操作
  function ensureArraysForSkills(){ if(!state.data) state.data={}; if(!Array.isArray(state.data.s0)) state.data.s0=[]; if(!Array.isArray(state.data.s1)) state.data.s1=[]; if(!Array.isArray(state.data.s2)) state.data.s2=[]; }
  function pushDocToState(collection, doc){ if(!state.data) state.data={}; if(collection==='term-fixed'){ (state.data.termFixed ||= []).unshift(doc); } else if(collection==='term-dynamic'){ (state.data.termDynamic ||= []).unshift(doc); } else if(collection==='card'){ (state.data.cards ||= []).unshift(doc); } else if(collection==='character'){ (state.data.characters ||= []).unshift(doc); } else if(collection==='skill'){ ensureArraysForSkills(); const s=Number(doc&&doc.strength); if(s===1) state.data.s1.unshift(doc); else if(s===2) state.data.s2.unshift(doc); else state.data.s0.unshift(doc); } }
  function updateDocInState(collection, id, updater){ if(!state.data) return false; const touch=(arr)=>{ if(!Array.isArray(arr)) return false; for(const d of arr){ if(d&&String(d._id)===String(id)){ updater(d); return true; } } return false; }; let updated=false; if(collection==='term-fixed') updated=touch(state.data.termFixed); else if(collection==='term-dynamic') updated=touch(state.data.termDynamic); else if(collection==='card') updated=touch(state.data.cards); else if(collection==='character') updated=touch(state.data.characters); else if(collection==='skill') updated=touch(state.data.s0)||touch(state.data.s1)||touch(state.data.s2); if(!updated){ for(const k of Object.keys(state.data)){ if(touch(state.data[k])){ updated=true; break; } } } return updated; }
  function removeDocFromState(collection, id){ if(!state.data) return false; const rm=(arr)=>{ if(!Array.isArray(arr)) return false; const i=arr.findIndex(d=> d && String(d._id)===String(id)); if(i>=0){ arr.splice(i,1); return true; } return false; }; if(collection==='term-fixed') return rm(state.data.termFixed); if(collection==='term-dynamic') return rm(state.data.termDynamic); if(collection==='card') return rm(state.data.cards); if(collection==='character') return rm(state.data.characters); if(collection==='skill') return rm(state.data.s0)||rm(state.data.s1)||rm(state.data.s2); for(const k of Object.keys(state.data)){ if(rm(state.data[k])) return true; } return false; }
  function findDocInState(collection, id){ if(!state.data) return null; const pick=(arr)=> Array.isArray(arr)? (arr.find(d=>d&&String(d._id)===String(id))||null) : null; if(collection==='term-fixed') return pick(state.data.termFixed); if(collection==='term-dynamic') return pick(state.data.termDynamic); if(collection==='card') return pick(state.data.cards); if(collection==='character') return pick(state.data.characters); if(collection==='skill') return pick(state.data.s0)||pick(state.data.s1)||pick(state.data.s2); for(const k of Object.keys(state.data)){ const hit=pick(state.data[k]); if(hit) return hit; } return null; }

  // 搜索
  function filterByQuery(arr, q){
    try{
      const kw=(q||'').trim().toLowerCase();
      if(!kw) return Array.isArray(arr)? arr.slice(): [];
      return (arr||[]).filter(it=> it && typeof it==='object' && deepContains(it, kw));
    }catch(_){ return Array.isArray(arr)? arr.slice(): []; }
  }
  function setupSearch(){ try{ const input=document.getElementById('tokens-search'); const btn=document.getElementById('tokens-refresh-btn'); if(btn && !btn.__bound){ btn.__bound=true; btn.addEventListener('click', ()=> window.tokensRefresh && window.tokensRefresh()); }
      // 确保缩略模式开关与刷新按钮并列
      try{
        const parent = btn && btn.parentElement ? btn.parentElement : null;
        if(parent && !document.getElementById('tokens-compact-toggle')){
          const tgl = document.createElement('button');
          tgl.id = 'tokens-compact-toggle';
          // 使用与刷新按钮相同的样式，保持一致的外观与“嵌入搜索框”布局
          try{ tgl.className = btn.className || 'btn btn--secondary'; }catch(_){ tgl.className = 'btn btn--secondary'; }
          tgl.type = 'button';
          tgl.title = '切换显示模式';
          const sync = ()=>{
            // 当前为缩略模式时显示“缩略”，详细模式时显示“详细”
            tgl.textContent = state.compactMode ? '缩略' : '详细';
            tgl.setAttribute('aria-pressed', state.compactMode ? 'true':'false');
            tgl.classList.toggle('is-active', !!state.compactMode);
          };
          tgl.addEventListener('click', ()=>{ state.compactMode = !state.compactMode; sync(); renderTokensDashboard(false); });
          sync();
          // 插入到刷新按钮后面
          if(btn.nextSibling){ parent.insertBefore(tgl, btn.nextSibling); } else { parent.appendChild(tgl); }
        }
      }catch(_){ }
      if(!input || input.__bound) return; input.__bound=true; const onChange=()=>{ clearTimeout(state.timer); state.timer=setTimeout(()=>{ const text=(input.value||''); if(text===state.q) return; const trimmed=(text||'').trim();
          // 记录或恢复展开状态，并在有检索时自动展开所有类型
          try{
            if(trimmed){
              if(!state.searchBackupOpenTypes){ state.searchBackupOpenTypes = new Set(state.openTypes ? Array.from(state.openTypes) : []); }
              state.openTypes = new Set(['term-fixed','term-dynamic','card','character','skill']);
            } else {
              if(state.searchBackupOpenTypes){ state.openTypes = new Set(Array.from(state.searchBackupOpenTypes)); state.searchBackupOpenTypes = null; }
            }
          }catch(_){ }
          state.q = text; renderTokensDashboard(false); }, SEARCH_DELAY_MS); }; input.addEventListener('input', onChange); }catch(_){}}

  // 值渲染
  const HIDE_KEYS=new Set(['_id','__v','_v']);
  const isObj=(v)=> v && typeof v==='object' && !Array.isArray(v);
  // 递归包含判断：支持对象/数组的子层级匹配（跳过隐藏键），限制最大深度避免性能问题
  function deepContains(v, kw, depth=0){
    try{
      if(depth>6) return false;
      if(v==null) return false;
      const t=typeof v;
      if(t==='string') return v.toLowerCase().includes(kw);
      if(t==='number' || t==='boolean') return String(v).toLowerCase().includes(kw);
      if(Array.isArray(v)){
        for(const it of v){ if(deepContains(it, kw, depth+1)) return true; }
        return false;
      }
      if(t==='object'){
        for(const k of Object.keys(v)){
          if(HIDE_KEYS.has(k)) continue;
          if(deepContains(v[k], kw, depth+1)) return true;
        }
        return false;
      }
      return false;
    }catch(_){ return false; }
  }
  function renderKV(obj, level=0, accent=null, basePath=''){
    if(!obj || typeof obj!=='object'){
      const bp=esc(basePath);
      return `<div class="kv-row" data-path="${bp}">
        <div class="kv-key">value</div>
        <div class="kv-val" data-path="${bp}" data-type="${typeof obj}" title="单击编辑">${esc(obj)}</div>
        <div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div>
      </div>`;
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
            return `<div class="kv-row" data-path="${esc(curPath)}.${idx}">
              <div class="kv-key">[${idx}]</div>
              <div class="kv-val" data-path="${esc(curPath)}.${idx}" data-type="${typeof it}" title="单击编辑">${esc(it)}</div>
              <div class="kv-actions" role="组" aria-label="字段操作"><button class="btn-del" title="删除" aria-label="删除">删除</button></div>
            </div>`;
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

  // 颜色
  const getAccent=(o)=>{ const v=(o&&typeof o.color==='string')? o.color.trim(): ''; if(!v) return null; if(/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v; if(/^[a-zA-Z]+$/.test(v)) return v; return null; };
  const computeTint=(col, ratio=0.95)=>{ if(!col) return ''; const hexToRgb=(h)=>{ let r,g,b; if(/^#([\da-fA-F]{3})$/.test(h)){ const m=h.slice(1); r=parseInt(m[0]+m[0],16); g=parseInt(m[1]+m[1],16); b=parseInt(m[2]+m[2],16); return {r,g,b}; } if(/^#([\da-fA-F]{6})$/.test(h)){ const m=h.slice(1); r=parseInt(m.slice(0,2),16); g=parseInt(m.slice(2,4),16); b=parseInt(m.slice(4,6),16); return {r,g,b}; } return null; }; const rgb=hexToRgb(col); if(rgb){ const r=Math.round(rgb.r*(1-ratio)+255*ratio); const g=Math.round(rgb.g*(1-ratio)+255*ratio); const b=Math.round(rgb.b*(1-ratio)+255*ratio); return `rgba(${r}, ${g}, ${b}, 1)`; } return `color-mix(in srgb, ${col} ${Math.round(ratio*100)}%, white)`; };

  // 卡片外壳
  const tagAttrs=(coll, obj)=>` data-coll="${coll}" data-id="${esc(obj&&obj._id||'')}"`;
  function cardShell(coll, obj, innerHtml){ const col=getAccent(obj); const style= col? ` style="--token-accent:${esc(col)}; --token-bg:${esc(computeTint(col))}; border-left:3px solid ${esc(col)}"`: ''; const { canEdit }=getAuth(); return `<div class="token-card"${style}${tagAttrs(coll,obj)}>${canEdit? `<div class="token-card__toolbar" role="工具栏" aria-label="对象操作"><button class="btn btn--secondary btn--xs btn-edit-doc" title="编辑对象" aria-label="编辑对象">编辑对象</button><button class="btn btn--danger btn--xs btn-del-doc" title="删除对象" aria-label="删除对象">删除对象</button></div>`: ''}${innerHtml}</div>`; }
  const termFixedItem=(t)=> cardShell('term-fixed', t, renderKV(t,0,getAccent(t),'') );
  const termDynamicItem=(t)=> cardShell('term-dynamic', t, renderKV(t,0,getAccent(t),'') );
  const cardItem=(c)=> cardShell('card', c, renderKV(c,0,getAccent(c),'') );
  const characterItem=(ch)=> cardShell('character', ch, renderKV(ch,0,getAccent(ch),'') );
  const skillItem=(s)=> cardShell('skill', s, renderKV(s,0,getAccent(s),'') );

  // 主渲染
  async function renderTokensDashboard(forceReload=false){
    const summaryEl=document.getElementById('tokens-summary');
    const contentEl=document.getElementById('tokens-content');
    if(!summaryEl||!contentEl) return;
    if(!summaryEl.__initialized||forceReload){ summaryEl.innerHTML='<div class="tokens-status tokens-status--loading">加载中…</div>'; }
    contentEl.innerHTML='';
    const { canEdit }=getAuth();
    try{
      if(!state.data || forceReload){
        const [termFixed, termDynamic, cards, characters, s0, s1, s2] = await Promise.all([
          apiJson('/term-fixed'), apiJson('/term-dynamic'), apiJson('/card'), apiJson('/character'), apiJson('/skill0'), apiJson('/skill1'), apiJson('/skill2')
        ]);
        state.data={ termFixed, termDynamic, cards, characters, s0, s1, s2 };
      }
      const { termFixed, termDynamic, cards, characters, s0, s1, s2 } = state.data;
      const skills=[].concat(s0||[], s1||[], s2||[]);
      const tiles=[
        { type:'term-fixed', key:'静态术语', value:Array.isArray(termFixed)? termFixed.length: 0 },
        { type:'term-dynamic', key:'动态术语', value:Array.isArray(termDynamic)? termDynamic.length: 0 },
        { type:'card', key:'牌', value:Array.isArray(cards)? cards.length: 0 },
        { type:'character', key:'武将', value:Array.isArray(characters)? characters.length: 0 },
        { type:'skill', key:'技能', value:Array.isArray(skills)? skills.length: 0 },
      ];
      if(!summaryEl.__initialized || forceReload){
        summaryEl.innerHTML = tiles.map(t=>{
          const isActive= state.activeType===t.type; const active=isActive? ' is-active': ''; const dim= state.activeType && !isActive? ' is-dim': '';
          return `<div class="type-tile${active}${dim}" data-type="${t.type}" role="button" tabindex="0" aria-pressed="${isActive}"><div class="type-tile__label">${t.key}</div><div class="type-tile__value">${t.value}</div></div>`; }).join('');
        summaryEl.__initialized=true;
      } else {
        const map=new Map(tiles.map(t=>[t.type,t]));
        summaryEl.querySelectorAll('.type-tile').forEach(node=>{
          const tp=node.getAttribute('data-type'); const conf=map.get(tp); if(!conf) return; const isActive= state.activeType===tp; node.classList.toggle('is-active',!!isActive); node.classList.toggle('is-dim',!!(state.activeType && !isActive)); node.setAttribute('aria-pressed', isActive? 'true':'false'); const valEl=node.querySelector('.type-tile__value'); if(valEl) valEl.textContent=String(conf.value);
        });
      }
      const section=(type,title,items,renderItem)=>{
        const id='sec-'+Math.random().toString(36).slice(2,8);
        const total=Array.isArray(items)? items.length: 0;
        const markedOpen = !!(state.openTypes && state.openTypes.has && state.openTypes.has(type));
        const shouldPreOpen= ((state.activeType===type) || markedOpen) && total>1;
        const allItemsHtml=(items||[]).map(renderItem).join('');
        const collapsedAreaHtml = (total>1)? '': (allItemsHtml || '<div class="tokens-empty">空</div>');
        return `<div class="tokens-section" data-type="${type}"><div class="tokens-section__header"><div class=\"tokens-section__title\">${title} <span class=\"count-badge\">(${total})</span></div><div class=\"tokens-section__ops\">${canEdit? `<button class=\"btn btn--secondary btn--sm\" onclick=\"tokensOpenCreate('${type}')\">新增</button>`: ''}${total>1? `<button id=\"btn-${id}\" class=\"btn btn--secondary btn--sm expand-btn${shouldPreOpen? ' is-expanded':''}\" aria-expanded=\"${shouldPreOpen? 'true':'false'}\" onclick=\"toggleTokensSection('${id}')\">${shouldPreOpen? '收起':'展开'}</button>`: ''}</div></div><div id="${id}" data-type="${type}" data-expanded="${shouldPreOpen? '1':'0'}" class="tokens-section__body"><div class="token-list">${collapsedAreaHtml}</div>${total>1? `<div id=\"more-${id}\" class=\"js-more token-list collapsible tokens-section__more${shouldPreOpen? ' is-open':''}\">${allItemsHtml}</div>`: ''}</div></div>`;
      };
      const q=state.q; const sections=[
        { type:'term-fixed', title:'静态术语', items:Array.isArray(termFixed)? filterByQuery(termFixed,q): [], render: termFixedItem },
        { type:'term-dynamic', title:'动态术语', items:Array.isArray(termDynamic)? filterByQuery(termDynamic,q): [], render: termDynamicItem },
        { type:'card', title:'牌', items:Array.isArray(cards)? filterByQuery(cards,q): [], render: cardItem },
        { type:'character', title:'武将', items:Array.isArray(characters)? filterByQuery(characters,q): [], render: characterItem },
        { type:'skill', title:'技能', items:Array.isArray(skills)? filterByQuery(skills,q): [], render: skillItem },
      ];
      const filtered= state.activeType? sections.filter(s=> s.type===state.activeType): sections;
      contentEl.innerHTML = filtered.map(s=> section(s.type,s.title,s.items,s.render)).join('');
      try{ contentEl.querySelectorAll('.token-card').forEach((el,i)=>{ const d=Math.min(i,12)*40; el.style.setProperty('--enter-delay', d+'ms'); }); }catch(_){ }
      setupSearch();
      if(!summaryEl.__bindTypeFilter){ summaryEl.__bindTypeFilter=true; const handler=(ev)=>{ const t= ev.target && ev.target.closest? ev.target.closest('.type-tile'): null; if(!t) return; const tp=t.getAttribute('data-type'); if(!tp) return; state.activeType = (state.activeType===tp)? null: tp; renderTokensDashboard(false); }; summaryEl.addEventListener('click', handler); summaryEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); handler(e); } }); }
      if(canEdit){ if(!contentEl.__inlineEditBound){ enableInlineEdit(contentEl); contentEl.__inlineEditBound=true; } if(!contentEl.__inlineDeleteBound){ enableInlineDelete(contentEl); contentEl.__inlineDeleteBound=true; } if(!contentEl.__deleteDocBound){ enableDeleteDoc(contentEl); contentEl.__deleteDocBound=true; } if(!contentEl.__editDocBound){ enableEditDoc(contentEl); contentEl.__editDocBound=true; } }
    }catch(e){ console.error('加载词元数据失败:', e); summaryEl.innerHTML='<div class="tokens-status tokens-status--error">加载失败，请点击“刷新”重试</div>'; }
  }

  // 初次预取（仅管理员）与 Ctrl 门槛状态
  document.addEventListener('DOMContentLoaded', function(){ try{ const { role }=getAuth(); if(role==='admin') renderTokensDashboard(); }catch(_){}
    try{ const setCtrl=(down)=>{ if(down) document.body.classList.add('ctrl-down'); else document.body.classList.remove('ctrl-down'); }; let ctrlLatch=false; window.addEventListener('keydown',(e)=>{ if(e.ctrlKey && !ctrlLatch){ ctrlLatch=true; setCtrl(true); } }); window.addEventListener('keyup',(e)=>{ if(!e.ctrlKey){ ctrlLatch=false; setCtrl(false); } }); window.addEventListener('blur',()=>{ ctrlLatch=false; setCtrl(false); }); }catch(_){ }
  });

  // 全局导出
  window.renderTokensDashboard = renderTokensDashboard;
  window.toggleTokensSection = function(baseId){
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
        more.style.display='block'; more.classList.add('is-opening'); more.style.height='0px'; void more.offsetHeight; const target=more.scrollHeight; more.style.height=target+'px';
        onEnd(()=>{ more.classList.remove('is-opening'); more.classList.add('is-open'); more.style.height='auto'; });
        root.setAttribute('data-expanded','1');
        setBtn(true);
        if(type){ try{ state.openTypes.add(type); }catch(_){ } }
      } else {
        const from=more.scrollHeight; more.style.height=from+'px'; void more.offsetHeight; more.classList.remove('is-open'); more.classList.add('is-closing'); more.style.height='0px';
        onEnd(()=>{ more.classList.remove('is-closing'); more.style.display='none'; more.style.height='0px'; });
        root.setAttribute('data-expanded','0');
        setBtn(false);
        if(type){ try{ state.openTypes.delete(type); }catch(_){ } }
      }
    }catch(_){}
  };
  window.tokensRefresh = function(){ state.data=null; renderTokensDashboard(true); };
  window.tokensOpenCreate = async function(collection){ try{ const dataArr= await getCollectionData(collection); const variants= computeCollectionVariants(collection, dataArr||[]); if(variants && variants.length>0){ showCreateModal(collection, null, variants[0].tpl, variants); return; } const shape = await apiJson(`/tokens/shape?collection=${encodeURIComponent(collection)}`, { auth:true }); const tpl = buildTemplate(collection, shape); showCreateModal(collection, shape, tpl, null); }catch(e){ alert(e.message || '获取结构失败'); } };

  // 获取集合数据
  async function getCollectionData(collection){ try{ if(!state.data) state.data={}; const conf=COLLECTIONS[collection]; if(!conf) return []; if(collection==='skill'){ if(!state.data.s0 || !state.data.s1 || !state.data.s2){ const [s0,s1,s2] = await Promise.all(conf.urls.map(u=> apiJson(u))); state.data.s0=s0||[]; state.data.s1=s1||[]; state.data.s2=s2||[]; } return [].concat(state.data.s0||[], state.data.s1||[], state.data.s2||[]); } if(!state.data[conf.key]){ const arr= await apiJson(conf.url); state.data[conf.key]=arr||[]; } return state.data[conf.key]||[]; }catch(_){ return []; } }

  // 结构推导与模板
  function deriveSchema(val){ if(val===null||val===undefined) return {kind:'null'}; if(Array.isArray(val)){ if(val.length===0) return {kind:'arr', elem:{kind:'empty'}}; const elemSchemas= val.map(deriveSchema); const merged= mergeSchemas(elemSchemas); return {kind:'arr', elem: merged}; } const t=typeof val; if(t==='string') return {kind:'str'}; if(t==='number') return {kind:'num'}; if(t==='boolean') return {kind:'bool'}; if(t==='object'){ const keys= Object.keys(val).filter(k=> k!=='_id' && k!=='__v' && k!=='_v'); keys.sort(); const fields={}; for(const k of keys) fields[k]=deriveSchema(val[k]); return {kind:'obj', fields}; } return {kind:'unknown'}; }
  function mergeSchemas(schemas){ if(!schemas||schemas.length===0) return {kind:'empty'}; const kinds=new Set(schemas.map(s=> s&&s.kind)); if(kinds.size===1){ const kind=schemas[0].kind; if(kind==='obj'){ const allKeys=new Set(); schemas.forEach(s=>{ Object.keys(s.fields||{}).forEach(k=> allKeys.add(k)); }); const fields={}; Array.from(allKeys).sort().forEach(k=>{ const subs=schemas.map(s=> (s.fields||{})[k]).filter(Boolean); fields[k]= mergeSchemas(subs); }); return {kind:'obj', fields}; } if(kind==='arr'){ const elems= schemas.map(s=> s.elem).filter(Boolean); return {kind:'arr', elem: mergeSchemas(elems)}; } return {kind}; } const hasObj= schemas.some(s=> s.kind==='obj'); const hasArr= schemas.some(s=> s.kind==='arr'); if(hasObj){ const objSchemas= schemas.filter(s=> s.kind==='obj'); return mergeSchemas([{kind:'obj', fields:{}}, ...objSchemas]); } if(hasArr){ const arrSchemas= schemas.filter(s=> s.kind==='arr'); const elems= arrSchemas.map(s=> s.elem).filter(Boolean); return {kind:'arr', elem: mergeSchemas(elems)}; } return {kind:'unknown'}; }
  function schemaSignature(s){ if(!s) return 'null'; switch(s.kind){ case 'str': case 'num': case 'bool': case 'null': case 'unknown': case 'empty': return s.kind; case 'arr': return `arr<${schemaSignature(s.elem)}>`; case 'obj': { const keys=Object.keys(s.fields||{}).sort(); const inner= keys.map(k=> `${k}:${schemaSignature(s.fields[k])}`).join(','); return `{${inner}}`; } default: return 'unknown'; } }
  function skeletonFromSchema(s){ switch(s&&s.kind){ case 'str': return ''; case 'num': return 0; case 'bool': return false; case 'null': return ''; case 'unknown': return ''; case 'empty': return []; case 'arr': { const elem=s.elem||{kind:'str'}; if(elem.kind==='obj') return [ skeletonFromSchema(elem) ]; if(elem.kind==='arr') return [ skeletonFromSchema(elem) ]; return [ skeletonFromSchema(elem) ]; } case 'obj': { const out={}; const keys=Object.keys(s.fields||{}).sort(); for(const k of keys) out[k]=skeletonFromSchema(s.fields[k]); return out; } default: return ''; } }
  function flattenHintsFromSchema(s, base=''){ const out=[]; (function _f(sch,p){ if(!sch) return; const dot=(k)=> p? `${p}.${k}`: k; switch(sch.kind){ case 'str': case 'num': case 'bool': case 'null': case 'unknown': out.push({name:p||'(root)', type:sch.kind}); break; case 'arr': { const t=schemaSignature(sch.elem); if(sch.elem && sch.elem.kind==='obj'){ _f(sch.elem, (p?`${p}`:p)+'[]'); } else { out.push({name:(p?`${p}`:p)+'[]', type:`Array<${t}>`}); } break; } case 'obj': { const keys=Object.keys(sch.fields||{}).sort(); if(!p && keys.length===0) out.push({name:'(root)', type:'obj'}); for(const k of keys) _f(sch.fields[k], dot(k)); break; } } })(s, base); return out; }
  function applyCollectionDefaults(collection, obj, shape){ try{ if(collection==='character'){ if(shape&&shape.suggest&&shape.suggest.nextId!=null && obj.id==null) obj.id=shape.suggest.nextId; if(obj.name==null) obj.name='新武将'; if(obj.health==null) obj.health=1; if(obj.dominator==null) obj.dominator=0; } else if(collection==='card'){ if(obj.en==null) obj.en='new_card_en'; if(obj.cn==null) obj.cn='新卡牌'; if(obj.type==null) obj.type=''; } else if(collection==='term-fixed'){ if(obj.en==null) obj.en='term_key'; if(obj.cn==null) obj.cn='术语中文'; if(!Array.isArray(obj.part)) obj.part=[]; if(!Array.isArray(obj.epithet)) obj.epithet=[]; } else if(collection==='term-dynamic'){ if(obj.en==null) obj.en='term_key'; if(!Array.isArray(obj.part)) obj.part=[]; } else if(collection==='skill'){ if(obj.name==null) obj.name='新技能'; if(obj.content==null) obj.content='技能描述'; if(obj.strength==null) obj.strength=0; if(!Array.isArray(obj.role)) obj.role=[]; } }catch(_){} return obj; }
  function computeCollectionVariants(collection, arr){ const map=new Map(); for(const doc of (Array.isArray(arr)? arr:[])){ const schema=deriveSchema(doc||{}); const sig=schemaSignature(schema); let cur=map.get(sig); if(!cur){ cur={schema, count:0, samples:[]}; map.set(sig, cur); } cur.count+=1; if(cur.samples.length<3) cur.samples.push(doc); } const list= Array.from(map.values()).map((it,idx)=>{ const base=skeletonFromSchema(it.schema); const tpl=base; const hints= flattenHintsFromSchema(it.schema); return { id:`scheme-${idx+1}`, count:it.count, schema:it.schema, tpl, hints, samples:it.samples }; }); list.sort((a,b)=>{ const ak=a.hints.length, bk=b.hints.length; if(bk!==ak) return bk-ak; return b.count-a.count; }); return list; }
  function buildTemplate(collection, shape){ const byTypeDefault=(t)=> t==='String'? '': t==='Number'? 0: t==='Boolean'? false: t==='Array'? []: {}; const obj={}; const fields= Array.isArray(shape&&shape.fields)? shape.fields: []; const arrayBases=new Set(); const arrayChildren=new Map(); const setDefaultByPath=(path,defVal)=>{ try{ setByPath(obj, path, defVal); }catch(_){}}; for(const f of fields){ const raw=f&&f.name; if(!raw) continue; if(raw==='_id'||raw==='__v') continue; if(raw.includes('[]')){ try{ const base= raw.slice(0, raw.indexOf('[]')); if(base){ arrayBases.add(base); const after = raw.slice(raw.indexOf('[]')+2); if(after.startsWith('.')){ const rel= after.slice(1); if(rel){ if(!arrayChildren.has(base)) arrayChildren.set(base, []); arrayChildren.get(base).push(rel); } } } }catch(_){} } if(raw.endsWith('[]')){ if(f.required){ const base= raw.slice(0,-2); const def= Array.isArray(f.default)? f.default: []; setDefaultByPath(base, def); } continue; } if(f.required){ const def= (f.default!==undefined)? f.default: byTypeDefault(f.type); setDefaultByPath(raw, def); } } for(const f of fields){ const raw=f&&f.name; if(!raw||raw==='_id'||raw==='__v') continue; if(raw.includes('.')){ const normalized= raw.replace(/\[\]/g, ''); const def= (f.default!==undefined)? f.default: byTypeDefault(f.type); setDefaultByPath(normalized, def); } } for (const base of arrayBases){ if(!Array.isArray(obj[base])) obj[base]=[]; try{ const children=arrayChildren.get(base)||[]; if(obj[base].length===0 && children.length>0){ const proto={}; for(const rel of children){ const defField= fields.find(ff=> ff.name && (ff.name===`${base}[].${rel}`)); const defVal= defField && defField.default!==undefined ? defField.default : byTypeDefault(defField? defField.type : 'String'); setByPath(proto, rel, defVal); } obj[base].push(proto); } }catch(_){} } return applyCollectionDefaults(collection, obj, shape); }
  function ensureCreateModal(){ let backdrop=document.getElementById('tokens-create-backdrop'); let modal=document.getElementById('tokens-create-modal'); if(!backdrop){ backdrop=document.createElement('div'); backdrop.id='tokens-create-backdrop'; backdrop.className='modal-backdrop'; document.body.appendChild(backdrop); } if(!modal){ modal=document.createElement('div'); modal.id='tokens-create-modal'; modal.className='modal approve-modal'; modal.innerHTML=`<div class="modal-header"><h2>新增对象</h2></div><div class="modal-form"><div id="tokens-create-hints"></div><textarea id="tokens-create-editor"></textarea><div id="tokens-create-actions" class="tokens-create-actions"><button type="button" class="btn btn--secondary" id="tokens-create-cancel">取消</button><button type="button" class="btn btn--primary" id="tokens-create-submit">创建</button></div></div>`; document.body.appendChild(modal); backdrop.addEventListener('click', hideCreateModal); document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideCreateModal(); }); } return { backdrop, modal }; }
  function showCreateModal(collection, shape, tpl, variants){ const {backdrop, modal}= ensureCreateModal(); const editor= modal.querySelector('#tokens-create-editor'); const hints= modal.querySelector('#tokens-create-hints'); const btnCancel= modal.querySelector('#tokens-create-cancel'); const btnSubmit= modal.querySelector('#tokens-create-submit'); const schemeBoxId='tokens-create-variants'; let schemeBox= modal.querySelector('#'+schemeBoxId); if(!schemeBox){ const form = modal.querySelector('.modal-form'); schemeBox=document.createElement('div'); schemeBox.id=schemeBoxId; schemeBox.className='tokens-scheme'; form.insertBefore(schemeBox, form.firstElementChild); }
    if(shape){ try{ const normArr=(val)=> Array.isArray(val)? val: []; const pushProtoIfEmpty=(arr, base, fields)=>{ try{ if(!Array.isArray(arr)) return arr; if(arr.length>0) return arr; const proto={}; const childPrefix=`${base}[].`; const list= Array.isArray(fields)? fields: []; list.forEach(ff=>{ if(!ff||!ff.name) return; if(ff.name.startsWith(childPrefix)){ const rel= ff.name.slice(childPrefix.length); const def= ff.default!==undefined? ff.default: (ff.type||'').toLowerCase()==='number'? 0: (ff.type||'').toLowerCase()==='boolean'? false: ''; try{ setByPath(proto, rel, def); }catch(_){} } }); if(Object.keys(proto).length===0){ proto.cn=''; proto.en=''; } arr.push(proto); return arr; }catch(_){ return arr; } };
      if(collection==='term-fixed'){ tpl.part = normArr(tpl.part); tpl.part = pushProtoIfEmpty(tpl.part, 'part', shape&&shape.fields); tpl.epithet = normArr(tpl.epithet); if(Array.isArray(tpl.epithet)&&tpl.epithet.length===0) tpl.epithet.push({ cn:'' }); } else if(collection==='term-dynamic'){ tpl.part = normArr(tpl.part); tpl.part = pushProtoIfEmpty(tpl.part, 'part', shape&&shape.fields); } }catch(_){}}
    const fields = shape && Array.isArray(shape.fields)? shape.fields: [];
    function renderHintsFromVariants(curTpl, curVariants){ const HIDE=new Set(['_id','__v','_v']); const stripHidden=(v)=>{ if(!v||typeof v!=='object') return v; if(Array.isArray(v)) return v.map(stripHidden); const o={}; for(const k of Object.keys(v)){ if(!HIDE.has(k)) o[k]=stripHidden(v[k]); } return o; }; const pruneBySchema=(val,sch)=>{ if(!sch) return stripHidden(val); switch(sch.kind){ case 'str': case 'num': case 'bool': case 'null': case 'unknown': return val; case 'arr': { const a= Array.isArray(val)? val: []; return a.slice(0,3).map(it=> pruneBySchema(it, sch.elem)); } case 'obj': { const out={}; const keys=Object.keys(sch.fields||{}); for (const k of keys) { if (val && Object.prototype.hasOwnProperty.call(val, k)) out[k]= pruneBySchema(val[k], sch.fields[k]); } return out; } default: return val; } };
      if(curVariants && curVariants.length){ const match= curVariants.find(v=> JSON.stringify(v.tpl)===JSON.stringify(curTpl)); const hintRows = (match? match.hints: []).map(h=>{ const badge=`(${h.type})`; return `<div class="hint-row"><div class="hint-name">${esc(h.name)}</div><div class="hint-type">${esc(badge)}</div></div>`; }).join(''); let sampleHtml=''; try{ const sample= match && Array.isArray(match.samples) && match.samples[0]; if(sample){ const pruned= pruneBySchema(stripHidden(sample), match.schema); const pretty= esc(JSON.stringify(pruned, null, 2)); sampleHtml = `<div class="variant-sample"><div class="variant-sample__title">示例对象</div><pre class="variant-sample__pre">${pretty}</pre></div>`; } }catch(_){} hints.innerHTML = `<div class="hints-title"><strong>${collection}</strong> 结构字段：</div><div class="hints-list">${hintRows || '无'}</div>${sampleHtml}`; return; }
      const list = (fields.filter(f=> !f.name.endsWith('[]') && f.name!=='_id' && f.name!=='__v').map(f=>{ const badge=`(${f.type}${f.enum? ': '+f.enum.join('|'): ''})`; const bullet=f.required? '•':'○'; return `<div class="hint-row"><div class="hint-name">${bullet} ${esc(f.name)}</div><div class="hint-type">${esc(badge)}</div></div>`; }).join(''));
      const extra = shape && shape.suggest && shape.suggest.mixedKeys && shape.suggest.mixedKeys.length ? `<div class="hints-extra">可能的可选键：${shape.suggest.mixedKeys.slice(0,20).join(', ')}${shape.suggest.mixedKeys.length>20?' …':''}</div>`: '';
      hints.innerHTML = `<div class="hints-title"><strong>${collection}</strong> 字段（• 必填）：</div><div class="hints-list">${list || '无'}</div>${extra}`;
    }
    function renderSchemeSelector(curVariants){ if(!curVariants||curVariants.length===0){ schemeBox.innerHTML=''; schemeBox.__variants=[]; return; } schemeBox.__variants=curVariants; const groupHtml = `<div class="tokens-scheme__title">结构方案：</div><div class="tokens-scheme__group" role="radiogroup" aria-label="结构方案">${curVariants.map((v,i)=>{ const idx=i+1; const selCls=i===0? ' is-selected': ''; const aria=i===0? 'true':'false'; const tab=i===0? '0':'-1'; const title=`方案${idx}，样本 ${v.count}`; return `<div class="tokens-scheme__btn${selCls}" role="radio" aria-checked="${aria}" tabindex="${tab}" data-index="${i}" title="${esc(title)}"><span class="idx">${idx}</span><span class="cnt">${v.count}</span><span class="label">方案${idx}</span></div>`; }).join('')}</div>`; schemeBox.innerHTML=groupHtml; const selectIdx=(idx)=>{ try{ const variantsList= schemeBox.__variants||[]; if(!Number.isFinite(idx) || idx<0 || idx>=variantsList.length) return; const btns= Array.from(schemeBox.querySelectorAll('.tokens-scheme__btn')); btns.forEach((b,i)=>{ const on=i===idx; b.classList.toggle('is-selected', on); b.setAttribute('aria-checked', on? 'true':'false'); b.setAttribute('tabindex', on? '0':'-1'); }); schemeBox.dataset.selectedIndex= String(idx); const v= variantsList[idx]; if(v){ editor.value= JSON.stringify(v.tpl||{}, null, 2); renderHintsFromVariants(v.tpl, variantsList); } }catch(_){ } };
      if(!schemeBox.__bound){ schemeBox.__bound=true; schemeBox.addEventListener('click',(e)=>{ const btn=e.target && e.target.closest? e.target.closest('.tokens-scheme__btn'): null; if(!btn) return; const idx=Number(btn.getAttribute('data-index')); if(!Number.isFinite(idx)) return; selectIdx(idx); }); schemeBox.addEventListener('keydown',(e)=>{ const btns= Array.from(schemeBox.querySelectorAll('.tokens-scheme__btn')); if(btns.length===0) return; const cur=Number(schemeBox.dataset.selectedIndex||'0'); let next=cur; if(e.key==='ArrowRight'||e.key==='ArrowDown'){ next=(cur+1)%btns.length; e.preventDefault(); } else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){ next=(cur-1+btns.length)%btns.length; e.preventDefault(); } else if(e.key==='Home'){ next=0; e.preventDefault(); } else if(e.key==='End'){ next=btns.length-1; e.preventDefault(); } else if(e.key==='Enter'||e.key===' '){ e.preventDefault(); selectIdx(cur); btns[cur].focus(); return; } else { return; } selectIdx(next); try{ btns[next].focus(); }catch(_){ } }); }
      selectIdx(0);
    }
    renderSchemeSelector(variants);
    renderHintsFromVariants(tpl, variants);
    editor.value = JSON.stringify(tpl||{}, null, 2);
    const submit= async ()=>{ try{ let payload; try{ payload= JSON.parse(editor.value); }catch(_){ throw new Error('JSON 不合法'); } const out= await apiJson('/tokens/create', { method:'POST', auth:true, body:{ collection, data: payload } }); const doc= out && out.doc; try{ pushDocToState(collection, doc); }catch(_){} hideCreateModal(); try{ showTokensToast('创建成功'); }catch(_){ } renderTokensDashboard(false); }catch(e){ alert(e.message || '创建失败'); } };
    btnCancel.onclick= hideCreateModal;
    btnSubmit.onclick= submit;
    backdrop.style.display='block'; modal.style.display='block'; requestAnimationFrame(()=>{ backdrop.classList.add('show'); modal.classList.add('show'); }); setTimeout(()=>{ try{ editor.focus(); }catch(_){} }, 80);
  }
  function hideCreateModal(){ const backdrop=document.getElementById('tokens-create-backdrop'); const modal=document.getElementById('tokens-create-modal'); if(backdrop) backdrop.classList.remove('show'); if(modal) modal.classList.remove('show'); setTimeout(()=>{ const bd=document.getElementById('tokens-create-backdrop'); const md=document.getElementById('tokens-create-modal'); if(bd && !bd.classList.contains('show')) bd.style.display='none'; if(md && !md.classList.contains('show')) md.style.display='none'; }, 320); }

  // 行内编辑
  function enableInlineEdit(rootEl){ if(rootEl.__inlineEditBound) return; rootEl.__inlineEditBound=true; rootEl.addEventListener('click', function(ev){ if(ev.ctrlKey || document.body.classList.contains('ctrl-down')) return; const host= ev.target && ev.target.closest? ev.target.closest('.kv-val'): null; if(!host) return; const target=host; const openEditing = rootEl.querySelector('.kv-val[data-editing="1"]'); if(openEditing && openEditing!==target){ const old=openEditing.getAttribute('data-old-text')||''; openEditing.textContent=old; openEditing.removeAttribute('data-editing'); openEditing.removeAttribute('data-old-text'); openEditing.classList.remove('is-editing','is-saving'); } const path= target.getAttribute('data-path'); if(!path || path.startsWith('_') || path.includes('.__v')) return; const type= target.getAttribute('data-type')||'string'; const tokenCard= target.closest('.token-card[data-coll][data-id]'); if(!tokenCard) return; const coll= tokenCard.getAttribute('data-coll'); const id= tokenCard.getAttribute('data-id'); if(!coll||!id) return;
      if(target.getAttribute('data-editing')==='1') return; if(target.querySelector('.inline-edit')) return; target.setAttribute('data-editing','1'); const oldText= target.textContent; target.setAttribute('data-old-text', oldText); target.classList.add('is-editing'); const looksLikeHex=(s)=> /^#([\da-fA-F]{3}|[\da-fA-F]{4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/.test((s||'').trim()); const looksLikeFuncColor=(s)=> /^(?:rgb|rgba|hsl|hsla)\s*\(/i.test((s||'').trim()); const endsWithColorKey= /(^|\.)color$/i.test(path); const isColorField= endsWithColorKey || looksLikeHex(oldText) || looksLikeFuncColor(oldText);
      let input; let colorPicker=null; const applyPreview=(val)=>{ try{ if(!tokenCard||!val) return; const col= String(val).trim(); if(!col) return; const tint= computeTint(col); const list = [tokenCard, ...Array.from(tokenCard.querySelectorAll('.token-card, .nest-block'))]; list.forEach(el=>{ try{ el.style.setProperty('--token-accent', col); if(el.classList.contains('token-card')){ if(tint) el.style.setProperty('--token-bg', tint); el.style.borderLeft= `3px solid ${col}`; } }catch(_){ } }); }catch(_){ } };
      if(isColorField){ const wrap=document.createElement('div'); wrap.className='inline-edit-color'; try{ wrap.classList.add('is-enter'); requestAnimationFrame(()=>{ try{ wrap.classList.remove('is-enter'); }catch(_){ } }); }catch(_){ } colorPicker=document.createElement('input'); colorPicker.type='color'; colorPicker.className='color-picker'; const to6Hex=(s)=>{ s=(s||'').trim(); if(!s.startsWith('#')) return null; const hex=s.slice(1); if(hex.length===3) return '#'+ hex.split('').map(c=>c+c).join(''); if(hex.length===4) return '#'+ hex.slice(0,3).split('').map(c=>c+c).join(''); if(hex.length===6) return '#'+ hex; if(hex.length===8) return '#'+ hex.slice(0,6); return null; }; colorPicker.value= to6Hex(oldText) || '#3399ff'; const text=document.createElement('input'); text.type='text'; text.value=oldText; text.className='inline-edit'; wrap.appendChild(colorPicker); wrap.appendChild(text); target.textContent=''; target.appendChild(wrap); input=text; colorPicker.addEventListener('input', ()=>{ const v=colorPicker.value; input.value=v; applyPreview(v); try{ colorPicker.classList.remove('is-pulse'); void colorPicker.offsetWidth; colorPicker.classList.add('is-pulse'); }catch(_){ } }); colorPicker.addEventListener('change', ()=>{ const v=colorPicker.value; input.value=v; commit(); }); input.addEventListener('input', ()=>{ const v=input.value; if(looksLikeHex(v)){ const hx=to6Hex(v); if(hx) colorPicker.value=hx; } applyPreview(v); }); input.focus(); input.select(); } else { const ta=document.createElement('textarea'); ta.value=oldText; ta.className='inline-edit'; try{ ta.classList.add('is-enter'); requestAnimationFrame(()=>{ try{ ta.classList.remove('is-enter'); }catch(_){ } }); }catch(_){ } ta.setAttribute('rows','1'); ta.setAttribute('wrap','soft'); target.textContent=''; target.appendChild(ta); input=ta; const autoSize=()=>{ try{ ta.style.height='auto'; ta.style.height= Math.max(24, ta.scrollHeight)+'px'; }catch(_){ } }; ta.addEventListener('input', autoSize); autoSize(); ta.focus(); ta.select(); }
      let committing=false; let revertTimer=null; const cleanup=()=>{ committing=false; target.removeAttribute('data-editing'); target.classList.remove('is-editing'); target.classList.remove('is-saving'); target.removeAttribute('data-old-text'); if(revertTimer){ clearTimeout(revertTimer); revertTimer=null; } }; const revert=()=>{ target.textContent=oldText; cleanup(); };
      const convertValue=(txt,t)=>{ if(t==='number'){ const n= Number(txt.trim()); if(Number.isNaN(n)) throw new Error('请输入数字'); return n; } if(t==='boolean'){ const s= txt.trim().toLowerCase(); if(s==='true') return true; if(s==='false') return false; throw new Error('请输入 true 或 false'); } return txt; };
      const commit = async ()=>{ const txt=input.value; if(txt===oldText){ revert(); return; } let value; try{ value= convertValue(txt, type); }catch(err){ alert(err.message || '值不合法'); return; } input.disabled=true; target.classList.add('is-saving'); committing=true; try{ await apiJson('/tokens/update', { method:'POST', auth:true, body:{ collection:coll, id, path, value, valueType:type } }); target.textContent= (type==='boolean'||type==='number')? String(value): value; try{ showTokensToast('已保存'); }catch(_){ } try{ updateDocInState(coll, id, (doc)=> setByPath(doc, path, value)); }catch(_){ } if(path==='color'){ const col=value; const tint=computeTint(col); if(tokenCard && col){ const list=[tokenCard, ...Array.from(tokenCard.querySelectorAll('.token-card, .nest-block'))]; list.forEach(el=>{ try{ el.style.setProperty('--token-accent', col); if(el.classList.contains('token-card')){ if(tint) el.style.setProperty('--token-bg', tint); el.style.borderLeft=`3px solid ${col}`; } }catch(_){ } }); } } cleanup(); } catch(e){ alert(e.message || '更新失败'); revert(); } };
      input.addEventListener('keydown',(e)=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); commit(); } else if(e.key==='Escape'){ e.preventDefault(); revert(); } }); const safeBlur=()=>{ if(committing) return; revertTimer=setTimeout(()=>{ if(committing) return; const ae=document.activeElement; if(!target.contains(ae)) revert(); },110); }; input.addEventListener('blur', safeBlur); if(colorPicker){ colorPicker.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); commit(); } else if(e.key==='Escape'){ e.preventDefault(); revert(); } }); colorPicker.addEventListener('blur', safeBlur); }
    });
  }

  // 行内删除字段
  function enableInlineDelete(rootEl){ if(rootEl.__inlineDeleteBound) return; rootEl.__inlineDeleteBound=true; rootEl.addEventListener('click', async function(ev){ if(ev.ctrlKey || document.body.classList.contains('ctrl-down')){ const maybe= ev.target && ev.target.closest? ev.target.closest('.btn-del'): null; if(maybe){ try{ showTokensToast('按 Ctrl 时仅支持删除对象'); }catch(_){ } ev.preventDefault(); return; } } const btn= ev.target && ev.target.closest? ev.target.closest('.btn-del'): null; if(!btn) return; const row= btn.closest('.kv-row'); if(!row) return; const path= row.getAttribute('data-path'); if(!path || path.startsWith('_') || path.includes('.__v')) return; const tokenCard= row.closest('.token-card[data-coll][data-id]'); if(!tokenCard) return; const coll= tokenCard.getAttribute('data-coll'); const id= tokenCard.getAttribute('data-id'); const keyNameEl= row.querySelector('.kv-key'); const keyName= keyNameEl? keyNameEl.textContent.trim(): path.split('.').pop(); if(!confirm(`确定删除「${keyName}」吗？此操作不可撤销。`)) return; try{ await apiJson('/tokens/delete', { method:'POST', auth:true, body:{ collection:coll, id, path } }); try{ updateDocInState(coll, id, (doc)=> deleteFieldInDocByPath(doc, path)); }catch(_){ } row.remove(); try{ showTokensToast('已删除'); }catch(_){ } }catch(e){ alert(e.message || '删除失败'); } }); }

  // 编辑对象（整文档）
  function enableEditDoc(rootEl){ if(rootEl.__editDocBound) return; rootEl.__editDocBound=true; rootEl.addEventListener('click', async function(ev){ const btn= ev.target && ev.target.closest? ev.target.closest('.btn-edit-doc'): null; if(!btn) return; if(!ev.ctrlKey && !document.body.classList.contains('ctrl-down')){ try{ showTokensToast('按住 Ctrl 键以启用编辑'); }catch(_){ } return; } const card= btn.closest('.token-card[data-coll][data-id]'); if(!card) return; const coll= card.getAttribute('data-coll'); const id= card.getAttribute('data-id'); if(!coll||!id) return; try{ openEditModal(coll, id); }catch(e){ alert(e.message || '无法打开编辑'); } }); }
  function ensureEditModal(){ let backdrop=document.getElementById('tokens-edit-backdrop'); let modal=document.getElementById('tokens-edit-modal'); if(!backdrop){ backdrop=document.createElement('div'); backdrop.id='tokens-edit-backdrop'; backdrop.className='modal-backdrop'; document.body.appendChild(backdrop); } if(!modal){ modal=document.createElement('div'); modal.id='tokens-edit-modal'; modal.className='modal approve-modal'; modal.innerHTML=`<div class="modal-header"><h2>编辑对象</h2></div><div class="modal-form"><div id="tokens-edit-hints"></div><textarea id="tokens-edit-editor"></textarea><div class="tokens-create-actions"><button type="button" class="btn btn--secondary" id="tokens-edit-cancel">取消</button><button type="button" class="btn btn--secondary" id="tokens-edit-saveas">另存</button><button type="button" class="btn btn--primary" id="tokens-edit-submit">保存</button></div></div>`; document.body.appendChild(modal); backdrop.addEventListener('click', hideEditModal); document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideEditModal(); }); } return { backdrop, modal }; }
  function hideEditModal(){ const backdrop=document.getElementById('tokens-edit-backdrop'); const modal=document.getElementById('tokens-edit-modal'); if(backdrop) backdrop.classList.remove('show'); if(modal) modal.classList.remove('show'); setTimeout(()=>{ const bd=document.getElementById('tokens-edit-backdrop'); const md=document.getElementById('tokens-edit-modal'); if(bd && !bd.classList.contains('show')) bd.style.display='none'; if(md && !md.classList.contains('show')) md.style.display='none'; }, 320); }
  function openEditModal(collection, id){ const doc=findDocInState(collection, id); if(!doc) throw new Error('未找到对象'); const HIDE=new Set(['_id','__v','_v']); const strip=(v)=>{ if(!v||typeof v!=='object') return v; if(Array.isArray(v)) return v.map(strip); const o={}; for(const k of Object.keys(v)){ if(!HIDE.has(k)) o[k]=strip(v[k]); } return o; }; const orig= strip(doc); const {backdrop, modal}= ensureEditModal(); const editor= modal.querySelector('#tokens-edit-editor'); const hints= modal.querySelector('#tokens-edit-hints'); const btnCancel= modal.querySelector('#tokens-edit-cancel'); const btnSubmit= modal.querySelector('#tokens-edit-submit'); const btnSaveAs= modal.querySelector('#tokens-edit-saveas'); try{ const schema= deriveSchema(orig); const list= flattenHintsFromSchema(schema).map(h=> `<div class="hint-row"><div class="hint-name">${esc(h.name)}</div><div class="hint-type">(${esc(h.type)})</div></div>`).join(''); hints.innerHTML= `<div class="hints-title">对象结构：</div><div class="hints-list">${list || '无'}</div>`; }catch(_){ hints.innerHTML=''; } editor.value= JSON.stringify(orig, null, 2); const submit= async ()=>{ let next; try{ next = JSON.parse(editor.value); }catch(_){ alert('JSON 不合法'); return; } try{ await applyObjectEdits(collection, id, orig, next); hideEditModal(); try{ showTokensToast('保存成功'); }catch(_){ } renderTokensDashboard(false); }catch(e){ alert(e.message || '保存失败'); } }; const saveAs = async ()=>{ let next; try{ next = JSON.parse(editor.value); }catch(_){ alert('JSON 不合法'); return; } try{ const out = await apiJson('/tokens/create', { method:'POST', auth:true, body:{ collection, data: next } }); const newDoc = out && out.doc; if(newDoc){ try{ pushDocToState(collection, newDoc); }catch(_){ } } hideEditModal(); try{ showTokensToast('已另存为新对象'); }catch(_){ } renderTokensDashboard(false); }catch(e){ alert(e.message || '另存失败'); } };
    btnCancel.onclick= hideEditModal; btnSubmit.onclick= submit; if(btnSaveAs) btnSaveAs.onclick = saveAs; backdrop.style.display='block'; modal.style.display='block'; requestAnimationFrame(()=>{ backdrop.classList.add('show'); modal.classList.add('show'); }); setTimeout(()=>{ try{ editor.focus(); }catch(_){ } }, 80); }
  function pathJoin(base,key){ return base? (base+'.'+key): String(key); }
  function isPrimitive(v){ return v==null || typeof v==='string' || typeof v==='number' || typeof v==='boolean'; }
  function diffObjects(orig, next, base=''){ const sets=[]; const dels=[]; const addSet=(p,v)=>{ const t=(typeof v==='number')? 'number': (typeof v==='boolean')? 'boolean': 'string'; sets.push({ path:p, value:v, valueType:t }); }; const walk=(o,n,p)=>{ if(isPrimitive(o) || isPrimitive(n)){ if(JSON.stringify(o)!==JSON.stringify(n)) addSet(p, n); return; } if(Array.isArray(o) || Array.isArray(n)){ const oa= Array.isArray(o)? o: []; const na= Array.isArray(n)? n: []; const len=Math.max(oa.length, na.length); for(let i=0;i<len;i++){ const op= pathJoin(p, String(i)); if(i>=na.length){ dels.push(op); } else if(i>=oa.length){ if(isPrimitive(na[i])) addSet(op, na[i]); else { walk(undefined, na[i], op); } } else { if(isPrimitive(oa[i]) || isPrimitive(na[i])){ if(JSON.stringify(oa[i])!==JSON.stringify(na[i])) addSet(op, na[i]); } else { walk(oa[i], na[i], op); } } } return; } const ok= Object.keys(o||{}); const nk= Object.keys(n||{}); const keySet= new Set([...ok,...nk]); for (const k of keySet){ if(n && !Object.prototype.hasOwnProperty.call(n,k)){ dels.push(pathJoin(p,k)); continue; } if(o && !Object.prototype.hasOwnProperty.call(o,k)){ const v=n[k]; if(isPrimitive(v)) addSet(pathJoin(p,k), v); else walk(undefined, v, pathJoin(p,k)); continue; } const ov=o[k], nv=n[k]; if(isPrimitive(ov) || isPrimitive(nv)){ if(JSON.stringify(ov)!==JSON.stringify(nv)) addSet(pathJoin(p,k), nv); } else { walk(ov, nv, pathJoin(p,k)); } } }; walk(orig,next,base); return { sets, dels }; }
  async function applyObjectEdits(collection, id, orig, next){ const { sets, dels } = diffObjects(orig, next, ''); const isHidden=(p)=> /^(\_id|__v|_v)(\.|$)/.test(p); const sets2= sets.filter(x=> x && x.path && !isHidden(x.path)); const dels2= dels.filter(p=> p && !isHidden(p)); dels2.sort((a,b)=>{ const al=a.split('.'), bl=b.split('.'); if(al.length!==bl.length) return bl.length-al.length; const an=al[al.length-1], bn=bl[bl.length-1]; const ai=/^\d+$/.test(an)? parseInt(an,10): NaN; const bi=/^\d+$/.test(bn)? parseInt(bn,10): NaN; if(!Number.isNaN(ai) && !Number.isNaN(bi)) return bi-ai; return 0; }); for(const p of dels2){ await apiJson('/tokens/delete', { method:'POST', auth:true, body:{ collection, id, path:p } }); } for(const s of sets2){ await apiJson('/tokens/update', { method:'POST', auth:true, body:{ collection, id, path:s.path, value:s.value, valueType:s.valueType } }); } const target=findDocInState(collection, id); if(target){ for(const p of dels2){ try{ deleteFieldInDocByPath(target, p); }catch(_){ } } for(const s of sets2){ try{ setByPath(target, s.path, s.value); }catch(_){ } } } }

  // Toast
  function showTokensToast(message){ try{ let container=document.querySelector('.tokens-toast-container'); if(!container){ container=document.createElement('div'); container.className='tokens-toast-container'; document.body.appendChild(container); } const toast=document.createElement('div'); toast.className='tokens-toast'; toast.textContent=message||'操作成功'; container.appendChild(toast); setTimeout(()=>{ try{ toast.remove(); }catch(_){ } if(container && container.children.length===0){ try{ container.remove(); }catch(_){ } } }, 2200); }catch(_){}}

  // 删除整对象
  function enableDeleteDoc(rootEl){ if(rootEl.__deleteDocBound) return; rootEl.__deleteDocBound=true; rootEl.addEventListener('click', async function(ev){ const btn= ev.target && ev.target.closest? ev.target.closest('.btn-del-doc'): null; if(!btn) return; if(!ev.ctrlKey && !document.body.classList.contains('ctrl-down')){ try{ showTokensToast('按住 Ctrl 键以启用删除'); }catch(_){ } return; } const card= btn.closest('.token-card[data-coll][data-id]'); if(!card) return; const coll= card.getAttribute('data-coll'); const id= card.getAttribute('data-id'); if(!coll||!id) return; if(!confirm('确定删除整个对象吗？此操作不可撤销。')) return; try{ await apiJson('/tokens/remove', { method:'POST', auth:true, body:{ collection:coll, id } }); try{ removeDocFromState(coll, id); }catch(_){ } card.remove(); try{ showTokensToast('对象已删除'); }catch(_){ } }catch(e){ alert(e.message || '删除失败'); } }); }
})();


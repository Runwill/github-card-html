// tokens/ui/modals
// 统一的“新建/编辑”弹窗；与渲染保持布局一致；支持“另存”
(function(){
  const T = window.tokensAdmin;
  const { esc, setByPath } = T;
  const { apiJson } = T;

  function showTokensToast(message){
    try{
      let container=document.querySelector('.tokens-toast-container');
      if(!container){ container=document.createElement('div'); container.className='tokens-toast-container'; document.body.appendChild(container); }
  const toast=document.createElement('div'); toast.className='tokens-toast'; toast.textContent=message || window.t('status.updated') || '';
      container.appendChild(toast);
      setTimeout(()=>{ try{ toast.remove(); }catch(_){ } if(container && container.children.length===0){ try{ container.remove(); }catch(_){ } } }, 2200);
    }catch(_){}
  }
  // 统一 toast 出口：优先使用全局 tokensAdmin.showToast
  function toast(msg){
    try{
      if (window.tokensAdmin && typeof window.tokensAdmin.showToast === 'function') {
        window.tokensAdmin.showToast(msg);
      } else {
        showTokensToast(msg);
      }
    }catch(_){ }
  }
  // 新建弹窗：懒加载构建 DOM 节点
  function ensureCreateModal(){
    let backdrop=document.getElementById('tokens-create-backdrop');
    let modal=document.getElementById('tokens-create-modal');
    if(!backdrop){ backdrop=document.createElement('div'); backdrop.id='tokens-create-backdrop'; backdrop.className='modal-backdrop'; document.body.appendChild(backdrop); }
    if(!modal){
      modal=document.createElement('div');
      modal.id='tokens-create-modal';
      modal.className='modal approve-modal';
      modal.innerHTML=`<div class="modal-header"><h2 data-i18n="tokens.create.title"></h2></div><div class="modal-form"><div id="tokens-create-hints"></div><textarea id="tokens-create-editor"></textarea><div id="tokens-create-actions" class="tokens-create-actions"><button type="button" class="btn btn--secondary" id="tokens-create-cancel" data-i18n="tokens.create.cancel"></button><button type="button" class="btn btn--primary" id="tokens-create-submit" data-i18n="tokens.create.submit"></button></div></div>`;
      document.body.appendChild(modal);
      backdrop.addEventListener('click', hideCreateModal);
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideCreateModal(); });
    }
    return { backdrop, modal };
  }
  function hideCreateModal(){
    const backdrop=document.getElementById('tokens-create-backdrop');
    const modal=document.getElementById('tokens-create-modal');
    if(backdrop) backdrop.classList.remove('show');
    if(modal) modal.classList.remove('show');
    setTimeout(()=>{
      const bd=document.getElementById('tokens-create-backdrop');
      const md=document.getElementById('tokens-create-modal');
      if(bd && !bd.classList.contains('show')) bd.style.display='none';
      if(md && !md.classList.contains('show')) md.style.display='none';
    }, 320);
  }
  // 打开新建弹窗：支持变体选择 + 字段提示
  function showCreateModal(collection, shape, tpl, variants){
    const {backdrop, modal}= ensureCreateModal();
    const editor= modal.querySelector('#tokens-create-editor');
    const hints= modal.querySelector('#tokens-create-hints');
    const btnCancel= modal.querySelector('#tokens-create-cancel');
    const btnSubmit= modal.querySelector('#tokens-create-submit');
    const { getAuth } = window.tokensAdmin;
    const { canEdit } = getAuth ? getAuth() : { canEdit:false };
    const schemeBoxId='tokens-create-variants';
    let schemeBox= modal.querySelector('#'+schemeBoxId);
    if(!schemeBox){ const form = modal.querySelector('.modal-form'); schemeBox=document.createElement('div'); schemeBox.id=schemeBoxId; schemeBox.className='tokens-scheme'; form.insertBefore(schemeBox, form.firstElementChild); }
  if(shape){ try{ const normArr=(val)=> Array.isArray(val)? val: []; const pushProtoIfEmpty=(arr, base, fields)=>{ try{ if(!Array.isArray(arr)) return arr; if(arr.length>0) return arr; const proto={}; const childPrefix=`${base}[].`; const list= Array.isArray(fields)? fields: []; list.forEach(ff=>{ if(!ff||!ff.name) return; if(ff.name.startsWith(childPrefix)){ const rel= ff.name.slice(childPrefix.length); const def= ff.default!==undefined? ff.default: (ff.type||'').toLowerCase()==='number'? 0: (ff.type||'').toLowerCase()==='boolean'? false: ''; try{ setByPath(proto, rel, def); }catch(_){} } }); if(Object.keys(proto).length===0){ proto.cn=''; proto.en=''; } arr.push(proto); return arr; }catch(_){ return arr; } }; if(collection==='term-fixed'){ tpl.part = normArr(tpl.part); tpl.part = pushProtoIfEmpty(tpl.part, 'part', shape&&shape.fields); tpl.epithet = normArr(tpl.epithet); if(Array.isArray(tpl.epithet)&&tpl.epithet.length===0) tpl.epithet.push({ cn:'' }); } else if(collection==='term-dynamic'){ tpl.part = normArr(tpl.part); tpl.part = pushProtoIfEmpty(tpl.part, 'part', shape&&shape.fields); } }catch(_){} }
    const fields = shape && Array.isArray(shape.fields)? shape.fields: [];
  function renderHintsFromVariants(curTpl, curVariants){ const HIDE=new Set(['_id','__v','_v','py']); const stripHidden=(v)=>{ if(!v||typeof v!=='object') return v; if(Array.isArray(v)) return v.map(stripHidden); const o={}; for(const k of Object.keys(v)){ if(!HIDE.has(k)) o[k]=stripHidden(v[k]); } return o; }; const pruneBySchema=(val,sch)=>{ if(!sch) return stripHidden(val); switch(sch.kind){ case 'str': case 'num': case 'bool': case 'null': case 'unknown': return val; case 'arr': { const a= Array.isArray(val)? val: []; return a.slice(0,3).map(it=> pruneBySchema(it, sch.elem)); } case 'obj': { const out={}; const keys=Object.keys(sch.fields||{}); for (const k of keys) { if (val && Object.prototype.hasOwnProperty.call(val, k)) out[k]= pruneBySchema(val[k], sch.fields[k]); } return out; } default: return val; } };
      if(curVariants && curVariants.length){ const match= curVariants.find(v=> JSON.stringify(v.tpl)===JSON.stringify(curTpl)); const hintRows = (match? match.hints: []).map(h=>{ const badge=`(${h.type})`; return `<div class="hint-row"><div class="hint-name">${esc(h.name)}</div><div class="hint-type">${esc(badge)}</div></div>`; }).join(''); let sampleHtml=''; try{ const sample= match && Array.isArray(match.samples) && match.samples[0]; if(sample){ const pruned= pruneBySchema(stripHidden(sample), match.schema); const pretty= esc(JSON.stringify(pruned, null, 2)); sampleHtml = `<div class="variant-sample"><div class="variant-sample__title" data-i18n="tokens.hints.sampleTitle"></div><pre class="variant-sample__pre">${pretty}</pre></div>`; } }catch(_){} hints.innerHTML = `<div class="hints-title"><span data-i18n="tokens.hints.title" data-i18n-params='${JSON.stringify({ name: esc(collection) })}'></span></div><div class="hints-list">${hintRows || `<span data-i18n="tokens.hints.none"></span>`}</div>${sampleHtml}`; try{ window.i18n && window.i18n.apply && window.i18n.apply(hints); }catch(_){ } return; }
      const list = (fields.filter(f=> !f.name.endsWith('[]') && f.name!=='_id' && f.name!=='__v').map(f=>{ const badge=`(${f.type}${f.enum? ': '+f.enum.join('|'): ''})`; const bullet=f.required? '•':'○'; return `<div class="hint-row"><div class="hint-name">${bullet} ${esc(f.name)}</div><div class="hint-type">${esc(badge)}</div></div>`; }).join(''));
      const extra = shape && shape.suggest && shape.suggest.mixedKeys && shape.suggest.mixedKeys.length ? `<div class="hints-extra" data-i18n="tokens.hints.optionalKeys" data-i18n-params='${JSON.stringify({ keys: shape.suggest.mixedKeys.slice(0,20).join(', ') + (shape.suggest.mixedKeys.length>20?' …':'') })}'></div>`: '';
      hints.innerHTML = `<div class="hints-title"><span data-i18n="tokens.hints.listTitle" data-i18n-params='${JSON.stringify({ name: esc(collection) })}'></span></div><div class="hints-list">${list || `<span data-i18n="tokens.hints.none"></span>`}</div>${extra}`;
      try{ window.i18n && window.i18n.apply && window.i18n.apply(hints); }catch(_){ }
    }
  function renderSchemeSelector(curVariants){ if(!curVariants||curVariants.length===0){ schemeBox.innerHTML=''; schemeBox.__variants=[]; return; } schemeBox.__variants=curVariants; const groupHtml = `<div class="tokens-scheme__group" role="radiogroup" aria-label="结构方案">${curVariants.map((v,i)=>{ const idx=i+1; const selCls=i===0? ' is-selected': ''; const aria=i===0? 'true':'false'; const tab=i===0? '0':'-1'; const title=`方案${idx}，样本 ${v.count}`; return `<div class="tokens-scheme__btn${selCls}" role="radio" aria-checked="${aria}" tabindex="${tab}" data-index="${i}" title="${esc(title)}"><span class="idx">${idx}</span><span class="cnt">${v.count}</span><span class="label">方案${idx}</span></div>`; }).join('')}</div>`; schemeBox.innerHTML=groupHtml; const selectIdx=(idx)=>{ try{ const variantsList= schemeBox.__variants||[]; if(!Number.isFinite(idx) || idx<0 || idx>=variantsList.length) return; const btns= Array.from(schemeBox.querySelectorAll('.tokens-scheme__btn')); btns.forEach((b,i)=>{ const on=i===idx; b.classList.toggle('is-selected', on); b.setAttribute('aria-checked', on? 'true':'false'); b.setAttribute('tabindex', on? '0':'-1'); }); schemeBox.dataset.selectedIndex= String(idx); const v= variantsList[idx]; if(v){ editor.value= JSON.stringify(v.tpl||{}, null, 2); renderHintsFromVariants(v.tpl, variantsList); } }catch(_){ } };
      if(!schemeBox.__bound){ schemeBox.__bound=true; schemeBox.addEventListener('click',(e)=>{ const btn=e.target && e.target.closest? e.target.closest('.tokens-scheme__btn'): null; if(!btn) return; const idx=Number(btn.getAttribute('data-index')); if(!Number.isFinite(idx)) return; selectIdx(idx); }); schemeBox.addEventListener('keydown',(e)=>{ const btns= Array.from(schemeBox.querySelectorAll('.tokens-scheme__btn')); if(btns.length===0) return; const cur=Number(schemeBox.dataset.selectedIndex||'0'); let next=cur; if(e.key==='ArrowRight'||e.key==='ArrowDown'){ next=(cur+1)%btns.length; e.preventDefault(); } else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){ next=(cur-1+btns.length)%btns.length; e.preventDefault(); } else if(e.key==='Home'){ next=0; e.preventDefault(); } else if(e.key==='End'){ next=btns.length-1; e.preventDefault(); } else if(e.key==='Enter'||e.key===' '){ e.preventDefault(); selectIdx(cur); btns[cur].focus(); return; } else { return; } selectIdx(next); try{ btns[next].focus(); }catch(_){ } }); }
      selectIdx(0);
    }
    renderSchemeSelector(variants);
    renderHintsFromVariants(tpl, variants);
    editor.value = JSON.stringify(tpl||{}, null, 2);
  const submit= async ()=>{
  if(!canEdit){ toast(window.t('common.noPermission')); return; }
      try{
        let payload;
  try{ payload= JSON.parse(editor.value); }catch(_){ toast(window.t('tokens.error.jsonInvalid')); return; }
        // 创建时也过滤隐藏键，避免用户手动输入 py 等
        try{ const HIDE=new Set(['_id','__v','_v','py']); const strip=(v)=>{ if(!v||typeof v!=='object') return v; if(Array.isArray(v)) return v.map(strip); const o={}; for(const k of Object.keys(v)){ if(!HIDE.has(k)) o[k]=strip(v[k]); } return o; }; payload = strip(payload); }catch(_){ }
        const out= await apiJson('/tokens/create', { method:'POST', auth:true, body:{ collection, data: payload } });
        const doc= out && out.doc;
        try{ window.tokensAdmin.pushDocToState(collection, doc); }catch(_){}
    try{ window.tokensAdmin.logChange && window.tokensAdmin.logChange('create', { collection, id: doc && doc._id, doc }); }catch(_){ }
  hideCreateModal();
  try{ toast(window.t('tokens.toast.created')); }catch(_){ }
        if(window.renderTokensDashboard) window.renderTokensDashboard(false);
      }catch(e){
        try{
          if(e && e.data && Array.isArray(e.data.details) && e.data.details.length){
            const base = window.t('tokens.error.createFailed') || (e && e.message) || '';
            toast(base + '：' + e.data.details.join('；'));
          } else {
            toast((e && e.message) || window.t('tokens.error.createFailed'));
          }
  }catch(_){ toast(window.t('tokens.error.createFailed')); }
      }
    };
  btnCancel.onclick= hideCreateModal; btnSubmit.onclick= submit;
  // 只读用户：仅做禁用视觉，去掉悬浮提示，点击再弹 toast
  if(!canEdit){ try{ btnSubmit.classList.add('is-disabled'); }catch(_){ } }
  else { try{ btnSubmit.classList.remove('is-disabled'); }catch(_){ } }
    backdrop.style.display='block'; modal.style.display='block';
    // 确保标题进入动画：移除残留的 visible，再触发 animate-in
    try{
      const h2 = modal.querySelector('.modal-header h2');
      if(h2){ h2.classList.remove('animate-in','visible'); void h2.offsetWidth; h2.classList.add('animate-in'); }
    }catch(_){ }
    requestAnimationFrame(()=>{ backdrop.classList.add('show'); modal.classList.add('show'); });
    setTimeout(()=>{ try{ editor.focus(); }catch(_){} }, 80);
  }
  // 编辑弹窗：与新建弹窗布局一致，含“另存”按钮
  function ensureEditModal(){
    let backdrop=document.getElementById('tokens-edit-backdrop');
    let modal=document.getElementById('tokens-edit-modal');
    if(!backdrop){ backdrop=document.createElement('div'); backdrop.id='tokens-edit-backdrop'; backdrop.className='modal-backdrop'; document.body.appendChild(backdrop); }
    if(!modal){
      modal=document.createElement('div');
      modal.id='tokens-edit-modal';
      modal.className='modal approve-modal';
      modal.innerHTML=`<div class=\"modal-header\"><h2 data-i18n=\"tokens.edit.title\"></h2></div><div class=\"modal-form\"><div id=\"tokens-edit-hints\"></div><textarea id=\"tokens-edit-editor\"></textarea><div class=\"tokens-create-actions\"><button type=\"button\" class=\"btn btn--secondary\" id=\"tokens-edit-cancel\" data-i18n=\"tokens.edit.cancel\"></button><button type=\"button\" class=\"btn btn--secondary\" id=\"tokens-edit-saveas\" data-i18n=\"tokens.edit.saveas\"></button><button type=\"button\" class=\"btn btn--primary\" id=\"tokens-edit-submit\" data-i18n=\"tokens.edit.submit\"></button></div></div>`;
      document.body.appendChild(modal);
      backdrop.addEventListener('click', hideEditModal);
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hideEditModal(); });
    }
    return { backdrop, modal };
  }
  function hideEditModal(){
    const backdrop=document.getElementById('tokens-edit-backdrop');
    const modal=document.getElementById('tokens-edit-modal');
    if(backdrop) backdrop.classList.remove('show');
    if(modal) modal.classList.remove('show');
    setTimeout(()=>{
      const bd=document.getElementById('tokens-edit-backdrop');
      const md=document.getElementById('tokens-edit-modal');
      if(bd && !bd.classList.contains('show')) bd.style.display='none';
      if(md && !md.classList.contains('show')) md.style.display='none';
    }, 320);
  }
  // 打开编辑弹窗：显示结构提示；保存与“另存”为新
  function openEditModal(collection, id){
    const doc= window.tokensAdmin.findDocInState(collection, id);
    if(!doc) throw new Error('未找到对象');
  const HIDE=new Set(['_id','__v','_v','py']);
    const strip=(v)=>{ if(!v||typeof v!=='object') return v; if(Array.isArray(v)) return v.map(strip); const o={}; for(const k of Object.keys(v)){ if(!HIDE.has(k)) o[k]=strip(v[k]); } return o; };
    const orig= strip(doc);
    const {backdrop, modal}= ensureEditModal();
    const editor= modal.querySelector('#tokens-edit-editor');
    const hints= modal.querySelector('#tokens-edit-hints');
    const btnCancel= modal.querySelector('#tokens-edit-cancel');
    const btnSubmit= modal.querySelector('#tokens-edit-submit');
    const btnSaveAs= modal.querySelector('#tokens-edit-saveas');
    try{
      const schema= window.tokensAdmin.deriveSchema(orig);
      const list= window.tokensAdmin.flattenHintsFromSchema(schema).map(h=> `<div class="hint-row"><div class="hint-name">${esc(h.name)}</div><div class="hint-type">(${esc(h.type)})</div></div>`).join('');
      hints.innerHTML= `<div class="hints-title" data-i18n="tokens.hints.title" data-i18n-params='${JSON.stringify({ name: window.tokensAdmin && window.tokensAdmin.escape ? window.tokensAdmin.escape(collection) : collection })}'></div><div class="hints-list">${list || `<span data-i18n="tokens.hints.none"></span>`}</div>`;
      try{ window.i18n && window.i18n.apply && window.i18n.apply(hints); }catch(_){ }
    }catch(_){ hints.innerHTML=''; }
    editor.value= JSON.stringify(orig, null, 2);
    const { getAuth } = window.tokensAdmin;
    const { canEdit } = getAuth ? getAuth() : { canEdit:false };
    const submit= async ()=>{
  if(!canEdit){ toast(window.t('common.noPermission')); return; }
  let next; try{ next = JSON.parse(editor.value); }catch(_){ toast(window.t('tokens.error.jsonInvalid')); return; }
      // 编辑提交时，强制过滤掉隐藏键（含 py）
      try{ next = strip(next); }catch(_){ }
      try{
        const detailed = await window.tokensAdmin.applyObjectEdits(collection, id, orig, next);
        try{ window.tokensAdmin.logChange && window.tokensAdmin.logChange('save-edits', { collection, id, sets: detailed && detailed.sets, dels: detailed && detailed.dels }); }catch(_){ }
        hideEditModal();
  try{ toast(window.t('status.updated')); }catch(_){ }
        if(window.renderTokensDashboard) window.renderTokensDashboard(false);
      }catch(e){
        try{
          if(e && e.data && Array.isArray(e.data.details) && e.data.details.length){
            const base = window.t('tokens.error.updateFailed') || (e && e.message) || '';
            toast(base + '：' + e.data.details.join('；'));
          } else {
            toast((e && e.message) || window.t('tokens.error.updateFailed'));
          }
  }catch(_){ toast(window.t('tokens.error.updateFailed')); }
      }
    };
    const saveAs = async ()=>{
  if(!canEdit){ toast(window.t('common.noPermission')); return; }
  let next; try{ next = JSON.parse(editor.value); }catch(_){ toast(window.t('tokens.error.jsonInvalid')); return; }
      // 另存为新对象时同样过滤隐藏键（含 py）
      try{ next = strip(next); }catch(_){ }
      try{
        const out = await apiJson('/tokens/create', { method:'POST', auth:true, body:{ collection, data: next } });
        const newDoc = out && out.doc;
        if(newDoc){ try{ window.tokensAdmin.pushDocToState(collection, newDoc); }catch(_){ } }
        try{ window.tokensAdmin.logChange && window.tokensAdmin.logChange('create', { collection, id: newDoc && newDoc._id, doc: newDoc }); }catch(_){ }
        hideEditModal();
  try{ toast(window.t('tokens.toast.savedAs')); }catch(_){ }
        if(window.renderTokensDashboard) window.renderTokensDashboard(false);
      }catch(e){
        try{
          if(e && e.data && Array.isArray(e.data.details) && e.data.details.length){
            const base = window.t('tokens.error.createFailed') || (e && e.message) || '';
            toast(base + '：' + e.data.details.join('；'));
          } else {
            toast((e && e.message) || window.t('tokens.error.createFailed'));
          }
  }catch(_){ toast(window.t('tokens.error.createFailed')); }
      }
    };
    btnCancel.onclick= hideEditModal; btnSubmit.onclick= submit; if(btnSaveAs) btnSaveAs.onclick = saveAs;
    // 只读用户：仅做禁用视觉，去掉悬浮提示，点击再弹 toast
    if(!canEdit){
      try{ btnSubmit.classList.add('is-disabled'); }catch(_){ }
      try{ if(btnSaveAs){ btnSaveAs.classList.add('is-disabled'); } }catch(_){ }
    } else {
      try{ btnSubmit.classList.remove('is-disabled'); }catch(_){ }
      try{ if(btnSaveAs){ btnSaveAs.classList.remove('is-disabled'); } }catch(_){ }
    }
    backdrop.style.display='block'; modal.style.display='block';
    try{
      const h2 = modal.querySelector('.modal-header h2');
      if(h2){ h2.classList.remove('animate-in','visible'); void h2.offsetWidth; h2.classList.add('animate-in'); }
    }catch(_){ }
    requestAnimationFrame(()=>{ backdrop.classList.add('show'); modal.classList.add('show'); });
    setTimeout(()=>{ try{ editor.focus(); }catch(_){ } }, 80);
  }
  Object.assign(window.tokensAdmin, { showCreateModal, hideCreateModal, openEditModal, hideEditModal });
})();

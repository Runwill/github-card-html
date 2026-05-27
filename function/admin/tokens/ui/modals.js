// tokens/ui/modals
// 统一的“新建/编辑”弹窗；与渲染保持布局一致；支持“另存”
  const T = window.tokensAdmin;
  const { esc, setByPath, stripHidden, showToast: toast } = T;
  const { apiJson } = T;

  // V7: 弹窗打开动画（display→show→animate-in→focus）
  function showModalAnim(backdrop, modal, editor){
    backdrop.style.display = modal.style.display = 'block';
    try{ const h2=modal.querySelector('.modal-header h2'); if(h2){ h2.classList.remove('animate-in','visible'); void h2.offsetWidth; h2.classList.add('animate-in'); } }catch(_){ }
    requestAnimationFrame(()=>{ backdrop.classList.add('show'); modal.classList.add('show'); });
    setTimeout(()=>{ try{ editor.focus(); }catch(_){} }, 80);
  }
  // V8: 带 details 的错误 toast
  function toastError(e, fallbackKey){
    try{
      if(e && e.data && Array.isArray(e.data.details) && e.data.details.length){
        const base = window.t(fallbackKey) || (e && e.message) || '';
        toast(base + '：' + e.data.details.join('；'));
      } else { toast((e && e.message) || window.t(fallbackKey)); }
    }catch(_){ toast(window.t(fallbackKey)); }
  }

  function ensureTokenModal(prefix, html, hide){
    let backdrop=document.getElementById(prefix+'-backdrop');
    let modal=document.getElementById(prefix+'-modal');
    if(!backdrop){ backdrop=Object.assign(document.createElement('div'), { id:prefix+'-backdrop', className:'modal-backdrop' }); document.body.append(backdrop); }
    if(!modal){
      modal=Object.assign(document.createElement('div'), { id:prefix+'-modal', className:'modal tokens-modal', innerHTML:html });
      document.body.append(modal);
      backdrop.addEventListener('click', hide);
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') hide(); });
    }
    return { backdrop, modal };
  }
  function getCanEdit(){
    const { getAuth } = window.tokensAdmin;
    const { canEdit } = getAuth ? getAuth() : { canEdit:false };
    return canEdit;
  }
  function setReadonlyButtons(canEdit, buttons){
    buttons.forEach(button => { try{ if(button) button.classList.toggle('is-disabled', !canEdit); }catch(_){ } });
  }
  function readEditorPayload(editor){
    let payload;
    try{ payload= JSON.parse(editor.value); }catch(_){ toast(window.t('tokens.error.jsonInvalid')); return undefined; }
    try{ payload = stripHidden(payload); }catch(_){ }
    return payload;
  }
  async function createDocFromPayload(collection, payload, close, toastKey){
    const out = await apiJson('/tokens/create', { method:'POST', auth:true, body:{ collection, data: payload } });
    const doc = out && out.doc;
    if(doc){ try{ window.tokensAdmin.pushDocToState(collection, doc); }catch(_){ } }
    T.logChange('create', { collection, id: doc && doc._id, doc });
    close();
    try{ toast(window.t(toastKey)); }catch(_){ }
    window.tokensAdmin.renderTokensDashboard?.(false);
  }

  async function runEditorAction(canEdit, editor, action, errorKey){
    if(!canEdit){ toast(window.t('common.noPermission')); return; }
    const payload = readEditorPayload(editor);
    if(payload === undefined) return;
    try{ await action(payload); }
    catch(e){ toastError(e, errorKey); }
  }
  // 新建弹窗：懒加载构建 DOM 节点
  const createModalHtml = `<div class="modal-header"><h2 data-i18n="tokens.create.title"></h2></div><div class="modal-form"><div id="tokens-create-hints" class="tokens-hints scrollbar-hidden"></div><textarea id="tokens-create-editor" class="tokens-editor"></textarea><div id="tokens-create-actions" class="tokens-actions"><button type="button" class="btn btn--secondary" id="tokens-create-cancel" data-i18n="tokens.create.cancel"></button><button type="button" class="btn btn--primary btn--lift" id="tokens-create-submit" data-i18n="tokens.create.submit"></button></div></div>`;
  function ensureCreateModal(){
    return ensureTokenModal('tokens-create', createModalHtml, hideCreateModal);
  }
  function hideModal(prefix){
    const backdrop=document.getElementById(prefix+'-backdrop');
    const modal=document.getElementById(prefix+'-modal');
    if(backdrop) backdrop.classList.remove('show');
    if(modal) modal.classList.remove('show');
    setTimeout(()=>{
      [document.getElementById(prefix+'-backdrop'), document.getElementById(prefix+'-modal')]
        .forEach(el=>{ if(el && !el.classList.contains('show')) el.style.display='none'; });
    }, 320);
  }
  function hideCreateModal(){ hideModal('tokens-create'); }
  // 打开新建弹窗：支持变体选择 + 字段提示
  function showCreateModal(collection, shape, tpl, variants){
    const {backdrop, modal}= ensureCreateModal();
    const editor= modal.querySelector('#tokens-create-editor');
    const hints= modal.querySelector('#tokens-create-hints');
    const btnCancel= modal.querySelector('#tokens-create-cancel');
    const btnSubmit= modal.querySelector('#tokens-create-submit');
    const canEdit = getCanEdit();
    const schemeBoxId='tokens-create-variants';
    let schemeBox= modal.querySelector('#'+schemeBoxId);
    if(!schemeBox){ const form = modal.querySelector('.modal-form'); schemeBox=document.createElement('div'); schemeBox.id=schemeBoxId; schemeBox.className='tokens-scheme'; form.insertBefore(schemeBox, form.firstElementChild); }
  if(shape){ try{ const normArr=(val)=> Array.isArray(val)? val: []; const pushProtoIfEmpty=(arr, base, fields)=>{ try{ if(!Array.isArray(arr)) return arr; if(arr.length>0) return arr; const proto={}; const childPrefix=`${base}[].`; const list= Array.isArray(fields)? fields: []; list.forEach(ff=>{ if(!ff||!ff.name) return; if(ff.name.startsWith(childPrefix)){ const rel= ff.name.slice(childPrefix.length); const def= ff.default!==undefined? ff.default: (ff.type||'').toLowerCase()==='number'? 0: (ff.type||'').toLowerCase()==='boolean'? false: ''; try{ setByPath(proto, rel, def); }catch(_){} } }); if(Object.keys(proto).length===0){ proto.cn=''; proto.en=''; } arr.push(proto); return arr; }catch(_){ return arr; } }; if(collection==='term-fixed'){ tpl.part = normArr(tpl.part); tpl.part = pushProtoIfEmpty(tpl.part, 'part', shape&&shape.fields); tpl.epithet = normArr(tpl.epithet); if(Array.isArray(tpl.epithet)&&tpl.epithet.length===0) tpl.epithet.push({ cn:'' }); } else if(collection==='term-dynamic'){ tpl.part = normArr(tpl.part); tpl.part = pushProtoIfEmpty(tpl.part, 'part', shape&&shape.fields); } }catch(_){} }
    const fields = shape && Array.isArray(shape.fields)? shape.fields: [];
  function renderHintsFromVariants(curTpl, curVariants){ const pruneBySchema=(val,sch)=>{ if(!sch) return stripHidden(val); switch(sch.kind){ case 'str': case 'num': case 'bool': case 'null': case 'unknown': return val; case 'arr': { const a= Array.isArray(val)? val: []; return a.slice(0,3).map(it=> pruneBySchema(it, sch.elem)); } case 'obj': { const out={}; const keys=Object.keys(sch.fields||{}); for (const k of keys) { if (val && Object.prototype.hasOwnProperty.call(val, k)) out[k]= pruneBySchema(val[k], sch.fields[k]); } return out; } default: return val; } };
      if(curVariants && curVariants.length){ const match= curVariants.find(v=> JSON.stringify(v.tpl)===JSON.stringify(curTpl)); const hintRows = (match? match.hints: []).map(h=>{ const badge=`(${h.type})`; return `<div class="hint-row"><div class="hint-name">${esc(h.name)}</div><div class="hint-type">${esc(badge)}</div></div>`; }).join(''); let sampleHtml=''; try{ const sample= match && Array.isArray(match.samples) && match.samples[0]; if(sample){ const pruned= pruneBySchema(stripHidden(sample), match.schema); const pretty= esc(JSON.stringify(pruned, null, 2)); sampleHtml = `<div class="variant-sample"><div class="variant-sample__title" data-i18n="tokens.hints.sampleTitle"></div><pre class="variant-sample__pre">${pretty}</pre></div>`; } }catch(_){} hints.innerHTML = `<div class="hints-title"><span data-i18n="tokens.hints.title" data-i18n-params='${JSON.stringify({ name: esc(collection) })}'></span></div><div class="hints-list">${hintRows || `<span data-i18n="tokens.hints.none"></span>`}</div>${sampleHtml}`; window.i18n?.applySafe?.(hints); return; }
      const list = (fields.filter(f=> !f.name.endsWith('[]') && f.name!=='_id' && f.name!=='__v').map(f=>{ const badge=`(${f.type}${f.enum? ': '+f.enum.join('|'): ''})`; const bullet=f.required? '•':'○'; return `<div class="hint-row"><div class="hint-name">${bullet} ${esc(f.name)}</div><div class="hint-type">${esc(badge)}</div></div>`; }).join(''));
      const extra = shape && shape.suggest && shape.suggest.mixedKeys && shape.suggest.mixedKeys.length ? `<div class="hints-extra" data-i18n="tokens.hints.optionalKeys" data-i18n-params='${JSON.stringify({ keys: shape.suggest.mixedKeys.slice(0,20).join(', ') + (shape.suggest.mixedKeys.length>20?' …':'') })}'></div>`: '';
      hints.innerHTML = `<div class="hints-title"><span data-i18n="tokens.hints.listTitle" data-i18n-params='${JSON.stringify({ name: esc(collection) })}'></span></div><div class="hints-list">${list || `<span data-i18n="tokens.hints.none"></span>`}</div>${extra}`;
      window.i18n?.applySafe?.(hints);
    }
  function renderSchemeSelector(curVariants){
      if(!curVariants||curVariants.length===0){ schemeBox.innerHTML=''; schemeBox.__variants=[]; return; }
      schemeBox.__variants=curVariants;
      const groupHtml = `<div class="ui-choice-group tokens-scheme__group">${curVariants.map((v,i)=>{ const idx=i+1; const selCls=i===0? ' is-active': ''; const tab=i===0? '0':'-1'; const pressed=i===0? 'true':'false'; return `<button type="button" class="ui-choice tokens-scheme__btn${selCls}" tabindex="${tab}" aria-pressed="${pressed}" data-index="${i}"><span class="idx">${idx}</span><span class="cnt">${v.count}</span><span class="label">方案${idx}</span></button>`; }).join('')}</div>`;
      schemeBox.innerHTML=groupHtml;
      const selectIdx=(idx)=>{ try{ const variantsList= schemeBox.__variants||[]; if(!Number.isFinite(idx) || idx<0 || idx>=variantsList.length) return; const btns= Array.from(schemeBox.querySelectorAll('.tokens-scheme__btn')); btns.forEach((b,i)=>{ const on=i===idx; b.classList.toggle('is-active', on); b.setAttribute('tabindex', on? '0':'-1'); b.setAttribute('aria-pressed', on? 'true':'false'); }); schemeBox.dataset.selectedIndex= String(idx); const v= variantsList[idx]; if(v){ editor.value= JSON.stringify(v.tpl||{}, null, 2); renderHintsFromVariants(v.tpl, variantsList); } }catch(_){ } };
      if(!schemeBox.__bound){ schemeBox.__bound=true; schemeBox.addEventListener('click',(e)=>{ const btn=e.target && e.target.closest? e.target.closest('.tokens-scheme__btn'): null; if(!btn) return; const idx=Number(btn.getAttribute('data-index')); if(!Number.isFinite(idx)) return; selectIdx(idx); }); schemeBox.addEventListener('keydown',(e)=>{ const btns= Array.from(schemeBox.querySelectorAll('.tokens-scheme__btn')); if(btns.length===0) return; const cur=Number(schemeBox.dataset.selectedIndex||'0'); let next=cur; if(e.key==='ArrowRight'||e.key==='ArrowDown'){ next=(cur+1)%btns.length; e.preventDefault(); } else if(e.key==='ArrowLeft'||e.key==='ArrowUp'){ next=(cur-1+btns.length)%btns.length; e.preventDefault(); } else if(e.key==='Home'){ next=0; e.preventDefault(); } else if(e.key==='End'){ next=btns.length-1; e.preventDefault(); } else if(e.key==='Enter'||e.key===' '){ e.preventDefault(); selectIdx(cur); btns[cur].focus(); return; } else { return; } selectIdx(next); try{ btns[next].focus(); }catch(_){ } }); }
      selectIdx(0);
    }
    renderSchemeSelector(variants);
    renderHintsFromVariants(tpl, variants);
    editor.value = JSON.stringify(tpl||{}, null, 2);
  const submit= ()=> runEditorAction(canEdit, editor, payload => createDocFromPayload(collection, payload, hideCreateModal, 'tokens.toast.created'), 'tokens.error.createFailed');
  btnCancel.onclick= hideCreateModal; btnSubmit.onclick= submit;
  setReadonlyButtons(canEdit, [btnSubmit]);
    showModalAnim(backdrop, modal, editor);
  }
  // 编辑弹窗：与新建弹窗布局一致，含“另存”按钮
  const editModalHtml = `<div class="modal-header"><h2 data-i18n="tokens.edit.title"></h2></div><div class="modal-form"><div id="tokens-edit-hints" class="tokens-hints scrollbar-hidden"></div><textarea id="tokens-edit-editor" class="tokens-editor"></textarea><div class="tokens-actions"><button type="button" class="btn btn--secondary" id="tokens-edit-cancel" data-i18n="tokens.edit.cancel"></button><button type="button" class="btn btn--secondary" id="tokens-edit-saveas" data-i18n="tokens.edit.saveas"></button><button type="button" class="btn btn--primary btn--lift" id="tokens-edit-submit" data-i18n="tokens.edit.submit"></button></div></div>`;
  function ensureEditModal(){
    return ensureTokenModal('tokens-edit', editModalHtml, hideEditModal);
  }
  function hideEditModal(){ hideModal('tokens-edit'); }
  // 打开编辑弹窗：显示结构提示；保存与“另存”为新
  function openEditModal(collection, id){
    const doc= window.tokensAdmin.findDocInState(collection, id);
    if(!doc) throw new Error('未找到对象');
    const orig= stripHidden(doc);
    const {backdrop, modal}= ensureEditModal();
    const editor= modal.querySelector('#tokens-edit-editor');
    const hints= modal.querySelector('#tokens-edit-hints');
    const btnCancel= modal.querySelector('#tokens-edit-cancel');
    const btnSubmit= modal.querySelector('#tokens-edit-submit');
    const btnSaveAs= modal.querySelector('#tokens-edit-saveas');
    try{
      const schema= window.tokensAdmin.deriveSchema(orig);
      const list= window.tokensAdmin.flattenHintsFromSchema(schema).map(h=> `<div class="hint-row"><div class="hint-name">${esc(h.name)}</div><div class="hint-type">(${esc(h.type)})</div></div>`).join('');
      hints.innerHTML= `<div class="hints-title" data-i18n="tokens.hints.title" data-i18n-params='${JSON.stringify({ name: esc(collection) })}'></div><div class="hints-list">${list || `<span data-i18n="tokens.hints.none"></span>`}</div>`;
      window.i18n?.applySafe?.(hints);
    }catch(_){ hints.innerHTML=''; }
    editor.value= JSON.stringify(orig, null, 2);
    const canEdit = getCanEdit();
    const submit= ()=> runEditorAction(canEdit, editor, async next => {
        const detailed = await window.tokensAdmin.applyObjectEdits(collection, id, orig, next);
        T.logChange('save-edits', { collection, id, sets: detailed && detailed.sets, dels: detailed && detailed.dels });
        hideEditModal();
  try{ toast(window.t('status.updated')); }catch(_){ }
          window.tokensAdmin.renderTokensDashboard?.(false);
    }, 'tokens.error.updateFailed');
    const saveAs = ()=> runEditorAction(canEdit, editor, next => createDocFromPayload(collection, next, hideEditModal, 'tokens.toast.savedAs'), 'tokens.error.createFailed');
    btnCancel.onclick= hideEditModal; btnSubmit.onclick= submit; if(btnSaveAs) btnSaveAs.onclick = saveAs;
    setReadonlyButtons(canEdit, [btnSubmit, btnSaveAs]);
    showModalAnim(backdrop, modal, editor);
  }
  Object.assign(window.tokensAdmin, { showCreateModal, hideCreateModal, openEditModal, hideEditModal });

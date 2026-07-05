  const bind=(sel,handler)=>{ try{
    if(!document.__termPanelButtonDelegates) document.__termPanelButtonDelegates = new Set();
    if(document.__termPanelButtonDelegates.has(sel)) return;
    document.__termPanelButtonDelegates.add(sel);
    document.addEventListener('click', e=>{
      const target = e.target && e.target.closest ? e.target.closest(sel) : null;
      if(!target || !document.documentElement.contains(target)) return;
      if(target.tagName === 'A' && !target.getAttribute('href')) e.preventDefault();
      handler(e, target);
    });
  }catch(_){} };
  const call=(name,...args)=>{ try{ const fn=window[name]; if(!fn) return; return fn.apply(window,args); }catch(_){} };

  function syncTermPanelButtonStates(){
    try {
      const pOn = Number(window.term_status?.pronoun) === 1;
      document.querySelectorAll('.button_pronoun').forEach(btn=> ButtonUtils.applyButtonState(btn, pOn));
      pOn ? window.add_pronoun?.() : window.pronounCheck?.();

      const tOn = Number(window.term_status?.tickQuantifier) === 1;
      document.querySelectorAll('.button_tickQuantifier').forEach(btn=> ButtonUtils.applyButtonState(btn, tOn));
      ButtonUtils.toggleDisplay('tickQuantifier', tOn);
    } catch(_) {}
  }
  window.syncTermPanelButtonStates = syncTermPanelButtonStates;

  (function trackCtrlKey(){
    let down = false;
    const set = (on) => {
      if (down === on) return;
      down = on;
      document.body.classList.toggle('ctrl-down', on);
      document.documentElement.classList.toggle('ctrl-pressed', on);
    };
    window.addEventListener('keydown', (e) => { if (e.ctrlKey) set(true); }, true);
    window.addEventListener('keyup', (e) => { if (!e.ctrlKey) set(false); }, true);
    window.addEventListener('blur', () => set(false));
  })();

  whenDOMReady().then(()=>{
    whenPartialsReady().then(()=>{
      // 初始同步：根据 term_status 设置按钮颜色与页面状态，避免首次点击才加载/切换。
      syncTermPanelButtonStates();

      const pairs=[
        ['.strength_title', ()=> call('change_strength')],
        ['.button_equaling', (e,target)=> call('elementReplaceCheck','equaling','equalingHead',{ target, currentTarget: target, originalEvent: e })],
        ['.button_roundUp', (e,target)=> call('elementReplaceCheck','roundUp','roundUp',{ target, currentTarget: target, originalEvent: e })],
        ['.button_pronoun', (e,target)=> call('pronounReplaceCheck',{ target, currentTarget: target, originalEvent: e })],
        ['.button_include', (e,target)=> call('elementReplaceCheck','include','include',{ target, currentTarget: target, originalEvent: e })],
        ['.button_tickQuantifier', (e,target)=> call('elementHideCheck','tickQuantifier',{ target, currentTarget: target, originalEvent: e })]
      ];
      for(let i=0;i<pairs.length;i++) bind(pairs[i][0], pairs[i][1]);
    });
  });

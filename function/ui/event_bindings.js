(function(){
  const onReady=fn=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn();
  const bind=(sel,handler)=>{ try{ document.querySelectorAll(sel).forEach(el=> el.addEventListener('click',handler)); }catch(_){} };
  const call=(name,...args)=>{ try{ const fn=window[name]; if(!fn) return; return fn.apply(window,args); }catch(_){} };

  onReady(()=>{
    Promise.resolve(window.partialsReady).then(()=>{
      // 初始同步：根据 term_status 设置按钮颜色与页面状态，避免首次点击才加载/切换
      try {
        const pOn = Number(window.term_status?.pronoun) === 1;
        document.querySelectorAll('.button_pronoun').forEach(btn=> ButtonUtils.applyButtonState(btn, pOn));
        // 应用一次代词显示/隐藏到文档
        pOn ? (window.add_pronoun && window.add_pronoun()) : (window.pronounCheck && window.pronounCheck());

        const tOn = Number(window.term_status?.tickQuantifier) === 1;
        document.querySelectorAll('.button_tickQuantifier').forEach(btn=> ButtonUtils.applyButtonState(btn, tOn));
        ButtonUtils.toggleDisplay('tickQuantifier', tOn);
      } catch(_) {}

      const pairs=[
        ['.strength_title', ()=> call('change_strength')],
        ['.button_equaling', e=> call('elementReplaceCheck','equaling','equalingHead',e)],
        ['.button_roundUp', e=> call('elementReplaceCheck','roundUp','roundUp',e)],
        ['.button_pronoun', e=> call('pronounReplaceCheck',e)],
        ['.button_include', e=> call('elementReplaceCheck','include','include',e)],
        ['.button_tickQuantifier', e=> call('elementHideCheck','tickQuantifier',e)]
      ];
      for(let i=0;i<pairs.length;i++) bind(pairs[i][0], pairs[i][1]);
    });
  });
})();

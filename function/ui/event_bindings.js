(function(){
  const onReady=fn=> document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn();
  const bind=(sel,handler)=>{ try{ document.querySelectorAll(sel).forEach(el=> el.addEventListener('click',handler)); }catch(_){} };
  const call=(name,...args)=>{ try{ const fn=window[name]; if(!fn) return; return fn.apply(window,args); }catch(_){} };

  onReady(()=>{
    Promise.resolve(window.partialsReady).then(()=>{
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

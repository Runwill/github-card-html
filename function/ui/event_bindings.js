(function(){
  var onReady=function(fn){ document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', fn, { once:true }) : fn(); };
  var bind=function(sel, handler){ try{ document.querySelectorAll(sel).forEach(function(el){ el.addEventListener('click', handler); }); }catch(_){} };
  var call=function(name){ try{ var fn=window[name]; if(!fn) return; return fn.apply(window, Array.prototype.slice.call(arguments,1)); }catch(_){} };

  onReady(function(){
    (window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve()).then(function(){
      var pairs=[
        ['.strength_title', function(){ call('change_strength'); }],
        ['.button_equaling', function(e){ call('elementReplaceCheck','equaling','equalingHead',e); }],
        ['.button_roundUp', function(e){ call('elementReplaceCheck','roundUp','roundUp',e); }],
        ['.button_pronoun', function(e){ call('pronounReplaceCheck',e); }],
        ['.button_include', function(e){ call('elementReplaceCheck','include','include',e); }],
        ['.button_tickQuantifier', function(e){ call('elementHideCheck','tickQuantifier',e); }]
      ];
      for(var i=0;i<pairs.length;i++) bind(pairs[i][0], pairs[i][1]);
    });
  });
})();

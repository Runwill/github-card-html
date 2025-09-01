(function(){
  function onReady(fn){
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  function bind(selector, handler){
    try {
      document.querySelectorAll(selector).forEach(function(el){
        el.addEventListener('click', handler);
      });
    } catch(_) {}
  }

  onReady(function(){
    var ready = window.partialsReady instanceof Promise ? window.partialsReady : Promise.resolve();
    ready.then(function(){
    // 强度切换
    bind('.strength_title', function(){
      try { if (window.change_strength) window.change_strength(); } catch(_) {}
    });

    // 等号（equaling）
    bind('.button_equaling', function(event){
      try { if (window.elementReplaceCheck) window.elementReplaceCheck('equaling', 'equalingHead', event); } catch(_) {}
    });

    // 向上取整（roundUp）
    bind('.button_roundUp', function(event){
      try { if (window.elementReplaceCheck) window.elementReplaceCheck('roundUp', 'roundUp', event); } catch(_) {}
    });

    // 代词（pronoun）
    bind('.button_pronoun', function(event){
      try { if (window.pronounReplaceCheck) window.pronounReplaceCheck(event); } catch(_) {}
    });

    // include
    bind('.button_include', function(event){
      try { if (window.elementReplaceCheck) window.elementReplaceCheck('include', 'include', event); } catch(_) {}
    });

    // tickQuantifier 显隐
    bind('.button_tickQuantifier', function(event){
      try { if (window.elementHideCheck) window.elementHideCheck('tickQuantifier', event); } catch(_) {}
    });
    });
  });
})();

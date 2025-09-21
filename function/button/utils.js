// 通用按钮与DOM工具，减少重复逻辑
(function(global){
  // 统一设置按钮颜色：true=Blue(开)，false=Red(关)
  function applyButtonState(btn, isOn){
    if(!btn) return;
    btn.classList.remove('button_color_blue','button_color_red');
    btn.classList.add(isOn ? 'button_color_blue' : 'button_color_red');
  }

  // 显隐工具（支持 NodeList/HTMLCollection/Element/选择器）
  function toggleDisplay(target, show){
    const nodes = typeof target === 'string' ? document.querySelectorAll(target)
                : (target && typeof target.length === 'number' && !target.tagName ? target : [target]);
    for (let i = 0; i < (nodes ? nodes.length : 0); i++){
      const el = nodes[i]; if(el && el.style) el.style.display = show ? 'inline' : 'none';
    }
  }

  // 标签替换：仅更换标签名，保留内容
  function replaceTag(nameFrom, nameTo, scope){
    (scope||document).querySelectorAll(nameFrom).forEach(function(el){
      const neo=document.createElement(nameTo); neo.innerHTML=el.innerHTML; el.parentNode && el.parentNode.replaceChild(neo, el);
    });
  }

  // 轻量缓存：term-dynamic
  let termDynamicCache=null;
  async function getTermDynamic(url){
    const ep=url || (window.endpoints && endpoints.termDynamic ? endpoints.termDynamic() : '/api/term-dynamic');
    if(termDynamicCache) return termDynamicCache;
    const res=await fetch(ep); termDynamicCache=await res.json(); return termDynamicCache;
  }

  global.ButtonUtils = { applyButtonState, toggleDisplay, replaceTag, getTermDynamic };
})(window);

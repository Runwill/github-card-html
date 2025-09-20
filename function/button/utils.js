// 通用按钮与DOM工具，减少重复逻辑
(function(global){
  // 颜色样式工具
  function resetButtonColor(btn){ if(!btn) return; btn.classList.remove('button_color_blue'); btn.classList.remove('button_color_red'); }
  function setButtonBlue(btn){ if(!btn) return; resetButtonColor(btn); btn.classList.add('button_color_blue'); }
  function setButtonRed(btn){ if(!btn) return; resetButtonColor(btn); btn.classList.add('button_color_red'); }

  // 显隐工具（支持 NodeList 或选择器）
  function toggleDisplay(target, show){
    const list = typeof target === 'string' ? document.querySelectorAll(target) : target;
    if(!list) return;
    list.forEach ? list.forEach(el => { el.style.display = show ? 'inline' : 'none'; }) : null;
  }

  // 标签替换工具：将所有 nameFrom 标签替换为 nameTo（仅元素名更改，保留 innerHTML）
  function replaceTag(nameFrom, nameTo, scope){
    const root = scope || document;
    const nodes = root.querySelectorAll(nameFrom);
    nodes.forEach(function(el){
      const newEl = document.createElement(nameTo);
      newEl.innerHTML = el.innerHTML;
      el.parentNode && el.parentNode.replaceChild(newEl, el);
    });
  }

  // 轻量缓存：term-dynamic
  let termDynamicCache = null;
  async function getTermDynamic(url){
    const endpoint = url || 'http://localhost:3000/api/term-dynamic';
    if(termDynamicCache) return termDynamicCache;
    const res = await fetch(endpoint);
    const data = await res.json();
    termDynamicCache = data;
    return data;
  }

  // 导出到全局
  global.ButtonUtils = {
    resetButtonColor,
    setButtonBlue,
    setButtonRed,
    toggleDisplay,
    replaceTag,
    getTermDynamic
  };
})(window);

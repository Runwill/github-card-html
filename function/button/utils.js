// 通用按钮与DOM工具，减少重复逻辑
(function(global){
  // 颜色样式工具
  function resetButtonColor(btn){ if(!btn) return; btn.classList.remove('button_color_blue', 'button_color_red'); }
  function setButtonBlue(btn){ if(!btn) return; resetButtonColor(btn); btn.classList.add('button_color_blue'); }
  function setButtonRed(btn){ if(!btn) return; resetButtonColor(btn); btn.classList.add('button_color_red'); }

  // 根据布尔状态统一设置按钮颜色：true=Blue(开启)，false=Red(关闭)
  function applyButtonState(btn, isOn){ if(!btn) return; resetButtonColor(btn); (isOn ? setButtonBlue : setButtonRed)(btn); }

  // 显隐工具（支持 NodeList 或选择器）
  function toggleDisplay(target, show){
    const nodes = (function(t){
      if(!t) return [];
      if (typeof t === 'string') return document.querySelectorAll(t) || [];
      // NodeList / HTMLCollection
      if (typeof t.length === 'number' && typeof t !== 'function' && !t.tagName) return t;
      // Single Element or similar
      return [t];
    })(target);
    // Iterate robustly over possible array-like collections
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el && el.style) el.style.display = show ? 'inline' : 'none';
    }
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
    const endpoint = url || (window.endpoints && endpoints.termDynamic ? endpoints.termDynamic() : '/api/term-dynamic');
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
    applyButtonState,
    toggleDisplay,
    replaceTag,
    getTermDynamic
  };
})(window);

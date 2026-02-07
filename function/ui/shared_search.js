;(function(){
  // 一个在“将池页”和“技能页”之间共享的搜索输入框
  // 行为约定：
  // - 仅在将池页触发筛选（调用 window.filterParagraphs 若存在）
  // - 技能页目前只展示输入框，不触发筛选逻辑（后续再接入）
  // - 输入框是同一个 DOM，会在两个面板之间移动，输入值保持不丢失

  const createSearchBox = () => {
    const container = document.createElement('div');
    container.className = 'search-container';

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'search-input';
    input.placeholder = '检索';
    input.autocomplete = 'off';

    // 仅当当前位于“将池页”时才真正触发筛选
    input.addEventListener('input', () => {
        try {
          if (isInCharacterPanel()) {
            window.filterParagraphs && window.filterParagraphs();
          } else if (isInSkillPanel()) {
            window.filterSkills && window.filterSkills();
          }
        } catch(_) { /* ignore */ }
    });

    container.appendChild(input);
    return container;
  };

  const isInCharacterPanel = () => {
    // 如果搜索框挂在将池面板内则认为在将池页
    return !!document.querySelector('#panel_character .search-container');
  };
    const isInSkillPanel = () => {
      // 如果搜索框挂在技能面板内则认为在技能页
      return !!document.querySelector('#panel_skill .search-container');
    };

  let searchContainer = null;
  let mountedPanel = null; // '#panel_character' | '#panel_skill'

  function ensureSearchOnce() {
    if (!searchContainer) {
      searchContainer = createSearchBox();
      attachAnimation(searchContainer);
    }
  }

  function attachAnimation(container){
    const input = container.querySelector('#search-input');
    let isFocused = false, isShowingAnimation = false, isDropped = false, timers = [];
    const clear = () => { timers.forEach(t => clearTimeout(t)); timers = []; };
    const lift  = () => { input.classList.add('is-lifted'); isDropped = false; };
    const drop  = () => { input.classList.remove('is-lifted'); isDropped = true; };
    const show  = () => { clear(); isShowingAnimation = true; lift(); timers.push(
      setTimeout(() => { input.classList.add('is-shown') }, 200),
      setTimeout(() => { isShowingAnimation = false; if (isFocused) drop() }, 1200)
    ); };
    const hide  = () => {
      if (!isFocused) {
        clear(); isShowingAnimation = false;
        const delay = isDropped ? 200 : 0; if (isDropped) lift();
        timers.push(
          setTimeout(() => { input.classList.remove('is-shown') }, delay),
          setTimeout(drop, 1200)
        );
      }
    };
    container.addEventListener('mouseenter', () => { if (!isFocused) show() });
    container.addEventListener('mouseleave', hide);
    input.addEventListener('focus', () => { isFocused = true; if (!isShowingAnimation) drop() });
    input.addEventListener('blur',  () => { isFocused = false; hide() });
  }

  function mountToPanel(panelSelector){
    ensureSearchOnce();
    if (mountedPanel === panelSelector) return; // already mounted
    const panel = document.querySelector(panelSelector);
    if (!panel) return;

    // 放在面板内靠前位置；若存在 #block-under-search 则插在其上方
    const under = panel.querySelector('#block-under-search');
    if (under && under.parentElement) {
      under.parentElement.insertBefore(searchContainer, under);
    } else {
      // 默认插入到内容容器顶部
      const target = panel.querySelector('.standardCharactersBlock, .standardCharacterSkillsBlock, padding') || panel;
      if (target.firstChild) target.insertBefore(searchContainer, target.firstChild);
      else target.appendChild(searchContainer);
    }
      mountedPanel = panelSelector;

      // 面板切换时，用当前关键词立即应用一次筛选
      try {
        if (panelSelector === '#panel_character') {
          window.filterParagraphs && window.filterParagraphs();
        } else if (panelSelector === '#panel_skill') {
          window.filterSkills && window.filterSkills();
        }
      } catch(_) { /* ignore */ }
  }

  // 当切换页签时，将同一个搜索框移动过去
  function setupTabSync(){
    const nav = document.getElementById('example-tabs');
    if (!nav) return;
    nav.addEventListener('click', (e)=>{
      const a = e.target.closest('a.title-a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (href === '#panel_character') {
        requestAnimationFrame(()=> mountToPanel('#panel_character'));
      } else if (href === '#panel_skill') {
        requestAnimationFrame(()=> mountToPanel('#panel_skill'));
      }
    }, true);
  }

  // 初始：默认挂到将池面板（若存在），否则挂到技能面板
  function init(){
    ensureSearchOnce();
    if (document.querySelector('#panel_character')) {
      mountToPanel('#panel_character');
    } else if (document.querySelector('#panel_skill')) {
      mountToPanel('#panel_skill');
    }
    setupTabSync();
  }

  // 等待 partials 注入完成
  if (window.partialsReady && typeof window.partialsReady.then === 'function') {
    window.partialsReady.then(init);
  } else {
    // 兜底
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // 简单的“将池页”筛选：根据输入内容隐藏/显示 <characterParagraph>
  // 通用筛选工厂：根据关键词隐藏/显示匹配元素，可选处理相邻节点
  function makeFilter(selector, afterToggle) {
    return function() {
      try {
        const input = document.getElementById('search-input');
        if (!input) return;
        const kw = String(input.value || '').trim().toLowerCase();
        const items = document.querySelectorAll(selector);
        if (!items.length) return;
        items.forEach(el => {
          const show = !kw || (el.textContent || el.innerText || '').toLowerCase().includes(kw);
          el.style.display = show ? '' : 'none';
          if (afterToggle) afterToggle(el, show);
        });
      } catch(_){}
    };
  }

  function toggleTrailingBrs(row, show) {
    let n = row.nextSibling, count = 0;
    while (n && count < 2) {
      if (n.nodeType === 1 && n.nodeName === 'BR') { n.style.display = show ? '' : 'none'; count++; }
      if (n.nodeType === 1 && n.classList && n.classList.contains('skill-row')) break;
      n = n.nextSibling;
    }
  }

  window.filterParagraphs = makeFilter('#panel_character .standardCharactersBlock .characterParagraph');
  window.filterSkills = makeFilter('#panel_skill .standardCharacterSkillsBlock .skill-row', toggleTrailingBrs);

})();

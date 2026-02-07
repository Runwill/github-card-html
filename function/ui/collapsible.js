// panel_term 面板的折叠式标题
// - 在 #panel_term 内的 H1/H2/H3 前添加切换按钮（小三角）
// - 将标题后连续的兄弟块（indent/padding 等）包裹进可折叠容器
// - 默认状态：H1/H2 展开，H3 收起

(function () {
  const PANEL_ID = 'panel_term';
  const HEADING_TAGS = ['H1', 'H2', 'H3'];

  function getLevel(el) {
    const t = el.tagName;
    if (t === 'H1') return 1;
    if (t === 'H2') return 2;
    if (t === 'H3') return 3;
    return 99;
  }

  function isHeading(el) {
    return el && HEADING_TAGS.includes(el.tagName);
  }

  function nextElement(el) {
    // 跳过文本节点等非元素节点，返回下一个元素节点
    let n = el.nextSibling;
    while (n && n.nodeType !== 1) n = n.nextSibling;
    return n;
  }

  function collectSectionSiblings(startHeading) {
    const level = getLevel(startHeading);
    const items = [];
    let cur = nextElement(startHeading);
    while (cur) {
      if (isHeading(cur) && getLevel(cur) <= level) break;
      items.push(cur);
      cur = nextElement(cur);
    }
    return items;
  }

  // 仅识别“术语段落”相关的块，避免把无关元素（如首页的固定按钮容器）也包裹进去
  function isSectionContentNode(n) {
    if (!n || n.nodeType !== 1) return false;
    if (isHeading(n)) return false;
    const tag = (n.tagName || '').toLowerCase();
    // panel_term 中用于内容结构的自定义标签/类
    if (tag === 'padding') return true;
    if (n.classList && (n.classList.contains('indent') || n.classList.contains('h'))) return true;
    // 容器型节点，内部包含上述内容时也允许（例如某些生成的包裹层）
    if (n.querySelector && n.querySelector('padding, .indent, .h')) return true;
    return false;
  }

  function hasLowerOrSameHeading(nodes, currentLevel) {
    // 若该标题段内存在层级 >= 当前层级的后代标题（即同级或更低级标题），则返回 true
    for (const n of nodes) {
      if (isHeading(n) && getLevel(n) >= currentLevel) return true;
      if (n.querySelector) {
        // 按需优化选择器（仅匹配同级及更低级的标题）
        let selector = '';
        if (currentLevel <= 1) selector = 'h1, h2, h3';
        else if (currentLevel === 2) selector = 'h2, h3';
        else selector = 'h3';
        if (selector && n.querySelector(selector)) return true;
      }
    }
    return false;
  }

  function ensureButton(h, content, index) {
    // 避免重复创建按钮
    if (h.querySelector('.collapsible__toggle')) return h.querySelector('.collapsible__toggle');

    const btn = document.createElement('button');
    btn.className = 'collapsible__toggle';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'true');
  // 添加下拉小三角图标
    const icon = document.createElement('span');
    icon.className = 'collapsible__chevron';
    icon.textContent = '▾';
    btn.appendChild(icon);

    // 生成唯一ID用于存储状态
    // 优先使用标题文本，如果文本为空(可能尚未渲染)，则使用索引
    let titleText = h.textContent.trim();
    // 移除可能已存在的按钮文本对 textContent 的影响(虽然 insertBefore 在后，但防万一)
    // 这里简单处理：如果文本为空，使用索引
    const storageKey = titleText ? ('term_panel_collapse_' + titleText) : ('term_panel_collapse_idx_' + index);

  // 插入到标题内容最前面
    h.insertBefore(btn, h.firstChild);

    // 恢复保存的状态
    const savedState = localStorage.getItem(storageKey);
    if (savedState === 'collapsed') {
      // 无动画直接收起
      content.style.height = '0px';
      content.style.overflow = 'hidden';
      content.classList.add('is-collapsed');
      content.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.add('is-collapsed');
    }

    btn.addEventListener('click', () => {
      if (content.classList.contains('is-collapsed')) {
        expandSection(content, btn);
        localStorage.setItem(storageKey, 'expanded');
      } else {
        collapseSection(content, btn);
        localStorage.setItem(storageKey, 'collapsed');
      }
    });

    // 仅允许点击图标触发折叠；点击标题文字不触发
    h.addEventListener('click', (e) => {
      if (!e.target.closest('.collapsible__toggle')) return;
      // Click on the toggle icon will be handled by the button listener
    });

    return btn;
  }

  function wrapContent(nodes) {
    const wrapper = document.createElement('div');
    wrapper.className = 'collapsible__content';
    if (nodes.length && nodes[0].parentNode) {
      const parent = nodes[0].parentNode;
      parent.insertBefore(wrapper, nodes[0]);
      nodes.forEach(n => wrapper.appendChild(n));
    }
    return wrapper;
  }

  function setup(container) {
    const headings = Array.from(container.querySelectorAll('h1, h2, h3'));
    if (!headings.length) return false;

    // 按 DOM 顺序处理
    headings.forEach((h, index) => {
      // 收集当前标题后属于该段落的兄弟节点
      const sectionNodesAll = collectSectionSiblings(h);
      // 过滤仅保留 panel_term 的“段落内容”节点，避免误包裹到其他页面的按钮/容器，造成遮挡
      const sectionNodes = sectionNodesAll.filter(isSectionContentNode);
      if (!sectionNodes.length) return; // 无可折叠内容

      const lvl = getLevel(h);
  // 仅在该段内容内存在“同级或更低级标题”时，才添加折叠容器（否则折叠没有意义）
  if (!hasLowerOrSameHeading(sectionNodes, lvl)) return;

      const wrapper = wrapContent(sectionNodes);
      const btn = ensureButton(h, wrapper, index);

      // 默认：全部展开（不加 'is-collapsed'）
    });

    return true;
  }

  function onTransitionEnd(e, el) {
    if (e.propertyName !== 'height') return;
    // 展开完成后，将高度改为 auto 以适配内容动态变化
    if (!el.classList.contains('is-collapsed')) {
      el.style.height = 'auto';
      // 展开完成后允许可见溢出，避免内容被裁剪
      el.style.overflow = '';
    }
    el.removeEventListener('transitionend', el._collapseTEnd);
    el._collapseTEnd = null;
  }

  function prepareTransition(el, fromHeight) {
    el.style.height = fromHeight + 'px';
    void el.offsetHeight;
    el.style.overflow = 'hidden';
    el._collapseTEnd && el.removeEventListener('transitionend', el._collapseTEnd);
    el._collapseTEnd = (ev) => onTransitionEnd(ev, el);
    el.addEventListener('transitionend', el._collapseTEnd);
  }

  function collapseSection(el, btn) {
    prepareTransition(el, el.scrollHeight);
    el.style.height = '0px';
    el.classList.add('is-collapsed');
    el.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.add('is-collapsed');
  }

  function expandSection(el, btn) {
    el.classList.remove('is-collapsed');
    prepareTransition(el, 0);
    el.style.height = el.scrollHeight + 'px';
    el.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.remove('is-collapsed');
  }


  function tryInit() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      // 面板尚未注入（data-include 仍在加载），监听 body，待出现后再初始化
      const bodyObserver = new MutationObserver(() => {
        const p = document.getElementById(PANEL_ID);
        if (p) {
          bodyObserver.disconnect();
          initOnPanel(p);
        }
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
      return;
    }
    initOnPanel(panel);
  }

  function initOnPanel(panel) {
    const container = panel.querySelector('main') || panel;
    if (!container) return;

    if (setup(container)) return;

    // 若标题内容尚未注入面板（include_loader 异步），监听变更并在就绪后初始化一次
    const mo = new MutationObserver(() => {
      if (setup(container)) {
        mo.disconnect();
      }
    });
    mo.observe(container, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();

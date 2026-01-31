(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * 安全地更新 DOM 元素，防止覆盖由外部脚本（如 i18n, highlight 等）修改过的 DOM。
     * 核心机制：使用 data-render-key 进行脏检查，避免不必要的 innerHTML 赋值。
     * 
     * @param {HTMLElement} element - 目标 DOM 元素
     * @param {string} content - 要设置的新内容 (HTML 或 纯文本)
     * @param {string|null} uniqueKey - 可选。用于判断内容是否变更的唯一键。如果不传，则回退到内容直接对比（不推荐用于 HTML）。
     * @param {boolean} isText - 是否作为 textContent 处理。默认为 false (innerHTML)。
     * @returns {boolean} - 如果执行了更新返回 true，否则返回 false
     */
    function safeRender(element, content, uniqueKey = null, isText = false) {
        if (!element) return false;

        // 策略 1: 基于 Key 的检查 (优先)
        // 这里的逻辑保持不变：如果提供了 Key 且 Key 没变，则绝对不更新
        if (uniqueKey !== null) {
            const currentKey = element.getAttribute('data-render-key');
            if (currentKey === String(uniqueKey)) {
                return false; 
            }
        }

        // 策略 2: 基于上次渲染值的缓存对比 (改进版)
        // 我们不对比 element.innerHTML (因为它可能被高亮脚本污染)，
        // 而是对比 element.__lastRenderedContent (上次无论是通过 Key 还是内容更新写入的原始值)。
        // 这样可以确保：即使 DOM 结构被变成了 <span class="highlight">...</span>，只要业务数据 content 没变，我们就不会覆盖它。
        if (element.__lastRenderedContent === content) {
            // 如果 Key 变了但内容碰巧没变，我们需要更新 Key 属性，但不需要重写 DOM 内容
            if (uniqueKey !== null && element.getAttribute('data-render-key') !== String(uniqueKey)) {
                 element.setAttribute('data-render-key', uniqueKey);
            }
            return false;
        }

        // --- 执行更新 ---
        
        if (isText) {
            element.textContent = content;
        } else {
            element.innerHTML = content;
        }

        // 更新状态记录
        element.__lastRenderedContent = content; // 记录"影子"状态
        
        if (uniqueKey !== null) {
            element.setAttribute('data-render-key', uniqueKey);
        }
        
        return true;
    }

    /**
     * 批量安全渲染列表
     * 复用元素并进行脏检查
     */
    function safeRenderList(container, items, renderItemFn, keyFn) {
        if (!container) return;
        const currentChildren = Array.from(container.children);
        
        items.forEach((item, index) => {
            let el = currentChildren[index];
            if (!el) {
                el = document.createElement('div'); // 默认 div，可优化
                container.appendChild(el);
            }
            const key = keyFn(item, index);
            const content = renderItemFn(item, index);
            
            // 假设列表项总是 HTML
            safeRender(el, content, key);
        });

        // 移除多余
        while (container.children.length > items.length) {
            container.removeChild(container.lastChild);
        }
    }

    window.Game.UI.safeRender = safeRender;
    // window.Game.UI.safeRenderList = safeRenderList; // 暂不需要，具体列表逻辑较复杂

    /**
     * 获取元素真实的布局 Rect (忽略 Transform 动画的影响)
     * 用于在 FLIP 动画或拖拽计算中获取元素的“最终/目前”所占位置，而非视觉位置。
     */
    function getLayoutRect(el) {
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const transform = style.transform;
        
        if (transform && transform !== 'none') {
            // 解析 matrix(a, b, c, d, tx, ty)
            const match = transform.match(/matrix\((.+)\)/);
            if (match) {
                const values = match[1].split(',').map(parseFloat);
                if (values.length >= 6) {
                    const tx = values[4];
                    const ty = values[5];
                    // 视觉位置 = 布局位置 + transform
                    // 布局位置 = 视觉位置 - transform
                    return {
                        left: rect.left - tx,
                        top: rect.top - ty,
                        right: rect.right - tx,
                        bottom: rect.bottom - ty,
                        width: rect.width,
                        height: rect.height,
                        // 兼容 x, y
                        x: rect.left - tx,
                        y: rect.top - ty
                    };
                }
            }
        }
        return rect;
    }

    /**
     * 复制计算后的关键样式属性
     * 用于克隆体 (Ghost) 或 测量元素
     */
    function copyStyles(source, target) {
        if (!source || !target) return;
        const computed = window.getComputedStyle(source);
        const properties = [
            'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 
            'color', 'textAlign', 'letterSpacing', 'textShadow'
        ];
        properties.forEach(prop => target.style[prop] = computed[prop]);
        target.style.boxSizing = 'border-box';
    }

    window.Game.UI.getLayoutRect = getLayoutRect;
    window.Game.UI.copyStyles = copyStyles;
})();

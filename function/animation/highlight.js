/**
 * 统一的高亮动画函数库
 * 提供一致的高亮效果和过渡动画
 */

// 高亮动画配置
const HIGHLIGHT_CONFIG = {
    HIGHLIGHT_DURATION: '0.15s',  // 高亮应用速度
    REMOVE_DURATION: '0.4s',      // 取消高亮速度
    EASE_TYPE: 'ease'             // 缓动类型
}

/**
 * 全局高亮注册表
 * 用于追踪当前活跃的高亮元素，并在元素被移除DOM时强制执行清理逻辑
 */
const ActiveHighlightRegistry = {
    items: new Set(), // Set<{ element: HTMLElement, cleanup: Function }>
    
    add(element, cleanup) {
        for (const item of this.items) {
            if (item.element === element) return;
        }
        this.items.add({ element, cleanup });
    },
    
    remove(element) {
        for (const item of this.items) {
            if (item.element === element) {
                this.items.delete(item);
                break;
            }
        }
    }
};

// 全局 MutationObserver 监听节点移除
if (window.MutationObserver) {
    const observer = new MutationObserver((mutations) => {
        if (ActiveHighlightRegistry.items.size === 0) return;

        mutations.forEach((mutation) => {
            if (mutation.removedNodes.length > 0) {
                mutation.removedNodes.forEach((removedNode) => {
                    if (removedNode.nodeType === 1) {
                        for (const item of ActiveHighlightRegistry.items) {
                            if (removedNode === item.element || (removedNode.contains && removedNode.contains(item.element))) {
                                try {
                                    item.cleanup(item.element);
                                } catch (e) { 
                                    console.error('Highlight cleanup failed for detached element', e); 
                                }
                                ActiveHighlightRegistry.items.delete(item);
                            }
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.documentElement, { childList: true, subtree: true });
}

/**
 * 统一的高亮应用函数
 * 在暗色主题下会对高亮颜色进行亮度反转（保持色相/饱和度），以获得更好的对比度
 * @param {string|jQuery} selector - 选择器或jQuery对象
 * @param {string} color - 高亮颜色
 */
function applyHighlight(selector, color) {
    // 在暗色模式反转亮度（依赖 ColorUtils），未加载则保持原色
    try {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        if (isDark && color && window.ColorUtils && typeof window.ColorUtils.invertColor === 'function') {
            color = window.ColorUtils.invertColor(color, { mode: 'luma', output: 'auto' })
        }
    } catch (e) { /* 忽略安全失败，继续使用原色 */ }

    $(selector).css({
        'background-color': color,
        'transition': `background-color ${HIGHLIGHT_CONFIG.HIGHLIGHT_DURATION} ${HIGHLIGHT_CONFIG.EASE_TYPE}`
    })
}

/**
 * 统一的高亮清除函数
 * @param {string|jQuery} selector - 选择器或jQuery对象
 */
function removeHighlight(selector) {
    $(selector).css({
        'background-color': '',
        'transition': `background-color ${HIGHLIGHT_CONFIG.REMOVE_DURATION} ${HIGHLIGHT_CONFIG.EASE_TYPE}`
    })
}

/**
 * 为元素添加标准的mouseover和mouseout高亮效果
 * @param {jQuery} element - jQuery元素对象
 * @param {string} color - 高亮颜色
 * @param {string} scrollSelector - 滚动区域对应的选择器
 */
function addStandardHighlight(element, color, scrollSelector) {
    $(element).each(function() {
        const el = this;
        
        const performCleanup = () => {
            removeHighlight(el);
            removeHighlight(scrollSelector);
        };

        $(el).mouseover(function(event) {
            applyHighlight(this, color);
            applyHighlight(scrollSelector, color);
            
            ActiveHighlightRegistry.add(this, () => {
                performCleanup();
                ActiveHighlightRegistry.remove(this);
            });
        }).mouseout(function(event) {
            performCleanup();
            ActiveHighlightRegistry.remove(this);
        });
    });
}

/**
 * 术语高亮函数（从term.js迁移过来）
 * @param {Object} term - 术语数据
 * @param {HTMLElement} element - DOM元素
 * @param {string} mode - 模式：'', 'divided', 'part'
 */
function termHighlight(term, element, mode='') {
    const HIGHLIGHT_OPACITY = '60'

    function getHighlightColor(baseColor) {
        return baseColor ? `${baseColor}${HIGHLIGHT_OPACITY}` : ''
    }

    const performCleanup = (target) => {
        const currentTerm = term[target.i]
        if (!currentTerm) {
             removeHighlight(target);
             return;
        }

        if(mode=='divided'){
            currentTerm.part.forEach((part) => {
                const enSelector = part.en
                removeHighlight($(element).children(enSelector))
                removeHighlight(`${currentTerm.en}.scroll ${enSelector}`)
            })
        }else if(mode=='part'){
            const currentPart = currentTerm?.part[target.j]
            if (currentPart) {
                removeHighlight(`${currentPart.en}.scroll`)
            }
        }else{
            removeHighlight(target)
            removeHighlight(`${currentTerm.en}.scroll`)
            
            if ($(target).hasClass('highlight') || currentTerm.highlight) {
                const containerType = $(target).closest('pronounScope').length > 0 
                    ? 'pronounScope' 
                    : 'padding'
                
                const specialHighlightElements = $(target).closest(containerType).find(currentTerm.en)
                removeHighlight(specialHighlightElements)
            }
        }
    };

    $(element).mouseover((event) => {
        const target = event.currentTarget
        
        // 注册 Cleanup
        ActiveHighlightRegistry.add(target, (el) => performCleanup(el));

        const currentTerm = term[target.i]
        
        if(mode=='divided'){
            currentTerm.part.forEach((part) => {
                const enSelector = part.en
                const color = part.termedPart 
                    ? (part.color || currentTerm.color) + '60'
                    : currentTerm.color
                
                applyHighlight($(element).children(enSelector), color)
                applyHighlight(`${currentTerm.en}.scroll ${enSelector}`, color)
            })
        }else if(mode=='part'){
            const currentPart = currentTerm?.part[target.j]
            const highlightColor = getHighlightColor(currentPart.color || currentTerm.color)
            
            applyHighlight(`${currentPart.en}.scroll`, highlightColor)
        }else{
            applyHighlight(target, currentTerm.color)
            applyHighlight(`${currentTerm.en}.scroll`, currentTerm.color)
            
            if ($(target).hasClass('highlight') || currentTerm.highlight) {
                const containerType = $(target).closest('pronounScope').length > 0 
                    ? 'pronounScope' 
                    : 'padding'
                
                const specialHighlightElements = $(target).closest(containerType).find(currentTerm.en)
                applyHighlight(specialHighlightElements, "#fddfdf")
            }
        }
    }).mouseout((event) => {
        const target = event.currentTarget
        performCleanup(target);
        ActiveHighlightRegistry.remove(target);
    })
}

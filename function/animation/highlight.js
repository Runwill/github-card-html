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
 * 典雅主题辅助：将颜色混入 20% 金色 (#d3ad6b)，使高亮带有暖金色调
 * 支持 hex / rgb / rgba 输入，输出保持原格式
 */
function _blendWithGold(color) {
    try {
        const ratio = 0.2 // 金色混入比例
        const gold = { r: 211, g: 173, b: 107 }
        let r, g, b, a = 1, isRgba = false
        if (color.startsWith('rgba')) {
            const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)
            if (!m) return color
            r = +m[1]; g = +m[2]; b = +m[3]; a = m[4] != null ? +m[4] : 1; isRgba = true
        } else if (color.startsWith('rgb')) {
            const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/)
            if (!m) return color
            r = +m[1]; g = +m[2]; b = +m[3]
        } else if (color.startsWith('#')) {
            const hex = color.length === 4
                ? color[1]+color[1]+color[2]+color[2]+color[3]+color[3]
                : color.slice(1,7)
            r = parseInt(hex.slice(0,2),16); g = parseInt(hex.slice(2,4),16); b = parseInt(hex.slice(4,6),16)
            if (color.length === 9) a = parseInt(color.slice(7,9),16) / 255
        } else { return color }
        r = Math.round(r * (1 - ratio) + gold.r * ratio)
        g = Math.round(g * (1 - ratio) + gold.g * ratio)
        b = Math.round(b * (1 - ratio) + gold.b * ratio)
        if (isRgba || a < 1) return `rgba(${r},${g},${b},${a})`
        return `rgb(${r},${g},${b})`
    } catch(_) { return color }
}

/**
 * 全局高亮注册表
 * 用于追踪当前活跃的高亮元素，并在元素被移除DOM时强制执行清理逻辑
 */
const ActiveHighlightRegistry = {
    items: new Map(), // Map<HTMLElement, Function>
    add(element, cleanup) { this.items.set(element, cleanup); },
    remove(element) { this.items.delete(element); }
};

// 全局 MutationObserver 监听节点移除
if (window.MutationObserver) {
    const observer = new MutationObserver((mutations) => {
        if (ActiveHighlightRegistry.items.size === 0) return;

        mutations.forEach((mutation) => {
            if (mutation.removedNodes.length > 0) {
                mutation.removedNodes.forEach((removedNode) => {
                    if (removedNode.nodeType === 1) {
                        for (const [el, cleanup] of ActiveHighlightRegistry.items) {
                            if (removedNode === el || (removedNode.contains && removedNode.contains(el))) {
                                try { cleanup(el); } catch (e) { console.error('Highlight cleanup failed for detached element', e); }
                                ActiveHighlightRegistry.items.delete(el);
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
        const theme = document.documentElement.getAttribute('data-theme')
        const isDark = theme === 'dark' || theme === 'elegant'
        if (isDark && color && window.ColorUtils && typeof window.ColorUtils.invertColor === 'function') {
            color = window.ColorUtils.invertColor(color, { mode: 'luma', output: 'auto' })
            // 典雅主题：将反转后的颜色混入金色调，使高亮与主题和谐
            if (theme === 'elegant') {
                color = _blendWithGold(color)
            }
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
    // divided 模式：对每个 part 执行 fn(enSelector, color)
    const eachDivided = (currentTerm, fn) => {
        currentTerm.part.forEach((part) => {
            fn(part.en, part.termedPart ? (part.color || currentTerm.color) + '60' : currentTerm.color)
        })
    }

    const performCleanup = (target) => {
        const currentTerm = term[target.i]
        if (!currentTerm) { removeHighlight(target); return; }

        if(mode=='divided'){
            eachDivided(currentTerm, (sel) => {
                removeHighlight($(element).children(sel))
                removeHighlight(`${currentTerm.en}.scroll ${sel}`)
            })
        }else if(mode=='part'){
            const currentPart = currentTerm?.part[target.j]
            if (currentPart) removeHighlight(`${currentPart.en}.scroll`)
        }else{
            removeHighlight(target)
            removeHighlight(`${currentTerm.en}.scroll`)
            if ($(target).hasClass('highlight') || currentTerm.highlight) {
                const containerType = $(target).closest('pronounScope').length > 0 ? 'pronounScope' : 'padding'
                removeHighlight($(target).closest(containerType).find(currentTerm.en))
            }
        }
    };

    $(element).mouseover((event) => {
        const target = event.currentTarget
        ActiveHighlightRegistry.add(target, (el) => performCleanup(el));
        const currentTerm = term[target.i]

        if(mode=='divided'){
            eachDivided(currentTerm, (sel, color) => {
                applyHighlight($(element).children(sel), color)
                applyHighlight(`${currentTerm.en}.scroll ${sel}`, color)
            })
        }else if(mode=='part'){
            const currentPart = currentTerm?.part[target.j]
            applyHighlight(`${currentPart.en}.scroll`, (currentPart.color || currentTerm.color) + '60')
        }else{
            applyHighlight(target, currentTerm.color)
            applyHighlight(`${currentTerm.en}.scroll`, currentTerm.color)
            if ($(target).hasClass('highlight') || currentTerm.highlight) {
                const containerType = $(target).closest('pronounScope').length > 0 ? 'pronounScope' : 'padding'
                applyHighlight($(target).closest(containerType).find(currentTerm.en), "#fddfdf")
            }
        }
    }).mouseout((event) => {
        const target = event.currentTarget
        performCleanup(target);
        ActiveHighlightRegistry.remove(target);
    })
}

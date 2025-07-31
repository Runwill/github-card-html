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
 * 统一的高亮应用函数
 * @param {string|jQuery} selector - 选择器或jQuery对象
 * @param {string} color - 高亮颜色
 */
function applyHighlight(selector, color) {
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
    element.mouseover(function(event) {
        applyHighlight(this, color)
        applyHighlight(scrollSelector, color)
    }).mouseout(function(event) {
        removeHighlight(this)
        removeHighlight(scrollSelector)
    })
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

    $(element).mouseover((event) => {
        const target = event.currentTarget
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
        const currentTerm = term[target.i]
        
        if(mode=='divided'){
            currentTerm.part.forEach((part) => {
                const enSelector = part.en
                removeHighlight($(element).children(enSelector))
                removeHighlight(`${currentTerm.en}.scroll ${enSelector}`)
            })
        }else if(mode=='part'){
            const currentPart = currentTerm?.part[target.j]
            removeHighlight(`${currentPart.en}.scroll`)
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
    })
}

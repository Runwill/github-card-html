/**
 * 统一给一组 jQuery 元素绑定：
 * - 文本已写入后，附加双击滚动 onDblclick
 * - 标准高亮 addStandardHighlight
 *
 * 参数：
 * - $elements: jQuery 集合
 * - options: {
 *     onDblclick: (evt, el) => void,
 *     // 生成滚动选择器（二选一）：
 *     getScrollSelector?: (el) => string,
 *     scrollSelector?: string,
 *     // 高亮颜色（可静态或按元素动态）
 *     highlightColor?: string,
 *     getHighlightColor?: (el) => string
 *   }
 */
function bindDblclickAndHighlight($elements, options){
  const onDblclick = options && typeof options.onDblclick === 'function' ? options.onDblclick : null
  const getScrollSelector = options && typeof options.getScrollSelector === 'function' ? options.getScrollSelector : null
  const fixedScrollSelector = options && typeof options.scrollSelector === 'string' ? options.scrollSelector : null
  const fixedColor = options && typeof options.highlightColor === 'string' ? options.highlightColor : null
  const getColor = options && typeof options.getHighlightColor === 'function' ? options.getHighlightColor : null

  $elements.each(function(){
    const el = this
    if (onDblclick) {
      $(el).on('dblclick', function(evt){
        evt.stopPropagation()
        onDblclick(evt, el)
      })
    }
    const selector = getScrollSelector ? getScrollSelector(el) : fixedScrollSelector
    const color = getColor ? getColor(el) : fixedColor
    if (selector) addStandardHighlight($(el), color || '', selector)
  })
}

// 暴露到全局，保持与现有模块风格一致
window.bindDblclickAndHighlight = bindDblclickAndHighlight

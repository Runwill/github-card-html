/* 行高亮条（贯穿屏幕宽度，元素同高）：淡入→停留→淡出 */
(function(global){
  function highlightRowAtElement(elem, opts){
    if (!elem) return function(){}
    const rect = elem.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0
    const elemTop = rect.top + scrollTop
    let height = Math.max(24, elem.offsetHeight || Math.ceil(rect.height) || 24)

    // 颜色与时长（可通过 opts 覆写）
    const baseColor = (opts && opts.rowColor) || '#2196f3' // 透明主题蓝
  const alpha = (opts && typeof opts.rowAlpha === 'number') ? opts.rowAlpha : 0.1
    const rgba = `rgba(${parseInt(baseColor.slice(1,3),16)}, ${parseInt(baseColor.slice(3,5),16)}, ${parseInt(baseColor.slice(5,7),16)}, ${alpha})`
    const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fadeIn = (opts && typeof opts.rowFadeIn === 'number') ? opts.rowFadeIn : (prefersReduce ? 0 : 400)
    const hold   = (opts && typeof opts.rowHold   === 'number') ? opts.rowHold   : (prefersReduce ? 0 : 400)
    const fadeOut= (opts && typeof opts.rowFadeOut=== 'number') ? opts.rowFadeOut: (prefersReduce ? 0 : 600)

    // 清理现有覆盖层，避免叠加
    const prev = document.getElementById('row-highlight-overlay')
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev)

    const overlay = document.createElement('div')
    overlay.id = 'row-highlight-overlay'

    // 基础样式由 CSS 提供，这里设置动态值
    Object.assign(overlay.style, {
      top: `${elemTop}px`,
      height: `${height}px`,
      background: rgba,
      opacity: '0',
      transition: fadeIn ? `opacity ${fadeIn}ms ease-out` : 'none'
    })

    document.body.appendChild(overlay)

    // 触发淡入
    void overlay.offsetHeight
    requestAnimationFrame(() => { overlay.style.opacity = '1' })

    // 计划淡出：在淡入结束 + 停留后开始
    const startFadeOutAfter = fadeIn + hold
    const fadeOutTimer = setTimeout(() => {
      if (!overlay.parentNode) return
      overlay.style.transition = fadeOut ? `opacity ${fadeOut}ms ease-out` : 'none'
      void overlay.offsetHeight
      overlay.style.opacity = '0'
      const removeDelay = fadeOut ? fadeOut + 80 : 0
      setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay) }, removeDelay)
    }, startFadeOutAfter)

    // 返回移除函数，供取消时调用
    return function removeOverlay(){
      clearTimeout(fadeOutTimer)
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
    }
  }

  global.rowHighlight = Object.assign(global.rowHighlight || {}, {
    highlightRowAtElement
  })
})(window)

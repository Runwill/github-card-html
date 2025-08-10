/*
 * 统一滚动与闪烁高亮工具
 * 用于在切换 Tab 后滚动到目标并执行淡入淡出提示
 */
(function(global){
  function selectTab(panelId){
    try {
      if (window.$) {
        $("#example-tabs").foundation('selectTab', panelId, 1)
      }
    } catch(e) {
      // 忽略 Foundation 不存在的情况
    }
  }

  function centerOffsetFor(elem){
    const rect = elem.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0
    const elemTop = rect.top + scrollTop
    const elemHeight = elem.offsetHeight || rect.height
    const winH = window.innerHeight || document.documentElement.clientHeight
    return Math.max(0, elemTop - (winH/2) + (elemHeight/2))
  }

  function performScroll(targetElem, opts){
    if (!targetElem) return
    const behavior = (opts && opts.behavior) || 'smooth'
    if (opts && opts.center) {
      // 居中滚动
      const top = centerOffsetFor(targetElem)
      window.scrollTo({ top, behavior })
    } else {
      // 原生滚动至可视区
      try { targetElem.scrollIntoView({ behavior }) } catch(e) { targetElem.scrollIntoView() }
    }
  }

  function performFlash($elements, opts){
    if (!$elements || !$elements.length) return
    const stopOngoing = !!(opts && opts.stop)
    $elements.each(function(){
      const $el = $(this)
      if (stopOngoing) $el.stop(true)
      $el.fadeTo(200, 0).fadeTo(1000, 1)
    })
  }

  function commonFlow(panelId, $matches, opts){
    selectTab(panelId)

    // 选择第一个可滚动的目标进行滚动（避免多次滚动抖动）
    let scrollTarget = null
    $matches.each(function(){
      const el = this
      if (!el.classList || !el.classList.contains('fadeOnly')) {
        if (!scrollTarget) scrollTarget = el
      }
    })

    if (scrollTarget) performScroll(scrollTarget, opts)
    performFlash($matches, opts)
  }

  // 根据选择器
  function scrollToSelectorAndFlash(panelId, selector, opts){
    const $matches = $(selector)
    if ($matches && $matches.length) commonFlow(panelId, $matches, opts)
  }

  // 根据 className（匹配 .scroll 中包含该 class 的元素）
  function scrollToClassAndFlash(panelId, className, opts){
    const $matches = $(`.scroll.${className}`)
    if ($matches && $matches.length) commonFlow(panelId, $matches, opts)
  }

  // 根据标签名（自定义标签支持），tagSelector 例如 'move'、'draw' 等
  function scrollToTagAndFlash(panelId, tagSelector, opts){
    const tag = (tagSelector || '').trim()
    if (!tag) return
    const $matches = $(`.scroll`).filter(function(){
      return this.tagName && this.tagName.toLowerCase() === tag.toLowerCase()
    })
    if ($matches && $matches.length) commonFlow(panelId, $matches, opts)
  }

  // 根据最近容器居中（用于武将容器等），centerSelector 可选
  function scrollToClassWithCenter(panelId, className, centerSelector, opts){
    const $matches = $(`.scroll.${className}`)
    if (!$matches || !$matches.length) return

    selectTab(panelId)

    let scrollTarget = null
    $matches.each(function(){
      const el = this
      if (!el.classList || !el.classList.contains('fadeOnly')) {
        if (!scrollTarget) {
          const container = centerSelector ? $(el).closest(centerSelector)[0] : el
          scrollTarget = container || el
        }
      }
    })

    if (scrollTarget) performScroll(scrollTarget, Object.assign({}, opts, { center: true }))
    performFlash($matches, opts)
  }

  // 暴露到全局
  global.scrollActions = {
    selectTab,
    scrollToSelectorAndFlash,
    scrollToClassAndFlash,
    scrollToTagAndFlash,
    scrollToClassWithCenter
  }
})(window)

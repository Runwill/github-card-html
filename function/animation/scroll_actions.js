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

  // 计算元素居中的滚动位置，可附加偏移（默认稍微下移）
  function centerOffsetFor(elem, bias = 0){
    const rect = elem.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0
    const elemTop = rect.top + scrollTop
    const elemHeight = elem.offsetHeight || rect.height
    const winH = window.innerHeight || document.documentElement.clientHeight
    return Math.max(0, elemTop - (winH/2) + (elemHeight/2) + (Number.isFinite(bias) ? bias : 0))
  }

  // 解析偏移：优先 opts.centerBias（数值，px），其次 CSS 变量 --scroll-center-bias（支持 px/vh/%），否则默认 48px（略偏下）
  function resolveCenterBias(opts){
    if (opts && typeof opts.centerBias === 'number' && Number.isFinite(opts.centerBias)) return opts.centerBias
    try {
      const raw = getComputedStyle(document.documentElement).getPropertyValue('--scroll-center-bias').trim()
      if (raw) {
        if (raw.endsWith('px')) return parseFloat(raw)
        if (raw.endsWith('vh')) return (window.innerHeight || document.documentElement.clientHeight) * (parseFloat(raw)/100)
        if (raw.endsWith('%')) return (window.innerHeight || document.documentElement.clientHeight) * (parseFloat(raw)/100)
        const num = parseFloat(raw)
        if (Number.isFinite(num)) return num
      }
    } catch(e) { /* 忽略 */ }
    return 48 // 默认向下偏移 48 像素
  }

  // 监听滚动结束（无进一步滚动的静默期）后回调
  function onScrollSettled(callback, settleDelay = 150, maxWait = 1500){
    if (typeof callback !== 'function') return
    let timer = null
    let deadline = null
    const handler = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        window.removeEventListener('scroll', handler, { passive: true })
        if (deadline) clearTimeout(deadline)
        callback()
      }, settleDelay)
    }
    window.addEventListener('scroll', handler, { passive: true })
    // 兜底：最长等待 maxWait 毫秒
    deadline = setTimeout(() => {
      window.removeEventListener('scroll', handler, { passive: true })
      if (timer) clearTimeout(timer)
      callback()
    }, maxWait)
    // 立即触发一次，确保即便没有滚动事件也能在 settleDelay 后回调
    handler()
  }

  // 在文档内容中绘制一条贯穿屏幕宽度、与元素同高的位置高亮条（相对文本静止）：淡入→停留→淡出
  function highlightRowAtElement(elem, opts){
    if (!elem) return
    const rect = elem.getBoundingClientRect()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0
    const elemTop = rect.top + scrollTop
    // 使用元素自身高度（最低 24px），并保持随内容滚动
    let height = Math.max(24, elem.offsetHeight || Math.ceil(rect.height) || 24)

  // 颜色与时长
    const baseColor = (opts && opts.rowColor) || '#2196f3' // 主题蓝
    const alpha = (opts && typeof opts.rowAlpha === 'number') ? opts.rowAlpha : 0.2
    const rgba = `rgba(${parseInt(baseColor.slice(1,3),16)}, ${parseInt(baseColor.slice(3,5),16)}, ${parseInt(baseColor.slice(5,7),16)}, ${alpha})`
    const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fadeIn = (opts && typeof opts.rowFadeIn === 'number') ? opts.rowFadeIn : (prefersReduce ? 0 : 400)
    const hold = (opts && typeof opts.rowHold === 'number') ? opts.rowHold : (prefersReduce ? 0 : 400)
    const fadeOut = (opts && typeof opts.rowFadeOut === 'number') ? opts.rowFadeOut : (prefersReduce ? 0 : 600)

    // 清理现有覆盖层，避免叠加
    const prev = document.getElementById('row-highlight-overlay')
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev)

    const overlay = document.createElement('div')
    overlay.id = 'row-highlight-overlay'
    Object.assign(overlay.style, {
      position: 'absolute', // 绝对定位，相对文档流滚动
      left: '0',
      right: '0',
      top: `${elemTop}px`,
      height: `${height}px`,
      background: rgba,
      pointerEvents: 'none',
      zIndex: '2147483647',
      opacity: '0', // 从 0 开始以实现淡入
      transition: fadeIn ? `opacity ${fadeIn}ms ease-out` : 'none',
      willChange: (fadeIn || fadeOut) ? 'opacity' : 'auto'
    })
    document.body.appendChild(overlay)

    // 触发淡入
    void overlay.offsetHeight // 强制回流以保证过渡生效
    requestAnimationFrame(() => { overlay.style.opacity = '1' })

    // 计划淡出：在淡入结束 + 停留后开始
    const startFadeOutAfter = fadeIn + hold
    setTimeout(() => {
      if (!overlay.parentNode) return
      if (fadeOut) {
        overlay.style.transition = `opacity ${fadeOut}ms ease-out`
      } else {
        overlay.style.transition = 'none'
      }
      void overlay.offsetHeight
      overlay.style.opacity = '0'
      const removeDelay = fadeOut ? fadeOut + 80 : 0
      setTimeout(() => { if (overlay.parentNode) overlay.parentNode.removeChild(overlay) }, removeDelay)
    }, startFadeOutAfter)
  }

  // 执行滚动：默认改为居中；若需顶部对齐，可传 opts.center === false
  function performScroll(targetElem, opts){
    if (!targetElem) return
    const behavior = (opts && opts.behavior) || 'smooth'
    const center = (opts && Object.prototype.hasOwnProperty.call(opts, 'center')) ? !!opts.center : true
    if (center) {
      // 居中滚动
      const bias = resolveCenterBias(opts)
      const top = centerOffsetFor(targetElem, bias)
      window.scrollTo({ top, behavior })
    } else {
      // 顶部对齐（仅在显式 center:false 时）
      try { targetElem.scrollIntoView({ behavior }) } catch(e) { targetElem.scrollIntoView() }
    }
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
    // 滚动结束后，给目标位置打一条蓝色贯穿屏幕的高亮条
    const enableRowHighlight = !(opts && opts.highlightRow === false)
    if (scrollTarget && enableRowHighlight) {
      const behavior = (opts && opts.behavior) || 'smooth'
      const fire = () => highlightRowAtElement(scrollTarget, opts)
      if (behavior === 'smooth') {
        onScrollSettled(fire)
      } else {
        // 非平滑滚动基本为即时完成
        fire()
      }
    }
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
    // 滚动结束后行高亮
    const enableRowHighlight = !(opts && opts.highlightRow === false)
    if (scrollTarget && enableRowHighlight) {
      const behavior = (opts && opts.behavior) || 'smooth'
      const fire = () => highlightRowAtElement(scrollTarget, opts)
      if (behavior === 'smooth') {
        onScrollSettled(fire)
      } else {
        fire()
      }
    }
  }

  // 暴露到全局
  global.scrollActions = {
    scrollToSelectorAndFlash,
    scrollToClassAndFlash,
    scrollToTagAndFlash,
  scrollToClassWithCenter,
  // 内部使用的高亮函数不再暴露
  }
})(window)

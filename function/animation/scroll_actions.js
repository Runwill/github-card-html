/*
 * 统一滚动与闪烁高亮工具
 * 用于在切换 Tab 后滚动到目标并执行淡入淡出提示
 */
  // 记录当前进行中的滚动+高亮操作，便于在切换 panel 时取消
  let __currentOp = null;
  let __opSeq = 0;

  function cancelCurrentOp(){
    const op = __currentOp;
    __currentOp = null;
    if (!op) return;
    try { op.settle && op.settle.cancel(); } catch(_) {}
    try { op.removeOverlay && op.removeOverlay(); } catch(_) {}
    window.scrollTo({ top: window.scrollY, left: 0, behavior: 'instant' });
  }
  function selectTab(panelId){
    try {
      if (window.TabsUI?.selectPanel?.(panelId)) return;
    } catch(e) {
      // fall back to Foundation below
    }
    try {
      if (window.$) {
        $("#main-tabs").foundation('selectTab', panelId, 1)
      }
    } catch(e) {
      // 忽略 Foundation 不存在的情况
    }
  }

  // 计算元素居中的滚动位置，可附加偏移（默认稍微下移）
  function centerOffsetFor(elem, bias = 0){
    var flScroll = document.getElementById('fl-scroll')
    var elemTop, elemHeight, winH

    if (flScroll && window.__flOffsetTopTo) {
      // 强制横屏：getBoundingClientRect 返回旋转后的屏幕坐标，不可用
      // 改用 offsetTop 链计算元素在滚动容器中的绝对位置
      elemTop = window.__flOffsetTopTo(elem, flScroll)
      elemHeight = elem.offsetHeight
      winH = flScroll.clientHeight
    } else {
      const rect = elem.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0
      elemTop = rect.top + scrollTop
      elemHeight = elem.offsetHeight || rect.height
      winH = window.innerHeight || document.documentElement.clientHeight
    }
    return Math.max(0, elemTop - (winH/2) + (elemHeight/2) + (Number.isFinite(bias) ? bias : 0))
  }

  function viewportHeight(){ return window.innerHeight || document.documentElement.clientHeight }

  function parseScrollLength(raw, allowPercent){
    if (!raw) return null
    if (raw.endsWith('px')) return parseFloat(raw)
    if (raw.endsWith('vh') || (allowPercent && raw.endsWith('%'))) return viewportHeight() * (parseFloat(raw)/100)
    const num = parseFloat(raw)
    return Number.isFinite(num) ? num : null
  }

  function readScrollLengthVar(name, allowPercent){
    try { return parseScrollLength(getComputedStyle(document.documentElement).getPropertyValue(name).trim(), allowPercent) }
    catch(e) { return null }
  }

  // 解析偏移：优先 opts.centerBias（数值，px），其次 CSS 变量 --scroll-center-bias（支持 px/vh/%），否则默认 48px（略偏下）
  function resolveCenterBias(opts){
    if (opts && typeof opts.centerBias === 'number' && Number.isFinite(opts.centerBias)) return opts.centerBias
    const cssValue = readScrollLengthVar('--scroll-center-bias', true)
    if (cssValue != null) return cssValue
    return 48 // 默认向下偏移 48 像素
  }

  // 解析最大滚动距离上限：优先 opts.maxScrollDistance，其次 CSS 变量 --max-scroll-distance（支持 px/vh），否则默认 2×视口高度
  function resolveMaxScrollDistance(opts){
    if (opts && typeof opts.maxScrollDistance === 'number' && Number.isFinite(opts.maxScrollDistance)) return opts.maxScrollDistance
    const cssValue = readScrollLengthVar('--max-scroll-distance', false)
    if (cssValue != null) return cssValue
    return viewportHeight() * 4  // 默认 4 倍视口高度
  }

  // 带距离上限的滚动：若距离超过上限，先瞬移至上限距离处，再平滑滚动剩余距离
  function cappedScrollTo(targetY, behavior){
    behavior = behavior || 'smooth'
    targetY = Math.max(0, targetY)
    const currentY = window.scrollY || window.pageYOffset || 0
    const maxDist = resolveMaxScrollDistance()
    const distance = Math.abs(targetY - currentY)
    if (distance > maxDist) {
      const jumpY = (targetY > currentY)
        ? (targetY - maxDist)   // 向下滚：跳到目标上方 maxDist 处
        : (targetY + maxDist)   // 向上滚：跳到目标下方 maxDist 处
      const safeJump = Math.max(0, jumpY)
      // 必须用 behavior:'instant' 覆盖 CSS 的 scroll-behavior:smooth
      window.scrollTo({ top: safeJump, left: 0, behavior: 'instant' })
      // 等一帧让浏览器完成瞬移后的绘制，避免平板端未栅格化瓦片闪烁黑屏
      requestAnimationFrame(function(){
        window.scrollTo({ top: targetY, behavior: behavior })
      })
      return
    }
    window.scrollTo({ top: targetY, behavior: behavior })
  }

  // 监听滚动结束（无进一步滚动的静默期）后回调
  // 默认等待时间由 150ms 调整为 50ms（原来的 1/3）
  function onScrollSettled(callback, settleDelay = 50, maxWait = 1500){
    if (typeof callback !== 'function') return { cancel: function(){} }
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
    return {
      cancel: function(){
        try {
          window.removeEventListener('scroll', handler, { passive: true })
          if (timer) clearTimeout(timer)
          if (deadline) clearTimeout(deadline)
        } catch(_) {}
      }
    }
  }

  // 判断当前激活的 panel 是否为指定 panelId（支持传入 '#id' 或 'id'）
  function isPanelActive(panelId){
    try {
      return window.TabsUI?.isPanelActive?.(panelId) ?? true
    } catch(e) { return true }
  }

  function finishPanelEnterAnimation(panelId){
    try {
      const id = String(panelId || '').replace(/^#/, '')
      const panel = id ? document.getElementById(id) : null
      if (panel) window.textAnimationController?.finishAnimations?.(panel)
    } catch(_) {}
  }

  // “文本进场动画”的固定时长（毫秒），用于延迟高亮出现时间
  // 说明：按当前样式约定取 600ms，不再做动态读取；若用户开启减少动态则为 0。
  function textEnterDurationMs(){
    try { if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0 } catch(_) {}
    return 600
  }

  const highlightRowAtElement = (elem, opts)=> window.rowHighlight?.highlightRowAtElement?.(elem, opts) || function(){}

  // 执行滚动：默认改为居中；若需顶部对齐，可传 opts.center === false
  // switching 为 true 时（跨面板跳转），应用滚动距离上限
  function performScroll(targetElem, opts, switching){
    if (!targetElem) return
    const behavior = (opts && opts.behavior) || 'smooth'
    const center = (opts && Object.prototype.hasOwnProperty.call(opts, 'center')) ? !!opts.center : true
    if (center) {
      const top = centerOffsetFor(targetElem, resolveCenterBias(opts))
      if (switching) cappedScrollTo(top, behavior)
      else window.scrollTo({ top, behavior })
      return
    }
    if (switching) {
      const rect = targetElem.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0
      cappedScrollTo(rect.top + scrollTop, behavior)
      return
    }
    try { targetElem.scrollIntoView({ behavior }) } catch(e) { targetElem.scrollIntoView() }
  }

  // 内部抽象：调度高亮条显示（管理延迟与生命周期）
  function scheduleRowHighlight(scrollTarget, panelId, switching, opts) {
    const enableRowHighlight = !(opts && opts.highlightRow === false)
    if (!scrollTarget || !enableRowHighlight) return
      const behavior = (opts && opts.behavior) || 'smooth'
      const myOpId = ++__opSeq
      const fire = () => {
        // 被取消或 panel 已切换则不再执行
        if (!__currentOp || __currentOp.id !== myOpId) return
        if (!isPanelActive(panelId)) return
        const remover = highlightRowAtElement(scrollTarget, opts)
        if (__currentOp && __currentOp.id === myOpId) {
          __currentOp.removeOverlay = remover
        } else {
          try { remover && remover() } catch(_) {}
        }
      }
      if (behavior === 'smooth') {
        const sd = (opts && typeof opts.rowSettleDelay === 'number') ? opts.rowSettleDelay : (switching ? textEnterDurationMs() : undefined)
        const settleCtrl = onScrollSettled(fire, sd)
        __currentOp = { id: myOpId, panelId, settle: settleCtrl, removeOverlay: null }
      } else {
        const remover = (isPanelActive(panelId)) ? (highlightRowAtElement(scrollTarget, opts) || null) : null
        __currentOp = { id: ++__opSeq, panelId, settle: { cancel: function(){} }, removeOverlay: remover }
      }
  }

  // 内部抽象：执行核心滚动动作序列
  // 包括：状态重置、切换 Tab、展开折叠、滚动、高亮
  function executeScrollAction(panelId, scrollTarget, opts) {
    if (!scrollTarget) return

    // 1. 每次新操作前取消旧操作
    cancelCurrentOp()

    // 2. 切换 Tab (并判断是否跨面板)
    const switching = panelId ? !isPanelActive(panelId) : false
    // 跨面板时设置标记，告知 panel_scroll_memory 跳过恢复（后续由 performScroll 接管滚动）
    if (switching) window.__scrollActionActive = true
    selectTab(panelId)
    if (switching) finishPanelEnterAnimation(panelId)
    if (switching) window.__scrollActionActive = false

    // 3. 展开路径上的折叠区域
    try { expandCollapsibleAncestorsIfNeeded(scrollTarget) } catch(_) {}

    // 强制浏览器重排布局，确保新面板已完成渲染，后续滚动能正确生效
    void document.documentElement.scrollHeight
    // 4. 执行滚动（跨面板时启用距离上限）
    performScroll(scrollTarget, opts, switching)

    // 5. 调度高亮
    scheduleRowHighlight(scrollTarget, panelId, switching, opts)
  }

  function findFirstTarget($matches, closestSelector){
    let target = null
    $matches.each(function(){
      if (!this.classList || !this.classList.contains('fadeOnly')) {
        target = closestSelector ? ($(this).closest(closestSelector)[0] || this) : this
        return false
      }
    })
    return target
  }

  function commonFlow(panelId, $matches, opts){
    const scrollTarget = findFirstTarget($matches, opts && opts.closestContainer)
    if (scrollTarget) executeScrollAction(panelId, scrollTarget, opts)
  }

  // 展开目标元素到 panel_term 的路径上所有被折叠的 collapsible 节点，然后再滚动
  function expandCollapsibleAncestorsIfNeeded(elem){
    try {
      const panel = document.getElementById('panel_term')
      if (!panel || !elem || !panel.contains(elem)) return
      let node = elem
      while (node && node !== panel) {
        if (node.classList && node.classList.contains('collapsible__content') && node.classList.contains('is-collapsed')) {
          // 立刻展开（无动画），以便正确计算滚动位置
          node.classList.remove('is-collapsed')
          node.style.height = 'auto'
          // 同步更新对应按钮状态（按钮在 wrapper 前一个兄弟节点的 heading 内）
          const heading = node.previousElementSibling
          const btn = heading && heading.querySelector && heading.querySelector('.collapsible__toggle')
          if (btn) btn.classList.remove('is-collapsed')
        }
        node = node.parentElement
      }
    } catch(_) {}
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
    if ($matches && $matches.length) commonFlow(panelId, $matches, Object.assign({}, opts, { center: true, closestContainer: centerSelector }))
  }

  function applyTokenLocator(locator, opts){
    if (!locator || typeof locator !== 'object') return false
    const method = locator.method
    if (method === 'tag') {
      scrollToTagAndFlash(locator.panelId, locator.key, opts)
      return true
    }
    if (method === 'selector') {
      scrollToSelectorAndFlash(locator.panelId, locator.selector, opts)
      return true
    }
    if (method === 'class') {
      scrollToClassAndFlash(locator.panelId, locator.className, opts)
      return true
    }
    if (method === 'classWithCenter') {
      scrollToClassWithCenter(locator.panelId, locator.className, locator.centerSelector, opts)
      return true
    }
    return false
  }

  function readStartupTokenLocator(){
    try {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('tokenLocator')
      return raw ? JSON.parse(raw) : null
    } catch(e) {
      return null
    }
  }

  function clearStartupTokenLocator(){
    try {
      const url = new URL(window.location.href)
      if (!url.searchParams.has('tokenLocator')) return
      url.searchParams.delete('tokenLocator')
      window.history.replaceState(window.history.state, document.title, url.pathname + url.search + url.hash)
    } catch(e) {}
  }

  function waitForReplacementsReady(){
    return new Promise(resolve => {
      let tries = 0
      const tick = () => {
        const ready = window.replacementsReady
        if (ready && typeof ready.then === 'function') {
          Promise.resolve(ready).catch(()=>{}).then(resolve)
          return
        }
        if (tries >= 100) {
          resolve()
          return
        }
        tries += 1
        setTimeout(tick, 50)
      }
      tick()
    })
  }

  function scheduleStartupTokenLocator(){
    const locator = readStartupTokenLocator()
    if (!locator) return
    const run = () => {
      waitForReplacementsReady().then(() => {
        requestAnimationFrame(() => {
          applyTokenLocator(locator, { behavior: 'smooth', stop: true })
          clearStartupTokenLocator()
        })
      })
    }
    if (typeof window.whenReady === 'function') {
      window.whenReady(run).catch(run)
    } else {
      run()
    }
  }

  // 暴露到全局
  const TOKEN_DETAIL_CHANNEL = 'card-html-token-detail'

  function runTokenLocator(locator){
    if (!locator) return
    waitForReplacementsReady().then(() => {
      requestAnimationFrame(() => {
        applyTokenLocator(locator, { behavior: 'smooth', stop: true })
      })
    })
  }

  function focusAfterReturnTargetReady(){
    requestAnimationFrame(() => {
      try { window.focus() } catch(_) {}
    })
  }

  function primeReturnPanel(panelId){
    if (!panelId) return
    const switching = !isPanelActive(panelId)
    if (switching) window.__scrollActionActive = true
    selectTab(panelId)
    if (switching) finishPanelEnterAnimation(panelId)
    if (switching) window.__scrollActionActive = false
  }

  function sendTokenDetailReturnAck(data, reply){
    if (!data || !data.requestId || typeof reply !== 'function') return
    try {
      reply({
        source: TOKEN_DETAIL_CHANNEL,
        type: 'return-ack',
        requestId: data.requestId
      })
    } catch(_) {}
  }

  function handleTokenDetailMessage(data, reply){
    if (!data || data.source !== TOKEN_DETAIL_CHANNEL) return false
    if (data.type === 'return-ack') return false
    if (data.type === 'back') {
      primeReturnPanel(data.panelId || 'panel_tokens')
      focusAfterReturnTargetReady()
      sendTokenDetailReturnAck(data, reply)
      return true
    }
    if (data.type === 'source') {
      focusAfterReturnTargetReady()
      sendTokenDetailReturnAck(data, reply)
      return true
    }
    if (data.type === 'locator') {
      primeReturnPanel(data.locator && data.locator.panelId)
      focusAfterReturnTargetReady()
      sendTokenDetailReturnAck(data, reply)
      runTokenLocator(data.locator)
      return true
    }
    return false
  }

  function bindTokenDetailReturnChannel(){
    try {
      window.addEventListener('message', function(ev){
        if (ev.origin && ev.origin !== 'null' && ev.origin !== window.location.origin) return
        handleTokenDetailMessage(ev.data, function(ack){
          const targetOrigin = ev.origin && ev.origin !== 'null' ? ev.origin : '*'
          try { ev.source && ev.source.postMessage(ack, targetOrigin) } catch(_) {}
        })
      })
    } catch(_) {}
    try {
      if (!('BroadcastChannel' in window)) return
      const channel = new BroadcastChannel(TOKEN_DETAIL_CHANNEL)
      channel.onmessage = function(ev){
        handleTokenDetailMessage(ev.data, function(ack){ channel.postMessage(ack) })
      }
    } catch(_) {}
  }

  window.scrollActions = {
    scrollToSelectorAndFlash,
    scrollToClassAndFlash,
    scrollToTagAndFlash,
    scrollToClassWithCenter,
    applyTokenLocator,
    cancel: cancelCurrentOp,
    cappedScrollTo,
    resolveMaxScrollDistance,
  }

  // 监听活动 panel 变化：若与当前操作目标不一致，则取消当前操作
  try {
    const root = document;
    const mo = new MutationObserver(function(){
      try {
        const activeId = window.TabsUI?.getActivePanelId?.() || null
        if (__currentOp && activeId && __currentOp.panelId && activeId !== (__currentOp.panelId[0]==='#' ? __currentOp.panelId.slice(1) : __currentOp.panelId)) {
          cancelCurrentOp()
        }
      } catch(_) {}
    })
    mo.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] })
  } catch(_) {}

  bindTokenDetailReturnChannel()
  scheduleStartupTokenLocator()

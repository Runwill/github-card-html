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
// 轻量 JSON 缓存，避免相同 URL 重复请求
const __jsonCache = new Map()
function fetchJsonCached(url, options){
  const cacheMode = options && options.cache
  const bypassCache = cacheMode === 'no-cache' || cacheMode === 'reload' || cacheMode === 'no-store'
  if (!bypassCache && __jsonCache.has(url)) return __jsonCache.get(url)
  const p = fetch(url, options).then(r => {
    if (!r.ok) throw new Error('HTTP '+r.status+' for '+url)
    return r.json()
  })
  .catch(err => { __jsonCache.delete(url); throw err })
  if (cacheMode !== 'no-store') __jsonCache.set(url, p)
  return p
}

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
    if (selector) window.addStandardHighlight?.($(el), color || '', selector)
  })
}

const TOKEN_DETAIL_CLICK_DELAY = 420

function tokenDetailText(key, fallback, params){
  try {
    if (typeof window.t === 'function') return window.t(key, params)
  } catch(_) {}
  return String(fallback || '').replace(/\{(\w+)\}/g, function(_, name){
    return params && params[name] != null ? params[name] : ''
  })
}

function tokenDetailSourcePanel(el){
  try {
    const panel = el && el.closest ? el.closest('.tabs-panel[id]') : null
    const id = panel && panel.id ? panel.id : (window.TabsUI?.getActivePanelId?.() || '')
    return /^panel_[A-Za-z0-9_-]+$/.test(String(id || '')) ? String(id) : ''
  } catch(_) {
    return ''
  }
}

function buildTokenDetailUrl(collection, id, options){
  const q = new URLSearchParams()
  q.set('collection', String(collection || ''))
  q.set('id', String(id || ''))
  const sourcePanel = options && typeof options === 'object' ? String(options.sourcePanel || options.panelId || '') : ''
  if (/^panel_[A-Za-z0-9_-]+$/.test(sourcePanel)) q.set('sourcePanel', sourcePanel)
  return 'token_detail.html?' + q.toString()
}

function openTokenDetail(collection, id, options){
  if (!collection || !id) return false
  const url = buildTokenDetailUrl(collection, id, options)
  const opened = window.open(url, '_blank')
  if (!opened) window.location.href = url
  return true
}

function resolveTokenDetailRef(source, el){
  const value = typeof source === 'function' ? source(el) : source
  if (!value || typeof value !== 'object') return null
  const collection = String(value.collection || '').trim()
  const id = String(value.id || value._id || '').trim()
  if (!collection || !id) return null
  return { collection, id }
}

function clearTokenDetailTimer(el){
  if (!el || !el.__tokenDetailClickTimer) return
  clearTimeout(el.__tokenDetailClickTimer)
  el.__tokenDetailClickTimer = null
}

function nestedInteractiveTarget(el, target){
  if (!target || !target.closest) return false
  const interactive = target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="button"]')
  return !!(interactive && interactive !== el && (el.contains(interactive) || interactive.contains(el)))
}

function selectionTouches(el){
  try {
    const sel = window.getSelection && window.getSelection()
    if (!sel || sel.isCollapsed) return false
    return el.contains(sel.anchorNode) || el.contains(sel.focusNode)
  } catch(_) {
    return false
  }
}

function programDebugOwnsInteraction(el){
  try {
    return !!(document.querySelector('#program-debug-panel:not([hidden])') && el.closest && el.closest('#panel_term'))
  } catch(_) {
    return false
  }
}

function bindTokenDetailOpen($elements, refSource){
  $elements.each(function(){
    const el = this
    if (nestedInteractiveTarget(el, el)) return
    const ref = resolveTokenDetailRef(refSource, el)
    if (!ref) return

    el.dataset.tokenDetailCollection = ref.collection
    el.dataset.tokenDetailId = ref.id
    if (!el.hasAttribute('role')) el.setAttribute('role', 'link')
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0')
    const label = (el.textContent || '').trim() || ref.id
    el.setAttribute('aria-label', tokenDetailText('tokens.detail.openLabel', '打开 {name} 的词元详情', { name: label }))

    $(el)
      .off('click.tokenDetail keydown.tokenDetail dblclick.tokenDetail')
      .on('click.tokenDetail', function(event){
        if (event.defaultPrevented) return
        if (event.button && event.button !== 0) return
        if (event.detail && event.detail > 1) return
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
        if (programDebugOwnsInteraction(el)) return
        if (nestedInteractiveTarget(el, event.target) || selectionTouches(el)) return
        const current = resolveTokenDetailRef({
          collection: el.dataset.tokenDetailCollection,
          id: el.dataset.tokenDetailId
        }, el)
        if (!current) return
        event.preventDefault()
        event.stopPropagation()
        clearTokenDetailTimer(el)
        el.__tokenDetailClickTimer = setTimeout(function(){
          el.__tokenDetailClickTimer = null
          openTokenDetail(current.collection, current.id, { sourcePanel: tokenDetailSourcePanel(el) })
        }, TOKEN_DETAIL_CLICK_DELAY)
      })
      .on('dblclick.tokenDetail', function(){
        clearTokenDetailTimer(el)
      })
      .on('keydown.tokenDetail', function(event){
        if (event.key !== 'Enter') return
        if (nestedInteractiveTarget(el, event.target)) return
        if (programDebugOwnsInteraction(el)) return
        const current = resolveTokenDetailRef({
          collection: el.dataset.tokenDetailCollection,
          id: el.dataset.tokenDetailId
        }, el)
        if (!current) return
        event.preventDefault()
        event.stopPropagation()
        openTokenDetail(current.collection, current.id, { sourcePanel: tokenDetailSourcePanel(el) })
      })
  })
}

function runTextReplacers(root){
  if (!root || !window.endpoints) return
  const endpoint = window.endpoints
  const calls = [
    ['replace_character_name', endpoint.character?.()],
    ['replace_skill_name', endpoint.skill?.()],
    ['replace_card_name', endpoint.card?.()],
    ['replace_term', endpoint.termDynamic?.(), 1, root, 'term-dynamic'],
    ['replace_term', endpoint.termFixed?.(), 1, root, 'term-fixed']
  ]
  calls.forEach(item => {
    try {
      const fn = window[item[0]]
      if (!fn || !item[1]) return
      const args = item.length > 4 ? item.slice(1) : item.slice(1).concat(root)
      const result = fn.apply(window, args)
      if (result && typeof result.catch === 'function') result.catch(function(){})
    } catch(_) {}
  })
  setTimeout(function(){ try { window.pronounCheck?.(root) } catch(_) {} }, 50)
}

// 暴露到全局，保持与现有模块风格一致
window.bindDblclickAndHighlight = bindDblclickAndHighlight
window.bindTokenDetailOpen = bindTokenDetailOpen
window.buildTokenDetailUrl = buildTokenDetailUrl
window.openTokenDetail = openTokenDetail
window.fetchJsonCached = fetchJsonCached
window.runTextReplacers = runTextReplacers

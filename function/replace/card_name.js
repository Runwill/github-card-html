function replace_card_name(path, paragraphs = document){
  fetchJsonCached(path).then(card => {
    for (let i = 0; i < card.length; i++){
      const info = card[i]
      const $elements = $(paragraphs).find(info.en)
      $elements.html(info.cn).data('index', i)
      bindDblclickAndHighlight($elements, {
        onDblclick: (_, el) => {
          const s = card[$(el).data('index')].en + '.scroll'
          scrollActions.scrollToSelectorAndFlash('panel_card', s, { behavior: 'smooth', stop: true })
        },
        getScrollSelector: (el) => card[$(el).data('index')].en + '.scroll',
        getHighlightColor: (el) => {
          const t = card[$(el).data('index')].type
          return t == '基本' ? '#c2f3c2' : (t == '锦囊' ? '#f3e6c2' : '')
        }
      })
    }
  })
}
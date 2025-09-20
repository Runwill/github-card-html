function replace_card_name(path, paragraphs = document){
    fetch(path).then(response => response.json()).then(card => {
        for (let i = 0; i < card.length; i++){
            const cardName = card[i].cn
            const sel = card[i].en
            const $elements = $(paragraphs).find(sel)
            // 写入文本
            $elements.html(cardName).data('index', i)
            // 统一绑定事件与高亮
            bindDblclickAndHighlight($elements, {
              onDblclick: (event, el) => {
                const s = card[$(el).data('index')].en + '.scroll'
                scrollActions.scrollToSelectorAndFlash('panel_card', s, { behavior: 'smooth', stop: true })
              },
              getScrollSelector: (el) => card[$(el).data('index')].en + '.scroll',
              getHighlightColor: (el) => {
                const cardData = card[$(el).data('index')]
                return cardData.type == '基本' ? '#c2f3c2' : (cardData.type == '锦囊' ? '#f3e6c2' : '')
              }
            })
        }
    })
}
function replace_card_name(path, paragraphs = document){
    fetch(path).then(response => response.json()).then(card => {
        for(var i in card){
            cardName=card[i].cn
            element = $(paragraphs).find(card[i].en)
            
            element.each(function() { // 替换和滚动
                $(this).html(cardName).data("index", i).on("dblclick", function(event) {
                    event.stopPropagation()
                    const sel = card[$(this).data("index")].en + ".scroll"
                    scrollActions.scrollToSelectorAndFlash('panel_card', sel, { behavior: 'smooth', stop: true })
                })
            })
            
            // 使用统一的高亮函数
            element.each(function() {
                const cardData = card[$(this).data("index")]
                const color = cardData.type == '基本' ? "#c2f3c2" : cardData.type == '锦囊' ? "#f3e6c2" : ""
                const scrollSelector = cardData.en + ".scroll"
                addStandardHighlight($(this), color, scrollSelector)
            })
        }
    })
}
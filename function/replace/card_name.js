function replace_card_name(path, paragraphs = document){
    fetch(path).then(response => response.json()).then(card => {
        for(var i in card){
            cardName=card[i].cn
            element = $(paragraphs).find(card[i].en)
            
            element.each(function() { // 替换和滚动
                $(this).html(cardName).data("index", i).on("dblclick", function(event) {
                    event.stopPropagation()
                    $("#example-tabs").foundation("selectTab", "panel_card", 1)
            
                    $(card[$(this).data("index")].en + ".scroll").each(function() {
                        event.stopPropagation()
                        this.scrollIntoView({ behavior: "smooth" }) // 滚动到目标元素
                        $(this).fadeTo(200, 0).fadeTo(1000, 1) // 淡入效果
                    })
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
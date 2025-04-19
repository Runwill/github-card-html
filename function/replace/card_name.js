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
            }).mouseover(//高亮
                function(event){
                    if(card[$(this).data("index")].type == '基本') color = "#c2f3c2"
                    if(card[$(this).data("index")].type == '锦囊') color = "#f3e6c2"
                    $(this).css("background-color",color)
                    $(card[$(this).data("index")].en+".scroll").css("background-color",color)
                }
            ).mouseout(//高亮
                function(event){
                    $(this).css("background-color","")
                    $(card[$(this).data("index")].en+".scroll").css("background-color","")
                }
            )
        }
    })
}
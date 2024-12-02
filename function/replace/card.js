function CardReplace(path){
    fetch(path).then(response => response.json()).then(card => {
        for(var i in card){
            cardName=card[i].cn
            document.querySelectorAll(card[i].en).forEach(//替换和滚动
                element => {
                    element.innerHTML = cardName
                    element.addEventListener(
                        'dblclick', function(event){
                            event.stopPropagation()
                            $("#example-tabs").foundation('selectTab','panel_card',1)
                            document.querySelectorAll(card[i].en).forEach(
                                scroll => {
                                    event.stopPropagation()
                                    scroll.scrollIntoView({ behavior: "smooth" })
                                    $(scroll).fadeTo(200, 0).fadeTo(1000, 1)
                                }
                            )
                        }
                    )
                }
            )
            $(card[i].en).mouseover(//高亮
                function(){
                    if(card[i].type == '基本') color = "#c2f3c2"
                    $(this).css("background-color",color)
                    $(card[i].en+".scroll").css("background-color",color)
                }
            )
            $(card[i].en).mouseout(//高亮
                function(){
                    $(this).css("background-color","")
                    $(card[i].en+".scroll").css("background-color","")
                }
            )
        }
    })
}
$(function () {
    $(document).ready(function () {
        $(document).foundation()
    })
})
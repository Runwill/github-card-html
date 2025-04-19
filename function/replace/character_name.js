function replace_character_name(path, paragraphs = document){
    fetch(path).then(response => response.json()).then(character => {
        //获取武将ID并排序
        let characterID = []
        for(var i in character){
                characterID.push(character[i].id)
        }
        characterID.sort()
        
        for(var i in characterID){
            for(var j in character){
                if(character[j].id == characterID[i]){
                    characterName = character[j].name
                }
            }
            element = $(paragraphs).find(".characterID" + characterID[i])

            element.each(function() { // 替换和滚动
                $(this).html(characterName).data("characterPosition", i).on("dblclick", function(event) {
                    event.stopPropagation()
                    $("#example-tabs").foundation("selectTab", "panel_character", 1)
            
                    $(".scroll").each(function() {
                        if ($(this).hasClass(event.currentTarget.classList[0])) {
                            if (!$(this).hasClass("fadeOnly")) {
                                // 获取页面高度和目标元素的位置信息
                                const container = $(this).closest(".container")[0];
                                const elementTop = container.getBoundingClientRect().top + window.pageYOffset
                                const elementHeight = container.offsetHeight
                                const windowHeight = window.innerHeight
            
                                // 计算目标元素滚动到屏幕中央的位置
                                const offset = elementTop - (windowHeight / 2) + (elementHeight / 2)
            
                                // 使用 scrollTo 进行滚动，确保目标元素居中
                                window.scrollTo({
                                    top: offset,
                                    behavior: "smooth"
                                })
                            }
                            // 淡入效果
                            $(this).fadeTo(200, 0).fadeTo(1000, 1)
                        }
                    })
                })
            }).mouseover(//高亮
                function(event){
                    $(this).css("background-color","#9ca8ee")
                    $("." + this.classList[0] + ".scroll").css("background-color","#9ca8ee")
                }
            ).mouseout(//高亮
                function(event){
                    $(this).css("background-color","")
                    $("." + this.classList[0] + ".scroll").css("background-color","")
                }
            )
        }
    })
}
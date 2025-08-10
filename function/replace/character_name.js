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
                    const className = event.currentTarget.classList[0]
                    // 最近容器居中滚动（容器选择器为 .container）
                    scrollActions.scrollToClassWithCenter('panel_character', className, '.container', { behavior: 'smooth', stop: true })
                })
            })
            
            // 使用统一的高亮函数
            element.each(function() {
                const scrollSelector = "." + this.classList[0] + ".scroll"
                addStandardHighlight($(this), "#9ca8ee", scrollSelector)
            })
        }
    })
}
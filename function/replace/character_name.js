function CharacterNameReplace(path,paragraphs = document){
    fetch(path).then(response => response.json()).then(character => {
        //获取武将ID并排序
        let characterID = []
        for(var i in character){
                characterID.push(character[i].id)
        }
        characterID.sort()
        
        for(var i in characterID){
            for(var j in character){
                if(character[j].id==characterID[i]){
                    characterName=character[j].name
                }
            }
            paragraphs.querySelectorAll(".characterID"+characterID[i]).forEach(//替换和滚动
                element => {
                    element.innerHTML = characterName
                    element.characterPosition=i
                    element.addEventListener(
                        'dblclick', function(event){
                            event.stopPropagation()
                            $("#example-tabs").foundation('selectTab','panel_character',1);
                            document.querySelectorAll(".scroll").forEach(
                                scroll => {
                                    if (scroll.classList.contains(event.currentTarget.classList[0])) {
                                        if (!(scroll.classList.contains('fadeOnly'))) {
                                            // 获取页面高度和目标元素的位置信息
                                            const container = scroll.closest('.container')
                                            const elementTop = container.getBoundingClientRect().top + window.pageYOffset
                                            const elementHeight = container.offsetHeight
                                            const windowHeight = window.innerHeight
                                    
                                            // 计算目标元素滚动到屏幕中央的位置
                                            const offset = elementTop - (windowHeight / 2) + (elementHeight / 2)
                                    
                                            // 使用 scrollTo 进行滚动，确保目标元素居中
                                            window.scrollTo({
                                                top: offset,
                                                behavior: 'smooth'
                                            })
                                        }
                                        // 淡入效果
                                        $(scroll).fadeTo(200, 0).fadeTo(1000, 1)
                                    }
                                }
                            )
                        }
                    )
                }
            )
            $(".characterID"+characterID[i]).mouseover(//高亮
                function(event){
                    $(this).css("background-color","#9ca8ee")
                    $("."+event.currentTarget.classList[0]+".scroll").css("background-color","#9ca8ee")
                }
            )
            $(".characterID"+characterID[i]).mouseout(//高亮
                function(event){
                    $(this).css("background-color","")
                    $("."+event.currentTarget.classList[0]+".scroll").css("background-color","")
                }
            )
        }
    })
}
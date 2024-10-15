$(function(){
    $.ajax({
        url:"base/character.json",
        type:"GET",
        datatype:"json",
        success:
        function (data){
            CharacterNameReplace(data)
        }
    });
    var CharacterNameReplace = function(character){
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
            document.querySelectorAll(".characterID"+characterID[i]).forEach(//替换和滚动
                element => {
                    element.innerHTML = characterName
                    element.characterPosition=i
                    element.addEventListener(
                        'click', function(){
                            event.stopPropagation()
                            $("#example-tabs").foundation('selectTab','panel_character',1);
                            document.querySelectorAll(".scroll").forEach(
                                scroll => {
                                    if (scroll.classList.contains(event.currentTarget.classList[0])){
                                        if(!(scroll.classList.contains('fadeOnly'))){
                                            scroll.scrollIntoView({behavior:'smooth'})
                                        }
                                        $(scroll).fadeTo(200,0).fadeTo(1000,1)
                                    }
                                }
                            )
                        }
                    )
                }
            )
            $(".characterID"+characterID[i]).mouseover(//高亮
                function(){
                    $(this).css("background-color","#9ca8ee")
                    $("."+event.currentTarget.classList[0]+".scroll").css("background-color","#9ca8ee")
                }
            )
            $(".characterID"+characterID[i]).mouseout(//高亮
                function(){
                    $(this).css("background-color","")
                    $("."+event.currentTarget.classList[0]+".scroll").css("background-color","")
                }
            )
        }
    }
});
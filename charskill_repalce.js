$(function(){
    $.ajax({
        url:"charskill.json",
        type:"GET",
        datatype:"json",
        success:
        function (data){
            CharacterSkillReplace(data)
        }
    });
    var CharacterSkillReplace = function(CharacterSkill){
        //获取技能名并排序
        let CharacterSkillNames = []
        for(var i in CharacterSkill){
            CharacterSkillNames.push(CharacterSkill[i].name)
        }
        CharacterSkillNames.sort()
        
        let standardCharacterSkills = ""
        for(var i in CharacterSkillNames){
            for(var j in CharacterSkill){
                if(CharacterSkill[j].name == CharacterSkillNames[i]){
                    standardCharacterSkills += "<skillQuote class=\"bold\"><skillQuoteLeft></skillQuoteLeft>"+"<characterSkillElement"+" class=\""+CharacterSkill[j].name+" scroll\"></characterSkillElement>"+"<skillQuoteRight></skillQuoteRight></skillQuote>"+CharacterSkill[j].content
                }
            }
            standardCharacterSkills += "<br>"+"<br>"
        }
        standardCharacterSkillsBlock.innerHTML = "<br>"+"<br>"+standardCharacterSkills
        
        for(var i in CharacterSkillNames){
            document.querySelectorAll("."+CharacterSkillNames[i]).forEach(//替换和滚动
                element => {
                    element.innerHTML = CharacterSkillNames[i]
                    element.skillPosition=i
                    element.addEventListener(
                        'click', function(){
                            document.querySelectorAll(".scroll").forEach(
                                scroll => {
                                    if (scroll.classList.contains(event.currentTarget.classList[0])){
                                        event.stopPropagation()
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
            $("."+CharacterSkillNames[i]).mouseover(//高亮
                function(){
                    $(this).css("background-color","#df90ff")
                    $("."+event.currentTarget.classList[0]+".scroll").css("background-color","#df90ff")
                }
            )
            $("."+CharacterSkillNames[i]).mouseout(//高亮
                function(){
                    $(this).css("background-color","")
                    $("."+event.currentTarget.classList[0]+".scroll").css("background-color","")
                }
            )
        }
    }
});
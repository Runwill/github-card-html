$(function(){
    $.ajax({
        url:"base/skill.json",
        type:"GET",
        datatype:"json",
        success:
        function (data){
            CharacterSkillReplace(data)
        }
    });
    var CharacterSkillReplace = function(skill){
        //获取武将技能名并排序
        let CharacterSkillNames = []
        for(var i in skill){
            if(skill[i].role)CharacterSkillNames.push(skill[i].name)
        }
        CharacterSkillNames.sort()
        
        let standardCharacterSkills = ""
        for(var i in CharacterSkillNames){
            for(var j in skill){
                if(skill[j].name == CharacterSkillNames[i]){
                    standardCharacterSkills += "<skillQuote class=\"bold\"><skillQuoteLeft></skillQuoteLeft>"+"<characterSkillElement"+" class=\""+skill[j].name+" scroll\"></characterSkillElement>"+"<skillQuoteRight></skillQuoteRight></skillQuote>"+skill[j].content
                }
            }
            standardCharacterSkills += "<br>"+"<br>"
        }
        standardCharacterSkillsBlock.innerHTML = "<br>"+"<br>"+standardCharacterSkills
    }
});
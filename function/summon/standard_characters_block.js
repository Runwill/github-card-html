$(function(){
    var deferred1 = $.Deferred();
    var deferred2 = $.Deferred();
    $.ajax({
        url:"base/character.json",
        type:"GET",
        datatype:"json",
        success:
        function (characterData){
            deferred1.resolve(characterData)
        }
    })
    $.ajax({
        url:"base/skill.json",
        type:"GET",
        datatype:"json",
        success:
        function (skillData){
            deferred2.resolve(skillData);
        }
    })
    $.when(deferred1, deferred2).done(function (characterData, skillData) {
        CharacterSkillReplace(characterData, skillData);
    });
    
    var CharacterSkillReplace = function(character,skill){
        let standardCharacters = []
        //提取武将序号的顺序数组
        let characterID = []
        for(i in character)characterID.push(parseInt(character[i].id))
        characterID.sort((a,b) => a-b)

        for (i in characterID){
            for(j in character){
                if(character[j].id == characterID[i]){
                    standardCharacters += characterID[i] + " <charactorName class=\"characterID"+characterID[i]+" scroll\"></charactorName>"
                }
            }
        }   
        //获取武将名并排序
        /*let 
        for(var i in character){
            CharacterNames.push(character[i].name)
        }
        CharacterNames.sort()
        
        let standardCharacterSkills = ""
        for(var i in CharacterSkillNames){
            for(var j in skill){
                if(skill[j].name == CharacterSkillNames[i]){
                    standardCharacterSkills += "<skillQuote class=\"bold\"><skillQuoteLeft></skillQuoteLeft>"+"<characterSkillElement"+" class=\""+skill[j].name+" scroll\"></characterSkillElement>"+"<skillQuoteRight></skillQuoteRight></skillQuote>"+skill[j].content
                }
            }
            standardCharacters += "<br>"+"<br>"
        }*/
        standardCharactersBlock.innerHTML = "<br>"+"<br>"+standardCharacters+"<process></process>"
    }
});
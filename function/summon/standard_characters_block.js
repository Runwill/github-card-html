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
        CharacterReplace(characterData, skillData);
    });

    var CharacterReplace = function(character,skill){
        let standardCharacters = []
        //提取武将序号的顺序数组
        let characterID = []
        for(i in character)characterID.push(parseInt(character[i].id))
        characterID.sort((a,b) => a-b)

        for (i in characterID){
            for(j in character){
                if(character[j].id == characterID[i]){
                    standardCharacters += "<h3>" + characterID[i] + " <characterName class=\"characterID"+characterID[i]+" scroll\"></characterName> "+character[j].title+"</h3>"

                    //获得武将牌上技能次序
                    let skillOrder = []
                    for(k in skill){
                        if(skill[k].role){
                            for(l in skill[k].role){
                                if(skill[k].role[l].id == characterID[i]){
                                    skillOrder.push(parseInt(skill[k].role[l].skill_order))
                                }
                            }
                        }
                    }
                    skillOrder.sort((a,b) => a-b)

                    for(k in skillOrder){
                        for(l in skill){
                            if(skill[l].role){
                                for(m in skill[l].role){
                                    if(skill[l].role[m].id == characterID[i] && skill[l].role[m].skill_order==skillOrder[k]){
                                        standardCharacters+="<padding><skillQuote class=\"bold\"><skillQuoteLeft></skillQuoteLeft>"+"<characterSkillElement"+" class=\""+skill[l].name+"\"></characterSkillElement>"+"<skillQuoteRight></skillQuoteRight></skillQuote>"+skill[l].content
                                        for(n in skill[l].role){
                                            for(o in character){
                                                if(character[o].id==skill[l].role[n].id){
                                                    standardCharacters+="<"+ "<characterName class=\"characterID"+character[o].id+"\"></characterName>"+skill[l].role[n].skill_order
                                                    //君主技
                                                    if(skill[l].role[n].dominator)standardCharacters+="<dominatorSkill epithet=\"1\"></dominatorSkill>"
                                                    standardCharacters+=">"
                                                }
                                            }
                                        }
                                        standardCharacters+="</padding>"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        standardCharactersBlock.innerHTML = "<br>"+"<br>"+standardCharacters
    }
});
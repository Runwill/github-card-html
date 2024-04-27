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
                    standardCharacters += characterID[i] + " <charactorName class=\"characterID"+characterID[i]+" scroll\"></charactorName> "+character[j].title

                    //提取武将牌上技能序号
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
                    alert(skillOrder)
                    /*for(k in skill){
                        if(skill[k].role){

                            for(l in skill[k].role){
                                if(skill[k].role[l].id == characterID[i]){
                                    standardCharacters+=skill[k].role[l].skill_order
                                }
                            }
                        }
                    }*/
                }
            }
        }
        standardCharactersBlock.innerHTML = "<br>"+"<br>"+standardCharacters
    }
});
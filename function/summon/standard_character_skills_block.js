function summonCharacterSkill(){
    return new Promise(function(resolve) {
        var deferred1 = $.Deferred();
        var deferred2 = $.Deferred();
        $.ajax({
            url: (endpoints && endpoints.character ? endpoints.character() : '/api/character'),
            type:"GET",
            datatype:"json",
            success:
            function (characterData){
                deferred1.resolve(characterData)
            }
        })
    const skillUrl = (endpoints && endpoints.skill ? endpoints.skill() : '/api/skill?strength=' + encodeURIComponent(localStorage.getItem('strength')));
        $.ajax({
            url: skillUrl,
            type:"GET",
            datatype:"json",
            success:
            function (skillData){
                deferred2.resolve(skillData);
            },
            error: function(){
                deferred2.resolve([]);
            }
        })
        $.when(deferred1, deferred2).done(function (characterData, skillData) {
            CharacterSkillReplace(characterData, skillData);
            resolve(); // 在HTML生成完成后resolve Promise
        })
    });
}
function CharacterSkillReplace(character,skill) {
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
                    standardCharacterSkills += "<pronounScope><skillQuote class=\"bold\"><skillQuoteLeft></skillQuoteLeft>"+"<characterSkillElement"+" class=\""+skill[j].name+" scroll\"></characterSkillElement>"+"<skillQuoteRight></skillQuoteRight></skillQuote>"+skill[j].content
                    for(k in skill[j].role){
                        for(l in character){
                            if(character[l].id==skill[j].role[k].id){
                                standardCharacterSkills+="<"+ "<characterName class=\"characterID"+character[l].id+"\"></characterName>"+skill[j].role[k].skill_order
                                //君主技
                                if(skill[j].role[k].dominator)standardCharacterSkills+="<dominatorSkill epithet=\"1\"></dominatorSkill>"
                                standardCharacterSkills+=">"
                            }
                        }
                    }
                }
            }
            standardCharacterSkills += "</pronounScope><br><br>"
        }
        $(".standardCharacterSkillsBlock").html("<br>"+"<br>"+standardCharacterSkills)
}
$(function () {
    var deferred1 = $.Deferred();
    var deferred2 = $.Deferred();
    $.ajax({
        url: "base/character.json",
        type: "GET",
        datatype: "json",
        success:
            function (characterData) {
                deferred1.resolve(characterData)
            }
    })
    $.ajax({
        url: 'base/skill/strength'+ localStorage.getItem('strength') +'.json',
        type: "GET",
        datatype: "json",
        success:
            function (skillData) {
                deferred2.resolve(skillData);
            }
    })
    $.when(deferred1, deferred2).done(function (characterData, skillData) {
        CharacterReplace(characterData, skillData);
    })

    var CharacterReplace = function (character, skill) {
        let standardCharacters = []
        //提取武将序号的顺序数组
        let characterID = []
        for (i in character) characterID.push(parseInt(character[i].id))
        characterID.sort((a, b) => a - b)

        for (i in characterID) {
            for (j in character) {
                if (character[j].id == characterID[i]) {

                    standardCharacters += "<div class='container'><div class='role_title'>" + character[j].title + "</div>"
                    
                    standardCharacters += "<img src='source/"
                    standardCharacters += character[j].position
                    if(character[j].dominator)standardCharacters += "_君主"
                    standardCharacters += ".png' width='300' height='300' class='role_icon'>"

                    standardCharacters += "<padding><h3>" + characterID[i] + " <characterName class=\"characterID" + characterID[i] + " scroll\"></characterName> "

                    for (let a = 0; a < character[j].health; a++)standardCharacters += "<health epithet='2' style='font-size: 1.3em;letter-spacing: -2px;'></health>"

                    standardCharacters += "</h3>"

                    //获得武将牌上技能次序
                    let skillOrder = []
                    for (k in skill) {
                        if (skill[k].role) {
                            for (l in skill[k].role) {
                                if (skill[k].role[l].id == characterID[i]) {
                                    skillOrder.push(parseInt(skill[k].role[l].skill_order))
                                }
                            }
                        }
                    }
                    skillOrder.sort((a, b) => a - b)

                    for (k in skillOrder) {
                        for (l in skill) {
                            if (skill[l].role) {
                                for (m in skill[l].role) {
                                    if (skill[l].role[m].id == characterID[i] && skill[l].role[m].skill_order == skillOrder[k]) {

                                        standardCharacters += "<div class=\"indent\"><skillQuote class=\"bold"
                                        
                                        //if (skill[l].role[m].dominator) standardCharacters += " glowing"

                                        standardCharacters += "\"><skillQuoteLeft></skillQuoteLeft>" + "<characterSkillElement" + " class=\"" + skill[l].name + " " + skill[l].name + "LoreCharacterID" + characterID[i] + "\"></characterSkillElement>" + "<skillQuoteRight></skillQuoteRight></skillQuote>"

                                        if (skill[l].role[m].dominator) standardCharacters += "<dominatorSkill></dominatorSkill>，"

                                        standardCharacters += skill[l].content

                                        //尾部武将名
                                        for (n in skill[l].role) {
                                            for (o in character) {
                                                if (character[o].id == skill[l].role[n].id) {
                                                    //武将名
                                                    standardCharacters += "<" + "<characterName class=\"characterID" + character[o].id + "\"></characterName>" + skill[l].role[n].skill_order
                                                    //君主技
                                                    if (skill[l].role[n].dominator) standardCharacters += "<dominatorSkill epithet=\"1\"></dominatorSkill>"
                                                    standardCharacters += ">"
                                                }
                                            }
                                        }
                                        standardCharacters += "</div>"
                                    }
                                }
                            }
                        }
                    }
                    standardCharacters += "</padding></div><br><br><br><br>"
                }
            }
        }
        standardCharactersBlock.innerHTML = "<br>" + "<br>" + standardCharacters
    }
});
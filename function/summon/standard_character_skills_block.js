
function CharacterSkillReplace(path1, path2) {
    Promise.all([
        fetch(path1).then(response => response.json()), // 获取第一个文件的数据
        fetch(path2).then(response => response.json())  // 获取第二个文件的数据
    ]).then(([character,skill]) => {
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
                    for(k in skill[j].role){
                        for(l in character){
                            if(character[l].id==skill[j].role[k].id){
                                standardCharacterSkills+="<"+ "<charactorName class=\"characterID"+character[l].id+"\"></charactorName>"+skill[j].role[k].skill_order
                                //君主技
                                if(skill[j].role[k].dominator)standardCharacterSkills+="<dominatorSkill epithet=\"1\"></dominatorSkill>"
                                standardCharacterSkills+=">"
                            }
                        }
                    }
                }
            }
            standardCharacterSkills += "<br>"+"<br>"
        }
        standardCharacterSkillsBlock.innerHTML = "<br>"+"<br>"+standardCharacterSkills
    })
}
$(function () {
    $(document).ready(function () {
        $(document).foundation()
    })
    CharacterSkillReplace('base/character.json','base/skill/strength'+ localStorage.getItem('strength') +'.json')
})
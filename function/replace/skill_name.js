function replace_skill_name(path, paragraphs = document){
    fetch(path).then(response => response.json()).then(skill => {
        //获取技能名并排序
        let skillNames = []
        for (var i in skill) {
            if (skill[i].role) skillNames.push(skill[i].name)
        }
        skillNames.sort()

        for (var i in skillNames) {//技能名i
            element = $(paragraphs).find("." + skillNames[i])

            element.each(function() { // 替换和滚动
                $(this).html(skillNames[i]).on("dblclick", function(event) {
                    event.stopPropagation()
                    $("#example-tabs").foundation("selectTab", "panel_skill", 1)
            
                    $(".scroll").each(function() {
                        if ($(this).hasClass(event.currentTarget.classList[0])) {
                            if (!$(this).hasClass("fadeOnly")) {
                                // 滚动到目标元素
                                this.scrollIntoView({ behavior: "smooth" })
                            }
                            // 淡入效果
                            $(this).fadeTo(200, 0).fadeTo(1000, 1)
                        }
                    })
                })
            })
            
            // 使用统一的高亮函数
            const scrollSelector = "." + skillNames[i] + ".scroll"
            addStandardHighlight(element, "#df90ff", scrollSelector)
            for (var j in skill) {//不同武将的技能名悬浮个性化文本
                if (skill[j].name == skillNames[i]) {
                    for (k in skill[j].role) {
                        element = $(paragraphs).find('.' + skillNames[i] + 'LoreCharacterID' + skill[j].role[k].id)
                        element.prop('loreSkillPosition', j)
                        element.prop('loreRolePosition', k)

                        element.mouseover(
                            function () {
                                $(this).after('<lore style="line-height: 0;">「' + skill[$(this).prop('loreSkillPosition')].role[$(this).prop('loreRolePosition')].lore + '」——《' + skill[$(this).prop('loreSkillPosition')].role[$(this).prop('loreRolePosition')].legend + '》</lore>')
                            }
                        )
                        element.mouseout(
                            function () {
                                $("lore").remove()
                            }
                        )
                    }
                }
            }
        }
    })
}
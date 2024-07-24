$(function(){
    $.ajax({
        url:"base/skill.json",
        type:"GET",
        datatype:"json",
        success:
        function (data){
            SkillNameReplace(data)
        }
    });
    var SkillNameReplace = function(skill){
        //获取技能名并排序
        let skillNames = []
        for(var i in skill){
            if(skill[i].role)skillNames.push(skill[i].name)
        }
        skillNames.sort()

        for(var i in skillNames){//技能名i
            document.querySelectorAll("."+skillNames[i]).forEach(//替换和滚动
                element => {
                    element.innerHTML = skillNames[i]
                    element.skillPosition=i
                    element.addEventListener(
                        'click', function(){
                            event.stopPropagation()
                            $("#example-tabs").foundation('selectTab','panel_skill',1);
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
            $("."+skillNames[i]).mouseover(//高亮
                function(){
                    $(this).css("background-color","#df90ff")
                    $("."+event.currentTarget.classList[0]+".scroll").css("background-color","#df90ff")
                }
            )
            $("."+skillNames[i]).mouseout(//高亮
                function(){
                    $(this).css("background-color","")
                    $("."+event.currentTarget.classList[0]+".scroll").css("background-color","")
                }
            )
            for(var j in skill){//不同武将的技能名悬浮个性化文本
                if(skill[j].name==skillNames[i]){
                    for(k in skill[j].role){

                        $('.'+skillNames[i]+'LoreCharacterID'+skill[j].role[k].id).prop('loreSkillPosition',j)
                        $('.'+skillNames[i]+'LoreCharacterID'+skill[j].role[k].id).prop('loreRolePosition',k)

                        $('.'+skillNames[i]+'LoreCharacterID'+skill[j].role[k].id).mouseover(
                            function(){
                                $(this).after('<lore>「'+skill[$(this).prop('loreSkillPosition')].role[$(this).prop('loreRolePosition')].lore+'」——《'+skill[$(this).prop('loreSkillPosition')].role[$(this).prop('loreRolePosition')].legend+'》</lore>')
                            }
                        )
                        $('.'+skillNames[i]+'LoreCharacterID'+skill[j].role[k].id).mouseout(
                            function(){
                                $("lore").remove()
                            }
                        )
                    }
                }
            }
        }
    }
});
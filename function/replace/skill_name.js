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

        for(var i in skillNames){
            document.querySelectorAll("."+skillNames[i]).forEach(//替换和滚动
                element => {
                    element.innerHTML = skillNames[i]
                    element.skillPosition=i
                    element.addEventListener(
                        'click', function(){
                            event.stopPropagation()
                            if(document.URL.includes("skill.html")){
                                document.querySelectorAll(".scroll").forEach(
                                    scroll => {
                                        if (scroll.classList.contains(event.currentTarget.classList[0])){
                                            //event.stopPropagation()
                                            if(!(scroll.classList.contains('fadeOnly'))){
                                                scroll.scrollIntoView({behavior:'smooth'})
                                            }
                                            $(scroll).fadeTo(200,0).fadeTo(1000,1)
                                        }
                                    }
                                )
                            }
                            else {
                                window.location.href = "skill.html#"+event.currentTarget.classList[0]
                            }
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
        }
    }
});
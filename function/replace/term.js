$(function(){
    $.ajax({
        url:"base/term.json",
        type:"GET",
        datatype:"json",
        success:
        function (data){
            textReplace(data)
        }
    });
    var textReplace = function(term){   
        for(var i in term){
            if(!term[i].part){
                document.querySelectorAll(term[i].en).forEach(//替换和滚动
                    element => {
                        element.termPosition=i
                        if(!element.classList.contains('irreplacable')){
                            if(!term[i].epithet){
                                if(term[i].cn)element.innerHTML = term[i].cn
                                else element.innerHTML = term[i].en
                            }
                            else{
                                if(!element.getAttribute("epithet"))element.innerHTML =  term[i].epithet[0].cn
                                else    element.innerHTML =  term[i].epithet[element.getAttribute("epithet")].cn  
                            }
                        }
                        element.addEventListener(
                            'click', function(){
                                document.querySelectorAll(".scroll").forEach(
                                    scroll => {
                                        event.stopPropagation()
                                        if (scroll.outerHTML.startsWith("<"+event.currentTarget.tagName.toLowerCase()+" ")){
                                            if(!(scroll.classList.contains('fadeOnly'))){
                                                scroll.scrollIntoView({behavior: "smooth"});
                                            }
                                            $(scroll).fadeTo(200,0).fadeTo(1000,1)
                                        }
                                    }
                                )
                            }
                        )
                    }
                )
                $(term[i].en).mouseover(//高亮
                    function(){
                        $(this).css("background-color",term[event.currentTarget.termPosition].color)
                        $(term[event.currentTarget.termPosition].en+".scroll").css("background-color",term[event.currentTarget.termPosition].color)
                    }
                )
                $(term[i].en).mouseout(//高亮
                    function(){
                        $(this).css("background-color","")
                        $(term[event.currentTarget.termPosition].en+".scroll").css("background-color","")
                    }
                )
            }
            else{
                for(var j in term[i].part){//替换
                    document.querySelectorAll(term[i].part[j].en).forEach(
                        element => {
                            element.innerHTML = term[i].part[j].cn
                        }
                    )
                }
                $(term[i].en).each((index,element)=>{//高亮
                    element.termPosition=i
                    $(element).mouseover(()=>{
                        for(var j in term[event.currentTarget.termPosition].part){
                            $(element).children(term[event.currentTarget.termPosition].part[j].en).css("background-color",term[event.currentTarget.termPosition].color)
                            $(term[event.currentTarget.termPosition].en+".scroll").children(term[event.currentTarget.termPosition].part[j].en).css("background-color",term[event.currentTarget.termPosition].color) 
                        }
                    })
                    $(element).mouseout(()=>{
                        for(var j in term[event.currentTarget.termPosition].part){
                            $(element).children(term[event.currentTarget.termPosition].part[j].en).css("background-color","")
                            $(term[event.currentTarget.termPosition].en+".scroll").children(term[event.currentTarget.termPosition].part[j].en).css("background-color","")
                        }
                    })
                })
                document.querySelectorAll(term[i].en).forEach(//滚动
                    element => {
                        element.addEventListener(
                            'click', function(){
                                document.querySelectorAll(".scroll").forEach(
                                    scroll => {
                                        event.stopPropagation()
                                        if (scroll.outerHTML.startsWith("<"+term[event.currentTarget.termPosition].en.toLowerCase()+" ")){
                                            if(!(scroll.classList.contains('fadeOnly'))){
                                                scroll.scrollIntoView({behavior: "smooth"});
                                            }
                                            for(var j in term[event.currentTarget.termPosition].part){
                                                $(term[event.currentTarget.termPosition].en+".scroll").find(term[event.currentTarget.termPosition].part[j].en).fadeTo(200,0).fadeTo(1000,1)
                                            }
                                        }
                                    }
                                )
                            }
                        )
                    }
                )
            }
        }
    }
});

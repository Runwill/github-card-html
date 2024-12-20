function textReplace(path,mode) {
    fetch(path).then(response => response.json()).then(term => {
        for (var i in term) {
            if (!term[i].part) {//不分段术语
                document.querySelectorAll(term[i].en).forEach(//替换
                    element => {
                        element.termPosition = i
                        if (!element.classList.contains('irreplaceable') && !(term[i].irreplaceable)) {
                            if (!term[i].epithet) {
                                if (term[i].cn) element.innerHTML = term[i].cn
                                else element.innerHTML = term[i].en
                            }
                            else {
                                if (!element.getAttribute("epithet")) element.innerHTML = term[i].epithet[0].cn
                                else element.innerHTML = term[i].epithet[element.getAttribute("epithet")].cn
                            }
                        }
                        if(mode){
                            element.addEventListener(//滚动
                                'dblclick', function (event) {
                                    event.stopPropagation()
                                    $("#example-tabs").foundation('selectTab', 'panel_term', 1);
                                    document.querySelectorAll(".scroll").forEach(
                                        scroll => {
                                            if (scroll.outerHTML.startsWith("<" + event.currentTarget.tagName.toLowerCase() + " ")) {
                                                if (!(scroll.classList.contains('fadeOnly'))) scroll.scrollIntoView({ behavior: "smooth" })
                                                $(scroll).fadeTo(200, 0).fadeTo(1000, 1)
                                            }
                                        }
                                    )
                                }
                            )
                        }
                    }
                )
                if(mode){
                    $(term[i].en).mouseover(//高亮
                        function (event) {
                            $(this).css("background-color", term[event.currentTarget.termPosition].color)
                            $(term[event.currentTarget.termPosition].en + ".scroll").css("background-color", term[event.currentTarget.termPosition].color)
                            if($(this).hasClass('highlight') || term[event.currentTarget.termPosition].highlight){
                                if($(this).closest('pronounScope').length > 0){
                                    $(this).closest('pronounScope').find(term[event.currentTarget.termPosition].en).each(function() {
                                        $(this).css("background-color", "#ff00002f")
                                    })
                                }else{
                                    $(this).closest('padding').find(term[event.currentTarget.termPosition].en).each(function() {
                                        $(this).css("background-color", "#ff00002f")
                                    })
                                }
                            }
                        }
                    )
                    $(term[i].en).mouseout(//去高亮
                        function (event) {
                            $(this).css("background-color", "")
                            $(term[event.currentTarget.termPosition].en + ".scroll").css("background-color", "")
                            if($(this).hasClass('highlight') || term[event.currentTarget.termPosition].highlight){
                                if($(this).closest('pronounScope').length > 0){
                                    $(this).closest('pronounScope').find(term[event.currentTarget.termPosition].en).each(function() {
                                        $(this).css("background-color", "")
                                    })
                                }else{
                                    $(this).closest('padding').find(term[event.currentTarget.termPosition].en).each(function() {
                                        $(this).css("background-color", "")
                                    })
                                }
                            }
                        }
                    )
                }
            }
            else {//分段术语
                for (var j in term[i].part) {//替换
                    document.querySelectorAll(term[i].part[j].en).forEach(
                        element => {
                            if(!element.classList.contains('irreplaceable'))element.innerHTML = term[i].part[j].cn
                        }
                    )
                }
                if(mode){
                    $(term[i].en).each((index, element) => {//高亮
                        element.termPosition = i
                        $(element).mouseover((event) => {
                            for (var j in term[event.currentTarget.termPosition].part) {
                                if(term[event.currentTarget.termPosition].part[j].termedPart){
                                    if(term[event.currentTarget.termPosition].part[j].color){
                                        $(element).find(term[event.currentTarget.termPosition].part[j].en).css("background-color", term[event.currentTarget.termPosition].part[j].color + '60')
                                        $(term[event.currentTarget.termPosition].en + ".scroll").children(term[event.currentTarget.termPosition].part[j].en).css("background-color", term[event.currentTarget.termPosition].part[j].color + '60')
                                    }else{
                                        $(element).find(term[event.currentTarget.termPosition].part[j].en).css("background-color", term[event.currentTarget.termPosition].color + '60')
                                        $(term[event.currentTarget.termPosition].en + ".scroll").children(term[event.currentTarget.termPosition].part[j].en).css("background-color", term[event.currentTarget.termPosition].color + '60')
                                    }
                                }else{
                                    $(element).find(term[event.currentTarget.termPosition].part[j].en).css("background-color", term[event.currentTarget.termPosition].color)
                                    $(term[event.currentTarget.termPosition].en + ".scroll").children(term[event.currentTarget.termPosition].part[j].en).css("background-color", term[event.currentTarget.termPosition].color)
                                }
                            }
                        })
                        $(element).mouseout((event) => {
                            for (var j in term[event.currentTarget.termPosition].part) {
                                $(element).find(term[event.currentTarget.termPosition].part[j].en).css("background-color", "")
                                $(term[event.currentTarget.termPosition].en + ".scroll").children(term[event.currentTarget.termPosition].part[j].en).css("background-color", "")
                            }
                        })
                    })
                    document.querySelectorAll(term[i].en).forEach(//滚动
                        element => {
                            element.addEventListener(
                                'dblclick', function (event) {
                                    event.stopPropagation()
                                    $("#example-tabs").foundation('selectTab', 'panel_term', 1);
                                    document.querySelectorAll(".scroll").forEach(
                                        scroll => {
                                            if (scroll.outerHTML.startsWith("<" + term[event.currentTarget.termPosition].en.toLowerCase() + " ")) {
                                                if (!(scroll.classList.contains('fadeOnly'))) {
                                                    scroll.scrollIntoView({ behavior: 'smooth' });
                                                    $(scroll).fadeTo(200, 0).fadeTo(1000, 1)
                                                }
                                            }
                                        }
                                    )
                                }
                            )
                        }
                    )
                    for (var j in term[i].part) {
                        if (term[i].part[j].termedPart){
                            $(term[i].part[j].en).each((index, element) => {
                                element.termPartFatherPosition = i
                                element.termPartPosition = j
                                $(element).mouseover((event) => {
                                    if(term[event.currentTarget.termPartFatherPosition].part[event.currentTarget.termPartPosition].color){
                                        $(term[event.currentTarget.termPartFatherPosition].part[event.currentTarget.termPartPosition].en + ".scroll").css("background-color", term[event.currentTarget.termPartFatherPosition].part[j].color + '60')
                                    }else{
                                        $(term[event.currentTarget.termPartFatherPosition].part[event.currentTarget.termPartPosition].en + ".scroll").css("background-color", term[event.currentTarget.termPartFatherPosition].color + '60')
                                    }
                                })
                                $(element).mouseout((event) => {
                                    $(term[event.currentTarget.termPartFatherPosition].part[event.currentTarget.termPartPosition].en + ".scroll").css("background-color", "")
                                })
                            })
                            document.querySelectorAll(term[i].part[j].en).forEach(//滚动
                                element => {
                                    element.addEventListener(
                                        'dblclick', function (event) {
                                            event.stopPropagation()
                                            $("#example-tabs").foundation('selectTab', 'panel_term', 1);
                                            document.querySelectorAll(".scroll").forEach(
                                                scroll => {
                                                    if (scroll.outerHTML.startsWith("<" + term[event.currentTarget.termPartFatherPosition].part[event.currentTarget.termPartPosition].en.toLowerCase() + " ")) {
                                                        if (!(scroll.classList.contains('fadeOnly'))) {
                                                            scroll.scrollIntoView({ behavior: 'smooth' });
                                                            $(scroll).fadeTo(200, 0).fadeTo(1000, 1)
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
            }
        }
    })
}
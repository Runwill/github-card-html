function textReplace(path,mode) {
    fetch(path).then(response => response.json()).then(term => {
        for (var i in term) {
            if (!term[i].part) {//不分段术语
                document.querySelectorAll(term[i].en).forEach(//替换
                    element => {
                        element.i = i
                        if (!element.classList.contains('irreplaceable') && !(term[i].irreplaceable)) {
                            if (!term[i].epithet) {
                                if(term[i].cn) {
                                    if(term[i].replace) element.innerHTML = term[i].replace
                                    else element.innerHTML = term[i].cn
                                }
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
                                            var target = event.currentTarget
                                            if (scroll.outerHTML.startsWith("<" + target.tagName.toLowerCase() + " ")) {
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
                            var target = event.currentTarget
                            $(this).css("background-color", term[target.i].color)
                            $(term[target.i].en + ".scroll").css("background-color", term[target.i].color)
                            if($(this).hasClass('highlight') || term[target.i].highlight){
                                if($(this).closest('pronounScope').length > 0){
                                    $(this).closest('pronounScope').find(term[target.i].en).each(function() {
                                        $(this).css("background-color", "#fddfdf")
                                    })
                                }else{
                                    $(this).closest('padding').find(term[target.i].en).each(function() {
                                        $(this).css("background-color", "#fddfdf")
                                    })
                                }
                            }
                        }
                    )
                    $(term[i].en).mouseout(//去高亮
                        function (event) {
                            var target = event.currentTarget
                            $(this).css("background-color", "")
                            $(term[target.i].en + ".scroll").css("background-color", "")
                            if($(this).hasClass('highlight') || term[target.i].highlight){
                                if($(this).closest('pronounScope').length > 0){
                                    $(this).closest('pronounScope').find(term[target.i].en).each(function() {
                                        $(this).css("background-color", "")
                                    })
                                }else{
                                    $(this).closest('padding').find(term[target.i].en).each(function() {
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
                            if(!element.classList.contains('irreplaceable')){
                                if(term[i].part[j].hasOwnProperty('replace'))element.innerHTML = term[i].part[j].replace
                                else element.innerHTML = term[i].part[j].cn
                            }
                        }
                    )
                }
                if(mode){
                    $(term[i].en).each((index, element) => {//高亮
                        element.i = i
                        $(element).mouseover((event) => {
                            const target = event.currentTarget
                            const termIndex = target.i
                            const currentTerm = term[termIndex] // 获取当前术语对象
                            
                            if (!currentTerm) return // 安全校验
                        
                            currentTerm.part.forEach((part) => { // 使用数组迭代代替 for...in
                                const enSelector = part.en
                                // 智能颜色选择：优先使用部件颜色，次用主术语颜色，带透明度
                                const color = part.termedPart 
                                    ? (part.color || currentTerm.color) + '60' // 60 表示 60% 透明度
                                    : currentTerm.color
                                
                                // 同时高亮主元素和滚动容器中的对应部件
                                $(element).children(enSelector).add(`${currentTerm.en}.scroll ${enSelector}`)
                                       .css('background-color', color)
                            })
                        })
                        
                        $(element).mouseout((event) => {
                            const target = event.currentTarget
                            const termIndex = target.i
                            const currentTerm = term[termIndex]
                            
                            if (!currentTerm) return
                        
                            currentTerm.part.forEach((part) => {
                                const enSelector = part.en
                                // 一次性清除两个区域的背景色
                                $(element).children(enSelector).add(`${currentTerm.en}.scroll ${enSelector}`)
                                       .css('background-color', '')
                            })
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
                                            var target = event.currentTarget
                                            if (scroll.outerHTML.startsWith("<" + term[target.i].en.toLowerCase() + " ")) {
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
                                element.i = i
                                element.j = j
                                $(element).mouseover((event) => {
                                    var target = event.currentTarget
                                    if(term[target.i].part[target.j].color){
                                        $(term[target.i].part[target.j].en + ".scroll").css("background-color", term[target.i].part[j].color + '60')
                                    }else{
                                        $(term[target.i].part[target.j].en + ".scroll").css("background-color", term[target.i].color + '60')
                                    }
                                })
                                $(element).mouseout((event) => {
                                    var target = event.currentTarget
                                    $(term[target.i].part[target.j].en + ".scroll").css("background-color", "")
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
                                                    var target = event.currentTarget
                                                    if (scroll.outerHTML.startsWith("<" + term[target.i].part[target.j].en.toLowerCase() + " ")) {
                                                        if (!(scroll.classList.contains('fadeOnly'))) {
                                                            scroll.scrollIntoView({ behavior: 'smooth' })
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
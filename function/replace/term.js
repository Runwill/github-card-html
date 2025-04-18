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
                                    $("#example-tabs").foundation('selectTab', 'panel_term', 1)
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
                    $(term[i].en).each((index, element) => {
                        element.i = i // 通过元素属性存储索引
                        term_highlight(term,element)
                    })
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
                        term_highlight(term,element,'divided')
                    })
                    document.querySelectorAll(term[i].en).forEach(//滚动
                        element => {
                            element.addEventListener(
                                'dblclick', function (event) {
                                    event.stopPropagation()
                                    $("#example-tabs").foundation('selectTab', 'panel_term', 1)
                                    document.querySelectorAll(".scroll").forEach(
                                        scroll => {
                                            var target = event.currentTarget
                                            if (scroll.outerHTML.startsWith("<" + term[target.i].en.toLowerCase() + " ")) {
                                                if (!(scroll.classList.contains('fadeOnly'))) {
                                                    scroll.scrollIntoView({ behavior: 'smooth' })
                                                    $(scroll).stop(true).fadeTo(200, 0).fadeTo(1000, 1)
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

                                term_highlight(term,element,'part')
                                
                            })
                            document.querySelectorAll(term[i].part[j].en).forEach(//滚动
                                element => {
                                    element.addEventListener(
                                        'dblclick', function (event) {
                                            event.stopPropagation()
                                            $("#example-tabs").foundation('selectTab', 'panel_term', 1)
                                            document.querySelectorAll(".scroll").forEach(
                                                scroll => {
                                                    var target = event.currentTarget
                                                    if (scroll.outerHTML.startsWith("<" + term[target.i].part[target.j].en.toLowerCase() + " ")) {
                                                        if (!(scroll.classList.contains('fadeOnly'))) {
                                                            scroll.scrollIntoView({ behavior: 'smooth' })
                                                            $(scroll).stop(true).fadeTo(200, 0).fadeTo(1000, 1)
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

function term_highlight(term,element,mode='') {
    const HIGHLIGHT_OPACITY = '60'

    function getHighlightColor(baseColor) {
        return baseColor ? `${baseColor}${HIGHLIGHT_OPACITY}` : ''
    }

    $(element).mouseover((event) => {
        const target = event.currentTarget
        const currentTerm = term[target.i]
        
        if(mode=='divided'){
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
        }else if(mode=='part'){
            const currentPart = currentTerm?.part[target.j]

            const highlightColor = getHighlightColor(currentPart.color || currentTerm.color)

            $(`${currentPart.en}.scroll`).css({
                'background-color': highlightColor,
                'transition': 'background-color 0.3s ease'
            })
        }else{
            // 基础高亮逻辑
            $(target).css("background-color", currentTerm.color)
            $(`${currentTerm.en}.scroll`).css("background-color", currentTerm.color)
            
            // 特殊高亮处理 判断是否为代词，如果是，自动选取武将段落或一般段落为作用域
            if ($(target).hasClass('highlight') || currentTerm.highlight) {
                const containerType = $(target).closest('pronounScope').length > 0 
                    ? 'pronounScope' 
                    : 'padding'
                
                $(target).closest(containerType)
                       .find(currentTerm.en)
                       .css("background-color", "#fddfdf")
            }
        }
    }).mouseout((event) => {
        const target = event.currentTarget
        const currentTerm = term[target.i]
        
        if(mode=='divided'){
            currentTerm.part.forEach((part) => {
                const enSelector = part.en
                // 一次性清除两个区域的背景色
                $(element).children(enSelector).add(`${currentTerm.en}.scroll ${enSelector}`)
                       .css('background-color', '')
            })
        }else if(mode=='part'){
            const currentPart = currentTerm?.part[target.j]

            $(`${currentPart.en}.scroll`).css({
                'background-color': '',
                'transition': 'background-color 0.3s ease'
            })
        }else{
            // 清除基础高亮
            $(target).css("background-color", "")
            $(`${currentTerm.en}.scroll`).css("background-color", "")
            
            // 清除特殊高亮
            if ($(target).hasClass('highlight') || currentTerm.highlight) {
                const containerType = $(target).closest('pronounScope').length > 0 
                    ? 'pronounScope' 
                    : 'padding'
                
                $(target).closest(containerType)
                       .find(currentTerm.en)
                       .css("background-color", "")
            }
        }
    })
}
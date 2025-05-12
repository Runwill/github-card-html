function replace_term(path, mode, paragraphs = document) {
    fetch(path).then(response => response.json()).then(term => {
        for (var i in term) {
            if (!term[i].part) {//不分段术语
                $(paragraphs).find(term[i].en).each(function() { //替换
                    if (!$(this).hasClass('irreplaceable') && !(term[i].irreplaceable)) {
                        if (!term[i].epithet) {
                            if(term[i].cn) {
                                if(term[i].replace) $(this).html(term[i].replace)
                                else $(this).html(term[i].cn)
                            }
                            else $(this).html(term[i].en)
                        }
                        else {
                            if (!this.getAttribute("epithet")) $(this).html(term[i].epithet[0].cn)
                            else $(this).html(term[i].epithet[this.getAttribute("epithet")].cn)
                        }
                    }
                    if(mode){
                        $(this).on('dblclick', function (event) {
                            event.stopPropagation()
                            $("#example-tabs").foundation('selectTab', 'panel_term', 1)
                            $(".scroll").each(function() {
                                var target = event.currentTarget
                                if (this.outerHTML.startsWith("<" + target.tagName.toLowerCase() + " ")) {
                                    if (!$(this).hasClass('fadeOnly')) this.scrollIntoView({ behavior: "smooth" })
                                    $(this).fadeTo(200, 0).fadeTo(1000, 1)
                                }
                            })
                        })
                    }
                })
                if(mode){
                    $(paragraphs).find(term[i].en).each((index, element) => {
                        element.i = i // 通过元素属性存储索引
                        term_highlight(term, element)
                    })
                }
            }
            else {//分段术语
                for (var j in term[i].part) {//替换
                    $(paragraphs).find(term[i].part[j].en).each(function() {
                        if(!$(this).hasClass('irreplaceable')){
                            if(term[i].part[j].hasOwnProperty('replace'))$(this).html(term[i].part[j].replace)
                            else $(this).html(term[i].part[j].cn)
                        }
                    })
                }
                if(mode){
                    $(paragraphs).find(term[i].en).each((index, element) => { //高亮
                        element.i = i
                        term_highlight(term, element, 'divided')

                    }).each(function() { //滚动
                        $(this).on('dblclick', function (event) {
                            event.stopPropagation()
                            $("#example-tabs").foundation('selectTab', 'panel_term', 1)
                            $(".scroll").each(function() {
                                var target = event.currentTarget
                                if (this.outerHTML.startsWith("<" + term[target.i].en.toLowerCase() + " ")) {
                                    if (!($(this).hasClass('fadeOnly'))) {
                                        this.scrollIntoView({ behavior: 'smooth' })
                                        $(this).stop(true).fadeTo(200, 0).fadeTo(1000, 1)
                                    }
                                }
                            })
                        })
                    })
                    for (var j in term[i].part) {
                        if (term[i].part[j].termedPart){ //高亮
                            $(paragraphs).find(term[i].part[j].en).each((index, element) => {
                                element.i = i
                                element.j = j
                                term_highlight(term, element, 'part')

                            }).each(function() { //滚动
                                $(this).on('dblclick', function (event) {
                                    event.stopPropagation()
                                    $("#example-tabs").foundation('selectTab', 'panel_term', 1)
                                    $(".scroll").each(function() {
                                        var target = event.currentTarget
                                        if (this.outerHTML.startsWith("<" + term[target.i].part[target.j].en.toLowerCase() + " ")) {
                                            if (!($(this).hasClass('fadeOnly'))) {
                                                this.scrollIntoView({ behavior: 'smooth' })
                                                $(this).stop(true).fadeTo(200, 0).fadeTo(1000, 1)
                                            }
                                        }
                                    })
                                })
                            })
                        }
                    }
                }
            }
        }
    })
}

function term_highlight(term, element, mode='') {
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
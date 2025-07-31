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
                        termHighlight(term, element)
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
                        termHighlight(term, element, 'divided')

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
                                termHighlight(term, element, 'part')

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
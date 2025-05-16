function elementReplaceCheck(key,name,event){
    const clickedButton = event.target
    fetch('base/term/dynamic.json').then(response => response.json()).then(term => {
        const targetObject = term.find(item => item.en === key)
        const partLength = targetObject ? targetObject.part.length : 0
        if(term_status[name] >= partLength - 1){
            reset_color(clickedButton)
            clickedButton.classList.add('button_color_blue')
            term_status[name] = 0
            elementReplace(name + String(partLength - 1), name + '0')
        }else if(term_status[name] < partLength - 1){
            reset_color(clickedButton)
            clickedButton.classList.add('button_color_red')
            term_status[name] = term_status[name] + 1
            elementReplace(name + String(term_status[name] - 1), name + String(term_status[name]))
        }else{
            reset_color(clickedButton)
            clickedButton.classList.add('button_color_red')
            term_status[name] = 1
            elementReplace(name + '0', name + '1')
        }
    })
}
function pronounReplaceCheck(event){
    if(term_status['pronoun'] == 0){
        reset_color(event.target)
        event.target.classList.add('button_color_blue')
        term_status['pronoun'] = 1
    }else{
        reset_color(event.target)
        event.target.classList.add('button_color_red')
        term_status['pronoun'] = 0
    }
    pronounCheck()
}

function pronounCheck(paragraphs = document){
    if(term_status['pronoun'] != 0){
        term_status['pronoun'] = 1
        add_pronoun(paragraphs)
    }else{
        term_status['pronoun'] = 0
        for(const i of [1, 2, 3]){
            $(paragraphs).find('pronoun'+i).each(function() { //替换
                if(this.innerHTML.endsWith('</pronounname>')){
                    this.innerHTML = this.innerHTML.slice(0, -28)
                }
            })
        }
    }
}

function reset_color(target){
    target.classList.remove('button_color_blue')
    target.classList.remove('button_color_red')
}

function elementReplace(name1,name2){
    document.querySelectorAll(name1).forEach(function(element) {
        let newElement = document.createElement(name2)
        newElement.innerHTML = element.innerHTML
        element.parentNode.replaceChild(newElement, element)
    })
    replace_term('base/term/dynamic.json')
}
function add_pronoun(paragraphs = document){
    // 定义一个数组，包含三个代名词：甲、乙、丙
    const pronounName = ['甲','乙','丙']
    // 使用for...of循环遍历数组[1, 2, 3]
    for(const i of [1, 2, 3]){
        $(paragraphs).find('pronoun'+i).each(function() { //替换
            if(!this.innerHTML.endsWith('</pronounname>')){
                this.innerHTML = this.innerHTML + '<pronounName>' + pronounName[i-1] + '</pronounName>'
            }
        })
    }
}
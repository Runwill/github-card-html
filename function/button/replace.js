function elementReplaceCheck(key,name,event){
    const clickedButton = event.target
    fetch('base/term/dynamic.json').then(response => response.json()).then(term => {
        const targetObject = term.find(item => item.en === key)
        const partLength = targetObject ? targetObject.part.length : 0
        if(term_status[name] >= partLength - 1){
            clickedButton.style.background='#8698ff'
            term_status[name] = 0
            elementReplace(name + String(partLength - 1), name + '0')
        }else if(term_status[name] < partLength - 1){
            clickedButton.style.background='#ff8686'
            term_status[name] = term_status[name] + 1
            elementReplace(name + String(term_status[name] - 1), name + String(term_status[name]))
        }else{
            clickedButton.style.background='#ff8686'
            term_status[name] = 1
            elementReplace(name + '0', name + '1')
            //textReplace('base/term/dynamic.json')
        }
    })
}
function pronounReplaceCheck(event){
    if(term_status['pronoun'] == 0){
        event.target.style.background='#8698ff'
        term_status['pronoun'] = 1
        pronounAdd()
    }else{
        event.target.style.background='#ff8686'
        term_status['pronoun'] = 0
        for(const i of [1, 2, 3]){
            document.querySelectorAll('pronoun'+i).forEach(//替换
                element => {
                    element.innerHTML = element.innerHTML.slice(0, -28)
                }
            )
        }
    }
}
function elementReplace(name1,name2){
    document.querySelectorAll(name1).forEach(function(element) {
        let newElement = document.createElement(name2)
        newElement.innerHTML = element.innerHTML
        element.parentNode.replaceChild(newElement, element)
    })
    textReplace('base/term/dynamic.json')
}
function pronounAdd(){
    const pronounName = ['甲','乙','丙']
    for(const i of [1, 2, 3]){
        document.querySelectorAll('pronoun'+i).forEach(//替换
            element => {
                element.innerHTML = element.innerHTML + '<pronounName>' + pronounName[i-1] + '</pronounName>'
            }
        )
    }
}
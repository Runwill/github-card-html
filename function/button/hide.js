function elementHideCheck(name,event){
    const clickedButton = event.target
        if(term_status[name] == 1){
            clickedButton.style.background='#ff8686'
            term_status[name] = 0
            $(name).each(function() {
                $(this).css('display','none')
            })
        }else if(term_status[name] == 0){
            clickedButton.style.background='#8698ff'
            term_status[name] = 1
            $(name).each(function() {
                $(this).css('display','inline')
            })
        }else{
            clickedButton.style.background='#ff8686'
            term_status[name] = 0
            $(name).each(function() {
                $(this).css('display','none')
            })
        }
}
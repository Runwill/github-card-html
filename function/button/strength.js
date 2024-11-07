function check_strength(){
    if(localStorage.getItem('strength') == null){
        localStorage.setItem('strength', 0)
    }
    const strength_name = [
        '太平',
        '升平',
        '衰乱'
    ]
    document.querySelectorAll('.strength_title').forEach(
        element => {
            element.innerHTML = strength_name[Number(localStorage.getItem('strength'))]
        }
    )
}
function change_strength(){
    if(Number(localStorage.getItem('strength')) > 1){
        localStorage.setItem('strength', 0)
    }else{
        localStorage.setItem('strength', Number(localStorage.getItem('strength')) + 1)
    }
    location.reload()
}
$(function () {
    $(document).ready(function () {
        $(document).foundation()
    })
    check_strength()
})
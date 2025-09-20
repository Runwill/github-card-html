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
    const cur = Number(localStorage.getItem('strength')) || 0;
    localStorage.setItem('strength', (cur + 1) % 3);
    location.reload()
}
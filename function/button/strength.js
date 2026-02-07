const STRENGTH_NAMES = ['太平','升平','衰乱'];
function check_strength(){
    document.querySelectorAll('.strength_title').forEach(
        element => {
            element.innerHTML = STRENGTH_NAMES[Number(localStorage.getItem('strength')) || 0]
        }
    )
}
function change_strength(){
    const cur = Number(localStorage.getItem('strength')) || 0;
    localStorage.setItem('strength', (cur + 1) % 3);
    location.reload();
}
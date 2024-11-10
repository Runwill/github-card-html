function add_button_wave(){
    document.querySelectorAll('.button').forEach(button => {
        button.addEventListener('click', function(e){
            let rect = e.target.getBoundingClientRect();
            let x = e.clientX - rect.left
            let y = e.clientY - rect.top

            let ripples = document.createElement('span')
            ripples.style.left = x + 'px'
            ripples.style.top = y + 'px'
            this.appendChild(ripples)

            setTimeout(() => {
                ripples.remove()
            }, 1000)
        })
    })
}
$(function () {
    $(document).ready(function () {
        $(document).foundation()
    })
    add_button_wave()
})
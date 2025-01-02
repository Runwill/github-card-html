function decompress(path){
    fetch(path).then(response => response.json()).then(compression => {
        for(var i in compression){
            document.querySelectorAll(compression[i].name).forEach(
                element => {
                    element.innerHTML = compression[i].pre + element.innerHTML +compression[i].suf
                }
            )
        }
    })
}
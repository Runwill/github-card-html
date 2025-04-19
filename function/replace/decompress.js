function decompress(path,paragraphs = document){
    fetch(path).then(response => response.json()).then(compression => {
        for(var i in compression){
            $(paragraphs).find(compression[i].name).each(function() {
                $(this).html(compression[i].pre + $(this).html() + compression[i].suf)
            })
        }
    })
}
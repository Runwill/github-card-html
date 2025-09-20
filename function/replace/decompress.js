function decompress(path, paragraphs = document){
    fetchJsonCached(path).then(compression => {
        for (var i in compression){
            $(paragraphs).find(compression[i].name).each(function() {
                $(this).html(compression[i].pre + $(this).html() + compression[i].suf)
            })
        }
    })
}
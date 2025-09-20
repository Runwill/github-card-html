function replace_character_name(path, paragraphs = document){
    fetchJsonCached(path).then(character => {
        const characterID = character.map(c => c.id).sort((a, b) => a - b)
        const idToName = new Map(character.map(c => [c.id, c.name]))
        for (let i = 0; i < characterID.length; i++){
            const id = characterID[i]
            const $elements = $(paragraphs).find('.characterID' + id)
            $elements.html(idToName.get(id)).data('characterPosition', i)
            bindDblclickAndHighlight($elements, {
                onDblclick: (_, el) => {
                    const className = el.classList[0]
                    scrollActions.scrollToClassWithCenter('panel_character', className, '.container', { behavior: 'smooth', stop: true })
                },
                getScrollSelector: (el) => '.' + el.classList[0] + '.scroll',
                highlightColor: '#9ca8ee'
            })
        }
    })
}
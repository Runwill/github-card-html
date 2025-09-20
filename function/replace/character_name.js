function replace_character_name(path, paragraphs = document){
    fetch(path).then(response => response.json()).then(character => {
        // 获取武将ID并排序
        const characterID = character.map(c => c.id).sort((a, b) => a - b)
        // 预构建 id -> name 映射，避免二重遍历
        const idToName = new Map()
        for (let j = 0; j < character.length; j++) {
            idToName.set(character[j].id, character[j].name)
        }

        for (let i = 0; i < characterID.length; i++){
            const id = characterID[i]
            const characterName = idToName.get(id)
                        const $elements = $(paragraphs).find(".characterID" + id)
                        // 写入文本
                        $elements.html(characterName).data('characterPosition', i)
                        // 统一绑定事件与高亮
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
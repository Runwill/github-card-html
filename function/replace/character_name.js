function replace_character_name(path, paragraphs = document){
    // 返回 Promise，供进度条与启动流程感知完成时机
    return fetchJsonCached(path).then(character => {
        const characterID = character.map(c => c.id).sort((a, b) => a - b)
        const idToName = new Map(character.map(c => [c.id, c.name]))
        const classPrefix = 'characterID' // 目标类名前缀
        const dataKey = 'characterProcessed' // 处理标记

        // 定义处理单个节点的函数
        const processLogic = (node) => {
            const $node = $(node);
            // 提取 ID (如 characterID1001 -> 1001)
            let id = null;
            // 遍历 classList 寻找匹配前缀类名
            for (let i = 0; i < node.classList.length; i++) {
                if (node.classList[i].startsWith(classPrefix)) {
                    id = parseInt(node.classList[i].slice(classPrefix.length), 10);
                    break;
                }
            }
            if (id === null) return;
            
            // 填充名字
            const name = idToName.get(id);
            if (name) $node.html(name);
            
            // 绑定交互
            bindDblclickAndHighlight($node, {
                onDblclick: (_, el) => {
                    const className = classPrefix + id;
                    scrollActions.scrollToClassWithCenter('panel_character', className, '.container', { behavior: 'smooth', stop: true })
                },
                getScrollSelector: (el) => '.' + classPrefix + id + '.scroll',
                highlightColor: '#9ca8ee'
            });
        };

        if (window.scanAndObserve) {
            window.scanAndObserve({
                root: paragraphs,
                processor: processLogic,
                dataKey: dataKey,
                selector: `[class*="${classPrefix}"]`
            });
        }
    })
}
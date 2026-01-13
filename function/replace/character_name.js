function replace_character_name(path, paragraphs = document){
    // 返回 Promise，供进度条与启动流程感知完成时机
    return fetchJsonCached(path).then(character => {
        const characterID = character.map(c => c.id).sort((a, b) => a - b)
        const idToName = new Map(character.map(c => [c.id, c.name]))
        const classPrefix = 'characterID' // 目标类名前缀
        const dataKey = 'characterProcessed' // 处理标记

        // 定义处理单个节点的函数
        const processNode = (node) => {
            // 防止重复处理
            if (node.dataset[dataKey]) return;

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

            node.dataset[dataKey] = "true";
        };

        // 批量处理现有节点
        characterID.forEach(id => {
            // 使用更精确的查找，遍历所有匹配前缀的元素
            // 这里为了与 MutationObserver 统一，可以在循环中根据 ID 查找
            // 或者直接查找所有包含该类名的元素
            // 原逻辑是按 ID 分组处理，这里保持一致
            const $elements = $(paragraphs).find('.' + classPrefix + id);
            $elements.each(function() {
                if (!this.dataset[dataKey]) processNode(this);
            });
        });

        // 动态监听 (MutationObserver)
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // ELEMENT_NODE
                                // 1. 检查自身
                                if (node.className && typeof node.className === 'string' && node.className.includes(classPrefix)) {
                                     processNode(node);
                                }
                                // 2. 检查子节点
                                const $found = $(node).find(`[class*="${classPrefix}"]`);
                                $found.each(function() {
                                    if (!this.dataset[dataKey]) processNode(this);
                                });
                            }
                        });
                    }
                });
            });
            const targetNode = (paragraphs === document) ? document.body : paragraphs;
            if(targetNode) observer.observe(targetNode, { childList: true, subtree: true });
            
            if(!window.characterObservers) window.characterObservers = [];
            window.characterObservers.push(observer);
        }
    })
}
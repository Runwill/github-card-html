function replace_card_name(path, paragraphs = document){
  // 返回 Promise，供进度条与启动流程感知完成时机
  return fetchJsonCached(path).then(card => {
    // 建立速查 Map: enName -> CardObject
    // 优化：仅针对 TagName 匹配 (去除类名支持以提升性能)
    const cardMap = new Map();
    card.forEach((info, index) => {
       if (info.en) cardMap.set(info.en.toUpperCase(), { ...info, index });
    });
    
    const dataKey = 'cardProcessed';

    // 定义单节点处理
    const processNode = (node) => {
        // 防止重复处理
        if (node.dataset[dataKey]) return;

        const tagName = node.tagName; // 浏览器保证TagName为大写
        const info = cardMap.get(tagName);
        
        if (!info) return;

        const $node = $(node);
        $node.html(info.cn).data('index', info.index);
        bindDblclickAndHighlight($node, {
            onDblclick: (_, el) => {
                // 修复：panel_card 现在的结构是 <ATTACK class="scroll">, 所以选择器应该是 "ATTACK.scroll"
                // 旧代码生成 "ATTACK.scroll" 是正确的 class 逻辑吗？
                // 如果 selector 是 "tagName.class", jQuery 会将其解释为 <tagName class="class">
                // 所以 "ATTACK.scroll" 符合 HTML 结构 <attack class="scroll"> (HTML 不区分大小写)
                
                // 但为了绝对稳健，特别是在 scrollActions.scrollToSelectorAndFlash 内部:
                // 由于 cardMap 里的 info.en 可能是 "Attack" (MixedCase)
                // "Attack.scroll" -> <Attack class="scroll">
                // 浏览器解析 HTML 标签名为大写 (ATTACK)，但 jQuery 选择器通常不区分标签大小写。

                const en = info.en; 
                // 调用专门的 Tag 滚动方法，以防选择器解析问题
                // scrollActions.scrollToTagAndFlash 会做额外的 tagName 过滤
                scrollActions.scrollToTagAndFlash('panel_card', en, { behavior: 'smooth', stop: true });
            },
            getScrollSelector: (el) => info.en + '.scroll',
            getHighlightColor: (el) => {
                const t = info.type;
                return t == '基本' ? '#c2f3c2' : (t == '锦囊' ? '#f3e6c2' : '');
            }
        });
        node.dataset[dataKey] = "true";
    };

    // 初始批量处理
    card.forEach((info) => {
        const $elements = $(paragraphs).find(info.en);
        $elements.each(function(){
            if (!this.dataset[dataKey]) processNode(this);
        });
    });

    // 动态监听
    if (window.MutationObserver) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { 
                             // 1. 检查自身
                             processNode(node); 
                             
                             // 2. 检查子节点 (优化版：直接遍历 DOM 树)
                             const descendants = node.getElementsByTagName('*');
                             for (let j = 0; j < descendants.length; j++) {
                                 processNode(descendants[j]);
                             }
                        }
                    });
                }
            });
        });
        const targetNode = (paragraphs === document) ? document.body : paragraphs;
        if(targetNode) observer.observe(targetNode, { childList: true, subtree: true });
        if(!window.cardObservers) window.cardObservers = [];
        window.cardObservers.push(observer);
    }
  })
}
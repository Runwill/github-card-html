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

    // 定义单节点处理逻辑 (无去重检查，�?scanAndObserve 负责)
    const processLogic = (node) => {
        const tagName = node.tagName; // 浏览器保证TagName为大�?
        const info = cardMap.get(tagName);
        
        if (!info) return;

        const $node = $(node);
        $node.html(info.cn).data('index', info.index);
        bindDblclickAndHighlight($node, {
            onDblclick: (_, el) => {
                const en = info.en; 
                scrollActions.scrollToTagAndFlash('panel_card', en, { behavior: 'smooth', stop: true });
            },
            getScrollSelector: (el) => info.en + '.scroll',
            getHighlightColor: (el) => {
                const t = info.type;
                return t == '基本' ? '#c2f3c2' : (t == '锦囊' ? '#f3e6c2' : '');
            }
        });
    };

    // 使用通用扫描与监听器
    if (window.scanAndObserve) {
        window.scanAndObserve({
            root: paragraphs,
            processor: processLogic,
            dataKey: dataKey,
            tagNameMap: cardMap
        });
    } else {
        console.warn('scanAndObserve not found, falling back to legacy manual loop');
        // Legacy Fallback (just in case utils load fails)
        const processNode = (node) => {
             if (node.dataset[dataKey]) return;
             processLogic(node);
             node.dataset[dataKey] = 'true';
        };
        card.forEach((info) => {
             $(paragraphs).find(info.en).each(function(){ processNode(this); });
        });
    }
  })
}
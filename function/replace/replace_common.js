(function() {
    /**
     * 通用的 DOM 扫描与 MutationObserver 封装
     * 用于 card_name, term, character_name, skill_name 等替换脚本
     */
    function scanAndObserve(config) {
        const { root, processor, dataKey, tagNameMap, selector, manualCheck } = config;

        const processSafe = (node) => {
            if (node.nodeType !== 1) return;
            if (node.dataset[dataKey]) return;
            if (tagNameMap && !tagNameMap.has(node.tagName)) return;
            if (manualCheck && !manualCheck(node)) return;
            processor(node);
            node.dataset[dataKey] = 'true';
        };

        // 统一扫描函数：初始扫描和 MutationObserver 回调复用
        const scanNodes = (parent) => {
            if (selector) {
                const all = parent.querySelectorAll(selector);
                for (let i = 0; i < all.length; i++) processSafe(all[i]);
            } else {
                const all = parent.getElementsByTagName('*');
                for (let i = 0; i < all.length; i++) processSafe(all[i]);
            }
        };

        const targetRoot = root || document.body;
        if (!targetRoot) return;

        // 1. 初始全量扫描
        scanNodes(targetRoot);

        // 2. 动态监听
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType !== 1) return;
                            processSafe(node);
                            scanNodes(node);
                        });
                    }
                });
            });
            observer.observe(targetRoot, { childList: true, subtree: true });
        }
    }

    window.scanAndObserve = scanAndObserve;
})();

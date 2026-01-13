(function() {
    /**
     * 通用的 DOM 扫描与 MutationObserver 封装
     * 用于 card_name, term, character_name, skill_name 等替换脚本
     */

    /**
     * 启动全量扫描并挂载 MutationObserver
     * @param {object} config
     * @param {HTMLElement} config.root - 扫描根节点
     * @param {Function} config.processor - 核心处理逻辑: (node) => void
     * @param {string} config.dataKey - dataset key，用于去重检查 (自动处理: 若 node.dataset[dataKey] 存在则跳过)
     * @param {Map<string, any>} [config.tagNameMap] - 优化模式A: 仅处理 tagName 在 Map 中的元素 (必须大写)
     * @param {string} [config.selector] - 优化模式B: 使用 querySelectorAll 查找目标元素
     * @param {Function} [config.manualCheck] - 优化模式C: 手动检查函数 (node) => boolean，用于极其复杂的匹配
     * @param {Object} [config.context] - 上下文数据，传给 processor 的第二个参数 (optional)
     */
    function scanAndObserve(config) {
        const { root, processor, dataKey, tagNameMap, selector, manualCheck, context } = config;
        
        // 内部封装处理函数：负责去重检查
        const processSafe = (node) => {
            if (node.nodeType !== 1) return; // 仅处理 Element
            if (node.dataset[dataKey]) return;
            
            // 额外检查逻辑
            if (tagNameMap && !tagNameMap.has(node.tagName)) return;
            if (manualCheck && !manualCheck(node)) return;

            processor(node, context);
            node.dataset[dataKey] = 'true';
        };

        const targetRoot = root || document.body;
        if (!targetRoot) return;

        // --- 1. 初始全量扫描 ---
        if (tagNameMap) {
            // TagName 优化路径: getElementsByTagName('*') 遍历检查 Map
            const all = targetRoot.getElementsByTagName('*');
            for (let i = 0; i < all.length; i++) {
                if (tagNameMap.has(all[i].tagName)) {
                    processSafe(all[i]);
                }
            }
        } else if (selector) {
            // Selector 优化路径
            const all = targetRoot.querySelectorAll(selector);
            for (let i = 0; i < all.length; i++) {
                processSafe(all[i]);
            }
        } else {
            // Fallback: 暴力全扫
            const all = targetRoot.getElementsByTagName('*');
            for (let i = 0; i < all.length; i++) {
                processSafe(all[i]);
            }
        }

        // --- 2. 动态监听 ---
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType !== 1) return;

                            // 1. Check self
                            processSafe(node);

                            // 2. Check descendants
                            if (tagNameMap) {
                                const descendants = node.getElementsByTagName('*');
                                for (let j = 0; j < descendants.length; j++) {
                                    if (tagNameMap.has(descendants[j].tagName)) {
                                        processSafe(descendants[j]);
                                    }
                                }
                            } else if (selector) {
                                const descendants = node.querySelectorAll(selector);
                                for (let j = 0; j < descendants.length; j++) {
                                    processSafe(descendants[j]);
                                }
                            } else {
                                const descendants = node.getElementsByTagName('*');
                                for (let j = 0; j < descendants.length; j++) {
                                    processSafe(descendants[j]);
                                }
                            }
                        });
                    }
                });
            });

            observer.observe(targetRoot, { childList: true, subtree: true });
            
            if (!window.globalObservers) window.globalObservers = [];
            window.globalObservers.push({ key: dataKey, observer });
        }
    }

    window.scanAndObserve = scanAndObserve;
})();

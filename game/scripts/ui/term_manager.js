(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    let cachedData = null; // 存储用于重新着色的数据

    // 撤销 term manager 中的 HTML 生成。
    // 相反，我们提供数据访问助手，以便渲染器可以直接构建 DOM 元素。

    function getTermData(key) {
        if (!cachedData) return null;
        const lowerKey = key.toLowerCase();
        for (let k in cachedData) {
            const item = cachedData[k];
            if (k === key || k.toLowerCase() === lowerKey) return item;
            if (item.partMap) {
               if (item.partMap[key]) return item.partMap[key];
               for(let pKey in item.partMap) {
                   if(pKey.toLowerCase() === lowerKey) return item.partMap[pKey];
               }
            }
        }
        return null;
    }

    // 只保留颜色加载和数据缓存功能
    function populateTerms(data) {
        window.Game.UI.termColors = window.Game.UI.termColors || new Map();
        
        // 1. 加载颜色
        for (let key in data) {
            const item = data[key];
            if (item.en && item.color) window.Game.UI.termColors.set(item.en, item.color);
            if (item.part && Array.isArray(item.part)) {
                item.partMap = {};
                item.part.forEach(p => {
                    if (p.en) {
                        item.partMap[p.en] = p;
                        if (p.color || item.color) window.Game.UI.termColors.set(p.en, p.color || item.color);
                    }
                });
            } else if (item.part) { // 遗留对象支持
                 item.partMap = item.part;
                 for(let pKey in item.part){
                     const p = item.part[pKey];
                     if(p.en) {
                         if (p.color || item.color) window.Game.UI.termColors.set(p.en, p.color || item.color);
                     }
                 }
            }
        }
    }

    function refreshTerms() {
         if (!cachedData) return;
         populateTerms(cachedData);
         window.Game.UI.updateUI?.();
    }

    function loadTermColors() {
        if (!window.endpoints || !window.fetchJsonCached) return;
        
        Promise.all([
            window.fetchJsonCached(window.endpoints.termDynamic()),
            window.fetchJsonCached(window.endpoints.termFixed())
        ]).then(([dyn, fixed]) => {
            cachedData = { ...dyn, ...fixed };
            populateTerms(cachedData);
            
            // 暴露数据供其他模块使用 (例如 GameText 可能需要查询)
            window.Game.UI.termData = cachedData;

            // Updated to check Game.GameState directly as per refactoring
            if (window.Game.GameState?.isGameRunning) window.Game.UI.updateUI?.();
        }).catch(e => console.error("Failed to load terms", e));
    }

    const observer = new MutationObserver(refreshTerms);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    window.Game.UI.loadTermColors = loadTermColors;
    window.Game.UI.getTermData = getTermData;

})();

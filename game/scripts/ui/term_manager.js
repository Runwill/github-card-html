(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    let cachedData = null; // 存储用于重新着色的数据

    // 撤销 term manager 中的 HTML 生成。
    // 相反，我们提供数据访问助手，以便渲染器可以直接构建 DOM 元素。

    function getTermData(key) {
        if (!cachedData) return null;
        
        // 1. 直接匹配
        if (cachedData[key]) return cachedData[key];
        
        // 2. 不区分大小写的搜索
        const lowerKey = key.toLowerCase();
        for (let k in cachedData) {
            if (k.toLowerCase() === lowerKey) return cachedData[k];
        }

        // 3. 在部件内部搜索（如果有）
        for (let k in cachedData) {
            const item = cachedData[k];
            if (item.partMap) {
               if (item.partMap[key]) return item.partMap[key];
               // 部件小写检查
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
         if (window.Game.UI.updateUI) window.Game.UI.updateUI();
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

            if (window.Game.Core && window.Game.Core.GameState.isGameRunning && window.Game.UI.updateUI) {
                window.Game.UI.updateUI();
            }
        }).catch(e => console.error("Failed to load terms", e));
    }

    // Theme Observer
    const observer = new MutationObserver((mutations) => {
        for(let m of mutations) {
            if (m.type === 'attributes' && m.attributeName === 'data-theme') {
                refreshTerms();
            }
        }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    window.Game.UI.loadTermColors = loadTermColors;
    window.Game.UI.getTermData = getTermData;

})();

(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * 渲染公共区域 (Public Board Areas)
     * e.g. 处理区 (Treatment Area), 牌堆 (Pile) 等
     */
    function renderBoard(GameState, GameText) {
        if (!GameText || !GameState) return;

        // 1. 处理区 (Treatment Area)
        if (GameState.treatmentArea) {
            const el = document.getElementById('header-treatment-area');
            if (el) {
                // Add Inspector
                el.setAttribute('data-inspector-type', 'area');
                el.setAttribute('data-area-name', 'treatmentArea');
                
                const key = GameState.treatmentArea.name || 'treatmentArea';
                const html = GameText.render(key);
                if (el.innerHTML !== html) el.innerHTML = html;
            }
            // 渲染卡牌
            if (window.Game.UI.renderCardList) {
                // 注意：Treatment Area 是公共区域，不属于任何特定 Role，dropZoneId 设为 'treatmentArea'
                window.Game.UI.renderCardList('treatment-area-container', GameState.treatmentArea.cards || [], 'treatmentArea');
            }
        }

        // 2. 将来可以在这里添加 DiscardPile, DrawPile 等可视化逻辑
    }

    // 导出
    window.Game.UI.renderBoard = renderBoard;

})();

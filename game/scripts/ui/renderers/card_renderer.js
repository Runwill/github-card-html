(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // 辅助：渲染卡牌列表
    function renderCardList(containerId, cards, dropZoneId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.setAttribute('data-drop-zone', dropZoneId);
        container.innerHTML = '';
        
        const GameText = window.Game.UI.GameText;

        cards.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card-placeholder';
            
            // "卡牌名全部重构为第一张卡牌的名称"
            // 这里理解为：使用 GameText 系统渲染卡牌
            // 假设 card 对象或字符串就是卡牌的 Key (如 'Sha')
            const cardName = typeof card === 'string' ? card : (card.name || card.key);
            
            if (GameText) {
                // 使用新的 GameText 系统渲染
                cardEl.innerHTML = GameText.render(cardName);
            } else {
                // 回退逻辑
                if (typeof i18n !== 'undefined' && i18n.t) {
                    const key = `game.card.${cardName}`;
                    const text = i18n.t(key, { defaultValue: cardName });
                    cardEl.innerHTML = text; 
                } else {
                    cardEl.textContent = cardName;
                }
            }
            
            if (window.Game.UI.Interactions && window.Game.UI.Interactions.initDrag) {
                window.Game.UI.Interactions.initDrag(cardEl, card, dropZoneId, index);
            }
            container.appendChild(cardEl);
        });
    }

    // 导出到全局命名空间供其他模块使用
    window.Game.UI.renderCardList = renderCardList;
})();

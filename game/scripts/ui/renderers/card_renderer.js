(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // 辅助：渲染卡牌列表
    function renderCardList(containerId, cards, dropZoneId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.setAttribute('data-drop-zone', dropZoneId);
        
        const GameText = window.Game.UI.GameText;
        const currentChildren = Array.from(container.children);

        // 差量更新 (Diffing) 策略：复用现有 DOM 节点，避免暴力清空导致的闪烁和 Hover 状态丢失
        cards.forEach((card, index) => {
            const cardName = typeof card === 'string' ? card : (card.name || card.key);
            
            // 尝试复用现有位置的节点
            let cardEl = currentChildren[index];
            let isNewNode = false;

            if (!cardEl) {
                cardEl = document.createElement('div');
                cardEl.className = 'card-placeholder';
                container.appendChild(cardEl);
                isNewNode = true;
            }

            // 添加 Inspector 所需的元数据
            cardEl.setAttribute('data-inspector-type', 'card');
            cardEl.setAttribute('data-area-name', dropZoneId);
            cardEl.setAttribute('data-card-index', index);

            // 检查内容是否需要更新 (Dirty Checking)
            // 使用 data-card-key 记录上次渲染的内容
            if (isNewNode || cardEl.getAttribute('data-card-key') !== cardName) {
                if (GameText) {
                    // 重要：这里是关键连接点。
                    // 1. 我们传入 cardName (例如 "Sha")
                    // 2. GameText.render 返回 "<Sha></Sha>"
                    // 3. 浏览器将其渲染为自定义标签
                    // 4. card_name.js 的 MutationObserver 捕获到 <SHA> 并将其替换为中文
                    cardEl.innerHTML = GameText.render(cardName);
                } else {
                    if (typeof i18n !== 'undefined' && i18n.t) {
                        const key = `game.card.${cardName}`;
                        const text = i18n.t(key, { defaultValue: cardName });
                        cardEl.innerHTML = text; 
                    } else {
                        cardEl.textContent = cardName;
                    }
                }
                cardEl.setAttribute('data-card-key', cardName);
            }

            // 总是更新交互元数据 (例如 index 可能变化)
            // 注意：依赖 initDrag 的实现能够处理重复调用 (例如覆盖 ondragstart 属性而非不断 addEventListener)
            if (window.Game.UI.Interactions && window.Game.UI.Interactions.initDrag) {
                window.Game.UI.Interactions.initDrag(cardEl, card, dropZoneId, index);
            }
        });

        // 移除多余的节点
        while (container.children.length > cards.length) {
            container.removeChild(container.lastChild);
        }
    }

    // 导出到全局命名空间供其他模块使用
    window.Game.UI.renderCardList = renderCardList;
})();

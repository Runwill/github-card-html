(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // 布局计算器：自动调整平铺区域的 margin 以防止换行
    function updateSpreadLayouts() {
        const containers = document.querySelectorAll('.area-spread');
        containers.forEach(container => {
            const width = container.clientWidth;
            // 考虑 Padding (左右各 15px)
            const contentWidth = width - 30; 
            
            const cards = Array.from(container.children).filter(c => 
                c.classList.contains('card-placeholder') && 
                c.style.display !== 'none' && 
                !c.classList.contains('drag-placeholder-hidden')
            );
            
            if (cards.length <= 1) {
                container.style.setProperty('--dynamic-card-margin', '10px');
                return;
            }

            const cardWidth = 100; // 标准卡牌宽度
            const maxGap = 10; // 默认间距
            
            // W = w + (n-1)(w + margin)
            // (W - w) / (n-1) = w + margin
            // margin = (W - w) / (n-1) - w
            
            const totalRequired = cards.length * cardWidth + (cards.length - 1) * maxGap;
            
            if (totalRequired <= contentWidth) {
                container.style.setProperty('--dynamic-card-margin', `${maxGap}px`);
            } else {
                const availableSpace = contentWidth - cardWidth; // 给最后一张牌留足空间
                const step = availableSpace / (cards.length - 1);
                let newMargin = step - cardWidth;
                
                // 限制最大重叠 (例如露出至少 20px) => margin >= 20 - 100 = -80
                const minVisibleSpine = 30;
                if (newMargin < (minVisibleSpine - cardWidth)) {
                    newMargin = minVisibleSpine - cardWidth;
                }
                
                container.style.setProperty('--dynamic-card-margin', `${newMargin}px`);
            }
        });
    }

    // 设置观察者以自动触发布局更新
    const observer = new MutationObserver((mutations) => {
        let needsUpdate = false;
        mutations.forEach(m => {
            if (m.type === 'childList') {
                // 检查是否是 .area-spread 容器或其子项
                if (m.target.classList.contains('area-spread')) needsUpdate = true;
            }
        });
        
        // 使用防抖或 requestAnimationFrame 避免过度计算
        if (needsUpdate) {
            requestAnimationFrame(updateSpreadLayouts);
        }
    });
    
    // 初始化监听
    // 需要等待 DOM 加载？renderCardList 会在之后运行
    // 监听整个 document body 或者 具体的容器？
    // 为了性能，最好不要监听 body。
    // 我们可以在 renderCardList 里做一次全量检查，或者在 container 创建时 attach。
    // 简单的方案：在 renderCardList 每次完事后调用 updateSpreadLayouts。
    
    // 辅助：渲染卡牌列表
    function renderCardList(containerId, cards, dropZoneId) {
        if (window.Game.UI.isRenderingSuspended) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        container.setAttribute('data-drop-zone', dropZoneId);
        
        const GameText = window.Game.UI.GameText;
        const currentChildren = Array.from(container.children);

        // 差量更新 (Diffing) 策略：复用现有 DOM 节点，避免暴力清空导致的闪烁和 Hover 状态丢失
        cards.forEach((card, index) => {
            // 模型层保证 card 是 Card 实例
            const cardName = card.name || card.key; // 兼容可能不仅叫 name 的情况，但主要依据 Model 定义
            
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

        // 触发布局更新 (如果是平铺区域)
        if (container.classList.contains('area-spread')) {
            updateSpreadLayouts();
            
            // 绑定 Observer 以处理后续的拖拽变化 (如果尚未绑定)
            if (!container._layoutObserver) {
                const obs = new MutationObserver(() => requestAnimationFrame(updateSpreadLayouts));
                obs.observe(container, { childList: true });
                container._layoutObserver = obs;
            }
        }
    }

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        requestAnimationFrame(updateSpreadLayouts);
    });

    // 导出到全局命名空间供其他模块使用
    window.Game.UI.renderCardList = renderCardList;

    // 辅助：获取区域的渲染配置
    function getAreaConfig(containerId) {
        // 简单匹配：通过 DOM 关系或 ID 反查 GameState
        // 这里暂时通过 dropZoneId/AreaName 约定
        // 实际上最好 renderCardList 能够直接接收 Area 对象而不是 ID
    }
})();

(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    function clamp(min, value, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getVisibleCards(container) {
        return Array.from(container.children).filter(c =>
            c.classList.contains('card-placeholder') &&
            c.style.display !== 'none' &&
            !c.classList.contains('drag-placeholder-hidden')
        );
    }

    function getCardWidth(cards) {
        if (cards[0]) {
            const rectWidth = cards[0].getBoundingClientRect().width;
            if (rectWidth > 0) return rectWidth;
        }
        return 100;
    }

    // 平铺区域：空间充足时保持常规牌距，空间不足时恢复受控露边重叠。
    function updateSpreadLayouts() {
        const containers = document.querySelectorAll('.area-spread');
        containers.forEach(container => {
            const cards = getVisibleCards(container);

            if (cards.length <= 1) {
                container.style.removeProperty('--dynamic-card-margin');
                return;
            }

            const cs = getComputedStyle(container);
            const padL = parseFloat(cs.paddingLeft) || 0;
            const padR = parseFloat(cs.paddingRight) || 0;
            const contentWidth = Math.max(0, container.clientWidth - padL - padR);
            const cardWidth = getCardWidth(cards);
            const maxGap = clamp(4, cardWidth * 0.1, 10);
            const minVisibleSpine = clamp(20, cardWidth * 0.3, 30);
            const minMargin = minVisibleSpine - cardWidth;
            const availableMargin = (contentWidth - cards.length * cardWidth) / (cards.length - 1);
            const nextMargin = clamp(minMargin, availableMargin, maxGap);

            container.style.setProperty('--dynamic-card-margin', `${nextMargin}px`);
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
    function renderCardList(containerId, cards, dropZoneId, options = {}) {
        if (window.Game.UI.isRenderingSuspended) return;

        const container = document.getElementById(containerId);
        if (!container) return;

        container.setAttribute('data-drop-zone', dropZoneId);
        
        const GameText = window.Game.UI.GameText;
        // Filter out static content (like labels) so they aren't removed or treated as card slots
        const currentChildren = Array.from(container.children).filter(c => 
            c.classList.contains('card-placeholder')
        );

        // 差量更新 (Diffing) 策略：复用现有 DOM 节点，避免暴力清空导致的闪烁和 Hover 状态丢失
        cards.forEach((card, index) => {
            // 模型层保证 card 是 Card 实例
            const originalName = card.name || card.key;
            
            // 决定渲染的卡牌名称：是否强制背面
            
            // 1. 基础判断：强制背面参数
            let showBack = !!options.forceFaceDown;

            // 2. 也是最重要的：可见性系统
            // 规则：
            // A. 如果 card.visibility == 0 (公开)，则可见。
            // B. 如果 card.visibility == 1 (私有/背面)，则检查可见性列表。
            //    如果 当前视角角色 (Main Player) 在 visibleTo 列表中，则可见。
            //    否则，渲染为卡背。
            
            if (!showBack && card.visibility === 1) {
                // 默认不可见，需检查权限
                showBack = true; // 先假设不可见
                
                const GameState = window.Game.GameState;
                
                // 获取当前主视角角色 ID（使用 perspectiveIndex）
                const perspIdx = (GameState.perspectiveIndex != null) ? GameState.perspectiveIndex : 0;
                const mainPlayer = GameState.players && GameState.players[perspIdx];
                
                if (mainPlayer && card.visibleTo && card.visibleTo.has(mainPlayer.id)) {
                    showBack = false; // 对我可见
                }
            }
            
            let renderName = originalName;
            if (showBack) {
                renderName = 'CardBack';
            }
            
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

            // 标记堆叠模式下的顶牌 (Top Card Logic)
            if (index === cards.length - 1) {
                cardEl.classList.add('is-top-card');
            } else {
                cardEl.classList.remove('is-top-card');
            }

            // 检查内容是否需要更新 (Dirty Checking)
            // 准备渲染内容
            let htmlContent = '';
            if (renderName !== 'CardBack') {
                 htmlContent = GameText.render(renderName);
            }

            // 注入位置序号 (如果开启)
            // REFACTOR: Moved to CSS Counter in game_viewer.css for cleaner drag handling.
            // When dragged out, the counter style won't apply, effectively removing the badge.
            if (options.showIndex) {
                 // Mark container as ordered to trigger CSS counters
                 container.classList.add('is-ordered-list');
            } else {
                 container.classList.remove('is-ordered-list');
            }

            // 使用标准化 SafeRender 替代手动 data-card-key 检查
            window.Game.UI.safeRender(cardEl, htmlContent, renderName);

            // ── 处理区：显示移动者角色名 ──
            // 仅在沙盒/手动模式下，处理区的牌显示上次移动者名称
            if (dropZoneId === 'treatmentArea' && card._lastMoveBy) {
                let moverLabel = cardEl.querySelector('.card-mover-label');
                const moverInfo = card._lastMoveBy;
                const moverHTML = GameText.render('Character', { id: moverInfo.characterId, name: moverInfo.name });
                const moverKey = `mover:${moverInfo.id}:${moverInfo.name}`;
                
                if (!moverLabel) {
                    moverLabel = document.createElement('div');
                    moverLabel.className = 'card-mover-label';
                    cardEl.appendChild(moverLabel);
                }
                window.Game.UI.safeRender(moverLabel, moverHTML, moverKey);
            } else {
                // 不在处理区或无移动者信息时移除标签
                const existingLabel = cardEl.querySelector('.card-mover-label');
                if (existingLabel) existingLabel.remove();
            }

            // 兼容 CSS: game_cards.css 依赖 [data-card-key='CardBack'] 选择器来显示牌背
            // 因此必须同步 data-card-key 属性
            if (cardEl.getAttribute('data-card-key') !== renderName) {
                cardEl.setAttribute('data-card-key', renderName);
            }

            // 总是更新交互元数据 (例如 index 可能变化)
            // 注意：依赖 initDrag 的实现能够处理重复调用 (例如覆盖 ondragstart 属性而非不断 addEventListener)
            if (window.Game.UI.Interactions && window.Game.UI.Interactions.initDrag) {
                // 关键点：即使渲染为卡背，通过 initDrag 传递的仍是**真实的 card 对象**
                // 这样拖拽逻辑中使用的数据是真实的，放置时也是真实的。
                window.Game.UI.Interactions.initDrag(cardEl, card, dropZoneId, index);
            }
        });

        // 移除多余的节点
        // FIX: 不要直接比较 container.children.length，因为其中可能包含非卡牌元素（如Label标签）
        // 应该只计算和移除 .card-placeholder 类型的元素
        const extraChildren = Array.from(container.children).filter(c => 
            c.classList.contains('card-placeholder')
        );
        
        // 从列表末尾开始移除多余的卡牌元素
        for (let i = cards.length; i < extraChildren.length; i++) {
            extraChildren[i].remove();
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

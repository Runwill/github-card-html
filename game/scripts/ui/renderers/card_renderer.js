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

    function hasVisibleRole(visibleTo, roleId) {
        if (roleId === undefined || roleId === null || !visibleTo) return false;
        if (visibleTo instanceof Set) return visibleTo.has(roleId);
        if (Array.isArray(visibleTo)) return visibleTo.includes(roleId);
        if (typeof visibleTo.has === 'function') return visibleTo.has(roleId);
        return false;
    }

    function isCardVisibleToPerspective(card, visibilityState) {
        const visibility = visibilityState && visibilityState.visibility !== undefined
            ? visibilityState.visibility
            : card && card.visibility;

        if (visibility !== 1) return true;

        const GameState = window.Game.GameState;
        const perspIdx = GameState && GameState.perspectiveIndex != null ? GameState.perspectiveIndex : 0;
        const mainPlayer = GameState && GameState.players && GameState.players[perspIdx];
        const visibleTo = visibilityState && visibilityState.visibleTo ? visibilityState.visibleTo : card && card.visibleTo;

        return !!(mainPlayer && hasVisibleRole(visibleTo, mainPlayer.id));
    }

    function getCardRenderState(card, options = {}) {
        const originalName = card && (card.name || card.key) || 'CardBack';
        const visibilityState = options.visibilityState || null;
        const showBack = !!options.forceFaceDown || !isCardVisibleToPerspective(card, visibilityState);
        const renderName = showBack ? 'CardBack' : originalName;
        const GameText = window.Game.UI.GameText;

        return {
            renderName,
            htmlContent: renderName === 'CardBack' || !GameText ? '' : GameText.render(renderName),
            isFaceUp: renderName !== 'CardBack'
        };
    }

    function getCardAppearanceForArea(card, area, options = {}) {
        const Models = window.Game.Models;
        const visibilityState = Models && Models.getCardVisibilityForArea
            ? Models.getCardVisibilityForArea(area)
            : null;
        const state = getCardRenderState(card, { ...options, visibilityState });
        return {
            innerHTML: state.htmlContent,
            dataCardKey: state.renderName,
            isFaceUp: state.isFaceUp
        };
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
            const minMargin = -cardWidth;
            const availableMargin = (contentWidth - cards.length * cardWidth) / (cards.length - 1);
            const nextMargin = clamp(minMargin, availableMargin, maxGap);

            container.style.setProperty('--dynamic-card-margin', `${nextMargin}px`);
        });
    }

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
            const renderState = getCardRenderState(card, options);
            const renderName = renderState.renderName;
            
            // 尝试复用现有位置的节点
            let cardEl = currentChildren[index];
            let isNewNode = false;

            if (!cardEl) {
                cardEl = document.createElement('div');
                cardEl.className = 'card-placeholder';
                container.appendChild(cardEl);
                isNewNode = true;
            }

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
            const htmlContent = renderState.htmlContent;

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
    window.Game.UI.getCardRenderState = getCardRenderState;
    window.Game.UI.getCardAppearanceForArea = getCardAppearanceForArea;

})();

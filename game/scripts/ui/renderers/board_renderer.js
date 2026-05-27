window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * 辅助：统一渲染堆叠型区域（牌堆/弃牌堆）
     */
    function renderPileLikeArea(containerId, pileData, dropZoneId, isFaceDown) {
        if (!pileData) return;
        
        const container = document.getElementById(containerId);
        if (container) {
            container.setAttribute('data-inspector-type', 'area');
            container.setAttribute('data-area-name', dropZoneId);
            // Mark the container if it enforces face-down cards (for Drag Animation Logic)
            if (isFaceDown) {
                container.setAttribute('data-force-facedown', 'true');
            } else {
                container.removeAttribute('data-force-facedown');
            }

            container.classList.add('area-stacked');
            container.classList.remove('area-spread');

            const options = isFaceDown ? { forceFaceDown: true } : {};
            window.Game.UI.renderCardList?.(containerId, pileData.cards || [], dropZoneId, options);
            // 绑定点击检视器
            setupPileInspector(container, pileData.cards || [], isFaceDown);
        }
    }

    function renderAreaHeader(elementId, area, fallbackKey, GameText) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const key = area?.name || fallbackKey;
        el.setAttribute('data-area-name', fallbackKey);
        el.setAttribute('data-inspector-type', 'area');
        window.Game.UI.safeRender(el, GameText.render(key), `area:${key}`);
    }

    /**
     * 渲染公共区域 (Public Board Areas)
     * e.g. 处理区 (Treatment Area), 牌堆 (Pile) 等
     */
    function renderBoard(GameState, GameText) {
        if (!GameState) return;

        // 1. 处理区 (Treatment Area)
        if (GameState.treatmentArea) {
            renderAreaHeader('header-treatment-area', GameState.treatmentArea, 'treatmentArea', GameText);
            // 渲染卡牌
            const container = document.getElementById('treatment-area-container');
            if (container && GameState.treatmentArea) {
                container.setAttribute('data-inspector-type', 'area');
                container.setAttribute('data-area-name', 'treatmentArea');
                const isCentered = !!GameState.treatmentArea.centered;
                const isStacked = GameState.treatmentArea.apartOrTogether === 1;
                container.classList.toggle('area-centered', isCentered);
                container.classList.toggle('area-left', !isCentered);
                container.classList.toggle('area-stacked', isStacked);
                container.classList.toggle('area-spread', !isStacked);
            }
            window.Game.UI.renderCardList?.('treatment-area-container', GameState.treatmentArea.cards || [], 'treatmentArea');
        }

        // 2. 牌堆 (Draw Pile)
        if (GameState.pile) {
            renderAreaHeader('header-pile', GameState.pile, 'pile', GameText);
        }
        renderPileLikeArea('pile-container', GameState.pile, 'pile', true);

        // 3. 弃牌堆 (Discard Pile)
        if (GameState.discardPile) {
            renderAreaHeader('header-discard-pile', GameState.discardPile, 'discardPile', GameText);
        }
        renderPileLikeArea('discard-pile-container', GameState.discardPile, 'discardPile', false);
    }

    /**
     * 设置点击式检视器
     *
     * @param {HTMLElement} container - 鼠标交互的目标容器 (如 pile-container)
     * @param {Array} cards - 数据源
     * @param {boolean} forceBack - 是否强制显示背面（在此模式下仅做参考，实际查看器会显示）
     */
    function setupPileInspector(container, cards, forceBack) {
        if (!container) return;
        
        // 查找或创建 Overlay 容器（位于父级 .board-pile-slot 内）
        const wrapper = container.closest('.board-pile-slot');
        if (!wrapper) return;

        // 绑定数据到 wrapper
        wrapper._inspectorCards = cards;
        wrapper._inspectorForceBack = forceBack;
        wrapper.setAttribute('data-inspector-type', 'area');
        wrapper.setAttribute('data-area-name', container.getAttribute('data-area-name') || container.getAttribute('data-drop-zone') || '');

        // 防止重复绑定
        if (!wrapper.hasAttribute('data-click-bound')) {
            wrapper.setAttribute('data-click-bound', 'true');
            wrapper.style.cursor = 'pointer';

            wrapper.addEventListener('click', (e) => {
                // 如果正在拖拽，不触发
                if (window.Game.UI._RoleUtils?.isCardDragging?.()) return;

                // Stop propagation to prevent global "Click Outside" handlers from closing existing windows immediately
                e.stopPropagation();

                const currentCards = wrapper._inspectorCards || [];
                // Retrieve the bound forceBack state
                const currentForceBack = wrapper._inspectorForceBack;

                const isDeck = wrapper.querySelector('#header-pile') != null; // 简单判断，或者检查容器 ID
                const GameText = window.Game.UI.GameText;
                // Fix: use 'pile' instead of 'drawPile' to match main view term
                const title = GameText.render(isDeck ? 'pile' : 'discardPile');
                const sourceId = isDeck ? 'pile' : 'discardPile'; // Map to GameState keys
                
                const openOptions = {
                    forceFaceDown: currentForceBack,
                    areaName: title
                };

                const openViewer = window.Game.UI.toggleCardViewer || window.Game.UI.openCardViewer;
                if (openViewer) openViewer(title, currentCards, sourceId, openOptions);
                else {
                    console.warn("Game.UI.openCardViewer not ready");
                }
            });
        }
    }

    // 导出
    window.Game.UI.renderBoard = renderBoard;

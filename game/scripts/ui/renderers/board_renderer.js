(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * 辅助：统一渲染堆叠型区域（牌堆/弃牌堆）
     */
    function renderPileLikeArea(containerId, pileData, dropZoneId, isFaceDown) {
        if (!pileData) return;
        
        const container = document.getElementById(containerId);
        if (container) {
            // Mark the container if it enforces face-down cards (for Drag Animation Logic)
            if (isFaceDown) {
                container.setAttribute('data-force-facedown', 'true');
            } else {
                container.removeAttribute('data-force-facedown');
            }

            container.classList.add('area-stacked');
            container.classList.remove('area-spread');

            if (window.Game.UI.renderCardList) {
                // 仅当明确要求面朝下时才传递 options
                const options = isFaceDown ? { forceFaceDown: true } : {};
                window.Game.UI.renderCardList(containerId, pileData.cards || [], dropZoneId, options);
            }
            // 初始化轮盘检视器
            setupPileInspector(container, pileData.cards || [], isFaceDown);
        }
    }

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
                const renderKey = `area:${key}`;

                // 使用 safeRender 替代手动脏检查，现在 render_utils.js 已确保加载
                window.Game.UI.safeRender(el, GameText.render(key), renderKey);
            }
            // 渲染卡牌
            if (window.Game.UI.renderCardList) {
                // 应用对齐方式
                const container = document.getElementById('treatment-area-container');
                if (container && GameState.treatmentArea) {
                    if (GameState.treatmentArea.centered) {
                        container.classList.add('area-centered');
                        container.classList.remove('area-left');
                    } else {
                        container.classList.add('area-left');
                        container.classList.remove('area-centered');
                    }
                    
                    if (GameState.treatmentArea.apartOrTogether === 1) { // 1 = 堆叠
                         container.classList.add('area-stacked');
                         container.classList.remove('area-spread');
                    } else { // 0 = 平铺
                         container.classList.add('area-spread');
                         container.classList.remove('area-stacked');
                    }
                }

                // 注意：Treatment Area 是公共区域，不属于任何特定 Role，dropZoneId 设为 'treatmentArea'
                window.Game.UI.renderCardList('treatment-area-container', GameState.treatmentArea.cards || [], 'treatmentArea');
            }
        }

        // 2. 牌堆 (Draw Pile)
        if (GameState.pile) {
            const el = document.getElementById('header-pile');
            if (el) {
                window.Game.UI.safeRender(el, GameText.render('pile'), 'area:pile');
            }
        }
        renderPileLikeArea('pile-container', GameState.pile, 'pile', true);

        // 3. 弃牌堆 (Discard Pile)
        if (GameState.discardPile) {
            const el = document.getElementById('header-discard-pile');
            if (el) {
                window.Game.UI.safeRender(el, GameText.render('discardPile'), 'area:discardPile');
            }
        }
        renderPileLikeArea('discard-pile-container', GameState.discardPile, 'discardPile', false);
    }

    /**
     * 设置轮盘式检视器
     *
     * @param {HTMLElement} container - 鼠标交互的目标容器 (如 pile-container)
     * @param {Array} cards - 数据源
     * @param {boolean} forceBack - 是否强制显示背面
     */
    /**
     * 设置点击式检视器 (原轮盘检视器已移除)
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

        // Cleanup legacy inspector overlay
        const oldOverlay = wrapper.querySelector('.pile-inspector-overlay');
        if (oldOverlay) oldOverlay.remove();
        
        // 绑定数据到 wrapper
        wrapper._inspectorCards = cards;
        wrapper._inspectorForceBack = forceBack;

        // 防止重复绑定
        if (!wrapper.hasAttribute('data-click-bound')) {
            wrapper.setAttribute('data-click-bound', 'true');
            wrapper.style.cursor = 'pointer';

            wrapper.addEventListener('click', (e) => {
                // 如果正在拖拽，不触发
                if (window.Game && window.Game.UI && window.Game.UI.DragState && window.Game.UI.DragState.isDragging) return;

                // Stop propagation to prevent global "Click Outside" handlers from closing existing windows immediately
                e.stopPropagation();

                const currentCards = wrapper._inspectorCards || [];
                // Retrieve the bound forceBack state
                const currentForceBack = wrapper._inspectorForceBack;

                const isDeck = wrapper.querySelector('#header-pile') != null; // 简单判断，或者检查容器 ID
                const title = isDeck ? 'Deck' : 'Discard Pile';
                const sourceId = isDeck ? 'pile' : 'discardPile'; // Map to GameState keys
                
                if (window.Game.UI.toggleCardViewer) {
                    window.Game.UI.toggleCardViewer(title, currentCards, sourceId, {
                        forceFaceDown: currentForceBack 
                    });
                } else if (window.Game.UI.openCardViewer) {
                    window.Game.UI.openCardViewer(title, currentCards, sourceId, {
                        forceFaceDown: currentForceBack 
                    });
                } else {
                    console.warn("Game.UI.openCardViewer not ready");
                }
            });
        }
    }

    // 导出
    window.Game.UI.renderBoard = renderBoard;

})();

window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    function clamp(min, value, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getSpreadItemSelector(container) {
        return container.getAttribute('data-spread-item-selector') || '.card-placeholder';
    }

    function getVisibleSpreadItems(container) {
        const selector = getSpreadItemSelector(container);
        return Array.from(container.children).filter(child =>
            child.matches(selector) &&
            child.style.display !== 'none' &&
            !child.classList.contains('drag-placeholder-hidden')
        );
    }

    function getSpreadItemWidth(items) {
        const rectWidth = items[0]?.getBoundingClientRect().width || 0;
        return rectWidth > 0 ? rectWidth : 100;
    }

    function hasVisibleRole(visibleTo, roleId) {
        if (roleId === undefined || roleId === null || !visibleTo) return false;
        if (visibleTo instanceof Set) return visibleTo.has(roleId);
        if (Array.isArray(visibleTo)) return visibleTo.includes(roleId);
        if (typeof visibleTo.has === 'function') return visibleTo.has(roleId);
        return false;
    }

    function isCardVisibleToPerspective(card, visibilityState) {
        const visibility = visibilityState?.visibility ?? card?.visibility;

        if (visibility !== 1) return true;

        const GameState = window.Game.GameState;
        const perspIdx = GameState?.perspectiveIndex ?? 0;
        const mainPlayer = GameState?.players?.[perspIdx];
        const visibleTo = visibilityState?.visibleTo || card?.visibleTo;

        return !!(mainPlayer && hasVisibleRole(visibleTo, mainPlayer.id));
    }

    function getCardRenderState(card, options = {}) {
        const originalName = card?.name || card?.key || 'CardBack';
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

    function composeCardShellHTML(faceHTML, annotationsHTML = '') {
        return `<div class="card-face-content">${faceHTML || ''}</div>`
            + `<div class="card-annotations">${annotationsHTML || ''}</div>`;
    }

    function getCardAppearanceForArea(card, area, options = {}) {
        const visibilityState = window.Game.Models?.getCardVisibilityForArea?.(area) || null;
        const state = getCardRenderState(card, { ...options, visibilityState });
        return {
            innerHTML: composeCardShellHTML(state.htmlContent),
            dataCardKey: state.renderName,
            isFaceUp: state.isFaceUp
        };
    }

    function directChildWithClass(parent, className) {
        return Array.from(parent.children).find(child => child.classList.contains(className)) || null;
    }

    function ensureCardShell(cardEl) {
        let faceEl = directChildWithClass(cardEl, 'card-face-content');
        let annotationsEl = directChildWithClass(cardEl, 'card-annotations');

        if (!faceEl || !annotationsEl) {
            cardEl.innerHTML = '';
            delete cardEl.__lastRenderedContent;
            cardEl.removeAttribute('data-render-key');

            faceEl = document.createElement('div');
            faceEl.className = 'card-face-content';
            annotationsEl = document.createElement('div');
            annotationsEl.className = 'card-annotations';
            cardEl.append(faceEl, annotationsEl);
        }

        return { faceEl, annotationsEl };
    }

    function getCardDomKey(card, dropZoneId, index) {
        if (card && card.id !== undefined && card.id !== null) return `card:${String(card.id)}`;
        const fallbackName = card?.name || card?.key || 'CardBack';
        return `slot:${dropZoneId}:${index}:${fallbackName}`;
    }

    function buildCardNodeMap(cardNodes) {
        const nodeMap = new Map();
        cardNodes.forEach(cardNode => {
            const key = cardNode.getAttribute('data-card-dom-key') || cardNode.getAttribute('data-card-id');
            if (key && !nodeMap.has(key)) nodeMap.set(key, cardNode);
        });
        return nodeMap;
    }

    // 平铺区域：空间充足时保持常规牌/槽位间距，空间不足时恢复受控露边重叠。
    function updateSpreadLayouts() {
        const containers = document.querySelectorAll('.area-spread');
        containers.forEach(container => {
            const items = getVisibleSpreadItems(container);

            if (items.length <= 1) {
                container.style.removeProperty('--dynamic-card-margin');
                return;
            }

            const cs = getComputedStyle(container);
            const padL = parseFloat(cs.paddingLeft) || 0;
            const padR = parseFloat(cs.paddingRight) || 0;
            const contentWidth = Math.max(0, container.clientWidth - padL - padR);
            const itemWidth = getSpreadItemWidth(items);
            const maxGap = clamp(4, itemWidth * 0.1, 10);
            const minMargin = -itemWidth;
            const availableMargin = (contentWidth - items.length * itemWidth) / (items.length - 1);
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
        const renderCards = (cards || []).filter(Boolean);
        
        const GameText = window.Game.UI.GameText;
        // Filter out static content (like labels) so they aren't removed or treated as card slots
        const currentChildren = Array.from(container.children).filter(c => 
            c.classList.contains('card-placeholder') && !c.classList.contains('drag-placeholder-hidden')
        );
        const keyedChildren = buildCardNodeMap(currentChildren);
        const usedChildren = new Set();
        const firstCardChild = currentChildren[0] || null;
        let previousCardChild = null;
        container.classList.toggle('is-ordered-list', !!options.showIndex);

        function placeCardChild(cardEl) {
            if (previousCardChild) {
                if (previousCardChild.nextSibling !== cardEl) {
                    container.insertBefore(cardEl, previousCardChild.nextSibling);
                }
            } else if (firstCardChild && firstCardChild !== cardEl) {
                container.insertBefore(cardEl, firstCardChild);
            } else if (!firstCardChild && cardEl.parentElement !== container) {
                container.appendChild(cardEl);
            }
            previousCardChild = cardEl;
        }

        // 差量更新 (Diffing) 策略：按牌 ID 复用 DOM 节点，避免中间插入/删除时牌身份错位。
        renderCards.forEach((card, index) => {
            const renderState = getCardRenderState(card, options);
            const renderName = renderState.renderName;
            const cardDomKey = getCardDomKey(card, dropZoneId, index);
            const cardId = card && card.id !== undefined && card.id !== null ? String(card.id) : '';
            
            // 尝试复用同一张牌的节点；旧页面首次加载无 key 时，再回退到原 index 复用。
            let cardEl = keyedChildren.get(cardDomKey);
            if (cardEl && usedChildren.has(cardEl)) cardEl = null;
            if (!cardEl) {
                const indexCandidate = currentChildren[index];
                if (indexCandidate && !usedChildren.has(indexCandidate) && !indexCandidate.getAttribute('data-card-dom-key')) {
                    cardEl = indexCandidate;
                }
            }
            if (!cardEl) {
                cardEl = document.createElement('div');
                cardEl.className = 'card-placeholder';
            }
            usedChildren.add(cardEl);
            placeCardChild(cardEl);

            const { faceEl, annotationsEl } = ensureCardShell(cardEl);

            cardEl.setAttribute('data-card-dom-key', cardDomKey);
            if (cardId) cardEl.setAttribute('data-card-id', cardId);
            else cardEl.removeAttribute('data-card-id');
            cardEl.setAttribute('data-area-name', dropZoneId);
            cardEl.setAttribute('data-card-index', index);
            cardEl.setAttribute('data-inspector-type', 'card');

            // 标记堆叠模式下的顶牌 (Top Card Logic)
            cardEl.classList.toggle('is-top-card', index === cards.length - 1);

            // 检查内容是否需要更新 (Dirty Checking)
            // 准备渲染内容
            const htmlContent = renderState.htmlContent;

            // 注入位置序号 (如果开启)
            // REFACTOR: Moved to CSS Counter in game_viewer.css for cleaner drag handling.
            // When dragged out, the counter style won't apply, effectively removing the badge.
            // 使用标准化 SafeRender 替代手动 data-card-key 检查
            window.Game.UI.safeRender(faceEl, htmlContent, renderName);

            // ── 处理区：显示移动者角色名 ──
            // 仅在沙盒/手动模式下，处理区的牌显示上次移动者名称
            if (dropZoneId === 'treatmentArea' && card._lastMoveBy) {
                let moverLabel = annotationsEl.querySelector('.card-mover-label');
                const moverInfo = card._lastMoveBy;
                const moverHTML = GameText.render('Character', { id: moverInfo.characterId, name: moverInfo.name });
                const moverKey = `mover:${moverInfo.id}:${moverInfo.name}`;
                
                if (!moverLabel) {
                    moverLabel = document.createElement('div');
                    moverLabel.className = 'card-mover-label';
                    annotationsEl.appendChild(moverLabel);
                }
                window.Game.UI.safeRender(moverLabel, moverHTML, moverKey);
            } else {
                // 不在处理区或无移动者信息时移除标签
                annotationsEl.querySelector('.card-mover-label')?.remove();
            }

            // 兼容 CSS: game_cards.css 依赖 [data-card-key='CardBack'] 选择器来显示牌背
            // 因此必须同步 data-card-key 属性
            if (cardEl.getAttribute('data-card-key') !== renderName) {
                cardEl.setAttribute('data-card-key', renderName);
            }

            // 总是更新交互元数据 (例如 index 可能变化)
            // 注意：依赖 initDrag 的实现能够处理重复调用 (例如覆盖 ondragstart 属性而非不断 addEventListener)
            window.Game.UI.Interactions?.initDrag?.(cardEl, card, dropZoneId, index);
        });

        // 移除多余的节点
        // FIX: 不要直接比较 container.children.length，因为其中可能包含非卡牌元素（如Label标签）
        // 应该只计算和移除 .card-placeholder 类型的元素
        currentChildren.forEach(cardNode => {
            if (!usedChildren.has(cardNode)) cardNode.remove();
        });

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
    window.Game.UI.updateSpreadLayouts = updateSpreadLayouts;

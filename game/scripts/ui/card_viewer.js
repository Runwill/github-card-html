(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // Registry of open viewers: sourceId -> { modal, cleanup }
    window.Game.UI.viewers = {};
    window.Game.UI.maxViewerZIndex = 11000; // Start higher than base modal

    // Global Click Handler for closing when clicking empty space
    document.addEventListener('mousedown', (e) => {
        // If we have no viewers, ignore
        if (Object.keys(window.Game.UI.viewers).length === 0) return;

        // If click target is inside ANY viewer, bring that viewer to front
        const clickedViewer = e.target.closest('.card-viewer-modal');
        if (clickedViewer) {
            clickedViewer.style.zIndex = ++window.Game.UI.maxViewerZIndex;
            return;
        }

        // If clicking on "Empty Space" (Game board background, not interactive elements)
        // We define "Empty Space" as strictly document body or specific containers?
        // Actually, previous logic was: if not inside modal, close.
        // But now we have multiple.
        // If I click ANYWHERE outside ALL modals, I should close ALL modals.
        
        // HOWEVER: We must distinguish between "Opening a new modal" (e.g. clicking a button) and "Clicking background".
        // Buttons usually stopPropagation or we check if target is interactive.
        // Let's rely on the fact that existing logic used 'click' on document.
        // If we use 'mousedown', we might catch it before buttons.
        // Use 'click' like before.
    });

    document.addEventListener('click', (e) => {
        // If click is inside ANY viewer, do nothing (handled by mousedown z-index logic)
        if (e.target.closest('.card-viewer-modal')) return;

        // Ignore clicks on buttons (likely interactions, or opening other windows)
        if (e.target.closest('button') || e.target.tagName === 'BUTTON') return;

        // 拖拽期间的合成 click 事件（pointerdown 在 viewer 内，pointerup 在 viewer 外）
        // 会导致 target 不在 .card-viewer-modal 内，但不应关闭 viewer
        if (document.body.classList.contains('is-global-dragging')) return;

        const now = Date.now();
        const viewers = Object.values(window.Game.UI.viewers);
        
        if (viewers.length > 0) {
            // Close all viewers that have been open for at least 200ms
            // This prevents immediate closing if the open event bubbles to document
            viewers.forEach(v => {
                if (now - v.openedAt > 200) {
                    if (v.cleanup) v.cleanup();
                }
            });
            
            // If we closed something, maybe we want to stop propagation? No need.
        }
    });

    // Global ESC Handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.Game.UI.closeAllViewers();
        }
    });

    window.Game.UI.closeAllViewers = function() {
        Object.keys(window.Game.UI.viewers).forEach(key => {
            const v = window.Game.UI.viewers[key];
            if (v && v.cleanup) v.cleanup();
        });
    };

    window.Game.UI.toggleCardViewer = function(title, cards, sourceId, options = {}) {
        if (window.Game.UI.viewers[sourceId]) {
            window.Game.UI.viewers[sourceId].cleanup();
        } else {
            window.Game.UI.openCardViewer(title, cards, sourceId, options);
        }
    };

    /**
     * Helper: Attach Drag-to-Move Logic to a Modal
     */
    function attachModalDrag(modal) {
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) return null;

        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onMouseDown = (e) => {
            if (e.button !== 0) return;
            // Ignore interaction elements
            if (e.target.closest('.card-placeholder') || e.target.closest('button')) return;
            
            // Bring to front
            modal.style.zIndex = ++window.Game.UI.maxViewerZIndex;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const style = window.getComputedStyle(modalContent);
            initialLeft = parseInt(style.left) || 0;
            initialTop = parseInt(style.top) || 0;
            
            modalContent.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
            
            document.addEventListener('mousemove', onMouseMoveDrag);
            document.addEventListener('mouseup', onMouseUpDrag);
        };

        const onMouseMoveDrag = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            modalContent.style.left = `${initialLeft + dx}px`;
            modalContent.style.top = `${initialTop + dy}px`;
        };

        const onMouseUpDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            modalContent.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMoveDrag);
            document.removeEventListener('mouseup', onMouseUpDrag);
        };

        modalContent.addEventListener('mousedown', onMouseDown);
        
        return () => { // Cleanup function
             modalContent.removeEventListener('mousedown', onMouseDown);
        };
    }

    function slotCardsAt(cards, index) {
        if (!Array.isArray(cards)) return [];
        if (Array.isArray(cards[index])) return cards[index];
        return cards[index] ? [cards[index]] : [];
    }

    function renderViewerSlot(sourceId, index, cards) {
        if (!window.Game.UI.renderCardList) return;
        const targetId = `viewer-slot-${sourceId}-${index}`;
        if (!document.getElementById(targetId)) return;
        window.Game.UI.renderCardList(targetId, cards, `${sourceId}:slot:${index}`, {
            skipLayout: true,
            forceFaceDown: false
        });
    }

    function renderViewerGrid(gridId, cards, sourceId, options) {
        if (!window.Game.UI.renderCardList) return;
        window.Game.UI.renderCardList(gridId, cards || [], sourceId, {
            skipLayout: true,
            showIndex: true,
            forceFaceDown: options && options.forceFaceDown
        });
    }

    function resolveViewerCards(sourceId, GameState) {
        if (sourceId === 'pile') return (GameState.pile && GameState.pile.cards) ? GameState.pile.cards : [];
        if (sourceId === 'discardPile') return (GameState.discardPile && GameState.discardPile.cards) ? GameState.discardPile.cards : [];
        if (sourceId === 'treatmentArea') return (GameState.treatmentArea && GameState.treatmentArea.cards) ? GameState.treatmentArea.cards : [];
        if (!sourceId.startsWith('role:') && !sourceId.startsWith('role-judge:')) return [];

        const isJudge = sourceId.startsWith('role-judge:');
        const roleId = parseInt(sourceId.replace('role-judge:', '').replace('role:', '').replace(':equip', ''));
        const player = GameState.players.find(p => p.id === roleId);
        const area = player && (isJudge ? player.judgeArea : player.hand);
        return (area && area.cards) ? area.cards : [];
    }

    // --- Card Viewer Modal Logic ---
    window.Game.UI.openCardViewer = function(title, cards, sourceId, options = {}) {
        // 1. Check if already open
        if (window.Game.UI.viewers[sourceId]) {
            const v = window.Game.UI.viewers[sourceId];
            // Bring to front
            v.modal.style.zIndex = ++window.Game.UI.maxViewerZIndex;
            // Highlight effect?
            const content = v.modal.querySelector('.modal-content');
            if (content) {
                content.animate([
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.05)' },
                    { transform: 'scale(1)' }
                ], { duration: 200 });
            }
            return; // Already open
        }

        // 2. Create DOM Structure
        const isSlotViewer = options.slots && Array.isArray(options.slots);
        const modal = document.createElement('div');
        modal.className = 'card-viewer-modal modal show' + (isSlotViewer ? ' card-viewer-modal--slots' : '');
        modal.id = `card-viewer-modal-${sourceId}`;
        modal.style.zIndex = ++window.Game.UI.maxViewerZIndex;
        
        // Offset slightly to prevent total overlap
        const count = Object.keys(window.Game.UI.viewers).length;
        const offset = count * 20; 
        
        modal.style.marginLeft = `${offset}px`;
        modal.style.marginTop = `${offset}px`;

        // Determine Layout
        let bodyContent = '';
        if (isSlotViewer) {
            // Layout: Multi-Slot (e.g. Equipment)
            // Note: We use a Wrapper for drop targeting and Label display.
            // The inner .equip-slot is the container for renderCardList but has pointer-events: none to allow pass-through.
            bodyContent = `<div class="equipment-slots-container">
                ${options.slots.map(slot => `
                    <div class="equip-slot-wrapper">
                        <div id="viewer-slot-${sourceId}-${slot.index}" 
                             class="equip-slot" 
                             data-slot="${slot.index}" 
                             data-drop-zone="${sourceId}:slot:${slot.index}">
                            <div class="equip-slot-label">${slot.label || ''}</div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        } else {
            // Layout: Standard Grid (Hand, Pile, Judge)
            // Note: Escape sourceId just in case, but usually safe for ID attribute if simple chars
            // We use simple string interpolation here.
            bodyContent = `<div id="card-viewer-grid-${sourceId}" class="card-grid scrollbar-hidden" data-drop-zone="${sourceId}"></div>`;
        }

        // Modal Content
        // Use auto width for slots to fit content tightly
        const bodyClass = isSlotViewer ? ' modal-body--slots' : '';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-body${bodyClass}">
                    <div id="card-viewer-watermark-${sourceId}" class="area-watermark"></div>
                    ${bodyContent}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 3. Populate Content
        const modalBody = modal.querySelector('.modal-body');
        const watermarkEl = document.getElementById(`card-viewer-watermark-${sourceId}`);
        // Scroll Target depends on layout
        const scrollTarget = options.slots ? null : document.getElementById(`card-viewer-grid-${sourceId}`);

        // Watermark Logic
        if (watermarkEl) {
            let ownerText = options.ownerName || '';
            let areaText = options.areaName || '';

            if (!areaText) {
                if (sourceId) {
                    const gameText = window.Game.UI.GameText ? window.Game.UI.GameText.render(sourceId) : sourceId;
                    if (gameText) areaText = gameText;
                }
                if (!areaText && title) areaText = title;
            }

            let html = '';
            if (ownerText) html += `<div class="watermark-owner">${ownerText}</div>`;
            if (areaText) html += `<div class="watermark-area">${areaText}</div>`;
            
            if (window.Game.UI.safeRender) {
                window.Game.UI.safeRender(watermarkEl, html, `viewer-wm:${sourceId}`);
            } else {
                watermarkEl.innerHTML = html;
            }
        }

        // Initial Card Render
        if (options.slots) {
            options.slots.forEach(slot => renderViewerSlot(sourceId, slot.index, slotCardsAt(cards, slot.index)));
        } else {
            renderViewerGrid(`card-viewer-grid-${sourceId}`, cards, sourceId, options);
        }

        // 4. Scrolling Animation Logic (Instance Scoped)
        // Only if scrollTarget exists (Grid Layout)
        let scrollRafId = null;
        let dragCleanup = null;

        if (scrollTarget) {
            // ... (Existing Scroll Logic for Grid) ...
            let scrollVelocity = 0;
            let scrollDirection = 0;

            const updateStartEndClasses = () => {
                 if (!modalBody || !scrollTarget) return;
                 const TOLERANCE = 5; 
                 const current = scrollTarget.scrollLeft;
                 const max = scrollTarget.scrollWidth - scrollTarget.clientWidth;
                 modalBody.classList.toggle('at-start', current <= TOLERANCE);
                 modalBody.classList.toggle('at-end', current >= max - TOLERANCE);
            };

            // Auto-scroll to end on open
            requestAnimationFrame(() => {
                scrollTarget.scrollLeft = scrollTarget.scrollWidth;
                updateStartEndClasses();
            });

            const ZONE_WIDTH = 80;
            const MAX_SPEED = 80;
            const SCROLL_ACCEL = 3.0;
            const SCROLL_FRICTION = 0.85;

            const updateScroll = () => {
                if (!document.body.contains(modal)) { 
                    scrollRafId = null;
                    return;
                }
                if (scrollDirection !== 0) {
                    scrollVelocity += scrollDirection * SCROLL_ACCEL;
                    if (scrollVelocity > MAX_SPEED) scrollVelocity = MAX_SPEED;
                    if (scrollVelocity < -MAX_SPEED) scrollVelocity = -MAX_SPEED;
                } else {
                    scrollVelocity *= SCROLL_FRICTION;
                    if (Math.abs(scrollVelocity) < 0.1) scrollVelocity = 0;
                }

                if (Math.abs(scrollVelocity) > 0.1) {
                    scrollTarget.scrollLeft += scrollVelocity;
                    updateStartEndClasses();
                    scrollRafId = requestAnimationFrame(updateScroll);
                } else if (scrollDirection !== 0) {
                    scrollRafId = requestAnimationFrame(updateScroll);
                } else {
                    scrollRafId = null;
                }
            };

            const onScrollEvent = () => requestAnimationFrame(updateStartEndClasses);
            scrollTarget.addEventListener('scroll', onScrollEvent, {passive: true});

            const onMouseMove = (e) => {
                const rect = modalBody.getBoundingClientRect();
                const relativeX = e.clientX - rect.left;
                if (relativeX >= 0 && relativeX < ZONE_WIDTH) {
                    scrollDirection = -1;
                    if (!scrollRafId) scrollRafId = requestAnimationFrame(updateScroll);
                } else if (relativeX > (rect.width - ZONE_WIDTH) && relativeX <= rect.width) {
                    scrollDirection = 1;
                    if (!scrollRafId) scrollRafId = requestAnimationFrame(updateScroll);
                } else {
                    scrollDirection = 0;
                }
            };
            
            const onMouseLeave = () => { scrollDirection = 0; };

            modalBody.addEventListener('mousemove', onMouseMove);
            modalBody.addEventListener('mouseleave', onMouseLeave);
        }

        // 5. Drag Logic
        dragCleanup = attachModalDrag(modal);

        // 6. Cleanup & Close
        const cleanupAndClose = () => {
             if (window.Game.UI.viewers[sourceId]) delete window.Game.UI.viewers[sourceId];
             if (scrollRafId) cancelAnimationFrame(scrollRafId);
             if (dragCleanup) dragCleanup();
             
             // 立即清除旧 modal/子元素的 ID，防止用户快速重新打开时 ID 冲突
             // （旧 modal 在关闭动画期间仍在 DOM 中，新 modal 创建的同名 ID 会被 getElementById 找到旧的）
             modal.removeAttribute('id');
             modal.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
             
             modal.classList.add('closing');
             const onAnimEnd = () => {
                 if (modal.parentNode) modal.parentNode.removeChild(modal);
             };
             modal.addEventListener('animationend', onAnimEnd);
             setTimeout(onAnimEnd, 250); 
        };

        window.Game.UI.viewers[sourceId] = {
            modal: modal,
            title: title,
            sourceId: sourceId,
            options: options, 
            cleanup: cleanupAndClose,
            openedAt: Date.now()
        };
    };

    // Update function to be called by main loop
    window.Game.UI.updateAllViewers = function() {
        if (!window.Game.Core || !window.Game.Core.GameState) return;
        const GameState = window.Game.Core.GameState;

        Object.values(window.Game.UI.viewers).forEach(viewer => {
             const { sourceId, modal, options } = viewer;
             if (!sourceId) return;

             // --- Type A: Multi-Slot Viewer (Generic) ---
             if (options.slots && Array.isArray(options.slots)) {
                 // Logic: Determine Data Source based on ID, then fill slots
                 // Currently only supports Role Equipment via 'role:ID:equip' pattern
                 let allSlotsData = null;

                 if (sourceId.startsWith('role:') && sourceId.includes(':equip')) {
                     const roleId = parseInt(sourceId.split(':')[1]);
                     const player = GameState.players.find(p => p.id === roleId);
                     if (player && player.equipSlots) {
                         allSlotsData = player.equipSlots.map(s => s.cards);
                     }
                 }
                 
                 // Render if we found data
                 if (allSlotsData) {
                     options.slots.forEach(slot => {
                         renderViewerSlot(sourceId, slot.index, slotCardsAt(allSlotsData, slot.index));
                     });
                 }
                 return;
             }

             // --- Type B: Standard Grid Viewer ---
             const grid = modal.querySelector('.card-grid');
             if (!grid) return;

             renderViewerGrid(grid.id, resolveViewerCards(sourceId, GameState), sourceId, options);
        });
    };

    window.Game.UI.createCardViewer = window.Game.UI.openCardViewer;

})();

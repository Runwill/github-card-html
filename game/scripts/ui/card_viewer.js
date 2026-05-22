(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // Registry of open viewers: sourceId -> { modal, cleanup }
    window.Game.UI.viewers = {};
    window.Game.UI.maxViewerZIndex = 11000; // Start higher than base modal

    function bringToFront(modal) {
        if (modal) modal.style.zIndex = ++window.Game.UI.maxViewerZIndex;
    }

    function cardsFromArea(area) {
        return (area && area.cards) ? area.cards.filter(Boolean) : [];
    }

    function currentGameState() {
        return window.Game.Core?.GameState || window.Game.GameState || null;
    }

    document.addEventListener('click', (e) => {
        const clickedViewer = e.target.closest('.card-viewer-modal');
        if (clickedViewer) {
            bringToFront(clickedViewer);
            return;
        }

        // Ignore clicks on buttons (likely interactions, or opening other windows)
        if (e.target.closest('button') || e.target.tagName === 'BUTTON') return;

        // 拖拽期间的合成 click 事件（pointerdown 在 viewer 内，pointerup 在 viewer 外）
        // 会导致 target 不在 .card-viewer-modal 内，但不应关闭 viewer
        if (document.body.classList.contains('is-global-dragging')) return;

        const now = Date.now();
        const viewers = Object.values(window.Game.UI.viewers);
        
        viewers.forEach(v => {
            if (now - v.openedAt > 200 && v.cleanup) v.cleanup();
        });
    });

    // Global ESC Handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.Game.UI.closeAllViewers();
        }
    });

    window.Game.UI.closeAllViewers = function() {
        Object.values(window.Game.UI.viewers).forEach(v => { if (v && v.cleanup) v.cleanup(); });
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
            bringToFront(modal);

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const style = window.getComputedStyle(modalContent);
            initialLeft = parseInt(style.left, 10) || 0;
            initialTop = parseInt(style.top, 10) || 0;
            
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

    function getAreaSlots(area) {
        return window.Game.Models?.getAreaSlots?.(area) || [];
    }

    function slotIndex(slot, fallbackIndex) {
        return Number.isFinite(slot?.index) ? slot.index : fallbackIndex;
    }

    function resolveViewerArea(sourceId, GameState, options = {}) {
        if (!sourceId) return options.area || null;
        if (options.areaPath && window.Game.Models?.resolveAreaByPath) {
            const area = window.Game.Models.resolveAreaByPath(options.areaPath, GameState);
            if (area) return area;
        }
        if (sourceId === 'pile' || sourceId === 'discardPile' || sourceId === 'treatmentArea') return GameState?.[sourceId] || null;
        if (sourceId.startsWith('role-judge:')) {
            const roleId = parseInt(sourceId.split(':')[1], 10);
            const player = GameState?.players?.find(p => p.id === roleId);
            return player?.judgeArea || null;
        }
        if (sourceId.startsWith('role:')) {
            const parts = sourceId.split(':');
            const roleId = parseInt(parts[1], 10);
            const player = GameState?.players?.find(p => p.id === roleId);
            if (!player) return null;
            if (parts[2] === 'equip') return player.equipArea || null;
            return player.hand || null;
        }
        return options.area || null;
    }

    function slotLabel(slot) {
        const key = slot?.labelKey || slot?.slotKey || '';
        if (!key) return '';
        const GameText = window.Game.UI.GameText;
        return GameText ? GameText.render(key) : key;
    }

    function renderViewerSlot(sourceId, sourceArea, slot, fallbackIndex) {
        if (!window.Game.UI.renderCardList) return;
        const index = slotIndex(slot, fallbackIndex);
        const targetId = `viewer-slot-${sourceId}-${index}`;
        const target = document.getElementById(targetId);
        if (!target) return;
        const dropZoneId = `${sourceId}:slot:${index}`;
        target.setAttribute('data-drop-zone', dropZoneId);
        target.setAttribute('data-area-name', dropZoneId);
        target.setAttribute('data-accept-placeholder', 'false');
        target.setAttribute('data-inspector-type', 'area');
        window.Game.UI.renderCardList(targetId, window.Game.Models?.getSlotCards?.(sourceArea, index) || [], dropZoneId, {
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

    // --- Card Viewer Modal Logic ---
    window.Game.UI.openCardViewer = function(title, cards, sourceId, options = {}) {
        // 1. Check if already open
        if (window.Game.UI.viewers[sourceId]) {
            const v = window.Game.UI.viewers[sourceId];
            // Bring to front
            bringToFront(v.modal);
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
        const GameState = currentGameState();
        const sourceArea = resolveViewerArea(sourceId, GameState, options);
        const slots = getAreaSlots(sourceArea);
        const isSlotViewer = slots.length > 0;
        const modal = document.createElement('div');
        modal.className = 'card-viewer-modal modal show';
        modal.id = `card-viewer-modal-${sourceId}`;
        bringToFront(modal);
        
        // Offset slightly to prevent total overlap
        const count = Object.keys(window.Game.UI.viewers).length;
        const offset = count * 20; 
        
        modal.style.marginLeft = `${offset}px`;
        modal.style.marginTop = `${offset}px`;

        // Determine Layout
        let bodyContent = '';
        if (isSlotViewer) {
            bodyContent = `<div class="equipment-slots-container area-spread" data-spread-item-selector=".equip-slot-wrapper" data-drop-zone="${sourceId}" data-area-name="${sourceId}" data-inspector-type="area" data-accept-placeholder="false">
                ${slots.map((slot, index) => {
                    const currentSlotIndex = slotIndex(slot, index);
                    return `
                    <div class="equip-slot-wrapper area-spread-item">
                        <div id="viewer-slot-${sourceId}-${currentSlotIndex}"
                             class="equip-slot"
                             data-slot="${currentSlotIndex}"
                             data-area-name="${sourceId}:slot:${currentSlotIndex}"
                             data-inspector-type="area"
                             data-accept-placeholder="false"
                             data-drop-zone="${sourceId}:slot:${currentSlotIndex}">
                            <div class="equip-slot-label">${slotLabel(slot)}</div>
                        </div>
                    </div>
                `;}).join('')}
            </div>`;
        } else {
            // Layout: Standard Grid (Hand, Pile, Judge)
            // Note: Escape sourceId just in case, but usually safe for ID attribute if simple chars
            // We use simple string interpolation here.
            bodyContent = `<div id="card-viewer-grid-${sourceId}" class="card-grid scrollbar-hidden" data-drop-zone="${sourceId}"></div>`;
        }

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-body">
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
        const scrollTarget = isSlotViewer ? null : document.getElementById(`card-viewer-grid-${sourceId}`);

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
        if (isSlotViewer) {
            slots.forEach((slot, index) => renderViewerSlot(sourceId, sourceArea, slot, index));
            window.Game.UI.updateSpreadLayouts?.();
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
             const onAnimEnd = () => { modal.remove(); };
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

             const sourceArea = resolveViewerArea(sourceId, GameState, options);
             const slots = getAreaSlots(sourceArea);

             // --- Type A: Slotted Area Viewer (equipment slots) ---
             if (slots.length > 0) {
                 slots.forEach((slot, index) => renderViewerSlot(sourceId, sourceArea, slot, index));
                 window.Game.UI.updateSpreadLayouts?.();
                 return;
             }

             // --- Type B: Standard Grid Viewer ---
             const grid = modal.querySelector('.card-grid');
             if (!grid) return;

             renderViewerGrid(grid.id, cardsFromArea(sourceArea), sourceId, options);
        });
    };

})();

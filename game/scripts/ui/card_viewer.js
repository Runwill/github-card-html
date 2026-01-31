(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // Scrolling State (Per-instance context will be easier, but we can reuse calculation logic)
    const SCROLL_ACCEL = 3.0;      // Acceleration per frame
    const MAX_SPEED = 80;        // Max speed
    const SCROLL_FRICTION = 0.85; // Deceleration when stopped

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

        const now = Date.now();
        const viewers = Object.values(window.Game.UI.viewers);
        
        if (viewers.length > 0) {
            // Close all viewers that have been open for at least 200ms
            // This prevents immediate closing if the open event bubbles to document
            let closedAny = false;
            viewers.forEach(v => {
                if (now - v.openedAt > 200) {
                    if (v.cleanup) v.cleanup();
                    closedAny = true;
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
        const modal = document.createElement('div');
        modal.className = 'card-viewer-modal modal show';
        modal.id = `card-viewer-modal-${sourceId}`;
        modal.style.zIndex = ++window.Game.UI.maxViewerZIndex;
        
        // Offset slightly to prevent total overlap
        const count = Object.keys(window.Game.UI.viewers).length;
        const offset = count * 20; 
        
        // Center positioning logic override
        // Base .modal has fixed top: 50%, left: 50%, transform: translate(-50%, -50%)
        // We want to add an offset. 
        // We can't easily add to '50%'. 
        // But we can adjust margin-left / margin-top.
        modal.style.marginLeft = `${offset}px`;
        modal.style.marginTop = `${offset}px`;

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-body">
                    <div id="card-viewer-watermark-${sourceId}" class="area-watermark"></div>
                    <div id="card-viewer-grid-${sourceId}" class="card-grid" data-drop-zone="${sourceId}"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 3. Populate Content
        // ... (rest of function) ...
        const modalBody = modal.querySelector('.modal-body');

        // Fix: Escape querySelector string for ID containing colons (e.g. role:3)
        // CSS.escape() is standard, but simple manual escape for colon is safer for selector syntax.
        // Or simply getElementById which doesn't require escaping
        const watermarkEl = document.getElementById(`card-viewer-watermark-${sourceId}`);
        const grid = document.getElementById(`card-viewer-grid-${sourceId}`);
        const scrollTarget = grid;

        // Watermark: Construct distinct lines for Owner and Area if provided
        if (watermarkEl) {
            let ownerText = options.ownerName || '';
            let areaText = options.areaName || '';

            // Fallback: Use GameText or Title if explicit separate names are missing
            if (!areaText) {
                if (sourceId) {
                    // Try to get text from common helper
                    // Note: This might return combined string if not updated, but better than nothing
                    const gameText = window.Game.UI.GameText.render(sourceId);
                    if (gameText) areaText = gameText;
                }
                
                // Last resort fallback to title
                if (!areaText && title) {
                    areaText = title;
                }
            }

            // Render
            let html = '';
            // If we have an owner, display it distinctly (Small Header style)
            if (ownerText) {
                html += `<div class="watermark-owner">${ownerText}</div>`;
            }
            // If we have area name (Large Watermark style)
            if (areaText) {
                html += `<div class="watermark-area">${areaText}</div>`;
            }
            
            // 使用 safeRender 确保动态文本 (Term) 能够正确渲染和绑定
            // 注意：HTML 字符串是拼接而成的，我们给个复合 Key，或依赖 safeRender 的内部 diff
            if (window.Game.UI.safeRender) {
                // key: viewer-watermark-{sourceId}
                // 移除 Date.now()，依赖 safeRender 和 sourceId 的唯一性
                window.Game.UI.safeRender(watermarkEl, html, `viewer-wm:${sourceId}`);
            } else {
                watermarkEl.innerHTML = html;
            }
        }

        // Cards
        if (window.Game.UI.renderCardList && sourceId) {
             const renderOptions = { 
                skipLayout: true, 
                showIndex: true,
                forceFaceDown: options.forceFaceDown // Pass through forceFaceDown
             };
             window.Game.UI.renderCardList(grid.id, cards, sourceId, renderOptions);
        }

        // 4. Scrolling Animation Logic (Instance Scoped)
        let scrollRafId = null;
        let scrollVelocity = 0;
        let scrollDirection = 0;

        // Auto-scroll to end
        if (scrollTarget) {
            requestAnimationFrame(() => {
                scrollTarget.scrollLeft = scrollTarget.scrollWidth;
                updateStartEndClasses();
            });
        }

        function updateStartEndClasses() {
             if (!modalBody || !scrollTarget) return;
             const TOLERANCE = 5; 
             const current = scrollTarget.scrollLeft;
             const max = scrollTarget.scrollWidth - scrollTarget.clientWidth;
             
             modalBody.classList.toggle('at-start', current <= TOLERANCE);
             modalBody.classList.toggle('at-end', current >= max - TOLERANCE);
        }

        if (modalBody && scrollTarget) {
            const ZONE_WIDTH = 80;
            const updateScroll = () => {
                if (!document.body.contains(modal)) { // Check if removed
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

        // 5. Drag Logic (Instance Scoped)
        // Replaced inline logic with shared helper
        const dragCleanup = attachModalDrag(modal);
        const modalContent = modal.querySelector('.modal-content'); // Keep this reference if needed elsewhere, though it was local before.


        // 6. Cleanup & Close
        const cleanupAndClose = () => {
             // Remove from registry immediately to prevent loop
             if (window.Game.UI.viewers[sourceId]) delete window.Game.UI.viewers[sourceId];

             // Stop loops
             if (scrollRafId) cancelAnimationFrame(scrollRafId);
             if (dragCleanup) dragCleanup();
             
             // Animate Out
             modal.classList.add('closing');
             const onAnimEnd = () => {
                 if (modal.parentNode) modal.parentNode.removeChild(modal);
             };
             modal.addEventListener('animationend', onAnimEnd);
             setTimeout(onAnimEnd, 250); // Fallback
        };

        // Store
        window.Game.UI.viewers[sourceId] = {
            modal: modal,
            title: title,
            sourceId: sourceId,
            options: options, // Save options for re-render
            cleanup: cleanupAndClose,
            openedAt: Date.now() // Track for click-safety
        };
    };

    // Update function to be called by main loop
    window.Game.UI.updateAllViewers = function() {
        if (!window.Game.Core || !window.Game.Core.GameState) return;
        const GameState = window.Game.Core.GameState;

        Object.values(window.Game.UI.viewers).forEach(viewer => {
             const { sourceId, modal, options } = viewer;
             const grid = modal.querySelector('.card-grid');
             if (!grid) return;

             // Resolve Data Source
             let cards = [];
             if (sourceId === 'pile') {
                 cards = (GameState.pile && GameState.pile.cards) ? GameState.pile.cards : [];
             } else if (sourceId === 'discardPile') {
                 cards = (GameState.discardPile && GameState.discardPile.cards) ? GameState.discardPile.cards : [];
             } else if (sourceId === 'treatmentArea') {
                 cards = (GameState.treatmentArea && GameState.treatmentArea.cards) ? GameState.treatmentArea.cards : [];
             } else if (sourceId.startsWith('role:') || sourceId.startsWith('role-judge:')) {
                 const isJudge = sourceId.startsWith('role-judge:');
                 const roleId = parseInt(sourceId.split(':')[1]);
                 const player = GameState.players.find(p => p.id === roleId);
                 if (player) {
                     const area = isJudge ? player.judgeArea : player.hand;
                     if (area && area.cards) cards = area.cards;
                 }
             }

             if (window.Game.UI.renderCardList) {
                 const renderOptions = { 
                    skipLayout: true, 
                    showIndex: true,
                    forceFaceDown: options.forceFaceDown
                 };
                 // This will perform Diffing/Dom updates
                 window.Game.UI.renderCardList(grid.id, cards, sourceId, renderOptions);
             }
        });
    };

    /**
     * 创建装备区详细查看器
     * 显示 4 个独立的插槽
     */
    window.Game.UI.createEquipmentViewer = function(sourceId, equipCards, options = {}) {
        // 1. 关闭现有
        Object.values(window.Game.UI.viewers).forEach(v => v.cleanup());
        
        // 2. 创建模态框
        const modal = document.createElement('div');
        modal.className = 'card-viewer-modal modal show';
        modal.style.zIndex = ++window.Game.UI.maxViewerZIndex;
        
        // 居中定位
        /* 
           对于装备栏，我们通常不需要复杂的滚动条，直接居中显示。
        */
        
        modal.innerHTML = `
            <div class="modal-content" style="width: auto; max-width: 95vw;">
                <div class="modal-body" style="padding: 20px; flex-direction: column;">
                    <div id="card-viewer-watermark-${sourceId}" class="area-watermark"></div>
                    
                    <div class="equipment-slots-container">
                        <div id="equip-slot-0" class="equip-slot" data-slot="0" data-label="武器/Weapon" data-drop-zone="${sourceId}"></div>
                        <div id="equip-slot-1" class="equip-slot" data-slot="1" data-label="防具/Armor" data-drop-zone="${sourceId}"></div>
                        <div id="equip-slot-2" class="equip-slot" data-slot="2" data-label="+1 马/Horse" data-drop-zone="${sourceId}"></div>
                        <div id="equip-slot-3" class="equip-slot" data-slot="3" data-label="-1 马/Horse" data-drop-zone="${sourceId}"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 3. 填充内容
        const watermarkEl = document.getElementById(`card-viewer-watermark-${sourceId}`);
        
        // Watermark Logic
        let ownerText = options.ownerName || '';
        let areaText = options.areaName || 'Equipment'; // Default text
        
        // Render Watermark
        let html = '';
        if (ownerText) html += `<div class="watermark-owner">${ownerText}</div>`;
        if (areaText) html += `<div class="watermark-area">${areaText}</div>`;
        if (watermarkEl) window.Game.UI.safeRender(watermarkEl, html, `viewer-wm:${sourceId}`);

        // Render Slots
        // equipCards expected to be Array[4] or sparse array
        const slots = [0, 1, 2, 3];
        const cardList = Array.isArray(equipCards) ? equipCards : [];
        
        slots.forEach(index => {
            const slotId = `equip-slot-${index}`;
            const card = cardList[index]; // Simple index mapping
            
            // Render specific card to specific slot
            if (window.Game.UI.renderCardList) {
                // We treat this slot as a tiny 'list' of 1 card for rendering purposes
                // But we must ensure renderCardList supports this container
                // Or we manually render if easier.
                // Using renderCardList ensures consistency (styles, classes, generic tooltips)
                const singleCardList = card ? [card] : [];
                
                // Note: The dropZoneId is usually the generic 'equipArea' (sourceId)
                // But specifically targeting a slot might require logic in drag handler.
                // For now, we pass sourceId.
                window.Game.UI.renderCardList(slotId, singleCardList, sourceId);
            }
        });

        // 5. Drag Logic
        const dragCleanup = attachModalDrag(modal);

        // 4. Cleanup / Close Logic
        const cleanup = () => {
             if (dragCleanup) dragCleanup();
             modal.classList.add('closing');
             modal.addEventListener('animationend', () => {
                 if(modal.parentNode) modal.parentNode.removeChild(modal);
             }, {once:true});
             delete window.Game.UI.viewers[sourceId];
        };

        // Reuse global close logic (document click) - No specific listeners needed on modal
        // if CSS pointer-events is set correctly (wrapper none, content auto), clicks fall through.
        // If wrapper blocks, global closer handles it if it doesn't match .card-viewer-modal check?
        // Actually earlier analysis suggests openCardViewer relies on `document.addEventListener('click')`
        // checking `!e.target.closest('.card-viewer-modal')`.
        // If modal wrapper has pointer-events:auto, clicking it protects it from global close.
        // If modal wrapper has pointer-events:none, clicking it passes to body -> global close.
        
        // Assuming standard behavior is sufficient:
        window.Game.UI.viewers[sourceId] = { 
            modal, 
            cleanup,
            openedAt: Date.now() // Required for global click-to-close logic
        };
        
        return modal;
    };

    window.Game.UI.createCardViewer = window.Game.UI.openCardViewer;

})();

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
        
        modal.style.marginLeft = `${offset}px`;
        modal.style.marginTop = `${offset}px`;

        // Determine Layout
        let bodyContent = '';
        if (options.slots && Array.isArray(options.slots)) {
            // Layout: Multi-Slot (e.g. Equipment)
            bodyContent = `<div class="equipment-slots-container">
                ${options.slots.map(slot => `
                    <div id="viewer-slot-${sourceId}-${slot.index}" 
                         class="equip-slot" 
                         data-slot="${slot.index}" 
                         data-label="${slot.label || ''}" 
                         data-drop-zone="${sourceId}:slot:${slot.index}"></div>
                `).join('')}
            </div>`;
        } else {
            // Layout: Standard Grid (Hand, Pile, Judge)
            // Note: Escape sourceId just in case, but usually safe for ID attribute if simple chars
            // We use simple string interpolation here.
            bodyContent = `<div id="card-viewer-grid-${sourceId}" class="card-grid" data-drop-zone="${sourceId}"></div>`;
        }

        // Modal Content
        // Use auto width for slots to fit content tightly
        const modalStyle = options.slots ? 'width: auto; max-width: 95vw;' : '';
        const bodyStyle = options.slots ? 'padding: 20px; flex-direction: column;' : '';

        modal.innerHTML = `
            <div class="modal-content" style="${modalStyle}">
                <div class="modal-body" style="${bodyStyle}">
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
        if (window.Game.UI.renderCardList) {
            if (options.slots) {
                // Multi-Slot: cards is [ [Card...], [Card...] ]
                // Or user passed flat array? We expect Array of Arrays.
                // Or the caller logic will handle updating via updateAllViewers shortly anyway.
                // Let's try to render initial state if possible.
                options.slots.forEach(slot => {
                    let slotCards = [];
                    if (Array.isArray(cards)) {
                        if (Array.isArray(cards[slot.index])) {
                            slotCards = cards[slot.index];
                        } else if (cards[slot.index]) {
                            // Single card fallback
                             slotCards = [cards[slot.index]];
                        }
                    }
                    
                    const slotElId = `viewer-slot-${sourceId}-${slot.index}`;
                    const slotDropZone = `${sourceId}:slot:${slot.index}`;
                    window.Game.UI.renderCardList(slotElId, slotCards, slotDropZone, { 
                        skipLayout: true, 
                        forceFaceDown: false 
                    });
                });
            } else {
                // Single Grid
                const gridId = `card-viewer-grid-${sourceId}`;
                window.Game.UI.renderCardList(gridId, cards, sourceId, { 
                    skipLayout: true, 
                    showIndex: true,
                    forceFaceDown: options.forceFaceDown
                });
            }
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
                         const targetId = `viewer-slot-${sourceId}-${slot.index}`;
                         if (document.getElementById(targetId)) {
                             const idx = slot.index;
                             const cards = (allSlotsData[idx] && Array.isArray(allSlotsData[idx])) ? allSlotsData[idx] : [];
                             const dropZone = `${sourceId}:slot:${idx}`; // Consistent Drop Zone
                             
                             window.Game.UI.renderCardList(targetId, cards, dropZone, { 
                                 skipLayout: true, 
                                 forceFaceDown: false 
                             });
                         }
                     });
                 }
                 return;
             }

             // --- Type B: Standard Grid Viewer ---
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
                 // Fix: Parse ID carefully
                 const roleId = parseInt(sourceId.replace('role-judge:', '').replace('role:', '').replace(':equip', ''));
                 
                 const player = GameState.players.find(p => p.id === roleId);
                 if (player) {
                     // Determine Area
                     let area = null;
                     if (isJudge) area = player.judgeArea;
                     else area = player.hand; // Default to hand for simple role:ID
                     
                     if (area && area.cards) cards = area.cards;
                 }
             }

             if (window.Game.UI.renderCardList) {
                 window.Game.UI.renderCardList(grid.id, cards, sourceId, { 
                    skipLayout: true, 
                    showIndex: true,
                    forceFaceDown: options.forceFaceDown
                 });
             }
        });
    };

    window.Game.UI.createCardViewer = window.Game.UI.openCardViewer;

})();

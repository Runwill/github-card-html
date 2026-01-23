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
                    <div id="card-viewer-grid-${sourceId}" class="card-grid"></div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 3. Populate Content
        // ... (rest of function) ...
        const modalBody = modal.querySelector('.modal-body');
        const watermarkEl = modal.querySelector(`#card-viewer-watermark-${sourceId}`);
        const grid = modal.querySelector(`#card-viewer-grid-${sourceId}`);
        const scrollTarget = grid;

        // Watermark
        if (watermarkEl && window.Game.UI.GameText && sourceId) {
            watermarkEl.innerHTML = window.Game.UI.GameText.render(sourceId);
        }

        // Cards
        if (window.Game.UI.renderCardList && sourceId) {
             const renderOptions = { 
                skipLayout: true, 
                showIndex: true,
                forceFaceDown: options.forceFaceDown // Pass through forceFaceDown
             };
             window.Game.UI.renderCardList(grid.id, cards, sourceId, renderOptions);
        } else {
            // Fallback
            grid.innerHTML = '';
            cards.forEach(card => {
                const el = document.createElement('div');
                el.className = 'card-placeholder';
                el.textContent = card.name || card.key || '???';
                grid.appendChild(el);
            });
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
        const modalContent = modal.querySelector('.modal-content');
        let dragCleanup = null;
        if (modalContent) {
            let isDragging = false;
            let startX, startY, initialLeft, initialTop;

            const onMouseDown = (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('.card-placeholder') || e.target.closest('button')) return;
                
                // Bring to front on click
                modal.style.zIndex = ++window.Game.UI.maxViewerZIndex;

                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                
                // We drag the CONTENT relative to its current position
                // Note: The Wrapper (modal) is fixed. The Content is relative.
                // We move the Content using left/top.
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
            dragCleanup = () => {
                 modalContent.removeEventListener('mousedown', onMouseDown);
                 document.removeEventListener('mousemove', onMouseMoveDrag);
                 document.removeEventListener('mouseup', onMouseUpDrag);
            };
        }

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
            cleanup: cleanupAndClose,
            openedAt: Date.now() // Track for click-safety
        };
    };

})();

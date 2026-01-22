(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // Scrolling State
    let scrollRafId = null;
    let scrollVelocity = 0;
    let scrollDirection = 0; // -1: Left, 1: Right, 0: None

    const SCROLL_ACCEL = 3.0;      // Acceleration per frame
    const MAX_SPEED = 80;        // Max speed
    const SCROLL_FRICTION = 0.85; // Deceleration when stopped

    // --- Card Viewer Modal Logic ---
    window.Game.UI.openCardViewer = function(title, cards, sourceId) {
        const modal = document.getElementById('card-viewer-modal');
        const grid = document.getElementById('card-viewer-grid');
        const titleEl = document.getElementById('card-viewer-title');
        const backdrop = document.getElementById('modal-backdrop');
        const modalBody = modal ? modal.querySelector('.modal-body') : null;
        
        // Target specifically the scrolling container (grid wrapper logic)
        // In the new CSS, .card-grid should be the scrollable element, 
        // OR .modal-body is wrapper and we scroll an inner wrapper.
        // Let's assume we update CSS so that .modal-body is the static wrapper 
        // and .card-grid (or a wrapper around it) is the scroll view.
        // Actually, easiest is: modal-body (relative, overflow hidden) -> card-grid (overflow hidden, scrollable via JS)
        const scrollTarget = grid; 

        if (!modal || !grid) return;
        
        // Update Title (Remove count suffix as requested)
        titleEl.textContent = title;
        
        // Use standard renderer
        if (window.Game.UI.renderCardList && sourceId) {
            grid.innerHTML = '';
            window.Game.UI.renderCardList('card-viewer-grid', cards, sourceId, { 
                skipLayout: true, 
                showIndex: true   
            });
        } else {
            // Fallback (ReadOnly)
            grid.innerHTML = '';
            cards.forEach(card => {
                const el = document.createElement('div');
                el.className = 'card-placeholder';
                const name = card.name || card.key || '???';
                 if (window.Game.UI.GameText) {
                    el.innerHTML = window.Game.UI.GameText.render(name);
                } else {
                    el.textContent = name;
                }
                grid.appendChild(el);
            });
        }
        
        // Show Modal
        modal.classList.add('show');
        // backdrop.classList.add('show'); // REMOVED: Modeless mode (Drag Enable)

        // --- Feature: Auto-scroll to Right (Top of Stack) ---
        if (scrollTarget) {
            requestAnimationFrame(() => {
                scrollTarget.scrollLeft = scrollTarget.scrollWidth;
                updateStartEndClasses();
            });
        }

        // --- Helper: Update Visual Fades based on position ---
        function updateStartEndClasses() {
             if (!modalBody || !scrollTarget) return;
             
             const TOLERANCE = 5; 
             const current = scrollTarget.scrollLeft;
             const max = scrollTarget.scrollWidth - scrollTarget.clientWidth;
             
             if (current <= TOLERANCE) {
                 modalBody.classList.add('at-start');
             } else {
                 modalBody.classList.remove('at-start');
             }
             
             if (current >= max - TOLERANCE) {
                 modalBody.classList.add('at-end');
             } else {
                 modalBody.classList.remove('at-end');
             }
        }

        // --- Feature: Time-based Acceleration Scrolling ---
        if (modalBody && scrollTarget) {
            // Reset State
            scrollVelocity = 0;
            scrollDirection = 0;
            
            const ZONE_WIDTH = 80;  // Activation zone size

            const updateScroll = () => {
                if (!modal.classList.contains('show')) {
                    scrollRafId = null;
                    return;
                }

                // Apply Acceleration
                if (scrollDirection !== 0) {
                    scrollVelocity += scrollDirection * SCROLL_ACCEL;
                    
                    // Clamp Speed
                    if (scrollVelocity > MAX_SPEED) scrollVelocity = MAX_SPEED;
                    if (scrollVelocity < -MAX_SPEED) scrollVelocity = -MAX_SPEED;
                } else {
                    // Apply Friction (Decelerate)
                    scrollVelocity *= SCROLL_FRICTION;
                    if (Math.abs(scrollVelocity) < 0.1) scrollVelocity = 0;
                }

                // Apply Move
                if (Math.abs(scrollVelocity) > 0.1) {
                    scrollTarget.scrollLeft += scrollVelocity;
                    updateStartEndClasses(); // Continuous Check
                    scrollRafId = requestAnimationFrame(updateScroll);
                } else if (scrollDirection !== 0) {
                    // Keep loop running if direction is held, even if speed low (startup)
                    scrollRafId = requestAnimationFrame(updateScroll);
                } else {
                    scrollRafId = null; // Clean stop
                }
            };
            
            // Allow manual scroll events to update fades too
            const onScrollEvent = () => requestAnimationFrame(updateStartEndClasses);
            scrollTarget.addEventListener('scroll', onScrollEvent, {passive: true});

            const onMouseMove = (e) => {
                const rect = modalBody.getBoundingClientRect();
                const relativeX = e.clientX - rect.left;

                // Check Zones
                if (relativeX >= 0 && relativeX < ZONE_WIDTH) {
                    scrollDirection = -1; // Left
                    if (!scrollRafId) scrollRafId = requestAnimationFrame(updateScroll);
                } else if (relativeX > (rect.width - ZONE_WIDTH) && relativeX <= rect.width) {
                    scrollDirection = 1; // Right
                    if (!scrollRafId) scrollRafId = requestAnimationFrame(updateScroll);
                } else {
                    scrollDirection = 0; // Neutral
                }
            };
            
            const onMouseLeave = () => { 
                scrollDirection = 0; 
            };

            // Clean up old listeners
            if (modal._removeScrollListeners) modal._removeScrollListeners();

            modalBody.addEventListener('mousemove', onMouseMove);
            modalBody.addEventListener('mouseleave', onMouseLeave);

            modal._removeScrollListeners = () => {
                modalBody.removeEventListener('mousemove', onMouseMove);
                modalBody.removeEventListener('mouseleave', onMouseLeave);
                scrollTarget.removeEventListener('scroll', onScrollEvent);
                if (scrollRafId) cancelAnimationFrame(scrollRafId);
                scrollRafId = null;
            };
        }
        
        // Close Internal Logic
        const cleanupAndClose = () => {
             modal.classList.remove('show');
             // backdrop.classList.remove('show');
             
             // Ensure we remove listener to avoid memory leak if we didn't use 'once' (we didn't)
             // But actually we need to remove the backdrop listener if it was added.
             // Since we removed 'add', we should remove the 'click' logic below too.
             
             if (modal._removeScrollListeners) modal._removeScrollListeners();
        };

        // Close on Backdrop Click (DISABLED for modeless)
        /* 
        const backdropHandler = (e) => {
            if (e.target === backdrop) {
                cleanupAndClose();
                backdrop.removeEventListener('click', backdropHandler);
            }
        };
        backdrop.addEventListener('click', backdropHandler);
        */
        
        const closeBtn = modal.querySelector('.btn-close');
        if (closeBtn) {
             closeBtn.onclick = (e) => {
                 cleanupAndClose();
             }
        }
    };

})();

(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    const DragState = {
        isDragging: false,
        dragSource: null, // { data, sourceArea }
        dragElement: null, // The actual card element being moved
        placeholderElement: null, // Keeps the flow in the original list
        
        // Physics / Animation State
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0,
        velocityX: 0,
        rafId: null,

        // Offset to keep mouse relative position constant
        initialX: 0,
        initialY: 0,
        offsetX: 0,
        offsetY: 0,
        
        currentDropZone: null
    };

    const DRAG_CONFIG = {
        lerpFactor: 0.25, // Higher = More responsive
        maxTilt: 12,      
        tiltFactor: 0.4   
    };

    function initDrag(cardElement, cardData, sourceAreaName, sourceIndex = -1) {
        cardElement.classList.add('draggable-item');
        cardElement.addEventListener('pointerdown', (e) => handlePointerDown(e, cardElement, cardData, sourceAreaName, sourceIndex));
        
        cardElement.ondragstart = () => false;
        cardElement.oncontextmenu = (e) => {
             if(DragState.isDragging) e.preventDefault();
        };
    }

    function handlePointerDown(e, el, data, sourceArea, sourceIndex) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        DragState.dragSource = { data, sourceArea, sourceIndex };
        DragState.dragElement = el;
        DragState.startX = e.clientX;
        DragState.startY = e.clientY;
        DragState.isDragging = false; 

        // Initial capture to handle the very start, but we will delegate to document for the dragging
        // This is important because once we move the element to Body, it might lose capture context in some browsers,
        // or if pointer-events becomes none, it might stop firing.
        el.setPointerCapture(e.pointerId);

        // Attach global listeners for robustness
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);
    }

    function startDrag(e) {
        DragState.isDragging = true;
        const el = DragState.dragElement;
        const rect = el.getBoundingClientRect();

        // 1. Create Placeholder to maintain layout flow
        const placeholder = el.cloneNode(true);
        placeholder.style.visibility = 'hidden'; 
        placeholder.classList.add('drag-placeholder');
        placeholder.id = ''; // Avoid ID conflicts
        
        if (el.parentNode) {
            el.parentNode.insertBefore(placeholder, el);
        }
        DragState.placeholderElement = placeholder;

        // 2. Prepare the Real Element for transport
        // We move it to body to escape overflow:hidden containers and z-index issues
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        el.style.position = 'fixed';
        el.style.zIndex = 10000;
        
        // Initial position matches exactly where it was
        DragState.initialX = rect.left;
        DragState.initialY = rect.top;
        
        // Offset: Mouse position relative to element top-left
        DragState.offsetX = e.clientX - rect.left;
        DragState.offsetY = e.clientY - rect.top;

        // Set initial styles
        el.style.left = DragState.initialX + 'px';
        el.style.top = DragState.initialY + 'px';
        el.style.margin = '0';
        
        // --- FIX: Copy essential computed styles to preserve look in body ---
        copyComputedStyles(placeholder, el);
        // ------------------------------------------------------------------

        el.classList.add('dragging-real'); 
        
        document.body.appendChild(el);

        // 3. Initialize Physics State
        DragState.currentX = 0; // Translation X
        DragState.currentY = 0; // Translation Y
        DragState.targetX = 0;
        DragState.targetY = 0;
        
        startAnimationLoop();
    }

    function startAnimationLoop() {
        if (DragState.rafId) cancelAnimationFrame(DragState.rafId);
        
        const render = () => {
            if (!DragState.isDragging || !DragState.dragElement) return;

            // Lerp current translation to target translation
            const dx = DragState.targetX - DragState.currentX;
            const dy = DragState.targetY - DragState.currentY;
            
            // Apply easing
            DragState.currentX += dx * DRAG_CONFIG.lerpFactor;
            DragState.currentY += dy * DRAG_CONFIG.lerpFactor;
            
            // Calculate velocity for tilt effect
            DragState.velocityX = dx * DRAG_CONFIG.lerpFactor;
            const tilt = Math.max(Math.min(DragState.velocityX * DRAG_CONFIG.tiltFactor, DRAG_CONFIG.maxTilt), -DRAG_CONFIG.maxTilt);
            
            if (DragState.dragElement) {
                DragState.dragElement.style.transform = `translate(${DragState.currentX}px, ${DragState.currentY}px) rotate(${tilt}deg)`;
            }

            DragState.rafId = requestAnimationFrame(render);
        };
        DragState.rafId = requestAnimationFrame(render);
    }

    function handlePointerMove(e) {
        if (!DragState.isDragging) {
            const dist = Math.hypot(e.clientX - DragState.startX, e.clientY - DragState.startY);
            if (dist > 5) { 
                startDrag(e);
            }
            return;
        }

        e.preventDefault();
        
        // Calculate where we WANT to be relative to start
        // Target Position = (Current Mouse - Offset) - Initial Pos
        // Basically: Displacement from origin
        const outcomeX = e.clientX - DragState.offsetX;
        const outcomeY = e.clientY - DragState.offsetY;
        
        DragState.targetX = outcomeX - DragState.initialX;
        DragState.targetY = outcomeY - DragState.initialY;
        
        // Ensure pointer events pass through to underlying elements for hit testing
        // We do this continuously to ensure safety
        if (DragState.dragElement && DragState.dragElement.style.pointerEvents !== 'none') {
            DragState.dragElement.style.pointerEvents = 'none';
        }

        // Detection of Drop Zone
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const dropZone = targetEl ? targetEl.closest('[data-drop-zone]') : null;
             
        if (DragState.currentDropZone !== dropZone) {
            if (DragState.currentDropZone) DragState.currentDropZone.classList.remove('drag-over');
            if (dropZone) dropZone.classList.add('drag-over');
            DragState.currentDropZone = dropZone;
        }

        // Live Reordering Logic
        if (dropZone && DragState.placeholderElement) {
            updatePlaceholderPosition(dropZone, targetEl, e.clientX);
        }
    }

    function updatePlaceholderPosition(dropZone, targetEl, mouseX) {
        // Find the card we are hovering over
        // We look for .card-placeholder but NOT the drag-placeholder itself
        const hoverCard = targetEl ? targetEl.closest('.card-placeholder:not(.drag-placeholder)') : null;
        
        if (hoverCard && hoverCard.parentNode === dropZone) {
            const rect = hoverCard.getBoundingClientRect();
            const midX = rect.left + rect.width / 2;
            const isAfter = mouseX > midX;
            
            // Only move if we are not already in the correct spot relative to this card
            // Move placeholder
            if (isAfter) {
                if (DragState.placeholderElement.previousElementSibling !== hoverCard) {
                    dropZone.insertBefore(DragState.placeholderElement, hoverCard.nextSibling);
                }
            } else {
                if (DragState.placeholderElement.nextElementSibling !== hoverCard) {
                    dropZone.insertBefore(DragState.placeholderElement, hoverCard);
                }
            }
        } else if (dropZone.children.length === 0 || (dropZone.children.length === 1 && dropZone.children[0] === DragState.placeholderElement)) {
            // Empty zone (or only containing placeholder), append
                if (DragState.placeholderElement.parentNode !== dropZone) {
                    dropZone.appendChild(DragState.placeholderElement);
                }
        } else if (!hoverCard && targetEl === dropZone) {
            // Hovering over the container (whitespace), append to end
            // Only if we are clearly past the last item
            const lastChild = dropZone.lastElementChild;
            if (lastChild && lastChild !== DragState.placeholderElement) {
                    const lastRect = lastChild.getBoundingClientRect();
                    // Assuming horizontal layout for simplicity in this check
                    if (mouseX > lastRect.right) {
                        dropZone.appendChild(DragState.placeholderElement);
                    }
            }
        }
    }

    function handlePointerUp(e) {
        if (DragState.isDragging) {
            finishDrag(e);
        } else {
            cancelDrag(e);
        }
    }

    function cleanupDrag() {
        if (DragState.currentDropZone) {
            DragState.currentDropZone.classList.remove('drag-over');
            DragState.currentDropZone = null;
        }

        // Clean up placeholder if orphan
        if (DragState.placeholderElement) {
            if(DragState.placeholderElement.parentNode) {
                DragState.placeholderElement.parentNode.removeChild(DragState.placeholderElement);
            }
            DragState.placeholderElement = null;
        }
        
        // Clean up real element if needed (usually handled by finish or cancel logic)
        // If dragElement is still attached to body, it means we failed/cancelled poorly
        if (DragState.dragElement && DragState.dragElement.parentNode === document.body) {
             DragState.dragElement.remove();
        }

        DragState.dragElement = null;
        DragState.isDragging = false;
        if(DragState.rafId) cancelAnimationFrame(DragState.rafId);
    }

    function cancelDrag(e) {
        const el = DragState.dragElement;
        
        // Remove global listeners
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerUp);

        if (el) {
            try { el.releasePointerCapture(e.pointerId); } catch(err){}
            // Cleanup local listeners just in case
            el.removeEventListener('pointermove', handlePointerMove);
            el.removeEventListener('pointerup', handlePointerUp);
            el.removeEventListener('pointercancel', handlePointerUp);
            
            // Revert logic
            if (el.parentNode === document.body && DragState.placeholderElement && DragState.placeholderElement.parentNode) {
                 // Snap back visually could happen here, but for now instant revert
                 resetStyles(el);
                 
                 // Put back in place
                 DragState.placeholderElement.parentNode.insertBefore(el, DragState.placeholderElement);
                 DragState.placeholderElement.remove();
                 DragState.placeholderElement = null;
            } else if (el.parentNode === document.body) {
                // If placeholder is gone (weird), just kill it
                el.remove();
            } else {
                // Was never moved to body (click only)
                el.classList.remove('draggable-item'); 
            }
        }
        
        // Reset state
        DragState.currentDropZone?.classList.remove('drag-over');
        DragState.currentDropZone = null;
        DragState.dragElement = null;
        DragState.isDragging = false;
        if(DragState.rafId) cancelAnimationFrame(DragState.rafId);
    }

    function finishDrag(e) {
        const el = DragState.dragElement;
        const placeholder = DragState.placeholderElement; // Capture placeholder reference
        
        // Remove global listeners
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerUp);
        // Stop Physics Loop
        if (DragState.rafId) cancelAnimationFrame(DragState.rafId);

        if (el) {
             try { el.releasePointerCapture(e.pointerId); } catch(err){}
             el.removeEventListener('pointermove', handlePointerMove);
             el.removeEventListener('pointerup', handlePointerUp);
             el.removeEventListener('pointercancel', handlePointerUp);
        }

        const dropZone = placeholder ? placeholder.parentNode : null;

        if (dropZone && dropZone.getAttribute('data-drop-zone')) {
            const targetZoneId = dropZone.getAttribute('data-drop-zone');
            
            // Calculate Index based on Placeholder Position
            // Filter out the placeholder itself from index calculation to match Backend logic expectation
            const siblings = Array.from(dropZone.children).filter(c => c.classList.contains('card-placeholder') && c !== placeholder);
             
            // Determine where the placeholder is relative to siblings
            // We can check which sibling is *after* the placeholder
            const nextSibling = placeholder.nextElementSibling;
            let targetIndex = siblings.length; // Default to end
            
            if (nextSibling) {
                // Find index of nextSibling in the filtered list
                // Note: siblings contains only .card-placeholder elements
                // nextSibling should be one of them.
                const idx = siblings.indexOf(nextSibling);
                if (idx !== -1) {
                    targetIndex = idx;
                } else {
                    // Fallback: If nextSibling is not in siblings (e.g. unclassed div), 
                    // we might need to look further or assume end.
                    // But for now, let's log if this weird case happens
                    console.warn("Placeholder nextSibling not found in siblings list", nextSibling);
                }
            }
            
            
            animateDropToPlaceholder(el, placeholder, () => {
                 // NOW call the backend/data update
                if (window.Game.UI.onCardDrop) {
                    window.Game.UI.onCardDrop(
                        DragState.dragSource.data, 
                        DragState.dragSource.sourceArea, 
                        targetZoneId, 
                        targetIndex,
                        DragState.dragSource.sourceIndex
                    );
                }
                // Cleanup
                DragState.dragElement = null;
                DragState.placeholderElement = null; 
            });

            DragState.currentDropZone = null;
            return;
        }

        cancelDrag(e);
    }

    function animateDropToPlaceholder(el, placeholder, onComplete) {
        // --- NEW: Animate First, Then Update logic ---
        // 1. Calculate visual position from State variables
        const startX = DragState.initialX + DragState.currentX;
        const startY = DragState.initialY + DragState.currentY;

        // 2. Lock visual position immediately
        // CRITICAL: Disable transition to prevent "flying from start"
        el.style.transition = 'none'; 
        el.style.transform = 'none'; 
        el.style.left = startX + 'px';
        el.style.top = startY + 'px';
        void el.offsetWidth; // Force Reflow

        // 3. Determine physical destination (The Placeholder's current spot)
        const targetRect = placeholder.getBoundingClientRect();

        // 4. Animate to Placeholder
        el.style.transition = 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)';
        el.style.left = targetRect.left + 'px';
        el.style.top = targetRect.top + 'px';
        el.style.width = targetRect.width + 'px';
        el.style.height = targetRect.height + 'px';

            // 5. Completion Callback
        let isCompleted = false;
        const onAnimationComplete = (e) => {
            // Prevent multiple calls (property transitions or timeout + event)
            if (isCompleted) return;
            // Only fire for the main property if it's an event, or ignore property checking to be simple with flag
            if (e && e.propertyName && e.propertyName !== 'left' && e.propertyName !== 'top') return; 

            isCompleted = true;
            el.ontransitionend = null;

            if (placeholder.parentNode) {
                // Visually replace placeholder with the dragged element (temporarily)
                if (el.parentNode === document.body) {
                    resetStyles(el);
                    
                    placeholder.parentNode.insertBefore(el, placeholder);
                    placeholder.remove(); 
                }
            }
            if (onComplete) onComplete();
        };

        el.ontransitionend = onAnimationComplete;
        setTimeout(() => onAnimationComplete(), 220); // Safety fallback
    }

    // --- Style Helpers ---
    function copyComputedStyles(source, target) {
        const computed = window.getComputedStyle(source);
        const properties = [
            'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 
            'color', 'textAlign', 'letterSpacing', 'textShadow'
        ];
        properties.forEach(prop => target.style[prop] = computed[prop]);
        target.style.boxSizing = 'border-box';
    }

    function resetStyles(target) {
        if (!target) return;
        const properties = [
            'position', 'left', 'top', 'width', 'height', 'zIndex', 'margin', 'transform',
            'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 
            'color', 'textAlign', 'letterSpacing', 'textShadow', 'boxSizing'
        ];
        properties.forEach(prop => target.style[prop] = '');
        target.classList.remove('dragging-real');
        target.style.pointerEvents = '';
        target.style.transition = '';
    }

    window.Game.UI.Interactions = {
        initDrag
    };
})();

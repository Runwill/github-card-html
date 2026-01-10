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
        
        currentDropZone: null,
        
        // --- State Restoration ---
        originalCssText: '',
        originalClasses: '' // Optional, but good for safety
    };

    const DRAG_CONFIG = {
        lerpFactor: 0.25, // Higher = More responsive
        maxTilt: 12,      
        tiltFactor: 0.4,
        swapAnimationDuration: 200 // ms
    };

    // Store positions for FLIP animation
    const flipSnapshot = new Map();

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
        if (!DragState.dragElement) return; // Guard against null element
        DragState.isDragging = true;
        
        // --- SAFE ELEMENT CAPTURE ---
        // We clone the element for dragging instead of moving the original.
        // This keeps the original DOM structure perfectly intact until the very moment of drop.
        // It greatly simplifies style restoration (because we just delete the clone).
        
        const originalEl = DragState.dragElement;
        const rect = originalEl.getBoundingClientRect();
        
        // 1. Create Placeholder (Invisible) to maintain layout flow if we were to hide original
        // But since we are Cloning, we can just style the original to be invisible?
        // Let's stick to the pattern: Clone becomes the "Visual Drag", Original stays as "Placeholder".
        
        // Wait, Existing logic:
        // 1. Create Placeholder -> Insert Before El
        // 2. Move El to Body
        
        // Proposed Logic:
        // 1. Leave Original El exactly where it is. Just set visibility:hidden.
        // 2. Create a "Drag Clone" and append to Body.
        
        // This solves "Start Position Mismatch" because we never mess with the DOM flow until the end.
        // This solves "Restoration" because we just remove the clone and unhide the original.
        
        const dragClone = originalEl.cloneNode(true);
        dragClone.id = ''; // Remove ID
        dragClone.classList.add('dragging-real'); 
        
        // Copy computed styles to ensure clone looks identical
        copyComputedStyles(originalEl, dragClone);
        
        dragClone.style.position = 'fixed';
        dragClone.style.zIndex = 10000;
        dragClone.style.width = rect.width + 'px';
        dragClone.style.height = rect.height + 'px';
        dragClone.style.margin = '0';
        
        // Initial Position
        DragState.initialX = rect.left;
        DragState.initialY = rect.top;
        DragState.offsetX = e.clientX - rect.left;
        DragState.offsetY = e.clientY - rect.top;
        
        dragClone.style.left = rect.left + 'px';
        dragClone.style.top = rect.top + 'px';
        
        document.body.appendChild(dragClone);
        
        // Hide Original
        originalEl.style.visibility = 'hidden';
        
        // Update State to track Clone
        DragState.dragClone = dragClone; // New property
        DragState.originalEl = originalEl;   // Keep track of real one
        // DragState.dragElement is now ambiguous in old code. 
        // Let's refactor DragState to distinguish.
        // BUT to minimize code changes, let's swap them?
        // No, 'dragElement' is used everywhere. Let's make 'dragElement' point to the CLONE.
        // And 'placeholderElement' point to the ORIGINAL.
        
        DragState.placeholderElement = originalEl; // The original acts as placeholder!
        DragState.dragElement = dragClone;         // The clone acts as the moving part
        
        // Note: Old 'placeholderElement' was a newly created div. 
        // Now 'placeholderElement' is the actual original DOM node.
        // But wait, the old logic MOVED the placeholder around for reordering.
        // If we move 'originalEl' around, we are reordering the DOM live. That's fine.
        // Just need to ensure 'originalEl' has the 'drag-placeholder' class?
        
        DragState.placeholderElement.classList.add('drag-placeholder'); // Add placeholder style
        
        // --- CALIBRATION FIX ---
        // Check if clone landed correctly
        const calibrationRect = dragClone.getBoundingClientRect();
        const driftX = calibrationRect.left - rect.left;
        const driftY = calibrationRect.top - rect.top;
        
        if (Math.abs(driftX) > 1 || Math.abs(driftY) > 1) {
             dragClone.style.left = (rect.left - driftX) + 'px';
             dragClone.style.top = (rect.top - driftY) + 'px';
        }
        
        // ------------------------------------
        
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
            // DragState.velocityX could be non-zero at end, ensure we don't have residual tilt when "dropping"?
            // Actually in animateDropToPlaceholder we decay rotation to 0.
            
            const tilt = Math.max(Math.min(DragState.velocityX * DRAG_CONFIG.tiltFactor, DRAG_CONFIG.maxTilt), -DRAG_CONFIG.maxTilt);
            
            if (DragState.dragElement) {
                // Ensure we use translate3d or consistent pixel snapping? 
                // Browser subpixel rendering might be factor.
                DragState.dragElement.style.transform = `translate(${DragState.currentX}px, ${DragState.currentY}px) rotate(${tilt}deg)`;
            }

            DragState.rafId = requestAnimationFrame(render);
        };
        DragState.rafId = requestAnimationFrame(render);
    }
    
    // Helper to get true offset of body 
    function getBodyOffset() {
         // If body has margin/padding that affects fixed elements (unlikely but possible in some frameworks)
         const style = window.getComputedStyle(document.body);
         return {
             marginLeft: parseFloat(style.marginLeft) || 0,
             marginTop: parseFloat(style.marginTop) || 0
         };
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
        
        // ... (existing physics code) ...
        
        // Target Position
        const targetRect = DragState.placeholderElement.getBoundingClientRect(); // Using placeholder NOT dragElement
        // Actually targetX/Y logic is for 'dragElement' visual
        
        const outcomeX = e.clientX - DragState.offsetX;
        const outcomeY = e.clientY - DragState.offsetY;
        
        DragState.targetX = outcomeX - DragState.initialX;
        DragState.targetY = outcomeY - DragState.initialY;
        
        // ...
        
        // Ensure pointer events pass through
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
        if (dropZone) { // Even if no placeholderElement yet? Oh it exists from startDrag.
             updatePlaceholderPosition(dropZone, targetEl, e.clientX, e.clientY);
        }
    }

    function updatePlaceholderPosition(dropZone, targetEl, mouseX, mouseY) {
        // Find the card we are hovering over
        const hoverCard = targetEl ? targetEl.closest('.card-placeholder:not(.drag-placeholder)') : null;
        
        // --- FLIP Animation: Pre-calculation ---
        // Snapshot positions of all siblings in the dropZone BEFORE move
        const siblings = Array.from(dropZone.children).filter(c => 
            c !== DragState.placeholderElement && 
            c.classList.contains('card-placeholder')
        );
        
        // Snapshot only if we haven't for this frame/action? 
        // No, we need to snapshot right before DOM change.
        // But doing this every mousemove is expensive.
        // We should only do it IF we are about to move.
        
        let shouldMove = false;
        let moveTarget = null;
        let movePosition = ''; // 'before' or 'after' or 'append'

        if (hoverCard && hoverCard.parentNode === dropZone) {
            const rect = hoverCard.getBoundingClientRect();
            // Directional logic (Grid support?)
            // Simple X-axis for now, or X+Y if flex-wrap
            // If rows differ, Y matters.
            
            // Check if same row
            // const placeholderRect = DragState.placeholderElement.getBoundingClientRect();
            // But placeholder is visibility hidden in 'Clone Mode', but it TAKES SPACE.
            // So we can use its rect usually.
            
            // Revert to simple mid-point logic
            const midX = rect.left + rect.width / 2;
            const midY = rect.top + rect.height / 2;
            
            // Very simple grid logic:
            // If we are overlapping significantly?
            
            // Use insertion sort style:
            // If before midX/midY -> insertBefore
            // If after -> insertAfter
            
            // Let's stick to X for simple lists, check Y for multiline?
            // Assuming flex-wrap:
            // If mouseY is clearly in a different row?
            
            // Simplified: Just use simple index check relative to hoverCard
            const isAfter = (mouseX > midX) && (Math.abs(mouseY - midY) < rect.height/2);
            // Or just 'isAfter' based on document order flow? 
            // In a wrapped flex, 'after' visually means right (or next row).
            
            if (isAfter || (mouseY > rect.bottom)) {
                 if (DragState.placeholderElement.previousElementSibling !== hoverCard) {
                     shouldMove = true;
                     moveTarget = hoverCard.nextSibling; // Insert before next sibling (i.e. after hover)
                     movePosition = 'insertBefore';
                 }
            } else {
                 if (DragState.placeholderElement.nextElementSibling !== hoverCard) {
                     shouldMove = true;
                     moveTarget = hoverCard;
                     movePosition = 'insertBefore';
                 }
            }
        } 
        else if (targetEl === dropZone) {
            // Container hover
             const lastChild = dropZone.lastElementChild;
             // If last child is not placeholder, and we are past it?
             if (!lastChild || (lastChild === DragState.placeholderElement && dropZone.children.length === 1)) {
                 // Empty or just self
                 if (DragState.placeholderElement.parentNode !== dropZone) {
                     shouldMove = true;
                     movePosition = 'append';
                 }
             } else {
                 // Check if we should append to end
                 const lastRect = lastChild.getBoundingClientRect();
                 if (mouseX > lastRect.right || mouseY > lastRect.bottom) {
                     if (lastChild !== DragState.placeholderElement) {
                         shouldMove = true;
                         movePosition = 'append';
                     }
                 }
             }
        }

        if (shouldMove) {
            // --- FLIP: First (Snapshot) ---
            siblings.forEach(el => {
                const r = el.getBoundingClientRect();
                flipSnapshot.set(el, { left: r.left, top: r.top });
            });

            // --- Action ---
            // If we move placeholder, we must ensure drag-over class persists on the correct dropZone
            if (DragState.placeholderElement.parentNode !== dropZone) {
                // Moving between zones
                if (movePosition === 'append') dropZone.appendChild(DragState.placeholderElement);
                else dropZone.insertBefore(DragState.placeholderElement, moveTarget);
                
                // Update drag-over state logic
                // Previous zone cleanup? handlePointerMove does it by checking currentDropZone.
            } else {
                // Same zone reorder
                if (movePosition === 'append') dropZone.appendChild(DragState.placeholderElement);
                else dropZone.insertBefore(DragState.placeholderElement, moveTarget);
            }

            // --- FLIP: Last (Invert & Play) ---
            // Force layout update implicitly by reading rects
            requestAnimationFrame(() => {
                siblings.forEach(el => {
                    const oldPos = flipSnapshot.get(el);
                    if (!oldPos) return;
                    
                    const newRect = el.getBoundingClientRect();
                    const dx = oldPos.left - newRect.left;
                    const dy = oldPos.top - newRect.top;
                    
                    if (dx !== 0 || dy !== 0) {
                        // Invert
                        el.style.transform = `translate(${dx}px, ${dy}px)`;
                        el.style.transition = 'none';
                        
                        // Play
                        requestAnimationFrame(() => {
                            el.style.transform = '';
                            el.style.transition = `transform ${DRAG_CONFIG.swapAnimationDuration}ms cubic-bezier(0.2, 0, 0, 1)`;
                            
                            // Clean up transition after done
                            const handler = () => {
                                el.style.transition = '';
                                el.removeEventListener('transitionend', handler);
                            };
                            el.addEventListener('transitionend', handler, {once: true});
                        });
                    }
                });
                flipSnapshot.clear(); // Clean up
            });
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
        const el = DragState.dragElement; // CLONE
        const placeholder = DragState.placeholderElement; // ORIGINAL
        
        // Remove global listeners
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerUp);
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
            // Filter siblings properly
            const siblings = Array.from(dropZone.children).filter(c => c.classList.contains('card-placeholder') && c !== placeholder);
             
            const nextSibling = placeholder.nextElementSibling;
            let targetIndex = siblings.length; // Default to end
            
            if (nextSibling) {
                const idx = siblings.indexOf(nextSibling);
                if (idx !== -1) {
                    targetIndex = idx;
                }
            }
            
            animateDropToPlaceholder(el, placeholder, () => {
                if (window.Game.UI.onCardDrop) {
                    window.Game.UI.onCardDrop(
                        DragState.dragSource.data, 
                        DragState.dragSource.sourceArea, 
                        targetZoneId, 
                        targetIndex,
                        DragState.dragSource.sourceIndex
                    );
                }
                DragState.dragElement = null; 
                DragState.placeholderElement = null; 
            });

            DragState.currentDropZone = null;
            return;
        }

        cancelDrag(e);
    }

    function animateDropToPlaceholder(el, placeholder, onComplete) {
        // ... (existing params)
        // Adapt 'el' as Clone, 'placeholder' as Original.
        // We animate Clone to Original.
        // targetRect moved to loop for dynamic updates
        
        // ... (existing vars)
        // Current State (CSS values)
        let cssX = DragState.currentX;
        let cssY = DragState.currentY;
        let cssW = parseFloat(el.style.width) || el.getBoundingClientRect().width;
        let cssH = parseFloat(el.style.height) || el.getBoundingClientRect().height;
        
        // Extract current rotation
        let curRot = 0;
        const rotMatch = el.style.transform.match(/rotate\(([-\d.]+)deg\)/);
        if (rotMatch) curRot = parseFloat(rotMatch[1]);

        // Ensure no CSS transition interferes
        el.style.transformOrigin = 'center center'; 
        el.style.transition = 'none'; 

        const loop = () => {
            if (!el.isConnected) return; // Dropped or removed externally

            // --- ROBUST VISUAL CONVERGENCE (Same as before) ---
            // Recalculate target position each frame to handle layout shifts
            const targetRect = placeholder.getBoundingClientRect();
            const currentRect = el.getBoundingClientRect();
            
            const deltaX = targetRect.left - currentRect.left;
            const deltaY = targetRect.top - currentRect.top;
            const deltaW = targetRect.width - currentRect.width;
            const deltaH = targetRect.height - currentRect.height;
            const factor = DRAG_CONFIG.lerpFactor;

            cssX += deltaX * factor;
            cssY += deltaY * factor;
            cssW += deltaW * factor;
            cssH += deltaH * factor;
            curRot += (0 - curRot) * factor;

            el.style.transform = `translate(${cssX}px, ${cssY}px) rotate(${curRot}deg)`;
            el.style.width = cssW + 'px';
            el.style.height = cssH + 'px';

            if (
                Math.abs(deltaX) < 1.0 && 
                Math.abs(deltaY) < 1.0 && 
                Math.abs(deltaW) < 1.0 &&
                Math.abs(deltaH) < 1.0 &&
                Math.abs(curRot) < 0.5
            ) {
                // Finalize:
                // 1. Remove Clone
                el.remove();
                
                // 2. Show Original
                placeholder.style.visibility = '';
                placeholder.classList.remove('drag-placeholder');
                
                if (onComplete) onComplete();
            } else {
                requestAnimationFrame(loop);
            }
        };
        requestAnimationFrame(loop);
    }
    
    // --- Compatibility Reset (No-Op usually) ---
    function resetStyles(target) {
        // Just empty to prevent crashes if called
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
        
        console.log("[DragDebug] Resetting Styles. Target same as DragEl?", target === DragState.dragElement);
        console.log("[DragDebug] Restoring CSS:", DragState.originalCssText);

        // --- RESTORE SNAPSHOT ---
        if (target === DragState.dragElement && DragState.originalCssText !== undefined) {
             target.style.cssText = DragState.originalCssText;
        } else {
             // Fallback for manual cleanup if confused
             target.style.cssText = ''; 
        }
        // ------------------------

        target.classList.remove('dragging-real');
        // Ensure pointer events are restored if they weren't in inline style
        // target.style.pointerEvents = ''; // cssText handles this if it was empty
    }

    window.Game.UI.Interactions = {
        initDrag
    };
})();

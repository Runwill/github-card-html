(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    const DragState = {
        isDragging: false,
        dragSource: null, // { data, sourceArea }
        dragElement: null, // 被移动的实际卡牌元素（克隆体）
        placeholderElement: null, // 在原始列表中保持流动的元素（原始元素）
        
        // 物理 / 动画状态
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0,
        velocityX: 0,
        rafId: null,

        // 保持鼠标相对位置恒定的偏移量
        initialX: 0,
        initialY: 0,
        offsetX: 0,
        offsetY: 0,
        
        currentDropZone: null,
        
        // --- 状态恢复 ---
        originalCssText: '',
        originalClasses: '' 
    };

    const DRAG_CONFIG = {
        lerpFactor: 0.25, // 越高 = 响应越快
        maxTilt: 12,      
        tiltFactor: 0.4,
        swapAnimationDuration: 200 // 毫秒
    };
    
    // Bind to Global for Split Modules
    window.Game.UI.DragState = DragState;
    window.Game.UI.DragConfig = DRAG_CONFIG;
    
    function setDragConfig(config) {
        if (typeof config.lerpFactor === 'number') {
            DRAG_CONFIG.lerpFactor = config.lerpFactor;
        }
    }

    // 调试辅助函数
    function logDragDebug(phase) {
        if (!window.Game || !window.Game.Core || !window.Game.Core.GameState) return;
        const gs = window.Game.Core.GameState;
        const self = gs.players && gs.players[0];
        const handCards = (self && self.hand && self.hand.cards) ? self.hand.cards : [];
        const treatmentCards = (gs.treatmentArea && gs.treatmentArea.cards) ? gs.treatmentArea.cards : [];
        console.group(`[DragDebug] ${phase}`);
        
        if (DragState.dragSource) {
             const cardName = typeof DragState.dragSource.data === 'string' ? DragState.dragSource.data : (DragState.dragSource.data.name || 'Unknown');
             console.log(`Moving Card: "${cardName}" (Index: ${DragState.dragSource.sourceIndex}, From: ${DragState.dragSource.sourceArea})`);
        }
        const getName = (c, i) => `[${i}] ${typeof c === 'string' ? c : (c.name || 'Unknown')}`;
        console.log(`Hand (${handCards.length}):`, handCards.map(getName));
        console.log(`Treatment (${treatmentCards.length}):`, treatmentCards.map(getName));
        console.groupEnd();
    }

    function initDrag(cardElement, cardData, sourceAreaName, sourceIndex = -1) {
        cardElement.classList.add('draggable-item');
        cardElement.onpointerdown = (e) => handlePointerDown(e, cardElement, cardData, sourceAreaName, sourceIndex);
        cardElement.ondragstart = () => false;
        cardElement.oncontextmenu = (e) => {
             if(DragState.isDragging) {
                 e.preventDefault();
                 return;
             }
             if (window.Game.UI.showCardContextMenu) {
                 e.preventDefault();
                 window.Game.UI.showCardContextMenu(e.clientX, e.clientY, cardData, sourceAreaName, cardElement);
             }
        };
    }

    function handlePointerDown(e, el, data, sourceArea, sourceIndex) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        DragState.dragSource = { data, sourceArea, sourceIndex };
        DragState.dragElement = el; 
        DragState.startX = e.clientX;
        DragState.startY = e.clientY;
        DragState.isDragging = false; 

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);
    }

    function startDrag(e) {
        if (!DragState.dragElement) return; 
        logDragDebug('Start Drag');
        DragState.isDragging = true;
        document.body.classList.add('is-global-dragging');
        
        const originalEl = DragState.dragElement;
        const rect = originalEl.getBoundingClientRect();
        
        const dragClone = originalEl.cloneNode(true);
        dragClone.id = ''; // 移除 ID
        dragClone.classList.add('dragging-real');
        dragClone.style.transform = 'none';
        
        // Use Module: Copy Styles
        if (window.Game.UI.DragAnimation) {
            window.Game.UI.DragAnimation.copyComputedStyles(originalEl, dragClone);
        }
        
        dragClone.style.position = 'fixed';
        dragClone.style.zIndex = 99999;
        dragClone.style.width = rect.width + 'px';
        dragClone.style.height = rect.height + 'px';
        dragClone.style.margin = '0';
        
        DragState.initialX = rect.left;
        DragState.initialY = rect.top;
        DragState.offsetX = e.clientX - rect.left;
        DragState.offsetY = e.clientY - rect.top;
        
        dragClone.style.left = rect.left + 'px';
        dragClone.style.top = rect.top + 'px';
        
        document.body.appendChild(dragClone);
        originalEl.style.visibility = 'hidden';
        
        DragState.dragClone = dragClone; 
        DragState.originalEl = originalEl;   
        
        DragState.placeholderElement = originalEl; 
        DragState.dragElement = dragClone;         
        
        DragState.placeholderElement.classList.add('drag-placeholder');
        
        // --- FLIP Setup: Reveal card underneath for stacked piles ---
        const parent = originalEl.parentElement;
        if (parent && parent.classList.contains('area-stacked')) {
            const prevSibling = originalEl.previousElementSibling;
            // Check if it's a valid card placeholder (not some other element)
            if (prevSibling && prevSibling.classList.contains('card-placeholder')) {
                // Determine if we should treat it as top card.
                // Usually yes, if we lift the top one, the next one becomes top.
                if (!prevSibling.classList.contains('is-top-card')) {
                    prevSibling.classList.add('is-top-card');
                    DragState.tempRevealedCard = prevSibling;
                }
            }
        }

        const calibrationRect = dragClone.getBoundingClientRect();
        const driftX = calibrationRect.left - rect.left;
        const driftY = calibrationRect.top - rect.top;
        
        if (Math.abs(driftX) > 1 || Math.abs(driftY) > 1) {
             dragClone.style.left = (rect.left - driftX) + 'px';
             dragClone.style.top = (rect.top - driftY) + 'px';
        }
        
        DragState.currentX = 0; 
        DragState.currentY = 0; 
        DragState.targetX = 0;
        DragState.targetY = 0;
        
        // Use Module: Start Loop
        if (window.Game.UI.DragAnimation) {
            window.Game.UI.DragAnimation.startAnimationLoop();
        }
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
        
        const outcomeX = e.clientX - DragState.offsetX;
        const outcomeY = e.clientY - DragState.offsetY;
        
        DragState.targetX = outcomeX - DragState.initialX;
        DragState.targetY = outcomeY - DragState.initialY;
        
        if (DragState.dragElement && DragState.dragElement.style.pointerEvents !== 'none') {
            DragState.dragElement.style.pointerEvents = 'none';
        }

        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const dropZone = targetEl ? targetEl.closest('[data-drop-zone]') : null;
             
        if (DragState.currentDropZone !== dropZone) {
            if (DragState.currentDropZone) DragState.currentDropZone.classList.remove('drag-over');
            if (dropZone) dropZone.classList.add('drag-over');
            DragState.currentDropZone = dropZone;
        }
        
        if (dropZone && window.Game.UI.DragSorting) {
             const acceptPlaceholder = dropZone.getAttribute('data-accept-placeholder') !== 'false';
             
             if (acceptPlaceholder) {
                 window.Game.UI.DragSorting.updatePlaceholderPosition(dropZone, targetEl, e.clientX, e.clientY);
             } 
             else if (DragState.placeholderElement) {
                 if (DragState.placeholderElement.parentNode !== dropZone) {
                     window.Game.UI.DragSorting.performPlaceholderMove(dropZone, null, true); 
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

    function cancelDrag(e) {
        // Cleanup temp revealed card
        if (DragState.tempRevealedCard) {
            DragState.tempRevealedCard.classList.remove('is-top-card');
            DragState.tempRevealedCard = null;
        }

        const el = DragState.dragElement;
        
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerUp);

        if (el) {
            el.removeEventListener('pointermove', handlePointerMove);
            el.removeEventListener('pointerup', handlePointerUp);
            el.removeEventListener('pointercancel', handlePointerUp);
            
            if (el.parentNode === document.body && DragState.placeholderElement && DragState.placeholderElement.parentNode) {
                 const placeholder = DragState.placeholderElement;
                 if (window.Game.UI.DragAnimation) {
                     window.Game.UI.DragAnimation.animateDropToPlaceholder(el, placeholder, () => {});
                 }
                 DragState.placeholderElement = null; 
            } else if (el.parentNode === document.body) {
                el.remove();
            } else {
                el.classList.remove('draggable-item'); 
            }
        }
        
        DragState.currentDropZone?.classList.remove('drag-over');
        DragState.currentDropZone = null;
        DragState.dragElement = null;
        DragState.isDragging = false;
        if(DragState.rafId) cancelAnimationFrame(DragState.rafId);
    }

    function finishDrag(e) {
        const el = DragState.dragElement; 
        const placeholder = DragState.placeholderElement; 
        
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

        let dropZone = DragState.currentDropZone;
        if (!dropZone && placeholder) {
            dropZone = placeholder.parentNode;
        }

        if (dropZone && dropZone.getAttribute('data-drop-zone')) {
            const targetZoneId = dropZone.getAttribute('data-drop-zone');
            const acceptPlaceholder = dropZone.getAttribute('data-accept-placeholder') !== 'false';
            
            let targetIndex = -1;

            if (acceptPlaceholder && placeholder && placeholder.parentNode === dropZone) {
                const siblings = Array.from(dropZone.children).filter(c => c.classList.contains('card-placeholder') && c !== placeholder);
                
                targetIndex = siblings.length; 
                
                const nextSibling = placeholder.nextElementSibling;
                if (nextSibling) {
                    const idx = siblings.indexOf(nextSibling);
                    if (idx !== -1) {
                        targetIndex = idx;
                    }
                }
            } else {
                targetIndex = -1;
            }
            
            logDragDebug(`Before Drop Action (Target: ${targetZoneId})`);
            window.Game.UI.isRenderingSuspended = true;

            let isLogicFinished = false;
            let isAnimationFinished = false;
            
            const useRemoteAnimation = !acceptPlaceholder;
            let options = {};
            
            if (useRemoteAnimation && el) {
                options.startRect = el.getBoundingClientRect();
                options.dragElement = el;
                options.cardHTML = el.outerHTML; 
                isAnimationFinished = true;
            }

            const checkFinish = () => {
                if (isLogicFinished && isAnimationFinished) {
                    window.Game.UI.isRenderingSuspended = false;
                    if (window.Game.UI.updateUI) window.Game.UI.updateUI();
                    logDragDebug('After Drop Action (All Done)');
                    
                    if (DragState.tempRevealedCard) {
                        DragState.tempRevealedCard.classList.remove('is-top-card'); // Just in case, though re-render should handle it
                        DragState.tempRevealedCard = null;
                    }

                    if (DragState.dragElement === el) {
                        document.body.classList.remove('is-global-dragging');
                        DragState.dragElement = null;
                        DragState.isDragging = false; 
                    }
                    if (DragState.placeholderElement === placeholder) {
                        DragState.placeholderElement = null; 
                    }
                }
            };

            const playDropAnimation = () => {
                if (window.Game.UI.DragAnimation) {
                     window.Game.UI.DragAnimation.animateDropToPlaceholder(el, placeholder, () => {
                        isAnimationFinished = true;
                        checkFinish();
                    });
                } else {
                    el.remove(); // Fallback if module missing
                    isAnimationFinished = true;
                    checkFinish();
                }
            };

            if (window.Game.UI.onCardDrop) {
                window.Game.UI.onCardDrop(
                    DragState.dragSource.data, 
                    DragState.dragSource.sourceArea, 
                    targetZoneId, 
                    targetIndex,
                    DragState.dragSource.sourceIndex,
                    {
                        onMoveExecuted: () => {
                            logDragDebug('Triggering Animation (Event Executed)');
                            if (useRemoteAnimation) {
                                if (placeholder) placeholder.remove(); 

                                // [Enhanced Drop Animation]
                                // Attempt to find the "real" resulting element in the target zone after UI update.
                                let newTargetEl = null;
                                const zone = document.querySelector(`[data-drop-zone="${targetZoneId}"]`);
                                
                                if (zone) {
                                    const cardChildren = Array.from(zone.children).filter(c => c.classList.contains('card-placeholder'));
                                    if (cardChildren.length > 0) {
                                        // If we had a specific index, try to respect it (though it might be -1 for piles)
                                        if (targetIndex >= 0 && targetIndex < cardChildren.length) {
                                             newTargetEl = cardChildren[targetIndex];
                                        } else {
                                             // Default to the last element (most common for Deck/Discard Pile additions)
                                             newTargetEl = cardChildren[cardChildren.length - 1];
                                        }
                                    }
                                }

                                if (newTargetEl && window.Game.UI.DragAnimation) {
                                    // Animate the ghost to merge with the new UI element.
                                    // We hide the target temporarily to avoid seeing "double" during the fly-in.
                                    newTargetEl.style.visibility = 'hidden';
                                    
                                    // The animation module will now also sync 'data-card-key' to trigger the flip effect.
                                    window.Game.UI.DragAnimation.animateDropToPlaceholder(el, newTargetEl, () => {
                                        isAnimationFinished = true;
                                        checkFinish();
                                    });
                                } else {
                                    // Fallback if target not found or animation missing
                                    if (el) el.remove();
                                    isAnimationFinished = true; 
                                    checkFinish();
                                }
                            } else {
                                playDropAnimation();
                            }
                        },
                        onComplete: () => {
                            isLogicFinished = true;
                            logDragDebug('Logic Finished');
                            checkFinish();
                        }
                    },
                    options
                );
            } else {
                isLogicFinished = true;
                playDropAnimation();
            }
            
            DragState.currentDropZone = null;
            return;
        }

        cancelDrag(e);
    }

    // Accessors for Modules if they need to call back? 
    // Usually they just operate on state.

    window.Game.UI.Interactions = {
        initDrag,
        setDragConfig
    };

})();

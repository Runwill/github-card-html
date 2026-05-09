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
        lerpFactor: 0.15, // 越高 = 响应越快（中等惯性）
        maxTilt: 12,      
        tiltFactor: 0.4,
        swapAnimationDuration: 200 // 毫秒
    };

    // ── 强制横屏坐标转换辅助 ─────────────────────
    // 将物理触摸坐标（clientX/Y）转为视觉坐标
    function _flPt(x, y) {
        if (window.__flTransformPoint) return window.__flTransformPoint(x, y);
        return { x: x, y: y };
    }
    // 将物理 BoundingClientRect 转为视觉矩形
    function _flR(rect) {
        if (window.__flTransformRect) return window.__flTransformRect(rect);
        return rect;
    }
    
    // Bind to Global for Split Modules
    window.Game.UI.DragState = DragState;
    window.Game.UI.DragConfig = DRAG_CONFIG;
    

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
        const p = _flPt(e.clientX, e.clientY);
        DragState.startX = p.x;
        DragState.startY = p.y;
        DragState.isDragging = false; 

        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);
    }

    function startDrag(e) {
        if (!DragState.dragElement) return; 
        DragState.isDragging = true;
        document.body.classList.add('is-global-dragging');
        
        const originalEl = DragState.dragElement;
        const physRect = originalEl.getBoundingClientRect();
        const rect = _flR(physRect);
        
        // Use Module: Create Ghost (receives physical rect, converts internally)
        const dragClone = window.Game.UI.DragAnimation.createGhost(originalEl, physRect, { zIndex: '99999' });

        // Remove ID
        dragClone.id = '';
        
        const p = _flPt(e.clientX, e.clientY);
        DragState.initialX = rect.left;
        DragState.initialY = rect.top;
        DragState.offsetX = p.x - rect.left;
        DragState.offsetY = p.y - rect.top;
        
        // Hide Original
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

        const calibrationRect = _flR(dragClone.getBoundingClientRect());
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
            const p = _flPt(e.clientX, e.clientY);
            const dist = Math.hypot(p.x - DragState.startX, p.y - DragState.startY);
            if (dist > 5) { 
                startDrag(e);
            }
            return;
        }

        e.preventDefault();
        
        const vp = _flPt(e.clientX, e.clientY);
        const outcomeX = vp.x - DragState.offsetX;
        const outcomeY = vp.y - DragState.offsetY;
        
        DragState.targetX = outcomeX - DragState.initialX;
        DragState.targetY = outcomeY - DragState.initialY;
        
        if (DragState.dragElement && DragState.dragElement.style.pointerEvents !== 'none') {
            DragState.dragElement.style.pointerEvents = 'none';
        }

        // elementFromPoint 使用物理坐标（浏览器 API 接受物理坐标）
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const dropZone = targetEl ? targetEl.closest('[data-drop-zone]') : null;
             
        if (DragState.currentDropZone !== dropZone) {
            if (DragState.currentDropZone) DragState.currentDropZone.classList.remove('drag-over');
            if (dropZone && dropZone.getAttribute('data-drop-zone') === 'hand') {
                dropZone.classList.add('drag-over');
            }
            DragState.currentDropZone = dropZone;
        }
        
        if (dropZone && window.Game.UI.DragSorting) {
             const acceptPlaceholder = dropZone.getAttribute('data-accept-placeholder') !== 'false';
             
             if (acceptPlaceholder) {
                 window.Game.UI.DragSorting.updatePlaceholderPosition(dropZone, targetEl, vp.x, vp.y);
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
            
            const isGhost = el.classList.contains('dragging-real');
            if (isGhost && DragState.placeholderElement && DragState.placeholderElement.parentNode) {
                 const placeholder = DragState.placeholderElement;
                 if (window.Game.UI.DragAnimation) {
                     window.Game.UI.DragAnimation.animateDropToPlaceholder(el, placeholder, () => {});
                 }
                 DragState.placeholderElement = null; 
            } else if (isGhost) {
                el.remove();
            } else {
                el.classList.remove('draggable-item'); 
            }
        }
        
        DragState.currentDropZone?.classList.remove('drag-over');
        DragState.currentDropZone = null;
        document.body.classList.remove('is-global-dragging');
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
        if (DragState.currentDropZone) {
            DragState.currentDropZone.classList.remove('drag-over');
            DragState.currentDropZone = null;
        }
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
            
            window.Game.UI.isRenderingSuspended = true;

            let isLogicFinished = false;
            let isAnimationFinished = false;
            
            const useRemoteAnimation = !acceptPlaceholder;
            let options = { isDrag: true };
            
            if (useRemoteAnimation && el) {
                options.startRect = el.getBoundingClientRect();
                options.dragElement = el;
                options.cardHTML = el.outerHTML; 
                // We wait for onMoveExecuted to complete the animation explicitly
                isAnimationFinished = false; 
            }

            const checkFinish = () => {
                if (isLogicFinished && isAnimationFinished) {
                    // Cleanup temporary reveal logic BEFORE updating UI. 
                    // This allows the renderer (updateUI) to be the final source of truth for 'is-top-card'.
                    if (DragState.tempRevealedCard) {
                        DragState.tempRevealedCard.classList.remove('is-top-card'); 
                        DragState.tempRevealedCard = null;
                    }

                    window.Game.UI.isRenderingSuspended = false;
                    if (window.Game.UI.updateUI) window.Game.UI.updateUI();

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
                            // Force UI update to ensure target existence (hidden initially by logic below)
                            const wasSuspended = window.Game.UI.isRenderingSuspended;
                            window.Game.UI.isRenderingSuspended = false;
                            if (window.Game.UI.updateUI) window.Game.UI.updateUI();
                            window.Game.UI.isRenderingSuspended = true;

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

                                if (!newTargetEl) {
                                    console.warn(`[DragAnim] Target Element NOT found in zone: ${targetZoneId}`);
                                }

                                if (newTargetEl && window.Game.UI.DragAnimation) {
                                    // Animate the ghost to merge with the new UI element.
                                    // We hide the target temporarily to avoid seeing "double" during the fly-in.
                                    newTargetEl.style.visibility = 'hidden';

                                    // FIX: In stacked areas, showing only the "new" top card means the 'previous' top card
                                    // (now covered by newTargetEl) is hidden by CSS (.area-stacked > not(.is-top-card) { display: none }).
                                    // We must force the UNDERLYING card visible so the stack doesn't appear empty during animation.
                                    let prevStackCard = null;
                                    const isStacked = zone && zone.classList.contains('area-stacked');
                                    if (isStacked) {
                                        // newTargetEl is likely the last child. Find the one before it.
                                        prevStackCard = newTargetEl.previousElementSibling;
                                        // Ensure it's a card and not something else
                                        if (prevStackCard && prevStackCard.classList.contains('card-placeholder')) {
                                            prevStackCard.style.display = 'flex'; // Force visible override
                                        } else {
                                            prevStackCard = null;
                                        }
                                    }
                                    
                                    // The animation module will now also sync 'data-card-key' to trigger the flip effect.
                                    window.Game.UI.DragAnimation.animateDropToPlaceholder(el, newTargetEl, () => {
                                        // Cleanup temp visibility logic for the underlying card
                                        if (prevStackCard) {
                                            prevStackCard.style.display = ''; // Revert to CSS control (hidden)
                                        }

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
                                // [Local Drop Animation]
                                // Logic similar to remote: prevent double vision and empty stack issue.
                                if (window.Game.UI.DragAnimation) {
                                    // 1. Hide the target (placeholder) so we don't see the "real" card yet
                                    placeholder.style.visibility = 'hidden';

                                    // 2. Fix Underlying Card Visibility for Stacked Areas
                                    let prevStackCard = null;
                                    const dropZone = placeholder.parentNode;
                                    const isStacked = dropZone && dropZone.classList.contains('area-stacked');
                                    
                                    if (isStacked) {
                                        // The placeholder is now the top card. The card before it is the "old" top.
                                        prevStackCard = placeholder.previousElementSibling;
                                        if (prevStackCard && prevStackCard.classList.contains('card-placeholder')) {
                                            prevStackCard.style.display = 'flex'; // Force visible
                                        } else {
                                            prevStackCard = null;
                                        }
                                    }

                                    window.Game.UI.DragAnimation.animateDropToPlaceholder(el, placeholder, () => {
                                        // 3. Cleanup
                                        // Unhide default target
                                        // Note: animation.js might handle removing 'drag-placeholder' & transitions,
                                        // but it sets visibility='' at the very end.
                                        // We trust it to clean up the target visibility.
                                        // Here we clean up the sibling.
                                        
                                        if (prevStackCard) {
                                            prevStackCard.style.display = ''; // Revert to CSS hidden
                                        }
                                        
                                        isAnimationFinished = true;
                                        checkFinish();
                                    });
                                } else {
                                    // Fallback
                                    el.remove();
                                    isAnimationFinished = true;
                                    checkFinish();
                                }
                            }
                        },
                        onComplete: () => {
                            isLogicFinished = true;
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
        initDrag
    };

})();

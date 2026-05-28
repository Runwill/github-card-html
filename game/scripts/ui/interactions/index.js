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
        originalParent: null,
        originalNextSibling: null,
        
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

    const _flR = window.Game.UI._flR;
    const _flPt = window.Game.UI._flPt;

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
                 window.Game.UI.showCardContextMenu(e.clientX, e.clientY, cardData);
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

        syncPointerListeners(document, 'addEventListener');
    }

    function syncPointerListeners(target, method) {
        if (!target || !target[method]) return;
        [
            ['pointermove', handlePointerMove],
            ['pointerup', handlePointerUp],
            ['pointercancel', handlePointerUp]
        ].forEach(([eventName, handler]) => target[method](eventName, handler));
    }

    function clearTempRevealedCard() {
        if (!DragState.tempRevealedCard) return;
        DragState.tempRevealedCard.classList.remove('is-top-card');
        DragState.tempRevealedCard = null;
    }

    function startDrag(e) {
        if (!DragState.dragElement) return; 
        DragState.isDragging = true;
        document.body.classList.add('is-global-dragging');
        
        const originalEl = DragState.dragElement;
        DragState.originalParent = originalEl.parentNode;
        DragState.originalNextSibling = originalEl.nextSibling;
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
        window.Game.UI.DragAnimation?.startAnimationLoop?.();
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
        
        const DragSorting = dropZone && window.Game.UI.DragSorting;
        if (DragSorting) {
             const acceptPlaceholder = dropZone.getAttribute('data-accept-placeholder') !== 'false';
             
             if (acceptPlaceholder) {
                 DragSorting.updatePlaceholderPosition(dropZone, targetEl, vp.x, vp.y);
             } 
             else if (DragState.placeholderElement) {
                 if (DragState.placeholderElement.parentNode !== dropZone) {
                     DragSorting.performPlaceholderMove(dropZone, null, true);
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
        clearTempRevealedCard();

        const el = DragState.dragElement;
        
        syncPointerListeners(document, 'removeEventListener');

        if (el) {
            syncPointerListeners(el, 'removeEventListener');
            
            const isGhost = el.classList.contains('dragging-real');
            if (isGhost && DragState.placeholderElement && DragState.placeholderElement.parentNode) {
                 const placeholder = DragState.placeholderElement;
                 window.Game.UI.DragAnimation?.animateDropToPlaceholder?.(el, placeholder);
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
        DragState.originalParent = null;
        DragState.originalNextSibling = null;
        if(DragState.rafId) cancelAnimationFrame(DragState.rafId);
    }

    function finishDrag(e) {
        const el = DragState.dragElement; 
        const placeholder = DragState.placeholderElement; 
        
           syncPointerListeners(document, 'removeEventListener');
        if (DragState.rafId) cancelAnimationFrame(DragState.rafId);

        if (el) {
             try { el.releasePointerCapture(e.pointerId); } catch(err){}
               syncPointerListeners(el, 'removeEventListener');
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
            const options = { isDrag: true };

            const checkFinish = () => {
                if (isLogicFinished && isAnimationFinished) {
                    // Cleanup temporary reveal logic BEFORE updating UI. 
                    // This allows the renderer (updateUI) to be the final source of truth for 'is-top-card'.
                    clearTempRevealedCard();

                    window.Game.UI.isRenderingSuspended = false;
                    window.Game.UI.updateUI?.();

                    if (DragState.dragElement === el) {
                        document.body.classList.remove('is-global-dragging');
                        DragState.dragElement = null;
                        DragState.isDragging = false; 
                    }
                    if (DragState.placeholderElement === placeholder) {
                        DragState.placeholderElement = null; 
                    }
                    DragState.originalParent = null;
                    DragState.originalNextSibling = null;
                }
            };

            const restorePlaceholderToOrigin = () => {
                const origin = DragState.originalParent;
                if (!placeholder || !origin) return;
                const next = DragState.originalNextSibling;
                if (next && next.parentNode === origin) origin.insertBefore(placeholder, next);
                else origin.appendChild(placeholder);
                placeholder.classList.remove('drag-placeholder-hidden');
                placeholder.style.display = '';
                placeholder.style.visibility = 'hidden';
            };

            const playDropAnimation = () => {
                     if (window.Game.UI.DragAnimation?.animateDropToPlaceholder) {
                     window.Game.UI.DragAnimation.animateDropToPlaceholder(el, placeholder, () => {
                        finishAnimation();
                    });
                } else {
                    fallbackAnimation();
                }
            };

            const finishAnimation = () => {
                isAnimationFinished = true;
                checkFinish();
            };

            const fallbackAnimation = () => {
                if (el) el.remove();
                finishAnimation();
            };

            const revealPreviousStackCard = (targetEl, zone) => {
                if (!zone || !zone.classList.contains('area-stacked')) return null;
                const prevStackCard = targetEl && targetEl.previousElementSibling;
                if (!prevStackCard || !prevStackCard.classList.contains('card-placeholder')) return null;
                prevStackCard.style.display = 'flex';
                return prevStackCard;
            };

            const animateToDropTarget = (targetEl, zone, isCardTarget = true) => {
                if (!targetEl || !window.Game.UI.DragAnimation) { fallbackAnimation(); return; }
                if (isCardTarget) {
                    targetEl.style.visibility = 'hidden';
                    targetEl._animRestore = true;
                }
                const prevStackCard = isCardTarget ? revealPreviousStackCard(targetEl, zone) : null;
                window.Game.UI.DragAnimation.animateDropToPlaceholder(el, targetEl, () => {
                    if (prevStackCard) prevStackCard.style.display = '';
                    if (isCardTarget) {
                        targetEl.style.visibility = '';
                        delete targetEl._animRestore;
                    }
                    finishAnimation();
                }, { matchSize: isCardTarget });
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
                            window.Game.UI.isRenderingSuspended = false;
                            window.Game.UI.updateUI?.();
                            window.Game.UI.isRenderingSuspended = true;

                            if (useRemoteAnimation) {
                                if (placeholder) placeholder.remove(); 

                                const target = window.Game.UI.CardMoveTargets?.findAnimationTargetForDropZone?.(targetZoneId, {
                                    cardId: DragState.dragSource.data && DragState.dragSource.data.id,
                                    targetIndex
                                });

                                if (!target) {
                                    console.warn(`[DragAnim] Target Element NOT found in zone: ${targetZoneId}`);
                                }

                                animateToDropTarget(target && target.target, target && target.zone, target && target.isCard);
                                window.Game.UI.CardMoveAnimator?.animateLayoutAfterMove?.();
                            } else {
                                animateToDropTarget(placeholder, placeholder && placeholder.parentNode);
                            }
                        },
                        onComplete: () => {
                            isLogicFinished = true;
                            checkFinish();
                        },
                        onMoveRejected: () => {
                            restorePlaceholderToOrigin();
                            animateToDropTarget(placeholder, placeholder && placeholder.parentNode);
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

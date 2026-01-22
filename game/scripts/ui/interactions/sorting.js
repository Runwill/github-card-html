(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    const UI = window.Game.UI;

    function getSortableSelector(el) {
        return el.getAttribute('data-item-selector') || '.card-placeholder';
    }

    // 获取元素真实的布局 Rect (忽略 Transform 动画的影响)
    function getLayoutRect(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const transform = style.transform;
        
        if (transform && transform !== 'none') {
            // 解析 matrix(a, b, c, d, tx, ty)
            const match = transform.match(/matrix\((.+)\)/);
            if (match) {
                const values = match[1].split(',').map(parseFloat);
                if (values.length >= 6) {
                    const tx = values[4];
                    const ty = values[5];
                    // 视觉位置 = 布局位置 + transform
                    // 布局位置 = 视觉位置 - transform
                    return {
                        left: rect.left - tx,
                        top: rect.top - ty,
                        right: rect.right - tx,
                        bottom: rect.bottom - ty,
                        width: rect.width,
                        height: rect.height,
                        // 兼容 x, y
                        x: rect.left - tx,
                        y: rect.top - ty
                    };
                }
            }
        }
        return rect;
    }

    function performPlaceholderMove(targetContainer, targetSibling, hidePlaceholder = false) {
        const DragState = UI.DragState;
        const DRAG_CONFIG = UI.DragConfig;
        if (!DragState || !DragState.placeholderElement) return;

        const placeholder = DragState.placeholderElement;
        const oldContainer = placeholder.parentNode;
        
        let affected = [];
        const targetSelector = getSortableSelector(targetContainer);
        
        Array.from(targetContainer.children).forEach(c => {
             if (c !== placeholder && c.matches(targetSelector)) affected.push(c);
        });
        
        if (oldContainer && oldContainer !== targetContainer && oldContainer.nodeType === 1) {
            const oldSelector = getSortableSelector(oldContainer);
            Array.from(oldContainer.children).forEach(c => {
                 if (c !== placeholder && c.matches(oldSelector)) affected.push(c);
            });
        }
        
        const snapshot = new Map();
        affected.forEach(el => {
            const r = el.getBoundingClientRect();
            snapshot.set(el, { left: r.left, top: r.top });
        });
        
        if (targetSibling) {
            targetContainer.insertBefore(placeholder, targetSibling);
        } else {
            targetContainer.appendChild(placeholder);
        }

        // 在移动之后再决定显示或隐藏占位符
        if (hidePlaceholder) {
            placeholder.classList.add('drag-placeholder-hidden');
            placeholder.style.display = 'none';
        } else {
            placeholder.classList.remove('drag-placeholder-hidden');
            placeholder.style.display = ''; 
            placeholder.style.visibility = ''; 
        }

        // --- 同步执行 FLIP Invert ---
        affected.forEach(el => {
            const start = snapshot.get(el);
            if (!start) return;
            
            const rect = el.getBoundingClientRect(); 
            const dx = start.left - rect.left;
            const dy = start.top - rect.top;
            
            if (dx !== 0 || dy !== 0) {
                el.style.transform = `translate(${dx}px, ${dy}px)`;
                el.style.transition = 'none';
                el.dataset.flipping = 'true';
            }
        });
        
        // --- 异步执行 FLIP Play ---
        requestAnimationFrame(() => {
            affected.forEach(el => {
                if (el.dataset.flipping === 'true') {
                    delete el.dataset.flipping;
                    el.style.transform = '';
                    el.style.transition = `transform ${DRAG_CONFIG.swapAnimationDuration}ms cubic-bezier(0.2, 0, 0, 1)`;
                    
                    const endHandler = () => {
                         el.style.transition = '';
                         el.removeEventListener('transitionend', endHandler);
                    };
                    el.addEventListener('transitionend', endHandler, {once: true});
                }
            });
        });
    }

    function updatePlaceholderPosition(dropZone, targetEl, mouseX, mouseY) {
        const DragState = UI.DragState;
        if (!DragState || !DragState.placeholderElement) return;

        const itemSelector = getSortableSelector(dropZone);
        const hoverItem = targetEl ? targetEl.closest(`${itemSelector}:not(.drag-placeholder)`) : null;
        
        let shouldMove = false;
        let moveTarget = null; // null = append

        if (hoverItem && hoverItem.parentNode === dropZone) {
            const rect = getLayoutRect(hoverItem);
            
            const midX = rect.left + rect.width / 2;
            const midY = rect.top + rect.height / 2;
            
            // Determine Before/After essentially
            const isAfter = (mouseX > midX) && (Math.abs(mouseY - midY) < rect.height * 0.8);
            
            if (isAfter || (mouseY > rect.bottom)) {
                 if (DragState.placeholderElement.previousElementSibling !== hoverItem) {
                     shouldMove = true;
                     moveTarget = hoverItem.nextSibling;
                 }
            } else {
                 if (DragState.placeholderElement.nextElementSibling !== hoverItem) {
                     shouldMove = true;
                     moveTarget = hoverItem;
                 }
            }
        } 
        else if (targetEl === dropZone) {
             // Container logic
             const items = Array.from(dropZone.children).filter(c => c.matches(itemSelector) && c !== DragState.placeholderElement);
             
             if (items.length === 0) {
                 if (DragState.placeholderElement.parentNode !== dropZone) {
                     shouldMove = true;
                     moveTarget = null;
                 }
             } else {
                 // Find closest
                 let minDist = Infinity;
                 let closest = null;

                 items.forEach(item => {
                     const r = getLayoutRect(item);
                     const cx = r.left + r.width / 2;
                     const cy = r.top + r.height / 2;
                     const dist = (mouseX - cx) ** 2 + (mouseY - cy) ** 2;
                     if (dist < minDist) {
                         minDist = dist;
                         closest = item;
                     }
                 });

                 if (closest) {
                     const rect = getLayoutRect(closest);
                     const midX = rect.left + rect.width / 2;
                     
                     let isAfter = mouseX > midX;

                     // Vertical logic fix
                     if (mouseY > rect.bottom) {
                         if (closest === items[items.length - 1]) {
                             isAfter = true;
                         }
                     }
                     if (mouseY < rect.top) {
                         if (closest === items[items.length - 1] && items.length < 5) {
                                 isAfter = true;
                         }
                     }

                     if (isAfter) {
                         if (DragState.placeholderElement.previousElementSibling !== closest) {
                             shouldMove = true;
                             moveTarget = closest.nextSibling;
                         }
                     } else {
                         if (DragState.placeholderElement.nextElementSibling !== closest) {
                             shouldMove = true;
                             moveTarget = closest;
                         }
                     }
                 }
             }
        }

        if (shouldMove) {
            performPlaceholderMove(dropZone, moveTarget);
        }
    }

    // Export
    UI.DragSorting = {
        getSortableSelector,
        getLayoutRect,
        performPlaceholderMove,
        updatePlaceholderPosition
    };

})();
(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};
    
    const UI = window.Game.UI;

    function startAnimationLoop() {
        const DragState = UI.DragState;
        const DRAG_CONFIG = UI.DragConfig;

        if (DragState.rafId) cancelAnimationFrame(DragState.rafId);
        
        const render = () => {
            if (!DragState.isDragging || !DragState.dragElement) return;

            // 插值当前平移到目标平移
            const dx = DragState.targetX - DragState.currentX;
            const dy = DragState.targetY - DragState.currentY;
            
            // 应用缓动
            DragState.currentX += dx * DRAG_CONFIG.lerpFactor;
            DragState.currentY += dy * DRAG_CONFIG.lerpFactor;
            
            // 计算速度以用于倾斜效果
            DragState.velocityX = dx * DRAG_CONFIG.lerpFactor;
            
            const tilt = Math.max(Math.min(DragState.velocityX * DRAG_CONFIG.tiltFactor, DRAG_CONFIG.maxTilt), -DRAG_CONFIG.maxTilt);
            
            if (DragState.dragElement) {
                DragState.dragElement.style.transform = `translate(${DragState.currentX}px, ${DragState.currentY}px) rotate(${tilt}deg)`;
            }

            DragState.rafId = requestAnimationFrame(render);
        };
        DragState.rafId = requestAnimationFrame(render);
    }

    function createGhost(source, rect, options = {}) {
        let ghost;
        if (typeof source === 'string') {
            const temp = document.createElement('div');
            temp.innerHTML = source;
            ghost = temp.firstElementChild;
        } else if (source && source.nodeType === 1) {
            ghost = source.cloneNode(true);
            UI.copyStyles(source, ghost);
            // Sync specific state attributes if useful
            if (source.getAttribute('data-card-key')) {
                ghost.setAttribute('data-card-key', source.getAttribute('data-card-key'));
            }
        } else {
            ghost = document.createElement('div');
            ghost.className = 'card dragging-real';
        }

        if (!ghost) return null;

        const defaultZIndex = '100000'; // High enough to be above Modals (11000)

        ghost.classList.add('dragging-real');
        ghost.style.position = 'fixed';
        ghost.style.left = `${rect.left}px`;
        ghost.style.top = `${rect.top}px`;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.margin = '0';
        ghost.style.zIndex = options.zIndex || defaultZIndex;
        ghost.style.pointerEvents = 'none';

        // [Fix] Reset transform to avoid double-offsetting 
        // (since we set left/top to the current visual position already)
        ghost.style.transform = 'none'; 
        
        // Remove ID to avoid duplicates
        ghost.removeAttribute('id');

        document.body.appendChild(ghost);
        return ghost;
    }

    function animateDropToPlaceholder(el, placeholder, onComplete, options = {}) {
        const DragState = UI.DragState;
        const DRAG_CONFIG = UI.DragConfig;
        
        // Options defaults
        const { 
            matchSize = true,  // If false, centers on target but keeps ghost size
            forceCenter = false // If true, calculates target based on center point alignment
        } = options;

        // ... existing sync logic ...
        // we apply it to the dragging ghost to trigger CSS transitions (flip/fade).
        if (placeholder && el) {
            const targetKey = placeholder.getAttribute('data-card-key');
            const currentKey = el.getAttribute('data-card-key');
            
            if (targetKey && currentKey !== targetKey) {
                // Determine if we need to force a flip style
                console.log(`[DragAnim] Syncing Keys: ${currentKey} -> ${targetKey}`);
                el.setAttribute('data-card-key', targetKey);
                
                // Optional: visual enhancement for flip
                // We could add a 'flipping' class if we wanted 3D rotate, 
                // but for now relying on CSS background/opacity transitions.
            }
        }

        let cssX, cssY;
        
        const styleTransform = el.style.transform || '';
        const translateMatch = styleTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        
        if (translateMatch) {
             cssX = parseFloat(translateMatch[1]);
             cssY = parseFloat(translateMatch[2]);
        } else if (DragState.dragElement === el) {
             cssX = DragState.currentX;
             cssY = DragState.currentY;
        } else {
             cssX = 0;
             cssY = 0;
        }

        let cssW = parseFloat(el.style.width) || el.getBoundingClientRect().width;
        let cssH = parseFloat(el.style.height) || el.getBoundingClientRect().height;
        
        // 提取当前旋转
        let curRot = 0;
        const rotMatch = el.style.transform.match(/rotate\(([-\d.]+)deg\)/);
        if (rotMatch) curRot = parseFloat(rotMatch[1]);

        el.style.transformOrigin = 'center center'; 
        
        // 修复：确保 transition 不为 "none"，否则翻面效果（背景/颜色过渡）会丢失
        // 显式指定需要过渡的属性，保留 transform 由 JS 控制
        // [Flip Fix] Increase speed for short distances if needed, but 0.3s is standard.
        const transitionRule = 'opacity 0.3s, background-color 0.3s, background-image 0.3s, color 0.3s, filter 0.3s, border-color 0.3s, box-shadow 0.3s';
        el.style.transition = transitionRule;
        
        // FORCE REFLOW: Ensure the browser registers the "Before" state (e.g. key='dodge', transition enabled)
        // before we flip the switch to 'CardBack'. This is crucial for triggering the transition.
        const reflowVal = el.offsetWidth;

        // If the target (placeholder) has a different state (e.g. CardBack),
        // we apply it to the dragging ghost to trigger CSS transitions (flip/fade).
        if (placeholder && el) {
            let targetKey = placeholder.getAttribute('data-card-key');
            
            // ROOT CAUSE FIX: Check if the container adheres to strict face-down rules.
            // If so, override any transient key the placeholder might still have (e.g. from previous zone).
            const container = placeholder.parentElement;
            if (container && container.getAttribute('data-force-facedown') === 'true') {
                 targetKey = 'CardBack';
            }

            const currentKey = el.getAttribute('data-card-key');
            
            if (targetKey && currentKey !== targetKey) {
                // Critical: Apply the key change immediately to start CSS transitions
                el.setAttribute('data-card-key', targetKey);
                
                // Visual Highlight: Add a class to indicate active transition state
                // This can be used in CSS to force 3D rotation or ensure properties are prioritized
                el.classList.add('is-flipping-state');
            }
        }

        const loop = () => {
            if (!el.isConnected) return; 

            // --- 鲁棒的视觉收敛 ---
            const targetRect = placeholder.getBoundingClientRect();
            const currentRect = el.getBoundingClientRect();
            
            let targetXStr, targetYStr, targetWStr, targetHStr;

            if (matchSize) {
                targetXStr = targetRect.left;
                targetYStr = targetRect.top;
                targetWStr = targetRect.width;
                targetHStr = targetRect.height;
            } else {
                // If not matching size, we center the ghost on the target
                // Target coord = TargetCenter - GhostSize/2
                // Ideally preserve ghost current size, but here we iterate so we use currentRect attributes
                // NOTE: 'currentRect' changes as we animate if we change width/height.
                // If matchSize is false, we want constant width/height equal to what we started or have now.
                
                // Let's assume we maintain cssW/cssH as constant if matchSize=false, 
                // but we need to compute the destination XY based on that size.
                
                targetWStr = cssW; // Keep current driven size
                targetHStr = cssH;
                
                // Center alignment
                const targetCenterX = targetRect.left + targetRect.width / 2;
                const targetCenterY = targetRect.top + targetRect.height / 2;
                
                targetXStr = targetCenterX - cssW / 2;
                targetYStr = targetCenterY - cssH / 2;
            }

            const deltaX = targetXStr - currentRect.left;
            const deltaY = targetYStr - currentRect.top;
            const deltaW = targetWStr - currentRect.width;
            const deltaH = targetHStr - currentRect.height;
            const factor = DRAG_CONFIG.lerpFactor;

            cssX += deltaX * factor;
            cssY += deltaY * factor;
            
            // Only lerp size if matching
            if (matchSize) {
                cssW += deltaW * factor;
                cssH += deltaH * factor;
            }
            
            curRot += (0 - curRot) * factor;

            el.style.transform = `translate(${cssX}px, ${cssY}px) rotate(${curRot}deg)`;
            el.style.width = cssW + 'px';
            el.style.height = cssH + 'px';

            if (
                Math.abs(deltaX) < 2.0 && 
                Math.abs(deltaY) < 2.0 && 
                Math.abs(deltaW) < 2.0 &&
                Math.abs(deltaH) < 2.0 &&
                Math.abs(curRot) < 2.0
            ) {
                el.remove();
                
                if (placeholder && placeholder.style) {
                    placeholder.style.visibility = '';
                    placeholder.classList.remove('drag-placeholder');

                    if (window.getComputedStyle(placeholder).transitionProperty !== 'none') {
                        placeholder.style.transition = 'none';
                        placeholder.style.boxShadow = '0 15px 30px rgba(0,0,0,0.3)';
                        void placeholder.offsetWidth;
                        placeholder.style.transition = 'box-shadow 0.1s ease-out';
                        placeholder.style.boxShadow = '';
                        
                        setTimeout(() => {
                             if (placeholder) placeholder.style.transition = '';
                        }, 100);
                    }
                }
                
                if (onComplete) onComplete();
            } else {
                requestAnimationFrame(loop);
            }
        };
        requestAnimationFrame(loop);
    }

    UI.DragAnimation = {
        startAnimationLoop,
        animateDropToPlaceholder,
        createGhost,
        // copyComputedStyles (Removed: now in UI.copyStyles)
    };

})();
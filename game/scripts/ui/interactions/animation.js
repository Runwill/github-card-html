(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};
    
    const UI = window.Game.UI;

    function copyComputedStyles(source, target) {
        const computed = window.getComputedStyle(source);
        const properties = [
            'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 
            'color', 'textAlign', 'letterSpacing', 'textShadow'
        ];
        properties.forEach(prop => target.style[prop] = computed[prop]);
        target.style.boxSizing = 'border-box';
    }

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

    function animateDropToPlaceholder(el, placeholder, onComplete) {
        const DragState = UI.DragState;
        const DRAG_CONFIG = UI.DragConfig;

        // --- Feature: Sync Visual State for Flip Animation ---
        // If the target (placeholder) has a different state (e.g. CardBack),
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
        
        console.group('[DragAnim] animateDropToPlaceholder details');
        console.log('Ghost Element:', el);
        console.log('Set Transition:', el.style.transition);

        // FORCE REFLOW: Ensure the browser registers the "Before" state (e.g. key='dodge', transition enabled)
        // before we flip the switch to 'CardBack'. This is crucial for triggering the transition.
        const reflowVal = el.offsetWidth;
        console.log('Forced Reflow. Width:', reflowVal);

        // If the target (placeholder) has a different state (e.g. CardBack),
        // we apply it to the dragging ghost to trigger CSS transitions (flip/fade).
        if (placeholder && el) {
            let targetKey = placeholder.getAttribute('data-card-key');
            
            // ROOT CAUSE FIX: Check if the container adheres to strict face-down rules.
            // If so, override any transient key the placeholder might still have (e.g. from previous zone).
            const container = placeholder.parentElement;
            if (container && container.getAttribute('data-force-facedown') === 'true') {
                 targetKey = 'CardBack';
                 console.log('[DragAnim] Override Target Key to CardBack (Zone Rule)');
            }

            const currentKey = el.getAttribute('data-card-key');
            
            console.log(`Key Check: Current='${currentKey}', Target='${targetKey}'`);

            if (targetKey && currentKey !== targetKey) {
                // Determine if we need to force a flip style
                console.log(`[DragAnim] Syncing Keys: ${currentKey} -> ${targetKey}`);
                
                // Critical: Apply the key change immediately to start CSS transitions
                el.setAttribute('data-card-key', targetKey);
                
                // Visual Highlight: Add a class to indicate active transition state
                // This can be used in CSS to force 3D rotation or ensure properties are prioritized
                el.classList.add('is-flipping-state');
                
                // Optional: visual enhancement for flip
                // We could add a 'flipping' class if we wanted 3D rotate, 
                // but for now relying on CSS background/opacity transitions.
                
                // Forced Toggle: access generic style properties to guarantee update
                if (targetKey === 'CardBack') {
                     // Ensure text hides immediately if transition is too slow for short distances
                     // But we want animation, so we trust the transition rule set above `el.style.transition`
                }
            } else {
                console.log('[DragAnim] Keys match or invalid, no flip triggered.');
            }
        }
        console.groupEnd();

        const loop = () => {
            if (!el.isConnected) return; 

            // --- 鲁棒的视觉收敛 ---
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
                Math.abs(deltaX) < 2.0 && 
                Math.abs(deltaY) < 2.0 && 
                Math.abs(deltaW) < 2.0 &&
                Math.abs(deltaH) < 2.0 &&
                Math.abs(curRot) < 2.0
            ) {
                el.remove();
                
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
        copyComputedStyles
    };

})();
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
        originalClasses: '' // 可选，但为了安全起见
    };

    const DRAG_CONFIG = {
        lerpFactor: 0.25, // 越高 = 响应越快
        maxTilt: 12,      
        tiltFactor: 0.4,
        swapAnimationDuration: 200 // 毫秒
    };

    // 为 FLIP 动画存储位置
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
        DragState.dragElement = el; // 暂存，startDrag 会处理克隆逻辑
        DragState.startX = e.clientX;
        DragState.startY = e.clientY;
        DragState.isDragging = false; 

        // 初始捕获以处理刚开始的情况，但我们将委托 document 进行拖动
        // 这一点很重要，因为一旦我们将元素移动到 Body，它可能会在某些浏览器中丢失捕获上下文，
        // 或者如果 pointer-events 变为 none，它可能会停止触发。
        el.setPointerCapture(e.pointerId);

        // 附加全局监听器以增强鲁棒性
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);
    }

    function startDrag(e) {
        if (!DragState.dragElement) return; // 防止空元素
        DragState.isDragging = true;
        
        // --- 安全的元素捕获 ---
        // 我们克隆元素进行拖动，而不是移动原始元素。
        // 这可以在掉落的一刻之前完美保持原始 DOM 结构。
        // 这极大地简化了样式恢复（因为我们要做的只是删除克隆体）。
        
        const originalEl = DragState.dragElement;
        const rect = originalEl.getBoundingClientRect();
        
        // 1. 创建占位符（不可见）以维持布局流（如果我们隐藏原始元素）
        // 但由于我们正在克隆，我们可以只是将原始元素样式设为不可见？
        // 让我们坚持模式：克隆体变成“视觉拖拽对象”，原始体保留为“占位符”。
        
        // 等等，现有逻辑：
        // 1. 创建占位符 -> 插入到 El 之前
        // 2. 将 El 移动到 Body
        
        // 提议的逻辑：
        // 1. 让原始元素完全保留在原位。只需设置 visibility:hidden。
        // 2. 创建一个“拖拽克隆体”并追加到 Body。
        
        // 这解决了“起始位置错配”，因为直到最后我们都不会弄乱 DOM 流。
        // 这解决了“恢复”，因为我们只需删除克隆体并取消隐藏原始体。
        
        const dragClone = originalEl.cloneNode(true);
        dragClone.id = ''; // 移除 ID
        dragClone.classList.add('dragging-real'); 
        
        // 复制计算样式以确保克隆体看起来完全相同
        copyComputedStyles(originalEl, dragClone);
        
        dragClone.style.position = 'fixed';
        dragClone.style.zIndex = 10000;
        dragClone.style.width = rect.width + 'px';
        dragClone.style.height = rect.height + 'px';
        dragClone.style.margin = '0';
        
        // 初始位置
        DragState.initialX = rect.left;
        DragState.initialY = rect.top;
        DragState.offsetX = e.clientX - rect.left;
        DragState.offsetY = e.clientY - rect.top;
        
        dragClone.style.left = rect.left + 'px';
        dragClone.style.top = rect.top + 'px';
        
        document.body.appendChild(dragClone);
        
        // 隐藏原始体
        originalEl.style.visibility = 'hidden';
        
        // 更新状态以追踪克隆体
        DragState.dragClone = dragClone; // 新属性
        DragState.originalEl = originalEl;   // 追踪真实的那个
        // DragState.dragElement 在旧代码中是模棱两可的。
        // 让我们重构 DragState 以进行区分。
        // 但是为了最小化代码更改，还是交换它们？
        // 不，'dragElement' 到处都在用。让 'dragElement' 指向克隆体。
        // 并且 'placeholderElement' 指向原始体。
        
        DragState.placeholderElement = originalEl; // 原始体充当占位符！
        DragState.dragElement = dragClone;         // 克隆体充当移动部件
        
        // 注意：旧的 'placeholderElement' 是一个新创建的 div。
        // 现在 'placeholderElement' 是实际的原始 DOM 节点。
        // 但是等等，旧逻辑移动了占位符以进行重新排序。
        // 如果这里移动 'originalEl'，我们就是在实时重新排序 DOM。这没问题。
        // 只需要确保 'originalEl' 拥有 'drag-placeholder' 类？
        
        DragState.placeholderElement.classList.add('drag-placeholder'); // 添加占位符样式
        
        // --- 较准修复 ---
        // 检查克隆体是否正确着陆
        const calibrationRect = dragClone.getBoundingClientRect();
        const driftX = calibrationRect.left - rect.left;
        const driftY = calibrationRect.top - rect.top;
        
        if (Math.abs(driftX) > 1 || Math.abs(driftY) > 1) {
             dragClone.style.left = (rect.left - driftX) + 'px';
             dragClone.style.top = (rect.top - driftY) + 'px';
        }
        
        // ------------------------------------
        
        // 3. 初始化物理状态
        DragState.currentX = 0; // 平移 X
        DragState.currentY = 0; // 平移 Y

        DragState.targetX = 0;
        DragState.targetY = 0;
        
        startAnimationLoop();
    }

    function startAnimationLoop() {
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
            // DragState.velocityX 在结束时可能非零，确保我们在“放下”时没有残留倾斜？
            // 实际上在 animateDropToPlaceholder 中我们将旋转衰减为 0。
            
            const tilt = Math.max(Math.min(DragState.velocityX * DRAG_CONFIG.tiltFactor, DRAG_CONFIG.maxTilt), -DRAG_CONFIG.maxTilt);
            
            if (DragState.dragElement) {
                // 确保我们使用 translate3d 或一致的像素捕捉？
                // 浏览器亚像素渲染可能是一个因素。
                DragState.dragElement.style.transform = `translate(${DragState.currentX}px, ${DragState.currentY}px) rotate(${tilt}deg)`;
            }

            DragState.rafId = requestAnimationFrame(render);
        };
        DragState.rafId = requestAnimationFrame(render);
    }
    
    // 获取 body 真实偏移的辅助函数
    function getBodyOffset() {
         // 如果 body 有影响固定元素的 margin/padding（不太可能但在某些框架中可能）
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
        
        // ... (现有物理代码) ...
        
        // 目标位置
        // 使用占位符而不是 dragElement
        // 实际上 targetX/Y 逻辑是用于 'dragElement' 视觉效果的
        
        const outcomeX = e.clientX - DragState.offsetX;
        const outcomeY = e.clientY - DragState.offsetY;
        
        DragState.targetX = outcomeX - DragState.initialX;
        DragState.targetY = outcomeY - DragState.initialY;
        
        // ...
        
        // 确保指针事件穿透
        if (DragState.dragElement && DragState.dragElement.style.pointerEvents !== 'none') {
            DragState.dragElement.style.pointerEvents = 'none';
        }

        // 检测放置区
        const targetEl = document.elementFromPoint(e.clientX, e.clientY);
        const dropZone = targetEl ? targetEl.closest('[data-drop-zone]') : null;
             
        if (DragState.currentDropZone !== dropZone) {
            if (DragState.currentDropZone) DragState.currentDropZone.classList.remove('drag-over');
            if (dropZone) dropZone.classList.add('drag-over');
            DragState.currentDropZone = dropZone;
        }

        // 实时重新排序逻辑
        if (dropZone) { // 即使没有 placeholderElement？噢，它从 startDrag 就存在。
             updatePlaceholderPosition(dropZone, targetEl, e.clientX, e.clientY);
        }
    }

    function updatePlaceholderPosition(dropZone, targetEl, mouseX, mouseY) {
        // 找到我们悬停其上的卡牌
        const hoverCard = targetEl ? targetEl.closest('.card-placeholder:not(.drag-placeholder)') : null;
        
        // --- FLIP 动画：预计算 ---
        // 在移动之前快照 dropZone 中所有兄弟节点的位置。
        // 如果我们要将占位符移出旧区域，我们还需要包含旧区域的兄弟节点。
        let siblings = Array.from(dropZone.children).filter(c => 
            c !== DragState.placeholderElement && 
            c.classList.contains('card-placeholder')
        );
        
        const currentParent = DragState.placeholderElement.parentNode;
        if (currentParent && currentParent !== dropZone && currentParent.nodeType === 1) {
             const oldSiblings = Array.from(currentParent.children).filter(c => 
                c !== DragState.placeholderElement && 
                c.classList.contains('card-placeholder')
             );
             siblings = siblings.concat(oldSiblings);
        }
        
        // 仅在这一帧/动作未快照时快照？
        // 不，我们需要在 DOM 更改前快照。
        // 但每次 mousemove 都这样做很昂贵。
        // 我们应该只在我们将要移动时才这样做。
        
        let shouldMove = false;
        let moveTarget = null;
        let movePosition = ''; // 'before' 或 'after' 或 'append'

        if (hoverCard && hoverCard.parentNode === dropZone) {
            const rect = hoverCard.getBoundingClientRect();
            // 方向逻辑（支持网格？）
            // 暂时简单的 X 轴，如果 flex-wrap 则 X+Y
            // 如果行不同，Y 很重要。
            
            // 检查是否同一行
            // const placeholderRect = DragState.placeholderElement.getBoundingClientRect();
            // 但占位符在“克隆模式”下是 visibility hidden，但它占据空间。
            // 所以我们可以通过使用它的 rect。
            
            // 回退到简单的中点逻辑
            const midX = rect.left + rect.width / 2;
            const midY = rect.top + rect.height / 2;
            
            // 非常简单的网格逻辑：
            // 如果我们重叠显著？
            
            // 使用插入排序样式：
            // 如果在 midX/midY 之前 -> insertBefore
            // 如果之后 -> insertAfter
            
            // 对于简单列表坚持 X，对于多行检查 Y？
            // 假设 flex-wrap：
            // 如果 mouseY 明显在不同行？
            
            // 简化：仅使用相对于 hoverCard 的简单索引检查
            const isAfter = (mouseX > midX) && (Math.abs(mouseY - midY) < rect.height/2);
            // 或者仅仅基于文档流顺序的 'isAfter'？
            // 在换行 flex 中，'after' 视觉上意味着右边（或下一行）。
            
            if (isAfter || (mouseY > rect.bottom)) {
                 if (DragState.placeholderElement.previousElementSibling !== hoverCard) {
                     shouldMove = true;
                     moveTarget = hoverCard.nextSibling; // 插入到下一个兄弟之前（即 hover 之后）
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
            // 容器悬停
             const lastChild = dropZone.lastElementChild;
             // 如果最后一个子项不是占位符，且我们超过了它？
             if (!lastChild || (lastChild === DragState.placeholderElement && dropZone.children.length === 1)) {
                 // 空或只有自己
                 if (DragState.placeholderElement.parentNode !== dropZone) {
                     shouldMove = true;
                     movePosition = 'append';
                 }
             } else {
                 // 检查是否应该追加到末尾
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
            // --- FLIP: 第一步 (快照) ---
            siblings.forEach(el => {
                const r = el.getBoundingClientRect();
                flipSnapshot.set(el, { left: r.left, top: r.top });
            });

            // --- 动作 ---
            // 如果我们移动占位符，必须确保 drag-over 类保留在正确的 dropZone 上
            if (DragState.placeholderElement.parentNode !== dropZone) {
                // 在区域间移动
                if (movePosition === 'append') dropZone.appendChild(DragState.placeholderElement);
                else dropZone.insertBefore(DragState.placeholderElement, moveTarget);
                
                // 更新 drag-over 状态逻辑
                // 上一个区域清理？handlePointerMove 通过检查 currentDropZone 来做。
            } else {
                // 同区域重新排序
                if (movePosition === 'append') dropZone.appendChild(DragState.placeholderElement);
                else dropZone.insertBefore(DragState.placeholderElement, moveTarget);
            }

            // --- FLIP: 最后一步 (反转 & 播放) ---
            // 通过读取 rects 隐式强制布局更新
            requestAnimationFrame(() => {
                siblings.forEach(el => {
                    const oldPos = flipSnapshot.get(el);
                    if (!oldPos) return;
                    
                    const newRect = el.getBoundingClientRect();
                    const dx = oldPos.left - newRect.left;
                    const dy = oldPos.top - newRect.top;
                    
                    if (dx !== 0 || dy !== 0) {
                        // 反转
                        el.style.transform = `translate(${dx}px, ${dy}px)`;
                        el.style.transition = 'none';
                        
                        // 播放
                        requestAnimationFrame(() => {
                            el.style.transform = '';
                            el.style.transition = `transform ${DRAG_CONFIG.swapAnimationDuration}ms cubic-bezier(0.2, 0, 0, 1)`;
                            
                            // 完成后清理 transition
                            const handler = () => {
                                el.style.transition = '';
                                el.removeEventListener('transitionend', handler);
                            };
                            el.addEventListener('transitionend', handler, {once: true});
                        });
                    }
                });
                flipSnapshot.clear(); // 清理
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

        // 清理占位符（如果孤立）
        if (DragState.placeholderElement) {
            if(DragState.placeholderElement.parentNode) {
                DragState.placeholderElement.parentNode.removeChild(DragState.placeholderElement);
            }
            DragState.placeholderElement = null;
        }
        
        // 如果需要，清理真实元素（通常由 finish 或 cancel 逻辑处理）
        // 如果 dragElement 仍然附加在 body 上，说明我们失败/取消得很糟糕
        if (DragState.dragElement && DragState.dragElement.parentNode === document.body) {
             DragState.dragElement.remove();
        }

        DragState.dragElement = null;
        DragState.isDragging = false;
        if(DragState.rafId) cancelAnimationFrame(DragState.rafId);
    }

    function cancelDrag(e) {
        const el = DragState.dragElement;
        
        // 移除全局监听器
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerUp);

        if (el) {
            try { el.releasePointerCapture(e.pointerId); } catch(err){}
            // 清理本地监听器以防万一
            el.removeEventListener('pointermove', handlePointerMove);
            el.removeEventListener('pointerup', handlePointerUp);
            el.removeEventListener('pointercancel', handlePointerUp);
            
            // 恢复逻辑
            if (el.parentNode === document.body && DragState.placeholderElement && DragState.placeholderElement.parentNode) {
                 // 视觉回弹可能发生在这里，但暂时立即恢复
                 resetStyles(el);
                 
                 // 放回原位
                 DragState.placeholderElement.parentNode.insertBefore(el, DragState.placeholderElement);
                 DragState.placeholderElement.remove();
                 DragState.placeholderElement = null;
            } else if (el.parentNode === document.body) {
                // 如果占位符消失（奇怪），直接干掉它
                el.remove();
            } else {
                // 从未移动到 body（仅点击）
                el.classList.remove('draggable-item'); 
            }
        }
        
        // 重置状态
        DragState.currentDropZone?.classList.remove('drag-over');
        DragState.currentDropZone = null;
        DragState.dragElement = null;
        DragState.isDragging = false;
        if(DragState.rafId) cancelAnimationFrame(DragState.rafId);
    }

    function finishDrag(e) {
        const el = DragState.dragElement; // 克隆体
        const placeholder = DragState.placeholderElement; // 原始体
        
        // 移除全局监听器
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
            
            // 基于占位符位置计算索引
            // 正确过滤兄弟节点
            const siblings = Array.from(dropZone.children).filter(c => c.classList.contains('card-placeholder') && c !== placeholder);
             
            const nextSibling = placeholder.nextElementSibling;
            let targetIndex = siblings.length; // 默认到末尾
            
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
        // ... (现有参数)
        // 适配 'el' 为克隆体，'placeholder' 为原始体。
        // 我们将克隆体动画化到原始体。
        // targetRect 移至循环以进行动态更新
        
        // ... (现有变量)
        // 当前状态 (CSS 值)
        let cssX = DragState.currentX;
        let cssY = DragState.currentY;
        let cssW = parseFloat(el.style.width) || el.getBoundingClientRect().width;
        let cssH = parseFloat(el.style.height) || el.getBoundingClientRect().height;
        
        // 提取当前旋转
        let curRot = 0;
        const rotMatch = el.style.transform.match(/rotate\(([-\d.]+)deg\)/);
        if (rotMatch) curRot = parseFloat(rotMatch[1]);

        // 确保没有 CSS transition 干扰
        el.style.transformOrigin = 'center center'; 
        el.style.transition = 'none'; 

        const loop = () => {
            if (!el.isConnected) return; // 外部已丢弃或移除

            // --- 鲁棒的视觉收敛 (同前) ---
            // 每帧重新计算目标位置以处理布局偏移
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
                // 完成:
                // 1. 移除克隆体
                el.remove();
                
                // 2. 显示原始体
                placeholder.style.visibility = '';
                placeholder.classList.remove('drag-placeholder');
                
                if (onComplete) onComplete();
            } else {
                requestAnimationFrame(loop);
            }
        };
        requestAnimationFrame(loop);
    }
    
    // --- 样式辅助函数 ---
    function copyComputedStyles(source, target) {
        const computed = window.getComputedStyle(source);
        const properties = [
            'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 
            'color', 'textAlign', 'letterSpacing', 'textShadow'
        ];
        properties.forEach(prop => target.style[prop] = computed[prop]);
        target.style.boxSizing = 'border-box';
    }

    // 重置样式的回退
    function resetStyles(target) {
        if (!target) return;
        
        console.log("[DragDebug] 重置样式。目标与 DragEl 相同？", target === DragState.dragElement);
        console.log("[DragDebug] 恢复 CSS:", DragState.originalCssText);

        // --- 恢复快照 ---
        if (target === DragState.dragElement && DragState.originalCssText !== undefined) {
             target.style.cssText = DragState.originalCssText;
        } else {
             // 如果困惑，手动清理的回退
             target.style.cssText = ''; 
        }
        // ------------------------

        target.classList.remove('dragging-real');
        // 确保 pointer events 被恢复（如果未在 inline style 中）
        // target.style.pointerEvents = ''; // cssText 处理它（如果是空的）
    }

    window.Game.UI.Interactions = {
        initDrag
    };
})();

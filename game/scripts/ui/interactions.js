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
    
    function setDragConfig(config) {
        if (typeof config.lerpFactor === 'number') {
            DRAG_CONFIG.lerpFactor = config.lerpFactor;
        }
        // Can add more configs here
    }

    // 调试辅助函数：输出手牌和处理区状态
    function logDragDebug(phase) {
        if (!window.Game || !window.Game.Core || !window.Game.Core.GameState) return;
        const gs = window.Game.Core.GameState;
        
        // 假设玩家0是当前玩家
        const self = gs.players && gs.players[0];
        const handCards = (self && self.hand && self.hand.cards) ? self.hand.cards : [];
        const treatmentCards = (gs.treatmentArea && gs.treatmentArea.cards) ? gs.treatmentArea.cards : [];
        
        console.group(`[DragDebug] ${phase}`);
        
        if (DragState.dragSource) {
             const cardName = typeof DragState.dragSource.data === 'string' ? DragState.dragSource.data : (DragState.dragSource.data.name || 'Unknown');
             console.log(`Moving Card: "${cardName}" (Index: ${DragState.dragSource.sourceIndex}, From: ${DragState.dragSource.sourceArea})`);
        }

        // 简单打印数量和名称列表
        const getName = (c, i) => `[${i}] ${typeof c === 'string' ? c : (c.name || 'Unknown')}`;
        console.log(`Hand (${handCards.length}):`, handCards.map(getName));
        console.log(`Treatment (${treatmentCards.length}):`, treatmentCards.map(getName));
        console.groupEnd();
    }

    // 为 FLIP 动画存储位置 (已移至局部变量)
    // const flipSnapshot = new Map();

    function initDrag(cardElement, cardData, sourceAreaName, sourceIndex = -1) {
        cardElement.classList.add('draggable-item');
        
        // 如果存在旧的监听器则移除，以防止累积逻辑检查
        // 虽然如果在引用相同的情况下多次使用 addEventListener 是相对安全的
        // 但这里我们使用的是箭头函数，所以它们会叠加。这对 pointerdown 很不好。
        // 我们应该解决这个问题。card_renderer 会重复调用 initDrag。
        // 解决方案：检查监听器是否已附加或使用属性 (onpointerdown)
        // 使用 onpointerdown 对于这种“单一拖动处理器”模型更整洁
        
        cardElement.onpointerdown = (e) => handlePointerDown(e, cardElement, cardData, sourceAreaName, sourceIndex);
        
        cardElement.ondragstart = () => false;
        cardElement.oncontextmenu = (e) => {
             if(DragState.isDragging) {
                 e.preventDefault();
                 return;
             }
             // 显示卡牌上下文菜单
             if (window.Game.UI.showCardContextMenu) {
                 e.preventDefault();
                 window.Game.UI.showCardContextMenu(e.clientX, e.clientY, cardData, sourceAreaName, cardElement);
             }
        };
    }

    function handlePointerDown(e, el, data, sourceArea, sourceIndex) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        DragState.dragSource = { data, sourceArea, sourceIndex };
        DragState.dragElement = el; // 暂存，startDrag 会处理克隆逻辑
        DragState.startX = e.clientX;
        DragState.startY = e.clientY;
        DragState.isDragging = false; 

        // 移除 setPointerCapture 以修复双击 (dblclick) 冲突
        // 通过 document 监听 pointermove 也就足够处理拖拽
        // el.setPointerCapture(e.pointerId);

        // 附加全局监听器以增强鲁棒性
        document.addEventListener('pointermove', handlePointerMove);
        document.addEventListener('pointerup', handlePointerUp);
        document.addEventListener('pointercancel', handlePointerUp);
    }

    function startDrag(e) {
        if (!DragState.dragElement) return; // 防止空元素
        logDragDebug('Start Drag');
        DragState.isDragging = true;
        document.body.classList.add('is-global-dragging');
        
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
        // 扩展逻辑：即使 acceptPlaceholder 为 false，我们也可能想把占位符“吸”过去（即使是隐藏的）
        // 以便让原区域（如手牌）复原。
        
        if (dropZone) {
             const acceptPlaceholder = dropZone.getAttribute('data-accept-placeholder') !== 'false';
             
             if (acceptPlaceholder) {
                 // 标准排序逻辑：占位符可见并占据空间
                 updatePlaceholderPosition(dropZone, targetEl, e.clientX, e.clientY);
             } 
             else if (DragState.placeholderElement) {
                 // 非排序逻辑（如摘要角色）：占位符移过去但隐藏
                 // 仅当它还没过去时触发
                 if (DragState.placeholderElement.parentNode !== dropZone) {
                     performPlaceholderMove(dropZone, null, true); // true = hide
                 }
             }
        }
    }

    // --- 提取复用的移动逻辑 ---
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
        const placeholder = DragState.placeholderElement;
        if (!placeholder) return;

        // 如果需要显示（hidePlaceholder 为 false），则立即移除隐藏样式，以便正确计算布局（挤开效果）
        // 如果需要隐藏，我们在移动后再添加样式，或者现在添加也行？
        // 最好在移动前重置状态，以确保 getBoundingClientRect 是基于“可见/占据空间”的（对于 target sibling 来说）
        // 但如果我们要隐藏它，它就不应该挤开 targetSibling。
        
        if (!hidePlaceholder) {
            placeholder.classList.remove('drag-placeholder-hidden');
            placeholder.style.display = ''; 
        }

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

        if (hidePlaceholder) {
            placeholder.classList.add('drag-placeholder-hidden');
            // 使用内联样式确保生效，防止 CSS 没加载
            placeholder.style.display = 'none';
        }

        // --- 同步执行 FLIP Invert ---
        // 立即读取新位置并应用反转变换，阻止布局跳变
        affected.forEach(el => {
            const start = snapshot.get(el);
            if (!start) return;
            
            const rect = el.getBoundingClientRect(); // 强制布局更新
            const dx = start.left - rect.left;
            const dy = start.top - rect.top;
            
            if (dx !== 0 || dy !== 0) {
                el.style.transform = `translate(${dx}px, ${dy}px)`;
                el.style.transition = 'none';
                
                // 标记该元素需要播放动画
                el.dataset.flipping = 'true';
            }
        });
        
        // --- 异步执行 FLIP Play ---
        requestAnimationFrame(() => {
            affected.forEach(el => {
                if (el.dataset.flipping === 'true') {
                    delete el.dataset.flipping;
                    
                    // 移除 transform 以播放过渡
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
        // 安全检查
        if (!DragState.placeholderElement) return;

        const itemSelector = getSortableSelector(dropZone);
        const hoverItem = targetEl ? targetEl.closest(`${itemSelector}:not(.drag-placeholder)`) : null;
        
        // 不再需要手动查找 siblings 和 FLIP 快照，只需计算我们想去哪里
        
        let shouldMove = false;
        let moveTarget = null; // null = append

        if (hoverItem && hoverItem.parentNode === dropZone) {
            // 使用 getLayoutRect 替代 getBoundingClientRect
            // 以避免在动画过程中基于“正在移动的视觉位置”进行判定，导致逻辑抖动
            const rect = getLayoutRect(hoverItem);
            
            const midX = rect.left + rect.width / 2;
            const midY = rect.top + rect.height / 2;
            
            // 简单的几何判定：如果在中点右侧或下方，则认为是 "After"
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
             const items = Array.from(dropZone.children).filter(c => c.matches(itemSelector) && c !== DragState.placeholderElement);
             const lastItem = items[items.length - 1];
             
             if (!lastItem) {
                 if (DragState.placeholderElement.parentNode !== dropZone) {
                     shouldMove = true;
                     moveTarget = null;
                 }
             } else {
                 const lastRect = getLayoutRect(lastItem);
                 if (mouseX > lastRect.right - 10 || mouseY > lastRect.bottom - 10) {
                     const currentLast = dropZone.lastElementChild;
                     if (currentLast !== DragState.placeholderElement) {
                         shouldMove = true;
                         moveTarget = null;
                     }
                 }
             }
        }

        if (shouldMove) {
            performPlaceholderMove(dropZone, moveTarget);
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
        document.body.classList.remove('is-global-dragging');
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
            // 对应移除 setPointerCapture
            // try { el.releasePointerCapture(e.pointerId); } catch(err){}
            
            // 清理本地监听器以防万一
            el.removeEventListener('pointermove', handlePointerMove);
            el.removeEventListener('pointerup', handlePointerUp);
            el.removeEventListener('pointercancel', handlePointerUp);
            
            // 恢复逻辑
            if (el.parentNode === document.body && DragState.placeholderElement && DragState.placeholderElement.parentNode) {
                 // 使用动画平滑归位，而不是瞬间重置
                 // 这可以解决“放下时阴影直接消失”的突兀感，并提供视觉反馈
                 const placeholder = DragState.placeholderElement;
                 
                 animateDropToPlaceholder(el, placeholder, () => {
                     // 动画结束后的清理
                     // animateDropToPlaceholder 会负责显示 placeholder 并移除 el
                     
                     // 我们还依然需要清理 DragState 的引用吗？
                     // 由于是异步回调，此时 DragState.placeholderElement 可能已经被置空了，这没关系。
                 });
                 
                 // 重要：不要在这里立即移除 placeholder 或 el
                 // 防止下面的逻辑进行破坏性清理
                 DragState.placeholderElement = null; // 断开引用，交给动画闭包
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

        // 确定放置区：优先使用鼠标当前的区域，回退到占位符所在的区域
        let dropZone = DragState.currentDropZone;
        if (!dropZone && placeholder) {
            dropZone = placeholder.parentNode;
        }

        if (dropZone && dropZone.getAttribute('data-drop-zone')) {
            const targetZoneId = dropZone.getAttribute('data-drop-zone');
            const acceptPlaceholder = dropZone.getAttribute('data-accept-placeholder') !== 'false';
            
            let targetIndex = -1;

            if (acceptPlaceholder && placeholder && placeholder.parentNode === dropZone) {
                // 标准模式：基于占位符位置计算索引
                const siblings = Array.from(dropZone.children).filter(c => c.classList.contains('card-placeholder') && c !== placeholder);
                
                targetIndex = siblings.length; // 默认到末尾
                
                const nextSibling = placeholder.nextElementSibling;
                if (nextSibling) {
                    const idx = siblings.indexOf(nextSibling);
                    if (idx !== -1) {
                        targetIndex = idx;
                    }
                }
            } else {
                // 触发模式（或占位符不在目标内）：默认追加
                targetIndex = -1;
            }
            
            logDragDebug(`Before Drop Action (Target: ${targetZoneId})`);

            // 提前挂起渲染
            window.Game.UI.isRenderingSuspended = true;

            let isLogicFinished = false;
            let isAnimationFinished = false;
            
            // 是否使用远程动画（即由 Controller 接管）
            // 如果是触发模式 (acceptPlaceholder=false)，我们没有本地占位符目标，必须依赖 Controller 对新元素的定位
            const useRemoteAnimation = !acceptPlaceholder;
            let options = {};
            
            if (useRemoteAnimation && el) {
                // 捕获当前拖拽元素的 rect 作为动画起点（备用）
                options.startRect = el.getBoundingClientRect();
                // 核心修改：直接移交 DOM 元素所有权给外部 (Controller)
                // 这样可以保留所有视觉状态（旋转、阴影等），防止动画跳动
                options.dragElement = el;
                options.cardHTML = el.outerHTML; // 备用
                
                // 标记动画阶段对“本地交互”来说已完成（因为移交了）
                isAnimationFinished = true;
            }

            // 统一的完成检查器
            const checkFinish = () => {
                if (isLogicFinished && isAnimationFinished) {
                    // 当且仅当两者都完成时，恢复UI
                    window.Game.UI.isRenderingSuspended = false;
                    if (window.Game.UI.updateUI) window.Game.UI.updateUI();
                    logDragDebug('After Drop Action (All Done)');
                    
                    document.body.classList.remove('is-global-dragging');
                    DragState.dragElement = null; 
                    DragState.placeholderElement = null; 
                    DragState.isDragging = false; // Reset dragging flag
                }
            };

            // 动画触发器 (本地)
            const playDropAnimation = () => {
                animateDropToPlaceholder(el, placeholder, () => {
                    isAnimationFinished = true;
                    checkFinish();
                });
            };

            // 执行业务逻辑
            if (window.Game.UI.onCardDrop) {
                window.Game.UI.onCardDrop(
                    DragState.dragSource.data, 
                    DragState.dragSource.sourceArea, 
                    targetZoneId, 
                    targetIndex,
                    DragState.dragSource.sourceIndex,
                    {
                        // 1. 当 Move 事件实际执行数据变更时（whenPlaced）
                        onMoveExecuted: () => {
                            logDragDebug('Triggering Animation (Event Executed)');
                            if (useRemoteAnimation) {
                                // 远程动画接管：本地无需播放飞回占位符的动画
                                // 我们已经移交了 el 的引用 (options.dragElement)，所以不要在这里销毁它！
                                if (placeholder) placeholder.remove(); // 移除可能的残留占位符(如果在原处)
                                
                                isAnimationFinished = true; // 视为本地动画阶段立即完成
                                checkFinish();
                            } else {
                                playDropAnimation();
                            }
                        },
                        // 2. 当 Move 事件完全结束后（afterPlaced...done）
                        onComplete: () => {
                            isLogicFinished = true;
                            logDragDebug('Logic Finished');
                            checkFinish();
                        }
                    },
                    options // 传递额外选项 (startRect)
                );
            } else {
                // 无逻辑处理，直通
                isLogicFinished = true;
                playDropAnimation();
            }
            
            DragState.currentDropZone = null;
            return;
        }

        cancelDrag(e);
    }

    function animateDropToPlaceholder(el, placeholder, onComplete) {
        // ... (现有参数)
        // 适配 'el' 为克隆体，'placeholder' 为原始体。
        // 我们将克隆体动画化到原始体。
        
        let cssX, cssY;
        
        // 智能判断初始位置：
        // 如果是正在拖动的中途 (DragState.isDragging 为 true 或刚结束)，从 DragState 读取以前的连续动量
        // 如果是从外部调用 (Programmatic)，解析当前的 transform 或为 0
        
        const styleTransform = el.style.transform || '';
        const translateMatch = styleTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/);
        
        if (translateMatch) {
             cssX = parseFloat(translateMatch[1]);
             cssY = parseFloat(translateMatch[2]);
        } else if (DragState.dragElement === el) {
             // 仅当 el 确实是上一次拖动的元素时，信任 DragState
             cssX = DragState.currentX;
             cssY = DragState.currentY;
        } else {
             // 完全没有变换的新元素（如 Context Menu 克隆体），起始 transform 为 0
             // 因为它的位置是由 left/top 决定的
             cssX = 0;
             cssY = 0;
        }

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

            // 放宽判定阈值，避免视觉上已停止但数值上还在微调导致的“停顿感”
            if (
                Math.abs(deltaX) < 2.0 && 
                Math.abs(deltaY) < 2.0 && 
                Math.abs(deltaW) < 2.0 &&
                Math.abs(deltaH) < 2.0 &&
                Math.abs(curRot) < 2.0
            ) {
                // 完成:
                // 1. 移除克隆体
                el.remove();
                
                // 2. 显示原始体
                placeholder.style.visibility = '';
                placeholder.classList.remove('drag-placeholder');
                // --- 视觉平滑处理 ---
                // 使阴影平滑过渡而不是突兀消失
                // 手动应用 .dragging-real 的阴影作为起始状态
                if (window.getComputedStyle(placeholder).transitionProperty !== 'none') {
                    placeholder.style.transition = 'none';
                    placeholder.style.boxShadow = '0 15px 30px rgba(0,0,0,0.3)';
                    // 强制 Reflow
                    void placeholder.offsetWidth;
                    // 使用快速过渡 (0.1s) 让阴影消失更利落
                    placeholder.style.transition = 'box-shadow 0.1s ease-out';
                    placeholder.style.boxShadow = '';
                    
                    // 恢复默认 CSS Transition
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
        initDrag,
        animateDropToPlaceholder,
        setDragConfig,
        performPlaceholderMove
    };
})();

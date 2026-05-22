(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * Helper: Apply term colors to UI elements
     */
    function applyTermStyle(element, termKey, isGlow = false) {
        if (!element || !termKey) return;
        
        const rawColor = window.Game.UI.termColors ? (window.Game.UI.termColors.get(termKey) || window.Game.UI.termColors.get(termKey.toLowerCase())) : null;
        const color = window.Game.UI.getAdaptiveColor ? window.Game.UI.getAdaptiveColor(rawColor) : rawColor;

        if (color) {
            element.style.color = color;
            // Set for CSS variables
            element.style.setProperty('--term-color', color);
            
            if (isGlow) {
                // Background/Border style (used by Badge)
                const bgAlpha = window.Game.UI.hexToRgba ? window.Game.UI.hexToRgba(color, 0.1) : 'rgba(0,0,0,0.1)';
                const borderAlpha = window.Game.UI.hexToRgba ? window.Game.UI.hexToRgba(color, 0.3) : color;
                
                element.style.backgroundColor = bgAlpha;
                element.style.borderColor = borderAlpha;
            } else {
                 // Clean up specific props if not glow mode (or leave them if not applicable)
                 // Main breadcrumb just sets color.
            }
            
            return { color, rawColor }; // Return for further use (e.g. textShadow)
        } else {
            element.style.color = '';
            element.style.backgroundColor = '';
            element.style.borderColor = '';
            return null;
        }
    }

    function updateUI() {
        const GameState = window.Game.Core.GameState;
        if (!GameState) return;

        const breadcrumbsEl = document.getElementById('game-breadcrumbs');
        const timingBadgeEl = document.getElementById('game-timing-badge');
        const GameText = window.Game.UI.GameText;

        // 1. 渲染面包屑
        if (breadcrumbsEl) {
            const activeProcesses = window.Game.Core.getActiveProcesses();

            // 用于对比/渲染的结构数据
            const displayItems = [];

            // 移除硬编码的 'Round' 插入，完全依赖 activeProcesses。
            // 之前的代码：displayItems.push({ key: 'Round', data: { n: GameState.round } }); 
            // 导致了 "Round Process"(来自 activeProcess) 和 "Hardcoded Round" 同时出现。
            
            // 遍历活跃堆栈
            activeProcesses.forEach(node => {
                // 过滤掉 tick (瞬时时机节点，通常显示在 Badges 而不是 Breadcrumbs)
                // 面包屑主要用于显示持续性的 "Process/Ticking" 状态
                if (node.type === 'tick') return;
                
                // 过滤掉 'TurnProcess', 'RoundProcess' 等容器节点，仅显示 'Round', 'Turn' 等语义节点
                // 根据 GameDef，有 name="RoundProcess" (process) 和 name="Round" (ticking)
                // 我们只想显示 name="Round"
                if (node.name.endsWith('Process')) return;

                const itemData = {};
                // 如果是 "Round"，注入轮数
                if (node.name === 'Round') {
                    itemData.n = GameState.round;
                }

                displayItems.push({
                    key: node.name,
                    data: itemData
                });
            });

            // (Deleted per user request: breadcrumbs should be empty if not inside Round)

            // 协调 / 渲染
            // 目前简单的清空并填充，依赖 GameText 生成缓存的 HTML 字符串
            // 优化：重用元素？GameText.mount 会覆盖 innerHTML。
            
            const currentChildren = Array.from(breadcrumbsEl.children);
            
            displayItems.forEach((item, index) => {
                let crumb = currentChildren[index];
                if (!crumb) {
                    crumb = document.createElement('span');
                    crumb.className = 'crumb';
                    breadcrumbsEl.appendChild(crumb);
                }

                const newHtml = GameText.render(item.key, item.data);
                // Composite key for uniqueness
                const uniqueKey = `${item.key}:${JSON.stringify(item.data)}`;

                let updated = window.Game.UI.safeRender(crumb, newHtml, uniqueKey);
                // safeRender sets data-render-key. We also set data-key for legacy compat if needed.
                if (updated) crumb.setAttribute('data-key', item.key);

                if (updated) {
                     // 重置动画
                     crumb.style.animation = 'none';
                     crumb.offsetHeight; 
                     crumb.style.animation = 'slideInUp 0.3s forwards';
                }

                // 处理样式（颜色/阴影）
                const styleResult = applyTermStyle(crumb, item.key, false);
                
                // 最后一项状态（等待/活动）
                // 使用索引比较中的 isLast
                const isItemLast = (index === displayItems.length - 1);
                const currentNode = window.Game.Core.getCurrentNode();
                const isWaiting = currentNode && window.Game.Core.isInteractive(currentNode);

                if (isItemLast) {
                     crumb.style.opacity = '1';
                     if (isWaiting && styleResult && styleResult.rawColor) {
                         // 柔和发光效果
                         const glowColor = window.Game.UI.hexToRgba ? window.Game.UI.hexToRgba(styleResult.rawColor, 0.3) : styleResult.rawColor;
                         crumb.style.textShadow = `0 0 10px ${glowColor}`;
                     } else {
                         crumb.style.textShadow = '';
                     }
                } else {
                     crumb.style.opacity = '0.6';
                     crumb.style.textShadow = '';
                }
            });

            // 移除多余的尾部面包屑
            while (breadcrumbsEl.children.length > displayItems.length) {
                breadcrumbsEl.removeChild(breadcrumbsEl.lastChild);
            }

            // ── 同步光环颜色：始终使用深色模式颜色（rawColor）──
            if (displayItems.length > 0) {
                const lastKey = displayItems[displayItems.length - 1].key;
                const ringRawColor = window.Game.UI.termColors
                    ? (window.Game.UI.termColors.get(lastKey) || window.Game.UI.termColors.get(lastKey.toLowerCase()))
                    : null;
                if (ringRawColor) {
                    document.documentElement.style.setProperty('--turn-ring-color', ringRawColor);
                }
            }
        }

        // 2. 渲染时机徽标
        if (timingBadgeEl) {
            const currentNode = window.Game.Core.getCurrentNode();
            // 跳过 process 容器节点（如 GameProcess, RoundProcess, TurnProcess），
            // 它们没有对应的文本模板，只是流程树的结构节点
            if (currentNode && currentNode.type !== 'process') {
                // 渲染内容
                const renderKey = currentNode.name;
                
                window.Game.UI.safeRender(timingBadgeEl, GameText.render(renderKey), renderKey);

                // 样式
                applyTermStyle(timingBadgeEl, currentNode.name, true);
            }
        }

        // 3. 渲染角色信息 (Self Role)
        window.Game.UI.updateSelfRoleInfo?.(GameState, GameText);

        // 4. 渲染角色列表 (Role List)
        window.Game.UI.renderRoleList?.(GameState, GameText);

        // 5. 渲染公共区域 (Board)
        window.Game.UI.renderBoard?.(GameState, GameText);

        // 6. 更新控件
        window.Game.UI.updateControls?.(GameState);

        // 7. 更新所有打开的详情窗口 (Inspect Viewers)
        // 这一步确保拖拽等操作后，窗口内容实时同步
        window.Game.UI.updateAllViewers?.();

        // 8. 刷新移动日志（视角切换时重新渲染以更新可见性显示）
        window.Game.UI.MoveLog?.renderLog?.();
    }

    // 导出
    window.Game.UI.updateUI = updateUI;

    function splitSlotAreaId(areaId) {
        if (!areaId || !areaId.includes(':slot:')) return { id: areaId, slot: -1 };
        const parts = areaId.split(':slot:');
        const slotIdx = parseInt(parts[1], 10);
        return { id: parts[0], slot: isNaN(slotIdx) ? -1 : slotIdx };
    }

    function equipAreaFor(player) {
        if (!player) return null;
        return player.equipArea || null;
    }

    function equipSlotFor(player, slot, cardData, mode) {
        if (!player || !player.equipArea) return -1;
        if (slot !== -1) return slot;
        if (mode === 'source') return window.Game.Models?.findCardSlotIndex?.(player.equipArea, cardData) ?? -1;
        return window.Game.Models?.getDefaultEquipSlotIndex?.(player, cardData) ?? -1;
    }

    function roleAreaFor(player, areaId) {
        if (!player) return null;
        if (areaId.startsWith('role-judge:')) return player.judgeArea;
        if (areaId.includes(':equip')) return equipAreaFor(player);
        return player.hand;
    }

    function resolveDropArea(GameState, areaId, currentPlayer, cardData, mode) {
        const parsed = splitSlotAreaId(areaId);
        const result = { area: null, forcedSlot: parsed.slot };
        if (parsed.id === 'hand') result.area = currentPlayer.hand;
        else if (parsed.id === 'equipArea') {
            result.area = equipAreaFor(currentPlayer);
            result.forcedSlot = equipSlotFor(currentPlayer, parsed.slot, cardData, mode);
        } else if (parsed.id === 'treatmentArea') result.area = GameState.treatmentArea;
        else if (parsed.id && (parsed.id.startsWith('role:') || parsed.id.startsWith('role-judge:'))) {
            const roleId = parseInt(parsed.id.replace('role-judge:', '').replace('role:', '').replace(':equip', ''), 10);
            const targetPlayer = GameState.players.find(p => p.id === roleId);
            result.area = roleAreaFor(targetPlayer, parsed.id);
            if (parsed.id.includes(':equip')) result.forcedSlot = equipSlotFor(targetPlayer, parsed.slot, cardData, mode);
        } else if (GameState[parsed.id]) result.area = GameState[parsed.id];
        return result;
    }
    
    // 拖放回调实现：触发核心 Move 事件
    window.Game.UI.onCardDrop = function(cardData, sourceAreaName, targetZoneId, targetIndex, sourceIndex, callbacks, options) {
        const GameState = window.Game.Core.GameState;
        const rejectDrop = () => {
            if (typeof callbacks?.onMoveRejected === 'function') callbacks.onMoveRejected();
            if (typeof callbacks?.onComplete === 'function') callbacks.onComplete();
        };
        if (!GameState) { rejectDrop(); return; }

        // 修正：当前操作者应与 UI 显示的"主视角角色"一致（perspectiveIndex）
        const perspIdx = (GameState.perspectiveIndex != null) ? GameState.perspectiveIndex : 0;
        const currentPlayer = GameState.players[perspIdx] || GameState.players[0];

        const targetInfo = resolveDropArea(GameState, targetZoneId, currentPlayer, cardData, 'target');
        const targetArea = targetInfo.area;

        if (!targetArea) {
            console.warn('[UI] Drop: Target area not found', targetZoneId);
            rejectDrop();
            return;
        }

        // Game Core movedAtPosition 是 1-based index
        let finalTargetIndex = targetIndex;
        if (targetInfo.forcedSlot >= 0) finalTargetIndex = targetInfo.forcedSlot;

        // 如果索引无效 (<0)，Core 通常使用 9999 代表追加到末尾
        // 如果有明确的 finalTargetIndex (且 >=0)，则转换为 1-based position
        const position = (finalTargetIndex < 0) ? 9999 : (finalTargetIndex + 1);

        // Resolve sourceArea based on sourceAreaName
        const sourceArea = resolveDropArea(GameState, sourceAreaName, currentPlayer, cardData, 'source').area;

        // cardData 是 Card 对象 (or String)
        // Delegate to Controller to handle mode-specific logic
        if (window.Game.Controller?.dispatch) {
            const isDrag = !!(options && options.isDrag);

            window.Game.Controller.dispatch('move', {
                moveRole: currentPlayer,
                card: cardData,
                toArea: targetArea,
                position,
                fromArea: sourceArea,
                fromIndex: sourceIndex,
                callbacks,
                isDrag // 标记来自拖拽，跳过 CardMoveAnimator
            });
        } else {
            // Fallback to direct event trigger (Legacy/Auto)
            window.Game.Core.Events.move(
                currentPlayer,
                cardData,
                targetArea,
                position,
                sourceArea,
                sourceIndex,
                callbacks
            );
        }
    };

})();

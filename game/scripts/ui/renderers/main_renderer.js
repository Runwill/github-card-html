(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // 占位函数，等待重构
    // TODO: 实现新的 GameTextRenderer 系统
    
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
        }

        // 2. 渲染时机徽标
        if (timingBadgeEl) {
            const currentNode = window.Game.Core.getCurrentNode();
            if (currentNode) {
                // 渲染内容
                const renderKey = currentNode.name;
                
                window.Game.UI.safeRender(timingBadgeEl, GameText.render(renderKey), renderKey);

                // 样式
                applyTermStyle(timingBadgeEl, currentNode.name, true);
            }
        }

        // 3. 渲染角色信息 (Self Role)
        if (window.Game.UI.updateSelfRoleInfo) {
            window.Game.UI.updateSelfRoleInfo(GameState, GameText);
        } else if (window.Game.UI.updateCharacterInfo) {
             // Fallback
             window.Game.UI.updateCharacterInfo(GameState, GameText);
        }

        // 4. 渲染角色列表 (Role List)
        if (window.Game.UI.renderRoleList) {
            window.Game.UI.renderRoleList(GameState, GameText);
        } else if (window.Game.UI.renderOtherRoles) {
            window.Game.UI.renderOtherRoles(GameState, GameText);
        }

        // 5. 渲染公共区域 (Board)
        if (window.Game.UI.renderBoard) {
            window.Game.UI.renderBoard(GameState, GameText);
        }

        // 6. 更新控件
        if (window.Game.UI.updateControls) {
            window.Game.UI.updateControls(GameState);
        }

        // 7. 更新所有打开的详情窗口 (Inspect Viewers)
        // 这一步确保拖拽等操作后，窗口内容实时同步
        if (window.Game.UI.updateAllViewers) {
            window.Game.UI.updateAllViewers();
        }
    }

    // 导出
    window.Game.UI.updateUI = updateUI;
    
    // 拖放回调实现：触发核心 Move 事件
    window.Game.UI.onCardDrop = function(cardData, sourceAreaName, targetZoneId, targetIndex, sourceIndex, callbacks, options) {
        const GameState = window.Game.Core.GameState;
        if (!GameState) return;

        let targetArea = null;
        let moveRole = null;
        let animationHint = null;
        // 修正：当前操作者应与 UI 显示的“主视角角色”一致
        // 之前硬编码为 players[0]，会导致在 updateSelfRoleInfo 渲染 players[1] 时逻辑错乱
        const currentPlayer = GameState.players[GameState.currentPlayerIndex] || GameState.players[0];

        // 1. 解析 Slot 后缀 (支持 equipArea:slot:0 或 role:1001:equip:slot:0)
        let resolvedTargetId = targetZoneId;
        let forcedTargetSlot = -1;

        if (targetZoneId && targetZoneId.includes(':slot:')) {
            const parts = targetZoneId.split(':slot:');
            resolvedTargetId = parts[0];
            const slotIdx = parseInt(parts[1]);
            if (!isNaN(slotIdx)) forcedTargetSlot = slotIdx;
        }

        // 2. 映射 targetZoneId 到 Area 对象
        if (resolvedTargetId === 'hand') {
            targetArea = currentPlayer.hand;
            moveRole = currentPlayer;
        } else if (resolvedTargetId === 'equipArea') {
            targetArea = currentPlayer.equipArea;
            moveRole = currentPlayer;
        } else if (resolvedTargetId === 'treatmentArea') {
            targetArea = GameState.treatmentArea;
            moveRole = currentPlayer; 
        } else if (resolvedTargetId && (resolvedTargetId.startsWith('role:') || resolvedTargetId.startsWith('role-judge:'))) {
            // 解析角色相关区域
            // role:1001 (Hand)
            // role-judge:1001 (Judge)
            // role:1001:equip (Equip)
            
            const isJudge = resolvedTargetId.startsWith('role-judge:');
            const isEquip = resolvedTargetId.includes(':equip');
            
            // 提取 ID
            // role-judge:1001 -> 1001
            // role:1001 -> 1001
            // role:1001:equip -> 1001
            
            let idPart = resolvedTargetId.replace('role-judge:', '').replace('role:', '').replace(':equip', '');
            const roleId = parseInt(idPart);
            
            const targetPlayer = GameState.players.find(p => p.id === roleId);
            
            if (targetPlayer) {
                if (isJudge) {
                    targetArea = targetPlayer.judgeArea;
                } else if (isEquip) {
                    // 如果有 forcedTargetSlot, 使用对应的 equipSlot
                    if (forcedTargetSlot !== -1 && targetPlayer.equipSlots) {
                        targetArea = targetPlayer.equipSlots[forcedTargetSlot];
                    } else if (targetPlayer.equipArea) {
                        // Fallback (Proxy)
                        targetArea = targetPlayer.equipArea; 
                    } else {
                        // Very bad fallback if model changed
                         targetArea = targetPlayer.equipSlots ? targetPlayer.equipSlots[0] : null;
                    }
                } else {
                    targetArea = targetPlayer.hand;
                }

                if (targetArea) {
                    moveRole = currentPlayer; // 发起移动的始终是“操作者”，目标是“目标角色区域”
                    animationHint = targetZoneId; 
                }
            }
        } else if (GameState[resolvedTargetId]) {
            // 尝试全局区域
            targetArea = GameState[resolvedTargetId];
            moveRole = currentPlayer;
        }

        if (targetArea) {
            // Game Core movedAtPosition 是 1-based index
            let finalTargetIndex = targetIndex;
            
            // 重要修正：
            // 如果我们已经通过 forcedTargetSlot 选定了一个具体的 EquipSlot Area（独立区域），
            // 那么 targetIndex 就是该区域内的相对位置。我们不应该强制重置为 0。
            // 之前的逻辑 finalTargetIndex = 0 是为了应对“假定槽位只能放一张牌”的情况，
            // 但如果用户想在一个槽位里放多张牌（堆叠），或者调整顺序，就必须尊重 targetIndex。
            
            // 注意：如果 targetArea 是 'equipArea' (Proxy/Legacy)，它没有 cards 数组 (它是 getter)，
            // 这会导致 Events.move 失败。必须确保 targetArea 是真实的 Area 实例。
            // 目前只有当 forcedTargetSlot 存在时，我们才映射到真实的 sub-area。
            // 如果 drop zone 没有 slot info (e.g. drop to header generally)，我们可能需要默认逻辑。
            if (resolvedTargetId === 'equipArea') {
                 if (forcedTargetSlot !== -1 && currentPlayer.equipSlots) {
                      targetArea = currentPlayer.equipSlots[forcedTargetSlot];
                      // targetArea 已切换为 slot，targetIndex 有效，不做修改
                 } else {
                      // 拖到 'equipArea' 但不知道哪个槽位? 
                      // 默认武器 slot 0
                      targetArea = currentPlayer.equipSlots ? currentPlayer.equipSlots[0] : null;
                      // 在这种模糊情况下，我们只能追加到末尾或头部
                      if (finalTargetIndex === -1) finalTargetIndex = 9999;
                 }
            }
            
            // 如果我们处于一个具体的 Slot 区域内，且 targetIndex 是 -1 (Drop on blank space)，这意味着 append
            // 否则尊重由 interactions.js 计算出的 targetIndex

            // 如果索引无效 (<0)，Core 通常使用 9999 代表追加到末尾
            // 如果有明确的 finalTargetIndex (且 >=0)，则转换为 1-based position
            const position = (finalTargetIndex < 0) ? 9999 : (finalTargetIndex + 1); 
            
            // Resolve sourceArea based on sourceAreaName
            let sourceArea = null;
            let resolvedSourceId = sourceAreaName;
            let forcedSourceSlot = -1;

            if (sourceAreaName && sourceAreaName.includes(':slot:')) {
                const parts = sourceAreaName.split(':slot:');
                resolvedSourceId = parts[0];
                const slotIdx = parseInt(parts[1]);
                if (!isNaN(slotIdx)) forcedSourceSlot = slotIdx;
            }

            if (resolvedSourceId === 'hand') {
                sourceArea = currentPlayer.hand;
            } else if (resolvedSourceId === 'equipArea') {
                 // 如果来源有 slot，使用具体 slot
                 if (forcedSourceSlot !== -1 && currentPlayer.equipSlots) {
                     sourceArea = currentPlayer.equipSlots[forcedSourceSlot];
                 } else {
                     sourceArea = currentPlayer.equipArea; // Proxy (unsafe for remove via Events? Events usually handle it if card is found)
                 }
            } else if (resolvedSourceId === 'treatmentArea') {
                sourceArea = GameState.treatmentArea; 
            } else if (resolvedSourceId && (resolvedSourceId.startsWith('role:') || resolvedSourceId.startsWith('role-judge:'))) {
                const isJudge = resolvedSourceId.startsWith('role-judge:');
                const isEquip = resolvedSourceId.includes(':equip');
                
                let idPart = resolvedSourceId.replace('role-judge:', '').replace('role:', '').replace(':equip', '');
                const roleId = parseInt(idPart);
                const p = GameState.players.find(pl => pl.id === roleId);
                
                if (p) {
                    if (isJudge) {
                        sourceArea = p.judgeArea;
                    } else if (isEquip) {
                        if (forcedSourceSlot !== -1 && p.equipSlots) {
                            sourceArea = p.equipSlots[forcedSourceSlot];
                        } else {
                            sourceArea = p.equipArea; // Fallback
                        }
                    } else {
                        sourceArea = p.hand;
                    }
                }
            } else if (GameState[resolvedSourceId]) {
                sourceArea = GameState[resolvedSourceId];
            } else {
                 // Try to check if it's a role ID or similar (not implemented here yet)
            }

            // cardData 是 Card 对象 (or String)
            // Delegate to Controller to handle mode-specific logic
            if (window.Game.Controller && window.Game.Controller.dispatch) {
                // 用于动画接管的起始位置
                const startRect = (options && options.startRect) ? options.startRect : null;
                const cardHTML = (options && options.cardHTML) ? options.cardHTML : null;
                const dragElement = (options && options.dragElement) ? options.dragElement : null;

                window.Game.Controller.dispatch('move', {
                    moveRole, 
                    card: cardData, 
                    toArea: targetArea, 
                    position, 
                    fromArea: sourceArea, 
                    fromIndex: sourceIndex, 
                    callbacks,
                    startRect,
                    animationHint, // 显式传递动画目标线索
                    cardHTML, // 显式传递卡牌外观
                    dragElement // 显式传递拖拽元素本体
                });
            } else {
                // Fallback to direct event trigger (Legacy/Auto)
                window.Game.Core.Events.move(
                    moveRole, 
                    cardData, 
                    targetArea, 
                    position, 
                    sourceArea, 
                    sourceIndex, 
                    callbacks 
                );
            }
        } else {
             console.warn('[UI] Drop: Target area not found', targetZoneId);
        }
    };

})();

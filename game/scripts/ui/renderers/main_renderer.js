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
        if (breadcrumbsEl && GameText) {
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
        if (timingBadgeEl && GameText) {
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

        // 1. 映射 targetZoneId 到 Area 对象
        if (targetZoneId === 'hand') {
            targetArea = currentPlayer.hand;
            moveRole = currentPlayer;
        } else if (targetZoneId === 'equipArea') {
            targetArea = currentPlayer.equipArea;
            moveRole = currentPlayer;
        } else if (targetZoneId === 'treatmentArea') {
            targetArea = GameState.treatmentArea;
            moveRole = currentPlayer; 
        } else if (targetZoneId && (targetZoneId.startsWith('role:') || targetZoneId.startsWith('role-judge:'))) {
            // 统一处理角色相关区域 (手牌 role:ID 或 判定区 role-judge:ID)
            const isJudge = targetZoneId.startsWith('role-judge:');
            const roleId = parseInt(targetZoneId.split(':')[1]);
            const targetPlayer = GameState.players.find(p => p.id === roleId);
            
            if (targetPlayer) {
                targetArea = isJudge ? targetPlayer.judgeArea : targetPlayer.hand;
                if (targetArea) {
                    moveRole = currentPlayer; 
                    animationHint = targetZoneId; 
                }
            }
        } else if (GameState[targetZoneId]) {
            // 尝试全局区域
            targetArea = GameState[targetZoneId];
            moveRole = currentPlayer;
        }

        if (targetArea) {
            // Game Core movedAtPosition 是 1-based index
            const position = targetIndex + 1;
            
            // Resolve sourceArea based on sourceAreaName
            let sourceArea = null;
            if (sourceAreaName === 'hand') {
                sourceArea = currentPlayer.hand;
            } else if (sourceAreaName === 'equipArea') {
                 sourceArea = currentPlayer.equipArea;
            } else if (sourceAreaName === 'treatmentArea') {
                sourceArea = GameState.treatmentArea; 
            } else if (sourceAreaName && (sourceAreaName.startsWith('role:') || sourceAreaName.startsWith('role-judge:'))) {
                const isJudge = sourceAreaName.startsWith('role-judge:');
                const roleId = parseInt(sourceAreaName.split(':')[1]);
                const p = GameState.players.find(pl => pl.id === roleId);
                if (p) {
                    sourceArea = isJudge ? p.judgeArea : p.hand;
                }
            } else if (GameState[sourceAreaName]) {
                sourceArea = GameState[sourceAreaName];
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
                    position: (targetIndex < 0) ? 9999 : position, // 负索引意味着追加到末尾
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

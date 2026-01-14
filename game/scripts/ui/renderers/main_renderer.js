(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // 占位函数，等待重构
    // TODO: 实现新的 GameTextRenderer 系统
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

                // 检查内容是否更改以避免 DOM 抖动（MutationObserver 滥用）
                const newHtml = GameText.render(item.key, item.data);
                
                // 仅在语义不同时更新
                // 注意：属性可能需要标准化比较
                if (crumb.getAttribute('data-key') !== item.key || crumb.getAttribute('data-val') !== JSON.stringify(item.data)) {
                     crumb.innerHTML = newHtml;
                     crumb.setAttribute('data-key', item.key);
                     crumb.setAttribute('data-val', JSON.stringify(item.data));
                     
                     // 重置动画
                     crumb.style.animation = 'none';
                     crumb.offsetHeight; 
                     crumb.style.animation = 'slideInUp 0.3s forwards';
                }

                // 处理样式（颜色/阴影）
                // 我们需要从 GameData.UI.termColors 获取颜色以设置容器样式。
                // GameText 生成内部术语，但面包屑容器承载视觉权重。
                const colorKey = item.key;
                const rawColor = window.Game.UI.termColors ? (window.Game.UI.termColors.get(colorKey) || window.Game.UI.termColors.get(colorKey.toLowerCase())) : null;
                const color = window.Game.UI.getAdaptiveColor ? window.Game.UI.getAdaptiveColor(rawColor) : rawColor;

                if (color) {
                    crumb.style.color = color;
                    // 如果需要，将颜色传递给 CSS 变量供内部使用
                    crumb.style.setProperty('--term-color', color);
                } else {
                    crumb.style.color = '';
                }

                // 最后一项状态（等待/活动）
                // 使用索引比较中的 isLast
                const isItemLast = (index === displayItems.length - 1);
                const currentNode = window.Game.Core.getCurrentNode();
                const isWaiting = currentNode && window.Game.Core.isInteractive(currentNode);

                if (isItemLast) {
                     crumb.style.opacity = '1';
                     if (isWaiting && rawColor) {
                         // 柔和发光效果
                         const glowColor = window.Game.UI.hexToRgba ? window.Game.UI.hexToRgba(rawColor, 0.3) : rawColor;
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
                // 使用 data-render-key 避免因全局高亮修改 DOM 导致的循环重置
                if (timingBadgeEl.getAttribute('data-render-key') !== renderKey) {
                    timingBadgeEl.innerHTML = GameText.render(renderKey);
                    timingBadgeEl.setAttribute('data-render-key', renderKey);
                }

                // 样式
                const rawColor = window.Game.UI.termColors ? (window.Game.UI.termColors.get(currentNode.name)) : null;
                const color = window.Game.UI.getAdaptiveColor ? window.Game.UI.getAdaptiveColor(rawColor) : rawColor;

                if (color) {
                    timingBadgeEl.style.color = color;
                    timingBadgeEl.style.backgroundColor = window.Game.UI.hexToRgba ? window.Game.UI.hexToRgba(color, 0.1) : 'rgba(0,0,0,0.1)';
                    timingBadgeEl.style.borderColor = window.Game.UI.hexToRgba ? window.Game.UI.hexToRgba(color, 0.3) : color;
                } else {
                    timingBadgeEl.style.color = '';
                    timingBadgeEl.style.backgroundColor = '';
                    timingBadgeEl.style.borderColor = '';
                }
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
    }

    // 导出
    window.Game.UI.updateUI = updateUI;
    
    // 如果仍然全局依赖 onCardDrop，则为拖放提供回退
    // 如果新系统不需要，我们可以最小化实现或将其留空
    window.Game.UI.onCardDrop = function() { console.log('Legacy drop'); };

})();

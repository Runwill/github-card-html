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
            // 我们需要 [RoundItem, ...ProcessItems]
            const displayItems = [];

            // 添加回合项
            displayItems.push({
                key: 'Round',
                data: { n: GameState.round }
            });

            // 添加流程项
            activeProcesses.forEach(node => {
                if (node.type === 'process' || node.type === 'tick') return;
                
                // 对带有玩家信息的 Turn 进行特殊处理？
                // 用户需求：“角色名”是单独的文本。
                // 但在面包屑中，目前显示“1 CaoCao Turn”。
                // 如果我们希望 "Turn" 为 <turn></turn>，我们可以构建一个组合键吗？
                // 或者只是推送通用的 'Process' 项。
                
                displayItems.push({
                    key: node.name,
                    data: {} // 标准阶段通常没有动态数据
                });
            });

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
                const newHtml = GameText.render(currentNode.name);
                if (timingBadgeEl.innerHTML !== newHtml) {
                    timingBadgeEl.innerHTML = newHtml;
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

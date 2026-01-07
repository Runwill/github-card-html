(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    function updateUI() {
        const GameState = window.Game.Core.GameState;
        const currentNode = window.Game.Core.getCurrentNode();
        const activeProcesses = window.Game.Core.getActiveProcesses();
        const isWaiting = currentNode && window.Game.Core.isInteractive(currentNode);
        
        const breadcrumbsEl = document.getElementById('game-breadcrumbs');
        const timingBadgeEl = document.getElementById('game-timing-badge');
        
        // Render Breadcrumbs
        if (breadcrumbsEl) {
            // Filter active processes first
            const filteredProcesses = activeProcesses.filter(name => !name.endsWith('Process'));
            
            // Create display items list
            // 1. Add Round as the first item
            const currentPlayer = GameState.players[GameState.currentPlayerIndex];
            const displayItems = [
                { 
                    id: `Round-${GameState.round}`, // Unique ID for diffing
                    text: i18n.t('game.round', { n: GameState.round }),
                    colorKey: 'Round' // Key to look up color
                },
                ...filteredProcesses.map(name => {
                    let text = i18n.t(`game.process.${name}`, { defaultValue: name });
                    if (name === 'Turn' && currentPlayer) {
                        // Format: "1 曹操 回合"
                        const seatStr = `${currentPlayer.id + 1}`;
                        text = `${seatStr} ${currentPlayer.name} ${text}`;
                    }
                    // Special handling for Event Steps to make them distinct
                    if (currentNode && currentNode.type === 'event-step' && name === currentNode.name) {
                         // Keep original name for step
                    }
                    return {
                        id: name,
                        text: text,
                        colorKey: name
                    };
                })
            ];

            // Get current DOM elements
            const currentCrumbs = Array.from(breadcrumbsEl.children);
            
            // Sync DOM with displayItems
            // 1. Update or Add
            displayItems.forEach((item, index) => {
                const rawColor = window.Game.UI.termColors.get(item.colorKey) || window.Game.UI.termColors.get(item.colorKey.toLowerCase());
                const color = window.Game.UI.getAdaptiveColor(rawColor);
                const isLast = index === displayItems.length - 1;
                
                if (index < currentCrumbs.length) {
                    // Existing element
                    const crumb = currentCrumbs[index];
                    
                    // Apply Modern Styling: Color all items if available
                    if (color) {
                        crumb.style.color = color;
                        // Only add glow/shadow to the last item to keep focus
                        if (isLast) {
                            // Only glow if waiting for user interaction
                            if (isWaiting) {
                                crumb.style.textShadow = `0 0 10px ${window.Game.UI.hexToRgba(color, 0.3)}`;
                            }
                        } else {
                            crumb.style.textShadow = '';
                            crumb.style.opacity = '0.8'; // Higher opacity for visibility
                        }
                    } else {
                        crumb.style.color = ''; // Revert to CSS default (grey)
                        crumb.style.textShadow = '';
                        crumb.style.fontWeight = '';
                        crumb.style.opacity = isLast ? '1' : '0.6';
                    }
                    
                    if (crumb.textContent !== item.text) {
                        // Content changed (e.g. sibling transition), update text and re-trigger animation
                        crumb.textContent = item.text;
                        // Reset animation
                        crumb.style.animation = 'none';
                        crumb.offsetHeight; /* trigger reflow */
                        crumb.style.animation = 'slideInUp 0.03s forwards';
                    }
                } else {
                    // New element
                    const crumb = document.createElement('span');
                    crumb.className = 'crumb';
                    crumb.textContent = item.text;
                    
                    if (color) {
                        crumb.style.color = color;
                        if (isLast) {
                            if (isWaiting) {
                                crumb.style.textShadow = `0 0 10px ${window.Game.UI.hexToRgba(color, 0.3)}`;
                            }
                        } else {
                            crumb.style.opacity = '0.8';
                        }
                    } else {
                        crumb.style.opacity = isLast ? '1' : '0.6';
                    }

                    // No delay needed for single addition, or keep it small
                    crumb.style.animationDelay = '0s'; 
                    breadcrumbsEl.appendChild(crumb);
                }
            });
            
            // 2. Remove extras
            while (breadcrumbsEl.children.length > displayItems.length) {
                breadcrumbsEl.removeChild(breadcrumbsEl.lastChild);
            }
        }
        
        // Render Timing Badge
        if (timingBadgeEl && currentNode) {
            timingBadgeEl.textContent = i18n.t(`game.timing.${currentNode.name}`);
            
            const rawColor = window.Game.UI.termColors.get(currentNode.name);
            const color = window.Game.UI.getAdaptiveColor(rawColor);
            
            if (color) {
                // Modern "Tag" Style: Transparent BG with tint, solid text
                timingBadgeEl.style.backgroundColor = window.Game.UI.hexToRgba(color, 0.15);
                timingBadgeEl.style.color = color;
                timingBadgeEl.style.border = `1px solid ${window.Game.UI.hexToRgba(color, 0.3)}`;
                timingBadgeEl.style.textShadow = 'none';
                timingBadgeEl.style.boxShadow = `0 2px 8px ${window.Game.UI.hexToRgba(color, 0.1)}`;
            } else {
                timingBadgeEl.style.backgroundColor = '';
                timingBadgeEl.style.color = '';
                timingBadgeEl.style.border = '';
                timingBadgeEl.style.textShadow = '';
                timingBadgeEl.style.boxShadow = '';
            }
        }

        // Update Buttons based on state
        const endTurnBtn = document.getElementById('btn-end-turn');
        const playCardBtn = document.getElementById('btn-play-card');
        
        if (isWaiting) {
            if (playCardBtn) playCardBtn.classList.remove('hidden');
            if (endTurnBtn) {
                endTurnBtn.classList.remove('hidden');
                endTurnBtn.textContent = i18n.t('game.endActing');
            }
        } else {
            if (playCardBtn) playCardBtn.classList.add('hidden');
            if (endTurnBtn) endTurnBtn.classList.add('hidden');
        }

        // Update Current Character
        const currentPlayer = GameState.players[GameState.currentPlayerIndex];
        if (currentPlayer) {
            document.getElementById('char-name').textContent = currentPlayer.name;
            // document.getElementById('char-img').src = currentPlayer.avatar; // Uncomment when images are real
            
            const hpEl = document.getElementById('char-hp-display');
            const newHpText = i18n.t('game.hp', { hp: currentPlayer.health, maxHp: currentPlayer.healthLimit });
            
            // Trigger animation if value changed (and not first render)
            if (hpEl.textContent && hpEl.textContent !== newHpText) {
                hpEl.classList.remove('hp-changed');
                void hpEl.offsetWidth; // Force reflow
                hpEl.classList.add('hp-changed');
            }
            hpEl.textContent = newHpText;
            
            // Add Context Menu
            const charInfoPanel = document.querySelector('.character-info');
            if (charInfoPanel) {
                charInfoPanel.oncontextmenu = (e) => {
                    e.preventDefault();
                    window.Game.UI.showContextMenu(e.clientX, e.clientY, currentPlayer);
                };
            }

            // Render Hand
            const handContainer = document.getElementById('hand-cards-container');
            if (handContainer) {
                handContainer.innerHTML = '';
                currentPlayer.hand.forEach(card => {
                    const cardEl = document.createElement('div');
                    cardEl.className = 'card-placeholder';
                    cardEl.textContent = card;
                    handContainer.appendChild(cardEl);
                });
            }
        }

        // Render Other Players
        const otherPlayersContainer = document.getElementById('other-players-container');
        
        if (otherPlayersContainer) {
            // Sync players instead of rebuilding to preserve animations
            GameState.players.forEach((player, index) => {
                let pEl = document.getElementById(`player-summary-${player.id}`);
                
                if (!pEl) {
                    pEl = document.createElement('div');
                    pEl.id = `player-summary-${player.id}`;
                    pEl.className = 'other-player-summary';
                    
                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'player-name';
                    pEl.appendChild(nameSpan);
                    
                    const hpSpan = document.createElement('span');
                    hpSpan.className = 'player-hp stat-hp'; // Added stat-hp for shared styling/animation
                    pEl.appendChild(hpSpan);
                    
                    otherPlayersContainer.appendChild(pEl);
                }
                
                // Update Active Status
                if (index === GameState.currentPlayerIndex) {
                    pEl.classList.add('active');
                } else {
                    pEl.classList.remove('active');
                }
                
                // Update Name
                const nameSpan = pEl.querySelector('.player-name');
                if (nameSpan.textContent !== player.name) nameSpan.textContent = player.name;
                
                // Update HP with Animation
                const hpSpan = pEl.querySelector('.player-hp');
                // Use health/healthLimit to match GameState structure
                const newHpText = i18n.t('game.hp', { hp: player.health, maxHp: player.healthLimit });
                
                if (hpSpan.textContent && hpSpan.textContent !== newHpText) {
                    hpSpan.classList.remove('hp-changed');
                    void hpSpan.offsetWidth; // Force reflow
                    hpSpan.classList.add('hp-changed');
                }
                hpSpan.textContent = newHpText;
                
                // Context Menu (Now supports modifying any player)
                pEl.oncontextmenu = (e) => {
                    e.preventDefault();
                    window.Game.UI.showContextMenu(e.clientX, e.clientY, player);
                };
            });
            
            // Cleanup removed players (if any)
            Array.from(otherPlayersContainer.children).forEach(child => {
                const id = parseInt(child.id.replace('player-summary-', ''));
                if (!GameState.players.find(p => p.id === id)) {
                    otherPlayersContainer.removeChild(child);
                }
            });
        }
    }

    window.Game.UI.updateUI = updateUI;
})();
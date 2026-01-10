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
                    
                    if (crumb.innerHTML !== item.text) {
                        // Content changed (e.g. sibling transition), update text and re-trigger animation
                        crumb.innerHTML = item.text;
                        // Reset animation
                        crumb.style.animation = 'none';
                        crumb.offsetHeight; /* trigger reflow */
                        crumb.style.animation = 'slideInUp 0.03s forwards';
                    }
                } else {
                    // New element
                    const crumb = document.createElement('span');
                    crumb.className = 'crumb';
                    crumb.innerHTML = item.text;
                    
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
            timingBadgeEl.innerHTML = i18n.t(`game.timing.${currentNode.name}`);
            
            const rawColor = window.Game.UI.termColors.get(currentNode.name);
            const color = window.Game.UI.getAdaptiveColor(rawColor);
            
            if (color) {
                // Modern "Tag" Style: Transparent BG with tint, solid text
                timingBadgeEl.style.backgroundColor = window.Game.UI.hexToRgba(color, 0.15);
                timingBadgeEl.style.color = color;
                // Only change Border Color, rely on CSS for width/style
                timingBadgeEl.style.borderColor = window.Game.UI.hexToRgba(color, 0.3);
                timingBadgeEl.style.textShadow = 'none';
                timingBadgeEl.style.boxShadow = `0 2px 8px ${window.Game.UI.hexToRgba(color, 0.1)}`;
            } else {
                timingBadgeEl.style.backgroundColor = '';
                timingBadgeEl.style.color = '';
                timingBadgeEl.style.borderColor = ''; // Revert to transparent
                timingBadgeEl.style.textShadow = '';
                timingBadgeEl.style.boxShadow = '';
            }
        }

        // Update Buttons based on state
        const endTurnBtn = document.getElementById('btn-end-turn');
        const playCardBtn = document.getElementById('btn-play-card');
        const pauseBtn = document.getElementById('btn-pause-game');
        
        // Pause Button Logic
        if (pauseBtn) {
            if (GameState.isGameRunning) {
                pauseBtn.classList.remove('hidden');
                if (GameState.isPaused) {
                    pauseBtn.textContent = i18n.t('game.resume', { defaultValue: 'Resume' });
                    pauseBtn.classList.remove('secondary');
                    pauseBtn.classList.add('warning'); // Visual cue for paused state
                } else {
                    pauseBtn.textContent = i18n.t('game.pause', { defaultValue: 'Pause' });
                    pauseBtn.classList.add('secondary');
                    pauseBtn.classList.remove('warning');
                }
            } else {
                pauseBtn.classList.add('hidden');
            }
        }

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

            // Render Treatment Area
            const treatmentHeader = document.getElementById('header-treatment-area');
            if (treatmentHeader && GameState.treatmentArea) {
                // Update header text based on backend area name
                // If term_manager is loaded, this returns HTML with interactions enabled
                treatmentHeader.innerHTML = i18n.t(`game.area.${GameState.treatmentArea.name}`);
            }

            const treatmentContainer = document.getElementById('treatment-area-container');
            if (treatmentContainer) {
                treatmentContainer.setAttribute('data-drop-zone', 'treatmentArea');
                treatmentContainer.innerHTML = '';
                const treatmentCards = GameState.treatmentArea ? GameState.treatmentArea.cards : [];
                
                treatmentCards.forEach((card, index) => {
                    const cardEl = document.createElement('div');
                    cardEl.className = 'card-placeholder';
                    
                    const cardName = typeof card === 'string' ? card : card.name;
                    // Check if translation exists in the underlying data (polyfill for i18n.has)
                    const key = `game.card.${cardName}`;
                    const hasTranslation = window.I18N_STRINGS && window.I18N_STRINGS.zh && window.I18N_STRINGS.zh[key];

                    if (hasTranslation) {
                        cardEl.innerHTML = i18n.t(key);
                    } else {
                        // Fallback to text content
                        cardEl.textContent = cardName;
                    }
                    
                    if (window.Game.UI.Interactions) {
                        window.Game.UI.Interactions.initDrag(cardEl, card, 'treatmentArea', index);
                    }
                    treatmentContainer.appendChild(cardEl);
                });
            }

            // Render Hand
            const handHeader = document.getElementById('header-hand-area');
            if (handHeader && currentPlayer.hand) {
                 // Check if it's an Area object to get name, otherwise default to 'hand'
                 const areaName = currentPlayer.hand.name || 'hand';
                 // If term_manager is loaded, this returns HTML with interactions enabled
                 handHeader.innerHTML = i18n.t(`game.area.${areaName}`);
            }

            const handContainer = document.getElementById('hand-cards-container');
            if (handContainer) {
                handContainer.setAttribute('data-drop-zone', 'hand');
                handContainer.innerHTML = '';
                // Handle hand if it is an Area object (has .cards) or legacy array
                const handCards = currentPlayer.hand.cards ? currentPlayer.hand.cards : currentPlayer.hand;
                
                handCards.forEach((card, index) => {
                    const cardEl = document.createElement('div');
                    cardEl.className = 'card-placeholder';
                    
                    const cardName = typeof card === 'string' ? card : card.name;
                    // Check if translation exists in the underlying data (polyfill for i18n.has)
                    const key = `game.card.${cardName}`;
                    const hasTranslation = window.I18N_STRINGS && window.I18N_STRINGS.zh && window.I18N_STRINGS.zh[key];
                    
                    if (hasTranslation) {
                        cardEl.innerHTML = i18n.t(key);
                    } else {
                        cardEl.textContent = cardName;
                    }

                    if (window.Game.UI.Interactions) {
                        window.Game.UI.Interactions.initDrag(cardEl, card, 'hand', index);
                    }
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
                    
                    // Optional: Equip Area Display (Placeholder)
                    const equipDiv = document.createElement('div');
                    equipDiv.className = 'player-equips';
                    equipDiv.style.fontSize = '0.8em';
                    equipDiv.style.color = '#aaa';
                    pEl.appendChild(equipDiv);

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
                
                // Update Equips
                const equipDiv = pEl.querySelector('.player-equips');
                if (equipDiv && player.equipArea && player.equipArea.cards.length > 0) {
                   equipDiv.textContent = `[${player.equipArea.cards.join(',')}]`;
                } else if (equipDiv) {
                   equipDiv.textContent = '';
                }

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

    window.Game.UI.onCardDrop = function(cardData, sourceZone, targetZone, targetIndex = -1, sourceIndex = -1) {
        const GameState = window.Game.Core.GameState;
        const currentPlayer = GameState.players[GameState.currentPlayerIndex];

        // Helper to get Area object or Array
        const getArea = (zoneName) => {
            if (zoneName === 'hand') return currentPlayer.hand;
            if (zoneName === 'treatmentArea') return GameState.treatmentArea;
            return null;
        };

        const srcAreaRaw = getArea(sourceZone);
        const tgtAreaRaw = getArea(targetZone);

        // Normalize to array manipulation
        // Some areas are arrays (legacy), others are objects with .cards
        const getCards = (area) => area.cards || area;

        if (srcAreaRaw && tgtAreaRaw) {
            const srcCards = getCards(srcAreaRaw);
            const tgtCards = getCards(tgtAreaRaw);

            // Robust index finding: Use sourceIndex if available, else fallback to indexOf (but avoid -1 splice issue)
            const srcIdx = (sourceIndex !== -1 && sourceIndex < srcCards.length) 
                ? sourceIndex 
                : srcCards.indexOf(cardData);
            
            if (srcIdx === -1) {
                console.error("Card drop failed: Source card not found in area", cardData);
                updateUI(); // Restore matching local state
                return;
            }

            if (sourceZone === targetZone) {
                // Internal Reordering
                if (targetIndex !== -1 && targetIndex !== srcIdx) {
                    
                    const itemToMove = srcCards[srcIdx];
                    
                    // Remove 1 element
                    srcCards.splice(srcIdx, 1);
                    
                    // Insert at targetIndex
                    srcCards.splice(targetIndex, 0, itemToMove);
                }
                updateUI();
            } else {
                // Cross Zone Move
                const itemToMove = srcCards[srcIdx];
                srcCards.splice(srcIdx, 1); // remove 1
                
                if (targetIndex !== -1) {
                    tgtCards.splice(targetIndex, 0, itemToMove);
                } else {
                    tgtCards.push(itemToMove);
                }
                updateUI();
            }
        }
    };
})();
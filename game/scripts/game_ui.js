(function() {
    window.Game = window.Game || {};

    const termColors = new Map();

    function loadTermColors() {
        if (!window.endpoints || !window.fetchJsonCached) return;
        
        const load = (url) => {
            window.fetchJsonCached(url).then(data => {
                for (let key in data) {
                    const item = data[key];
                    // 1. Load Colors
                    if (item.en && item.color) {
                        termColors.set(item.en, item.color);
                    }
                    // 2. Load Translations (Backend Driven)
                    if (item.en && (item.cn || item.replace) && window.I18N_STRINGS && window.I18N_STRINGS.zh) {
                        // Inject into I18N system (Prefer 'replace' over 'cn' to match panel_term behavior)
                        const val = item.replace || item.cn;
                        
                        // 2.1 Process/Event Names (game.process.X)
                        window.I18N_STRINGS.zh[`game.process.${item.en}`] = val;
                        
                        // Also inject PascalCase version if key is lowercase (e.g. 'damage' -> 'Damage')
                        const pascalKey = item.en.charAt(0).toUpperCase() + item.en.slice(1);
                        if (pascalKey !== item.en) {
                            window.I18N_STRINGS.zh[`game.process.${pascalKey}`] = val;
                        }

                        // 2.2 Timings (game.timing.X) - Detect if it looks like a timing
                        if (/^(before|when|after)/.test(item.en)) {
                            window.I18N_STRINGS.zh[`game.timing.${item.en}`] = val;
                        }
                    }

                    if (item.part) {
                        for (let pKey in item.part) {
                            const part = item.part[pKey];
                            if (part.en && (part.color || item.color)) {
                                termColors.set(part.en, part.color || item.color);
                            }
                            // Load Part Translations
                            if (part.en && (part.cn || part.replace) && window.I18N_STRINGS && window.I18N_STRINGS.zh) {
                                const val = part.replace || part.cn;
                                window.I18N_STRINGS.zh[`game.process.${part.en}`] = val;
                                
                                const pascalKey = part.en.charAt(0).toUpperCase() + part.en.slice(1);
                                if (pascalKey !== part.en) {
                                    window.I18N_STRINGS.zh[`game.process.${pascalKey}`] = val;
                                }

                                // Timings for parts
                                if (/^(before|when|after)/.test(part.en)) {
                                    window.I18N_STRINGS.zh[`game.timing.${part.en}`] = val;
                                }
                            }
                        }
                    }
                }
                if (window.Game.Core && window.Game.Core.GameState.isGameRunning) {
                    updateUI();
                }
            }).catch(e => console.error("Failed to load colors/terms", e));
        };

        load(window.endpoints.termDynamic());
        load(window.endpoints.termFixed());
    }

    // Helper: Hex to RGBA
    function hexToRgba(hex, alpha) {
        let c;
        if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
            c= hex.substring(1).split('');
            if(c.length== 3){
                c= [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c= '0x'+c.join('');
            return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
        }
        return hex;
    }

    // Helper: Get Adaptive Color
    function getAdaptiveColor(color) {
        if (!color) return null;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (!isDark && window.ColorUtils && typeof window.ColorUtils.invertColor === 'function') {
            try {
                return window.ColorUtils.invertColor(color, { mode: 'luma', output: 'auto' });
            } catch (e) {
                return color;
            }
        }
        return color;
    }

    function showCharacterInfo(player) {
        // Deprecated: Use showContextMenu instead
        console.log("Showing info for", player.name);
    }

    // Context Menu Logic
    let contextMenuEl = null;

    function createContextMenu() {
        if (contextMenuEl) return contextMenuEl;
        
        contextMenuEl = document.createElement('div');
        contextMenuEl.className = 'custom-context-menu';
        document.body.appendChild(contextMenuEl);
        
        // Close on click outside
        document.addEventListener('click', () => {
            contextMenuEl.classList.remove('visible');
        });
        
        return contextMenuEl;
    }

    function showContextMenu(x, y, player) {
        const menu = createContextMenu();
        menu.innerHTML = ''; // Clear previous content
        
        // Header
        const header = document.createElement('div');
        header.className = 'context-menu-header';
        header.textContent = player.name;
        menu.appendChild(header);
        
        // Actions
        const actions = [
            { label: 'Damage 1 HP', action: () => window.Game.Core.Events.damage(null, player, 1) },
            { label: 'Cure 1 HP', action: () => window.Game.Core.Events.cure(null, player, 1) },
            { label: 'Recover 1 HP', action: () => window.Game.Core.Events.recover(player, 1) },
            { label: 'Loss 1 HP', action: () => window.Game.Core.Events.loss(player, 1) }
        ];
        
        actions.forEach(item => {
            const el = document.createElement('div');
            el.className = 'context-menu-item';
            el.textContent = item.label;
            el.onclick = (e) => {
                e.stopPropagation(); // Prevent document click from closing immediately (though we want it to close after action)
                item.action();
                menu.classList.remove('visible');
            };
            menu.appendChild(el);
        });

        // Position and Show
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.add('visible');
        
        // Adjust if out of bounds (simple check)
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }
    }

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
                const rawColor = termColors.get(item.colorKey) || termColors.get(item.colorKey.toLowerCase());
                const color = getAdaptiveColor(rawColor);
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
                                crumb.style.textShadow = `0 0 10px ${hexToRgba(color, 0.3)}`;
                            } else {
                                crumb.style.textShadow = '';
                            }
                            crumb.style.opacity = '1';
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
                        crumb.style.animation = 'slideInUp 0.1s forwards';
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
                                crumb.style.textShadow = `0 0 10px ${hexToRgba(color, 0.3)}`;
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
            
            const rawColor = termColors.get(currentNode.name);
            const color = getAdaptiveColor(rawColor);
            
            if (color) {
                // Modern "Tag" Style: Transparent BG with tint, solid text
                timingBadgeEl.style.backgroundColor = hexToRgba(color, 0.15);
                timingBadgeEl.style.color = color;
                timingBadgeEl.style.border = `1px solid ${hexToRgba(color, 0.3)}`;
                timingBadgeEl.style.textShadow = 'none';
                timingBadgeEl.style.boxShadow = `0 2px 8px ${hexToRgba(color, 0.1)}`;
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
            document.getElementById('char-hp-display').textContent = i18n.t('game.hp', { hp: currentPlayer.health, maxHp: currentPlayer.healthLimit });
            
            // Add Context Menu
            const charInfoPanel = document.querySelector('.character-info');
            if (charInfoPanel) {
                charInfoPanel.oncontextmenu = (e) => {
                    e.preventDefault();
                    showContextMenu(e.clientX, e.clientY, currentPlayer);
                };
            }

            // Render Hand
            const handContainer = document.getElementById('hand-cards-container');
            handContainer.innerHTML = '';
            currentPlayer.hand.forEach(card => {
                const cardEl = document.createElement('div');
                cardEl.className = 'card-placeholder';
                cardEl.textContent = card;
                handContainer.appendChild(cardEl);
            });
        }

        // Render Other Players
        const otherPlayersContainer = document.getElementById('other-players-container');
        otherPlayersContainer.innerHTML = '';
        GameState.players.forEach((player, index) => {
            const pEl = document.createElement('div');
            pEl.className = 'other-player-summary';
            if (index === GameState.currentPlayerIndex) {
                pEl.classList.add('active');
            }
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = player.name;
            
            const hpSpan = document.createElement('span');
            hpSpan.className = 'player-hp';
            hpSpan.textContent = i18n.t('game.hp', { hp: player.hp, maxHp: player.maxHp });
            
            pEl.appendChild(nameSpan);
            pEl.appendChild(hpSpan);
            
            pEl.oncontextmenu = (e) => {
                e.preventDefault();
                showCharacterInfo(player);
            };
            
            otherPlayersContainer.appendChild(pEl);
        });
    }

    window.Game.UI = {
        loadTermColors,
        updateUI,
        getAdaptiveColor
    };

})();

(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // Mapping of Event Name to its display parts (based on panel_term.html structure)
    const termStructure = {
        // Basic Events
        'recover': ['recoverBody'],
        'loss': ['lossBody'],
        'cure': ['cureEnd'],
        'damage': ['damageEnd'],
        'dying': ['dyingEnd'],
        'die': ['dieEnd'],
        'use': ['useBody'],
        'play': ['playBody'],
        'discard': ['discardBody'],
        'face': ['faceBody'],
        'back': ['backBody'],
        'draw': ['drawHead', 'drawEnd'],
        'move': ['moveBody0'],

        // Timings - Recover
        'beforeRecover': ['recoverBody', 'beforeEnd'],
        'whenRecover': ['recoverBody', 'whenEnd'],
        'afterRecover': ['recoverBody', 'afterEnd'],

        // Timings - Damage
        'beforeDamage': ['dealtBody', 'damageEnd', 'beforeEnd'],
        'beforeDamaged': ['takeBody', 'damageEnd', 'beforeEnd'],
        'whenDamage': ['dealtBody', 'damageEnd', 'whenEnd'],
        'whenDamaged': ['takeBody', 'damageEnd', 'whenEnd'],
        'afterDamage': ['dealtBody', 'damageEnd', 'afterEnd'],
        'afterDamaged': ['takeBody', 'damageEnd', 'afterEnd'],

        // Timings - Use
        'beforeUse': ['useBody', 'beforeEnd'],
        'beforeUsed': ['passive', 'useBody', 'beforeEnd'],
        'whenUse': ['useBody', 'whenEnd'],
        'whenUsed': ['passive', 'useBody', 'whenEnd'],
        'afterUse': ['useBody', 'afterEnd'],
        'afterUsed': ['passive', 'useBody', 'afterEnd'],

        // Timings - Play
        'beforePlay': ['playBody', 'beforeEnd'],
        'beforePlayed': ['passive', 'playBody', 'beforeEnd'],
        'whenPlay': ['playBody', 'whenEnd'],
        'whenPlayed': ['passive', 'playBody', 'whenEnd'],
        'afterPlay': ['playBody', 'afterEnd'],
        'afterPlayed': ['passive', 'playBody', 'afterEnd'],

        // Timings - Discard
        'beforeDiscard': ['discardBody', 'beforeEnd'],
        'whenDiscard': ['discardBody', 'whenEnd'],
        'afterDiscard': ['discardBody', 'afterEnd'],

        // Timings - Dying
        'beforeDying': ['dyingEnd', 'beforeEnd'],
        'whenDying': ['dyingEnd', 'whenEnd'],
        'afterDying': ['dyingEnd', 'afterEnd'],

        // Timings - Die
        'beforeDie': ['dieEnd', 'beforeEnd'],
        'whenDie': ['dieEnd', 'whenEnd'],
        'afterDie': ['dieEnd', 'afterEnd'],

        // Timings - Draw
        'beforeDraw': ['drawHead', 'drawEnd', 'beforeEnd'],
        'whenDraw': ['drawHead', 'drawEnd', 'whenEnd'],
        'afterDraw': ['drawHead', 'drawEnd', 'afterEnd'],

        // Timings - Move
        'beforeMove': ['moveBody0', 'beforeEnd'],
        'whenMove': ['moveBody0', 'whenEnd'],
        'afterMove': ['moveBody0', 'afterEnd'],

        // Timings - Cure
        'beforeCure': ['dealtBody', 'cureEnd', 'beforeEnd'],
        'beforeCured': ['takeBody', 'cureEnd', 'beforeEnd'],
        'whenCure': ['dealtBody', 'cureEnd', 'whenEnd'],
        'whenCured': ['takeBody', 'cureEnd', 'whenEnd'],
        'afterCure': ['dealtBody', 'cureEnd', 'afterEnd'],
        'afterCured': ['takeBody', 'cureEnd', 'afterEnd'],

        // Timings - Loss
        'beforeLoss': ['lossBody', 'beforeEnd'],
        'whenLoss': ['lossBody', 'whenEnd'],
        'afterLoss': ['lossBody', 'afterEnd']
    };

    function injectTerm(key, val) {
        if (!window.I18N_STRINGS || !window.I18N_STRINGS.zh) return;
        
        // 1. Process/Event Names
        window.I18N_STRINGS.zh[`game.process.${key}`] = val;
        
        // PascalCase
        const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
        if (pascalKey !== key) {
            window.I18N_STRINGS.zh[`game.process.${pascalKey}`] = val;
        }

        // 2. Timings
        if (/^(before|when|after)/.test(key)) {
            window.I18N_STRINGS.zh[`game.timing.${key}`] = val;
        }

        // 3. Areas (Special case for known areas)
        if (['treatmentArea', 'hand', 'equipArea', 'judgeArea', 'discardPile', 'drawPile'].includes(key)) {
            window.I18N_STRINGS.zh[`game.area.${key}`] = val;
        }

        // 4. Cards (Basic & Scrolls & Equips)
        // Add known card keys here to categorize them correctly
        const knownCards = [
            'Slash', 'Dodge', 'Peach', 'Wine', 'Duel', 
            'FireSlash', 'ThunderSlash', 'Analeptic', // Variants
            'SavageAssault', 'ArcheryAttack', 'AmazingGrace', 'Godsalvation', // Scrolls
            'Lightning', 'Indulgence', 'SupplyShortage', // Delayed Scrolls
            'QingLongBlade', 'SerpentSpear', 'EightTrigrams', 'RenWangShield' // Equips
        ];
        if (knownCards.includes(key) || knownCards.includes(pascalKey)) {
            window.I18N_STRINGS.zh[`game.card.${key}`] = val;
            window.I18N_STRINGS.zh[`game.card.${pascalKey}`] = val; // Support both cases
        }
    }

    function createTermHtml(text, key, color) {
        // Use CSS variable to store color, apply it only in specific contexts via CSS
        const style = color ? ` style="--term-color:${color}"` : '';
        return `<span class="term-click" data-term="${key}"${style}>${text}</span>`;
    }

    function loadTermColors() {
        if (!window.endpoints || !window.fetchJsonCached) return;
        
        const load = (url) => {
            window.fetchJsonCached(url).then(data => {
                // Store all available parts for cross-referencing
                const globalParts = new Map();

                // First pass: Process raw data and populate globalParts AND Colors (moved up)
                for (let key in data) {
                    const item = data[key];
                    
                    // 1. Load Colors (Immediate)
                    if (item.en && item.color) {
                        window.Game.UI.termColors.set(item.en, item.color);
                    }

                    if (item.part && Array.isArray(item.part)) {
                        item.partMap = {};
                        item.part.forEach(p => {
                            if (p.en) {
                                item.partMap[p.en] = p;
                                globalParts.set(p.en, p);
                                // Load Part Colors
                                if (p.color || item.color) {
                                    window.Game.UI.termColors.set(p.en, p.color || item.color);
                                }
                            }
                        });
                    } else if (item.part) {
                        // Handle case where part might be an object (legacy/different format)
                        item.partMap = item.part;
                        for (let pKey in item.part) {
                            const p = item.part[pKey];
                            if (p.en) {
                                globalParts.set(p.en, p);
                                // Load Part Colors
                                if (p.color || item.color) {
                                    window.Game.UI.termColors.set(p.en, p.color || item.color);
                                }
                            }
                        }
                    }
                }

                // Second pass: Generate translations
                const processedKeys = new Set();

                // 1. Process explicit structure definitions (Priority)
                for (let key in termStructure) {
                    const partsList = termStructure[key];
                    
                    // Try to construct from global parts
                    const partHtmls = partsList.map(pKey => {
                        const p = globalParts.get(pKey);
                        if (!p) return '';
                        const val = p.replace || p.cn || '';
                        const color = window.Game.UI.termColors.get(pKey);
                        return createTermHtml(val, pKey, color);
                    });

                    // Check if we have valid parts (at least one non-empty)
                    if (partHtmls.some(t => t)) {
                        const val = partHtmls.join('');
                        injectTerm(key, val);
                        processedKeys.add(key);
                    } else {
                        // Debug: Log missing parts for 'recover' or other keys we expect
                        if (key === 'recover') {
                            console.log('Failed to construct recover. Missing parts:', partsList.filter(pKey => !globalParts.get(pKey)));
                        }
                    }
                }

                // 2. Process remaining items from data
                for (let key in data) {
                    const item = data[key];
                    
                    // 2. Load Translations
                    if (!processedKeys.has(item.en) && window.I18N_STRINGS && window.I18N_STRINGS.zh) {
                        let val = item.replace || item.cn;
                        if (item.en && val) {
                            const color = window.Game.UI.termColors.get(item.en);
                            injectTerm(item.en, createTermHtml(val, item.en, color));
                        }
                    }

                    // 3. Load Part Translations
                    if (item.partMap) {
                        for (let pKey in item.partMap) {
                            const part = item.partMap[pKey];
                            // Inject part translation if available and not complex
                            if (part.en && (part.cn || part.replace)) {
                                const pVal = part.replace || part.cn;
                                const color = window.Game.UI.termColors.get(part.en);
                                injectTerm(part.en, createTermHtml(pVal, part.en, color));
                            }
                        }
                    }
                }
                
                if (window.Game.Core && window.Game.Core.GameState.isGameRunning && window.Game.UI.updateUI) {
                    window.Game.UI.updateUI();
                }
            }).catch(e => console.error("Failed to load colors/terms", e));
        };

        load(window.endpoints.termDynamic());
        load(window.endpoints.termFixed());
    }

    // Add Global Click Listener for terms
    document.addEventListener('dblclick', (e) => {
        const target = e.target.closest('.term-click');
        if (target && window.scrollActions && typeof window.scrollActions.scrollToTagAndFlash === 'function') {
            e.preventDefault();
            e.stopPropagation();
            const tag = target.dataset.term;
            if (tag) {
                window.scrollActions.scrollToTagAndFlash('panel_term', tag, { behavior: 'smooth', stop: true });
            }
        }
    });

    window.Game.UI.loadTermColors = loadTermColors;
    window.Game.UI.injectTerm = injectTerm;
})();
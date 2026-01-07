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
    }

    function loadTermColors() {
        if (!window.endpoints || !window.fetchJsonCached) return;
        
        const load = (url) => {
            window.fetchJsonCached(url).then(data => {
                // Store all available parts for cross-referencing
                const globalParts = new Map();

                // First pass: Process raw data and populate globalParts
                for (let key in data) {
                    const item = data[key];
                    if (item.part && Array.isArray(item.part)) {
                        item.partMap = {};
                        item.part.forEach(p => {
                            if (p.en) {
                                item.partMap[p.en] = p;
                                globalParts.set(p.en, p);
                            }
                        });
                    } else if (item.part) {
                        // Handle case where part might be an object (legacy/different format)
                        item.partMap = item.part;
                        for (let pKey in item.part) {
                            const p = item.part[pKey];
                            if (p.en) globalParts.set(p.en, p);
                        }
                    }
                }

                // Second pass: Generate translations
                const processedKeys = new Set();

                // 1. Process explicit structure definitions (Priority)
                for (let key in termStructure) {
                    const partsList = termStructure[key];
                    
                    // Try to construct from global parts
                    const partTexts = partsList.map(pKey => {
                        const p = globalParts.get(pKey);
                        return p ? (p.replace || p.cn || '') : '';
                    });

                    if (partTexts.some(t => t)) {
                        const val = partTexts.join('');
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
                    
                    // 1. Load Colors
                    if (item.en && item.color) {
                        window.Game.UI.termColors.set(item.en, item.color);
                    }
                    
                    // 2. Load Translations
                    if (!processedKeys.has(item.en) && window.I18N_STRINGS && window.I18N_STRINGS.zh) {
                        let val = item.replace || item.cn;
                        if (item.en && val) {
                            injectTerm(item.en, val);
                        }
                    }

                    // 3. Load Part Colors & Simple Translations
                    if (item.partMap) {
                        for (let pKey in item.partMap) {
                            const part = item.partMap[pKey];
                            if (part.en && (part.color || item.color)) {
                                window.Game.UI.termColors.set(part.en, part.color || item.color);
                            }
                            // Inject part translation if available and not complex
                            if (part.en && (part.cn || part.replace)) {
                                const pVal = part.replace || part.cn;
                                injectTerm(part.en, pVal);
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

    window.Game.UI.loadTermColors = loadTermColors;
    window.Game.UI.injectTerm = injectTerm;
})();
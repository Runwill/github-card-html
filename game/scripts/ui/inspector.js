(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    const Inspector = {
        tooltip: null,
        initialized: false,
        lastHoveredTarget: null,
        lastMousePosition: { x: 0, y: 0 },

        init() {
            if (this.initialized) return;
            this.initialized = true;
            
            this.injectStyles();

            // 创建 tooltip 元素
            if (!this.tooltip) {
                this.tooltip = document.createElement('div');
                this.tooltip.id = 'game-inspector-tooltip';
                document.body.appendChild(this.tooltip);
            }

            // 全局事件代理
            document.addEventListener('mouseover', (e) => this.handleMouseOver(e));
            document.addEventListener('mouseout', (e) => this.handleMouseOut(e));
            document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            document.addEventListener('mousedown', (e) => this.handleLog(e), true);
            
            // Key Listeners for Toggle Behavior
            document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        },

        injectStyles() {
            if (document.getElementById('inspector-styles')) return;
            const style = document.createElement('style');
            style.id = 'inspector-styles';
            style.textContent = `
                #game-inspector-tooltip {
                    position: fixed;
                    padding: var(--inspector-pad-y, 8px) var(--inspector-pad-x, 12px);
                    border-radius: var(--inspector-radius, 4px);
                    font-size: var(--inspector-fs, 12px);
                    font-family: Consolas, Monaco, monospace;
                    pointer-events: none;
                    z-index: 20000;
                    display: none;
                    max-width: var(--inspector-max-w, 600px);
                    max-height: var(--inspector-max-h, 80vh);
                    overflow-y: hidden;
                    white-space: pre-wrap;
                    text-align: left;
                    line-height: 1.4;
                    
                    /* Light Mode Defaults */
                    background-color: rgba(255, 255, 255, 0.95);
                    color: #24292e; 
                    border: 1px solid #e1e4e8;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                
                #game-inspector-tooltip strong {
                    display: block;
                    margin-bottom: var(--inspector-title-mb, 5px);
                    padding-bottom: var(--inspector-title-pad-b, 2px);
                    border-bottom: 1px solid #e1e4e8;
                    color: #0366d6;
                }
                
                #game-inspector-tooltip strong span {
                    font-weight: normal; 
                    font-size: 0.9em;
                    color: #586069;
                }

                /* Dark Mode Overrides */
                html[data-theme="dark"] #game-inspector-tooltip {
                    background-color: rgba(20, 20, 20, 0.95);
                    color: #00ffaa;
                    border: 1px solid #444;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                }
                
                html[data-theme="dark"] #game-inspector-tooltip strong {
                    color: #fff;
                    border-bottom-color: #555;
                }
                
                html[data-theme="dark"] #game-inspector-tooltip strong span {
                    color: #aaa;
                }

                /* Elegant Mode Overrides */
                html[data-theme="elegant"] #game-inspector-tooltip {
                    background-color: rgba(11, 17, 21, 0.95);
                    color: #d3ad6b;
                    border: 1px solid rgba(211, 173, 107, 0.3);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                }
                html[data-theme="elegant"] #game-inspector-tooltip strong {
                    color: #e0e0e0;
                    border-bottom-color: rgba(211, 173, 107, 0.25);
                }
                html[data-theme="elegant"] #game-inspector-tooltip strong span {
                    color: rgba(224, 224, 224, 0.6);
                }
            `;
            document.head.appendChild(style);
        },
        
        handleLog(e) {
            // Log logic remains similar, but strictly depends on visibility or key state?
            // User requirement: "Hover + Hold Key to show". 
            // Logging usually implies it's visible. 
            if (this.currentData && this.tooltip.style.display !== 'none') {
                 // Check if it's Alt+Click? 
                 // The requirement said "Hold key (default Alt) to show".
                 // So if I am showing, Alt is likely held.
                 // So Click should trigger log.
                 console.log('[Inspector Log]', this.currentData);
                 if (this.tooltip) {
                    const originalColor = this.tooltip.style.borderColor;
                    this.tooltip.style.borderColor = '#fff';
                    setTimeout(() => {
                        this.tooltip.style.borderColor = originalColor;
                    }, 200);
                 }
            }
        },
        
        handleKeyDown(e) {
            if (this.lastHoveredTarget && window.KeySettings && window.KeySettings.checkBinding(e, 'inspect_details')) {
                // Key Pressed while hovering -> Show
                // Use last known mouse position since KeyboardEvent doesn't have coordinates
                this._resolveAndShow(this.lastHoveredTarget, this.lastMousePosition.x, this.lastMousePosition.y);
            }
        },

        handleMouseOver(e) {
            const target = e.target.closest('[data-inspector-type]');
            if (!target) return;
            
            this.lastHoveredTarget = target;
            this.lastMousePosition = { x: e.clientX, y: e.clientY };
            
            // Logic change: Do NOT show on hover, even if key is held.
            // Requirement: "For new hover object, need to press Alt again".
            // The tooltip remains hidden until the trigger key is pressed while hovering.
        },

        handleMouseOut(e) {
             const target = e.target.closest('[data-inspector-type]');
             if (target) {
                 if (!target.contains(e.relatedTarget)) {
                     this.lastHoveredTarget = null;
                     this.currentData = null;
                     this.hide();
                 }
             }
        },

        handleMouseMove(e) {
            this.lastMousePosition = { x: e.clientX, y: e.clientY };
            if (this.tooltip.style.display !== 'none') {
                 this.positionTooltip(e.clientX, e.clientY);
            }
        },
        
        positionTooltip(x, y) {
            const offset = 15;
            let left = x + offset;
            let top = y + offset;

            const rect = this.tooltip.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            if (left + rect.width > winW) {
                left = x - rect.width - offset;
            }
            if (top + rect.height > winH) {
                top = y - rect.height - offset;
            }
            
            if (top < 0) top = offset;

            this.tooltip.style.left = left + 'px';
            this.tooltip.style.top = top + 'px';
        },

        _resolveAndShow(target, x, y) {
            const type = target.getAttribute('data-inspector-type');
            if (!type) return;

            let data = null;
            let title = '';

            try {
                const Core = window.Game.Core;
                if (!Core || !Core.GameState) return;
                const GameState = Core.GameState;

                if (type === 'role') {
                    const id = parseInt(target.getAttribute('data-role-id'), 10);
                    data = GameState.players.find(p => p.id === id);
                    if (data) title = `Role: ${data.name}`;
                } 
                else if (type === 'card') {
                    const areaName = target.getAttribute('data-area-name');
                    const index = parseInt(target.getAttribute('data-card-index'), 10);
                    
                    let area = GameState[areaName];
                    
                    if (!area) {
                        const roleEl = target.closest('[data-inspector-type="role"]');
                        if (roleEl) {
                            const roleId = parseInt(roleEl.getAttribute('data-role-id'), 10);
                            const player = GameState.players.find(p => p.id === roleId);
                            if (player) area = player[areaName];
                        } else {
                            if (areaName === 'hand' || areaName === 'equipArea') {
                                const player = window.Game.UI.getMainPlayer ? window.Game.UI.getMainPlayer() : GameState.players[0]; 
                                if (player) area = player[areaName];
                            }
                        }
                    }

                    if (area && area.cards) {
                        data = area.cards[index];
                        title = `Card in ${area.name}`;
                    }
                }
                else if (type === 'area') {
                    const areaName = target.getAttribute('data-area-name');
                    if (GameState[areaName]) {
                        data = GameState[areaName];
                        title = `Area: ${areaName}`;
                    } else {
                        const roleEl = target.closest('[data-inspector-type="role"]');
                        if (roleEl) {
                            const roleId = parseInt(roleEl.getAttribute('data-role-id'), 10);
                            const player = GameState.players.find(p => p.id === roleId);
                            if (player) data = player[areaName];
                        } else {
                             const player = window.Game.UI.getMainPlayer ? window.Game.UI.getMainPlayer() : GameState.players[0];
                             if (player) data = player[areaName];
                        }
                        if (data) title = `Area: ${areaName}`;
                    }
                }
            } catch(err) {
                console.error("[Inspector] Error resolving data", err);
            }

            this.currentData = data; 

            if (data) {
                this.show(title, data, x, y);
            }
        },

        show(title, data, x, y) {
            const content = this.formatData(data);
            this.tooltip.innerHTML = `<strong>${title} <span>(Click logs to Console)</span></strong>${content}`;
            this.tooltip.style.display = 'block';
            this.positionTooltip(x, y);
        },

        hide() {
            this.tooltip.style.display = 'none';
        },

        formatData(data) {
            const cache = new Set();
            return JSON.stringify(data, (key, value) => {
                if (typeof value === 'object' && value !== null) {
                    if (cache.has(value)) {
                        return '[Circular]';
                    }
                    cache.add(value);
                }

                if (key === 'hand' || key === 'equipArea') {
                    if (value && value.cards) {
                        return `[Area: ${value.name} (${value.cards.length})]`;
                    }
                }
                
                if (Array.isArray(value)) {
                    if (value.length > 10 && typeof value[0] === 'string') {
                        return `[Array(${value.length})] - First few: ${value.slice(0, 3).join(', ')}...`;
                    }
                }

                if (value instanceof Set) {
                    return `[Set(${value.size})]`;
                }

                return value;
            }, 2);
        }
    };

    window.Game.UI.Inspector = Inspector;
})();

/**
 * Enhanced Three Kingdoms Rules Visualization JavaScript
 * Provides advanced semantic highlighting, tooltips, and interaction features
 */

class ThreeKingdomsRulesEnhancer {
    constructor() {
        this.tooltip = null;
        this.explanationPanel = null;
        this.semanticDatabase = {};
        this.currentHoveredElement = null;
        this.init();
    }

    init() {
        this.createTooltip();
        this.createExplanationPanel();
        this.createSearchEnhancement();
        this.enhanceSemanticElements();
        this.addKeyboardNavigation();
        this.addAccessibilityFeatures();
    }

    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip';
        this.tooltip.innerHTML = `
            <div class="tooltip-title"></div>
            <div class="tooltip-content"></div>
            <div class="tooltip-category"></div>
        `;
        document.body.appendChild(this.tooltip);
    }

    createExplanationPanel() {
        this.explanationPanel = document.createElement('div');
        this.explanationPanel.className = 'explanation-panel';
        this.explanationPanel.innerHTML = `
            <div class="panel-header">
                <h3 class="panel-title">词汇详解</h3>
                <button class="close-btn" onclick="rulesEnhancer.closeExplanationPanel()">&times;</button>
            </div>
            <div class="panel-content">
                <div class="selected-term">
                    <h4>选择一个术语查看详细解释</h4>
                    <p>鼠标悬浮在规则文本上的语义元素上，或双击查看详细说明。</p>
                </div>
            </div>
        `;
        document.body.appendChild(this.explanationPanel);
    }

    createSearchEnhancement() {
        // Add search functionality if it doesn't exist
        const header = document.querySelector('#header');
        if (header && !document.querySelector('.search-container')) {
            const searchContainer = document.createElement('div');
            searchContainer.className = 'search-container';
            searchContainer.innerHTML = `
                <i class="search-icon">🔍</i>
                <input type="text" class="search-input" placeholder="搜索规则术语..." 
                       oninput="rulesEnhancer.handleSearch(this.value)">
            `;
            header.appendChild(searchContainer);
        }
    }

    enhanceSemanticElements() {
        // Load semantic database from existing JSON files
        this.loadSemanticDatabase().then(() => {
            this.applySemanticEnhancements();
        });
    }

    async loadSemanticDatabase() {
        try {
            const [dynamicTerms, fixedTerms] = await Promise.all([
                fetch('base/term/dynamic.json').then(r => r.json()),
                fetch('base/term/fixed.json').then(r => r.json())
            ]);

            // Combine and categorize terms
            const allTerms = [...dynamicTerms, ...fixedTerms];
            
            allTerms.forEach(term => {
                const category = this.categorizeSemanticElement(term);
                this.semanticDatabase[term.en] = {
                    ...term,
                    category: category,
                    description: this.generateDescription(term, category)
                };
            });
        } catch (error) {
            console.error('Failed to load semantic database:', error);
        }
    }

    categorizeSemanticElement(term) {
        const termName = term.cn || term.en;
        
        // Time-related terms
        if (termName.includes('阶段') || termName.includes('时') || termName.includes('回合') || 
            termName.includes('开始') || termName.includes('结束') || termName.includes('前') || 
            termName.includes('后') || termName.includes('当')) {
            return 'timing';
        }
        
        // Restriction terms
        if (termName.includes('限') || termName.includes('次') || termName.includes('不能') || 
            termName.includes('只能') || termName.includes('必须')) {
            return 'restriction';
        }
        
        // Quantity terms
        if (termName.includes('数') || termName.includes('张') || termName.includes('个') || 
            termName.includes('名') || termName.includes('点') || /\d+/.test(termName)) {
            return 'quantity';
        }
        
        // Effect terms
        if (termName.includes('效果') || termName.includes('生效') || termName.includes('伤害') || 
            termName.includes('摸牌') || termName.includes('弃') || termName.includes('获得')) {
            return 'effect';
        }
        
        // Procedure terms
        if (termName.includes('程序') || termName.includes('流程') || termName.includes('事件') || 
            termName.includes('操作') || termName.includes('执行')) {
            return 'procedure';
        }
        
        // Role terms
        if (termName.includes('角色') || termName.includes('你') || termName.includes('其他') || 
            termName.includes('目标') || termName.includes('来源')) {
            return 'role';
        }
        
        // Card terms
        if (termName.includes('牌') || termName.includes('手牌') || termName.includes('装备') || 
            termName.includes('基本') || termName.includes('锦囊')) {
            return 'card';
        }
        
        return 'general';
    }

    generateDescription(term, category) {
        const categoryDescriptions = {
            timing: '时机元素 - 定义游戏事件发生的具体时点',
            restriction: '限制元素 - 规定行动的条件和限制',
            quantity: '数量元素 - 表示数值、数量或计数',
            effect: '效果元素 - 描述游戏动作的结果',
            procedure: '程序元素 - 定义游戏流程和操作步骤',
            role: '角色元素 - 涉及游戏中的角色和对象',
            card: '卡牌元素 - 与卡牌相关的概念',
            general: '通用元素 - 一般性的游戏术语'
        };

        let description = categoryDescriptions[category] || '游戏术语';
        
        if (term.cn && term.en !== term.cn) {
            description += `\n\n中文：${term.cn}`;
        }
        
        if (term.epithet && term.epithet.length > 0) {
            description += `\n别称：${term.epithet.map(e => e.cn).join('、')}`;
        }
        
        if (term.part && term.part.length > 0) {
            description += `\n\n包含以下部分：\n${term.part.map(p => `• ${p.cn}`).join('\n')}`;
        }
        
        return description;
    }

    applySemanticEnhancements() {
        Object.keys(this.semanticDatabase).forEach(termKey => {
            const term = this.semanticDatabase[termKey];
            const elements = document.querySelectorAll(termKey);
            
            elements.forEach(element => {
                if (!element.classList.contains('enhanced')) {
                    this.enhanceElement(element, term);
                }
            });
        });
    }

    enhanceElement(element, term) {
        element.classList.add('enhanced', 'semantic-element', `${term.category}-element`);
        
        // Add enhanced hover events
        element.addEventListener('mouseenter', (e) => this.handleElementHover(e, term));
        element.addEventListener('mouseleave', (e) => this.handleElementLeave(e, term));
        element.addEventListener('click', (e) => this.handleElementClick(e, term));
        
        // Add accessibility attributes
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
        element.setAttribute('aria-label', `${term.cn || term.en} - ${term.category}元素`);
    }

    handleElementHover(event, term) {
        this.currentHoveredElement = event.target;
        
        // Show tooltip
        this.showTooltip(event, term);
        
        // Highlight related elements
        this.highlightRelatedElements(term);
        
        // Add visual effects
        event.target.classList.add('animate-pulse');
    }

    handleElementLeave(event, term) {
        this.currentHoveredElement = null;
        
        // Hide tooltip
        this.hideTooltip();
        
        // Remove highlights
        this.removeHighlights();
        
        // Remove visual effects
        event.target.classList.remove('animate-pulse');
    }

    handleElementClick(event, term) {
        event.preventDefault();
        event.stopPropagation();
        
        // Show detailed explanation in panel
        this.showDetailedExplanation(term);
        
        // Add click animation
        event.target.classList.add('animate-fade-in-up');
        setTimeout(() => event.target.classList.remove('animate-fade-in-up'), 600);
    }

    showTooltip(event, term) {
        const titleEl = this.tooltip.querySelector('.tooltip-title');
        const contentEl = this.tooltip.querySelector('.tooltip-content');
        const categoryEl = this.tooltip.querySelector('.tooltip-category');
        
        titleEl.textContent = term.cn || term.en;
        contentEl.textContent = term.description.split('\n\n')[0];
        categoryEl.textContent = term.category === 'timing' ? '时机' :
                                term.category === 'restriction' ? '限制' :
                                term.category === 'quantity' ? '数量' :
                                term.category === 'effect' ? '效果' :
                                term.category === 'procedure' ? '程序' :
                                term.category === 'role' ? '角色' :
                                term.category === 'card' ? '卡牌' : '通用';
        
        // Position tooltip
        const rect = event.target.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        let top = rect.top - tooltipRect.height - 10;
        
        // Adjust if tooltip would go off screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        this.tooltip.style.left = left + 'px';
        this.tooltip.style.top = top + 'px';
        this.tooltip.classList.add('show');
    }

    hideTooltip() {
        this.tooltip.classList.remove('show');
    }

    highlightRelatedElements(term) {
        // Highlight elements of the same category
        const sameCategory = document.querySelectorAll(`.${term.category}-element`);
        sameCategory.forEach(el => {
            if (el !== this.currentHoveredElement) {
                el.style.opacity = '0.7';
                el.style.transform = 'scale(0.98)';
            }
        });
        
        // Special highlighting for related terms
        if (term.part) {
            term.part.forEach(part => {
                const relatedElements = document.querySelectorAll(part.en);
                relatedElements.forEach(el => {
                    el.style.boxShadow = '0 0 8px rgba(102, 126, 234, 0.6)';
                });
            });
        }
    }

    removeHighlights() {
        const allElements = document.querySelectorAll('.semantic-element');
        allElements.forEach(el => {
            el.style.opacity = '';
            el.style.transform = '';
            el.style.boxShadow = '';
        });
    }

    showDetailedExplanation(term) {
        const panelContent = this.explanationPanel.querySelector('.panel-content');
        panelContent.innerHTML = `
            <div class="selected-term animate-fade-in-up">
                <h4>${term.cn || term.en}</h4>
                <div class="term-category ${term.category}-element">${this.getCategoryDisplayName(term.category)}</div>
                <div class="term-description">
                    ${term.description.replace(/\n/g, '<br>')}
                </div>
                ${term.part ? `
                    <div class="term-parts">
                        <h5>组成部分：</h5>
                        <ul>
                            ${term.part.map(part => `<li><strong>${part.cn}</strong> (${part.en})</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${term.epithet ? `
                    <div class="term-epithets">
                        <h5>别称：</h5>
                        <p>${term.epithet.map(e => e.cn).join('、')}</p>
                    </div>
                ` : ''}
                <div class="related-terms">
                    <h5>相关术语：</h5>
                    <div class="related-list">
                        ${this.getRelatedTerms(term).map(relatedTerm => 
                            `<span class="related-term ${relatedTerm.category}-element" 
                                   onclick="rulesEnhancer.showDetailedExplanation(rulesEnhancer.semanticDatabase['${relatedTerm.en}'])">
                                ${relatedTerm.cn || relatedTerm.en}
                            </span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
        
        this.explanationPanel.classList.add('active');
    }

    getRelatedTerms(term) {
        const related = [];
        const allTerms = Object.values(this.semanticDatabase);
        
        // Find terms in the same category
        allTerms.forEach(otherTerm => {
            if (otherTerm.en !== term.en && 
                otherTerm.category === term.category && 
                related.length < 5) {
                related.push(otherTerm);
            }
        });
        
        return related;
    }

    getCategoryDisplayName(category) {
        const displayNames = {
            timing: '时机元素',
            restriction: '限制元素',
            quantity: '数量元素',
            effect: '效果元素',
            procedure: '程序元素',
            role: '角色元素',
            card: '卡牌元素',
            general: '通用元素'
        };
        return displayNames[category] || '未知类型';
    }

    closeExplanationPanel() {
        this.explanationPanel.classList.remove('active');
    }

    handleSearch(query) {
        if (!query.trim()) {
            this.clearSearchHighlights();
            return;
        }
        
        this.clearSearchHighlights();
        
        const matchingTerms = Object.values(this.semanticDatabase).filter(term => 
            (term.cn && term.cn.includes(query)) ||
            (term.en && term.en.toLowerCase().includes(query.toLowerCase())) ||
            (term.description && term.description.includes(query))
        );
        
        matchingTerms.forEach(term => {
            const elements = document.querySelectorAll(term.en);
            elements.forEach(el => {
                el.classList.add('search-highlight');
                el.style.animation = 'pulse 1s infinite';
            });
        });
        
        // Scroll to first match
        if (matchingTerms.length > 0) {
            const firstMatch = document.querySelector(matchingTerms[0].en);
            if (firstMatch) {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    clearSearchHighlights() {
        const highlighted = document.querySelectorAll('.search-highlight');
        highlighted.forEach(el => {
            el.classList.remove('search-highlight');
            el.style.animation = '';
        });
    }

    addKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // ESC to close explanation panel
            if (e.key === 'Escape') {
                this.closeExplanationPanel();
            }
            
            // Ctrl+F to focus search
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Arrow keys for navigation when element is focused
            if (document.activeElement.classList.contains('semantic-element')) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    document.activeElement.click();
                }
            }
        });
    }

    addAccessibilityFeatures() {
        // Add high contrast mode toggle
        const contrastToggle = document.createElement('button');
        contrastToggle.innerHTML = '🔍';
        contrastToggle.title = '切换高对比度模式';
        contrastToggle.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: #667eea;
            color: white;
            font-size: 16px;
            cursor: pointer;
            z-index: 1001;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        contrastToggle.addEventListener('click', () => {
            document.body.classList.toggle('high-contrast');
        });
        
        document.body.appendChild(contrastToggle);
        
        // Add screen reader announcements
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(announcer);
        this.announcer = announcer;
    }

    announce(message) {
        if (this.announcer) {
            this.announcer.textContent = message;
        }
    }
}

// Initialize the enhancer when DOM is loaded
let rulesEnhancer;
document.addEventListener('DOMContentLoaded', () => {
    rulesEnhancer = new ThreeKingdomsRulesEnhancer();
});

// Export for global access
window.rulesEnhancer = rulesEnhancer;
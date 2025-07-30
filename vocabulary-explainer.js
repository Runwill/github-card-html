/**
 * Vocabulary explanation generator for Three Kingdoms Rules
 * Automatically generates detailed explanations for rule terms
 */

class VocabularyExplainer {
    constructor() {
        this.explanationTemplates = {
            timing: {
                prefix: "这是一个时机术语，表示",
                examples: [
                    "在{term}时，玩家可以发动相应的技能",
                    "{term}是游戏流程中的关键节点"
                ]
            },
            restriction: {
                prefix: "这是一个限制术语，用于",
                examples: [
                    "{term}限制了玩家的行动次数",
                    "符合{term}条件才能执行相应动作"
                ]
            },
            quantity: {
                prefix: "这是一个数量术语，指",
                examples: [
                    "{term}表示具体的数值大小",
                    "游戏中的{term}影响策略选择"
                ]
            },
            effect: {
                prefix: "这是一个效果术语，描述",
                examples: [
                    "{term}是游戏中的重要动作",
                    "执行{term}会改变游戏状态"
                ]
            },
            procedure: {
                prefix: "这是一个程序术语，定义",
                examples: [
                    "{term}规定了游戏的执行流程",
                    "{term}是游戏机制的重要组成"
                ]
            },
            role: {
                prefix: "这是一个角色术语，指代",
                examples: [
                    "{term}在技能描述中表示特定角色",
                    "理解{term}的含义对游戏很重要"
                ]
            },
            card: {
                prefix: "这是一个卡牌术语，表示",
                examples: [
                    "{term}是游戏中的重要资源",
                    "合理使用{term}是制胜关键"
                ]
            }
        };
        
        this.contextualExplanations = {
            "出牌阶段": {
                breakdown: ["出牌", "阶段"],
                explanation: "出牌 + 阶段 = 可以打出卡牌的游戏时段",
                details: "这是每个角色回合中最重要的阶段，玩家可以：使用基本牌、装备牌、锦囊牌，发动主动技能，进行各种游戏操作。"
            },
            "限一次": {
                breakdown: ["限", "一", "次"],
                explanation: "限制 + 数量(一) + 单位(次) = 只能执行一次",
                details: "这种限制确保了游戏的平衡性，防止某些强力效果被过度使用。"
            },
            "摸牌": {
                breakdown: ["摸", "牌"],
                explanation: "动作(摸) + 对象(牌) = 从牌堆获得卡牌",
                details: "摸牌是获得手牌资源的主要途径，通常从牌堆顶部获得，增加手牌数量。"
            },
            "造成伤害": {
                breakdown: ["造成", "伤害"],
                explanation: "动作(造成) + 效果(伤害) = 使目标失去体力",
                details: "伤害是游戏中的重要机制，会减少目标的体力值，可能导致角色濒死。"
            }
        };
    }

    explainTerm(termData) {
        const termName = termData.cn || termData.en;
        const category = termData.category || 'general';
        
        let explanation = {
            basic: this.generateBasicExplanation(termName, category),
            detailed: this.generateDetailedExplanation(termData),
            breakdown: this.generateBreakdown(termName),
            usage: this.generateUsageExamples(termData),
            related: this.findRelatedTerms(termData)
        };
        
        return explanation;
    }

    generateBasicExplanation(termName, category) {
        const template = this.explanationTemplates[category] || this.explanationTemplates.general;
        return `${template.prefix}${this.getCategoryDescription(category)}。`;
    }

    generateDetailedExplanation(termData) {
        if (this.contextualExplanations[termData.cn]) {
            return this.contextualExplanations[termData.cn];
        }

        let explanation = {
            breakdown: this.analyzeTermStructure(termData.cn || termData.en),
            explanation: this.generateLogicalExplanation(termData),
            details: this.generateContextualDetails(termData)
        };

        return explanation;
    }

    analyzeTermStructure(term) {
        // Analyze Chinese term structure
        const commonElements = {
            '阶段': '游戏流程的特定时段',
            '限': '限制、约束',
            '次': '次数单位',
            '牌': '卡牌',
            '摸': '获得、拿取',
            '弃': '丢弃、放下',
            '造成': '产生、引起',
            '受到': '承受、遭受',
            '伤害': '损失体力的效果',
            '你': '技能拥有者',
            '目标': '被选择的对象',
            '角色': '游戏参与者',
            '手牌': '持有的卡牌',
            '装备': '提供能力的道具',
            '体力': '生命值'
        };

        let breakdown = [];
        for (let element in commonElements) {
            if (term.includes(element)) {
                breakdown.push({
                    part: element,
                    meaning: commonElements[element]
                });
            }
        }

        return breakdown;
    }

    generateLogicalExplanation(termData) {
        const termName = termData.cn || termData.en;
        
        // Pattern matching for common term structures
        if (termName.includes('阶段')) {
            return `${termName.replace('阶段', '')} + 阶段 = 游戏中进行${termName.replace('阶段', '')}相关操作的时间段`;
        }
        
        if (termName.includes('限') && termName.includes('次')) {
            const number = termName.match(/限(.+)次/);
            if (number) {
                return `限制 + ${number[1]} + 次 = 在特定条件下只能执行${number[1]}次`;
            }
        }
        
        if (termName.includes('摸') && termName.includes('牌')) {
            return `动作(摸) + 对象(牌) = 从牌堆获得卡牌到手牌`;
        }
        
        if (termName.includes('弃') && termName.includes('牌')) {
            return `动作(弃) + 对象(牌) = 将卡牌放入弃牌堆`;
        }
        
        return `${termName}是${this.getCategoryDescription(termData.category)}相关的重要概念`;
    }

    generateContextualDetails(termData) {
        const category = termData.category;
        const termName = termData.cn || termData.en;
        
        const detailTemplates = {
            timing: `${termName}在游戏流程中起到重要的节点作用，玩家需要在合适的${termName}发动技能或执行操作。掌握${termName}的时机对于策略规划非常重要。`,
            
            restriction: `${termName}是游戏平衡机制的重要组成部分，通过限制某些行动的频率或条件，确保游戏的公平性和策略性。理解${termName}有助于更好地规划行动。`,
            
            quantity: `${termName}表示游戏中的具体数值，这些数值直接影响游戏的进程和结果。准确计算和管理${termName}是获得优势的关键。`,
            
            effect: `${termName}是游戏中的核心动作之一，会直接改变游戏状态。熟练掌握${termName}的使用时机和目标选择，对游戏胜负有重要影响。`,
            
            procedure: `${termName}定义了游戏的执行规则和流程，是游戏机制的基础。理解${termName}的具体执行步骤，有助于准确进行游戏操作。`,
            
            role: `${termName}在游戏描述中用于指代特定的角色对象，明确${termName}的含义对于正确理解技能效果和规则条件至关重要。`,
            
            card: `${termName}是游戏中的重要资源，合理管理和使用${termName}是制胜的关键。了解${termName}的特性和使用方法，能显著提升游戏水平。`
        };
        
        return detailTemplates[category] || `${termName}是游戏中的重要概念，需要在实践中逐步理解和掌握。`;
    }

    generateUsageExamples(termData) {
        const termName = termData.cn || termData.en;
        
        // Generate context-aware examples
        const examples = [];
        
        if (termData.part) {
            // For compound terms, show how parts combine
            const parts = termData.part.map(p => p.cn).join(' + ');
            examples.push(`完整表达：${parts}`);
        }
        
        // Add category-specific examples
        switch (termData.category) {
            case 'timing':
                examples.push(`"${termName}，你可以发动技能"`);
                examples.push(`"当${termName}时，执行以下效果"`);
                break;
            case 'restriction':
                examples.push(`"${termName}：使用【杀】"`);
                examples.push(`"符合${termName}的条件"`);
                break;
            case 'quantity':
                examples.push(`"造成${termName}伤害"`);
                examples.push(`"摸${termName}牌"`);
                break;
            case 'effect':
                examples.push(`"${termName}一张手牌"`);
                examples.push(`"对目标${termName}"`);
                break;
            case 'role':
                examples.push(`"${termName}选择一名角色"`);
                examples.push(`"${termName}成为此牌的目标"`);
                break;
            case 'card':
                examples.push(`"一张${termName}"`);
                examples.push(`"将${termName}置入弃牌堆"`);
                break;
        }
        
        return examples;
    }

    findRelatedTerms(termData) {
        // This would typically query the semantic database
        // For now, return some predefined related terms based on category
        const relatedByCategory = {
            timing: ['出牌阶段', '回合开始时', '回合结束时'],
            restriction: ['限一次', '限两次', '不能'],
            quantity: ['一点', '一张', '一名'],
            effect: ['摸牌', '弃牌', '造成伤害'],
            procedure: ['程序', '流程', '事件'],
            role: ['你', '目标', '其他角色'],
            card: ['手牌', '装备牌', '基本牌']
        };
        
        return relatedByCategory[termData.category] || [];
    }

    getCategoryDescription(category) {
        const descriptions = {
            timing: '时机控制',
            restriction: '行动限制',
            quantity: '数值计算',
            effect: '游戏效果',
            procedure: '执行流程',
            role: '角色指代',
            card: '卡牌管理',
            general: '游戏机制'
        };
        
        return descriptions[category] || '游戏概念';
    }
}

// Export the class
window.VocabularyExplainer = VocabularyExplainer;
(function() {
    window.Game = window.Game || {};
    window.Game.Models = window.Game.Models || {};

    // 卡牌类
    class Card {
        constructor(name, type, suit = 'none', number = 0, id = null) {
            this.name = name;
            this.type = type; // 'basic', 'kit', 'delay-kit'
            this.suit = suit; // 'spade', 'heart', 'club', 'diamond'
            this.number = number; // 1-13
            this.id = id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 运行时状态
            this.lyingArea = null; // 当前所在的区域 (Area对象)
            this.visibility = 0; // 0: Visible (Generic), 1: Invisible (Generic Private)
            this.visibleTo = new Set(); // Specifically visible to these Role IDs
        }

        // 工厂方法：生成标准测试牌堆
        static generateStandardDeck(size = 80) {
            const types = ['attack', 'dodge', 'peach', 'wine'];
            const deck = [];
            for (let i = 0; i < size; i++) {
                deck.push(new Card(types[i % types.length]));
            }
            return deck;
        }
    }

    // 区域类
    class Area {
        constructor(name, options = {}) {
            this.name = name;
            this.cards = []; // 区域内的对象
            this.owner = options.owner || null; // 拥有此区域的角色
            
            // 默认选项
            this.visible = options.visible || new Set(); // 可以看到该区域卡牌的角色
            this.forOrAgainst = options.forOrAgainst !== undefined ? options.forOrAgainst : Area.Configs.Generic.forOrAgainst; 
            this.verticalOrHorizontal = options.verticalOrHorizontal !== undefined ? options.verticalOrHorizontal : Area.Configs.Generic.verticalOrHorizontal; 
            this.apartOrTogether = options.apartOrTogether !== undefined ? options.apartOrTogether : Area.Configs.Generic.apartOrTogether; 
            this.centered = options.centered !== undefined ? options.centered : Area.Configs.Generic.centered;
        }

        add(card) {
            this.cards.push(card);
        }

        remove(card) {
            const index = this.cards.indexOf(card);
            if (index > -1) {
                this.cards.splice(index, 1);
            }
        }

        removeAt(index) {
            if (index > -1 && index < this.cards.length) {
                this.cards.splice(index, 1);
            }
        }
    }

    // 静态配置定义，用于统一管理不同类型区域的默认属性
    Area.Configs = {
        // 0: 友方/通用, 1: 敌方/特定
        // 0: 垂直, 1: 水平
        // 0: 分开(独立，平铺), 1: 聚合(堆叠)
        // 0: 靠左(默认), 1: 居中
        
        Generic:        { apartOrTogether: 0, forOrAgainst: 0, verticalOrHorizontal: 0, centered: 0 },
        
        // 公共区域
        Pile:           { apartOrTogether: 1, forOrAgainst: 1 }, // 牌堆：堆叠
        DiscardPile:    { apartOrTogether: 1, forOrAgainst: 0 }, // 弃牌堆：堆叠
        TreatmentArea:  { apartOrTogether: 0, forOrAgainst: 0, centered: 1 }, 
        
        // 玩家区域
        Hand:           { apartOrTogether: 0, forOrAgainst: 1 }, 
        EquipArea:      { apartOrTogether: 0, forOrAgainst: 0 }, 
        JudgeArea:      { apartOrTogether: 0, forOrAgainst: 0 }, 
    };

    // 玩家类
    class Player {
        constructor(config, index) {
            // 混入配置数据 (保留原始属性如 skills, gender, country 等)
            Object.assign(this, config);

            // 基础属性
            this.id = index;
            this.characterId = config.characterId || config.id;
            this.name = config.name || `Player ${index + 1}`;
            
            // 头像处理：配置 > Position关联 > 默认(朱雀)
            if (config.avatar) {
                this.avatar = config.avatar;
            } else if (config.position) {
                // 如果有 position (如 '青龙_君主'), 自动关联到 'source/青龙.png'
                // 移除 _君主 后缀
                const cleanName = config.position.replace(/_君主$/, '');
                this.avatar = `source/${cleanName}.png`;
            } else {
                // 彻底没有头像时的默认值
                this.avatar = 'source/朱雀.png';
            }

            this.seat = index + 1;
            
            // 状态属性
            this.liveStatus = true;
            this.isActing = false; // 是否当前行动
            this.status = []; // 状态列表 (e.g. 翻面, 连锁)
            
            // 数值属性
            this.health = config.hp !== undefined ? config.hp : 4;
            this.healthLimit = config.maxHp !== undefined ? config.maxHp : 4;
            this.handLimit = this.health; // 默认手牌上限等于体力
            this.reach = 1; // 攻击距离
            
            // 区域
            // 注意：依赖 Area.Configs 已定义
            const Area = window.Game.Models.Area;
            this.hand = new Area('hand', Area.Configs.Hand);
            this.equipArea = new Area('equipArea', Area.Configs.EquipArea);
            this.judgeArea = new Area('judgeArea', Area.Configs.JudgeArea);

            this.hand.owner = this;
            this.equipArea.owner = this;
            this.judgeArea.owner = this;
            
            // 默认可见性设置
            // 手牌自己可见
            this.hand.visible.add(this);
        }

        /**
         * 从指定区域抽牌
         * @param {Area} fromArea - 来源区域（通常是牌堆）
         * @param {number} count - 数量
         */
        drawCards(fromArea, count) {
            for (let i = 0; i < count; i++) {
                if (fromArea.cards.length > 0) {
                    const card = fromArea.cards.pop();
                    card.lyingArea = this.hand;
                    this.hand.add(card);
                } else {
                    console.warn(`[Player] ${this.name} tried to draw ${count} cards but source is empty.`);
                    break;
                }
            }
        }
    }

    window.Game.Models.Card = Card;
    window.Game.Models.Area = Area;
    window.Game.Models.Player = Player;

})();

// Ensure Hand always has visibility=0 initially if not set
(function() {
    if (window.Game && window.Game.Models && window.Game.Models.Area && window.Game.Models.Area.Configs && window.Game.Models.Area.Configs.Hand) {
        window.Game.Models.Area.Configs.Hand.forOrAgainst = 0;
    }
})();


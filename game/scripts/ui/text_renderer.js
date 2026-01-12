(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    /**
     * GameText - 统一游戏文本渲染器
     * 
     * 职责:
     * 1. 生成包含语义标签的 HTML 字符串（例如 <round>）
     * 2. 将动态数据注入模板（例如 "Round {n}"）
     * 3. 依赖全局 term.js/MutationObserver 激活交互。
     */
    const GameText = {
        
        // 模板注册表 - 可通过配置扩展
        templates: {
            // 示例:
            'Round': '第 {n} <round></round>', 
            // 未知键的默认回退仅为 <Key></Key>
        },

        config: {
            useI18n: true
        },

        /**
         * 为给定的键和数据渲染 HTML 字符串。
         * 用法: GameText.render('Round', {n: 1}) -> "第 1 <round></round>"
         */
        render(key, data = {}) {
            let template = this.getTemplate(key);
            
            // 格式化数据：将 {key} 替换为值
            return template.replace(/\{(\w+)\}/g, (match, p1) => {
                return data[p1] !== undefined ? data[p1] : match;
            });
        },

        /**
         * 获取模板字符串。
         * 优先级:
         * 1. 明确在 `templates` 中注册的模板
         * 2. i18n 查找（如果启用）
         * 3. 自动生成："<Key></Key>"（如果键看起来像一个术语）
         * 4. 原始文本
         */
        getTemplate(key) {
            // 1. 已注册模板
            if (this.templates[key]) {
                return this.templates[key];
            }

            // 2. I18N 查找
            if (this.config.useI18n && window.i18n) {
                // 检查 i18n 是否直接包含此键（例如 'game.text.Round'）
                const i18nKey = `game.text.${key}`;
                if (window.i18n.exists && window.i18n.exists(i18nKey)) {
                    return window.i18n.t(i18nKey);
                }
                // 检查遗留键（game.round -> "第 {n} 轮"）
                // 我们可能需要迁移这些通过使用标签。
            }

            // 3. 回退：假设它是一个 Term 标签
            // 转换为小驼峰或帕斯卡命名法？
            // term.js 期望 TAG NAME 与 `en` 属性匹配（HTML 中通常不区分大小写，但 map 使用大写）
            // 如果键是 'Turn'，标签为 <Turn> 或 <turn>
            return `<${key}></${key}>`;
        },

        /**
         * 将文本挂载到容器中。
         * 这会触发 term.js 中的 MutationObserver
         */
        mount(container, key, data = {}) {
            if (!container) return;
            const html = this.render(key, data);
            container.innerHTML = html;
        },

        /**
         * 注册/覆盖模板
         */
        registerTemplates(map) {
            Object.assign(this.templates, map);
        }
    };

    // 预注册已知的复杂模板
    // 这些使用术语数据中定义的语义标签
    GameText.registerTemplates({
        'Round': '第 {n} <round></round>',
        'Turn': '<turn></turn>', 
        // 注册武将术语模板
        // 前端生成方式参考: <characterName class="characterID{id}"></characterName>
        'Character': '<characterName class="characterID{id}">{name}</characterName>'
    });

    // 暴露
    window.Game.UI.GameText = GameText;

})();
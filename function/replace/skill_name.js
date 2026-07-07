window.replace_skill_name = function replace_skill_name(path, paragraphs = document){
  // 返回 Promise，供进度条与启动流程感知完成时机
  return fetchJsonCached(path).then(skill => {
        const dataKey = 'skillProcessed';
        // 1. 准备数据
        // 过滤出有 role 的技能名用于类名匹配 (replacement)
        const validSkillNames = new Set(
            skill.filter(s => s && s.role).map(s => s.name)
        );
        const skillByName = new Map();
        skill.forEach(s => {
            if (s && s.role && s.name && !skillByName.has(s.name)) skillByName.set(s.name, s);
        });
        // 核心处理函数（dom 操作与事件绑定）
        const processor = (node) => {
             const $node = $(node);
             const classList = node.classList;
             
             // 遍历类名进行匹配
             for (let i = 0; i < classList.length; i++) {
                 const cls = classList[i];

                 // CASE A: 基础技能名替换
                 if (validSkillNames.has(cls)) {
                     const name = cls;
                     // 写入文本
                     $node.html(name);
                     // 绑定
                     bindDblclickAndHighlight($node, {
                        onDblclick: (event, el) => {
                            scrollActions.scrollToClassAndFlash('panel_skill', name, { behavior: 'smooth', stop: true });
                        },
                        scrollSelector: '.' + name + '.scroll',
                        highlightColor: '#df90ff'
                     });
                     window.bindTokenDetailOpen?.($node, { collection: 'skill', id: skillByName.get(name)?._id });
                 }
             }
        };

        // 手动检查函数：只筛选包含特定 class 的节点
        // 这对于 replace_common.js 的 "Fallback 全扫" 模式至关重要
        // 只对通过检查的节点设置 data-skillProcessed="true" 并调用 processor
        const manualCheck = (node) => {
            if (!node.classList || !node.classList.length) return false;
            // 快速扫描
            for (let i = 0; i < node.classList.length; i++) {
                const cls = node.classList[i];
                if (validSkillNames.has(cls)) return true;
            }
            return false;
        };

        // 统一调用通用扫描器
        // 自动处理了：初始扫描、MutationObserver、去重检测 (dataKey)
        scanAndObserve({
            root: paragraphs,
            processor: processor,
            dataKey: dataKey,
            manualCheck: manualCheck,
            // 技能名没有特定的 TagName 或简单的选择器，所以利用 manualCheck + fallback 遍历
        });
  })
};

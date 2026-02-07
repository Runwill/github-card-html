function replace_skill_name(path, paragraphs = document){
  // 返回 Promise，供进度条与启动流程感知完成时机
  return fetchJsonCached(path).then(skill => {
        const dataKey = 'skillProcessed';
        // 1. 准备数据
        // 过滤出有 role 的技能名用于类名匹配 (replacement)
        const validSkillNames = new Set(
            skill.filter(s => s && s.role).map(s => s.name)
        );
        // 全量映射 name -> skill (用于查找 Lore)
        const nameToSkill = new Map();
        skill.forEach(s => {
            if(s && s.name) {
                 if (!nameToSkill.has(s.name)) nameToSkill.set(s.name, s);
            }
        });

        // Tooltip 单例初始化
        if (!window._loreTooltipAppended) {
            window._loreTooltipAppended = true;
            $('body').append('<div id="lore-tooltip" aria-hidden="true"></div>');
        }
        const $tooltip = $('#lore-tooltip');

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
                            const className = el.classList[0]; // 保持原有逻辑取第一个类
                            scrollActions.scrollToClassAndFlash('panel_skill', className, { behavior: 'smooth', stop: true });
                        },
                        scrollSelector: '.' + name + '.scroll',
                        highlightColor: '#df90ff'
                     });
                 }
                 
                 // CASE B: Lore Tooltip 绑定
                 // 格式: {name}LoreCharacterID{id}
                 if (cls.includes('LoreCharacterID')) {
                     const match = cls.match(/^(.+)LoreCharacterID(\d+)$/);
                     if (match) {
                         const name = match[1];
                         const rid = parseInt(match[2], 10);
                         
                         if (nameToSkill.has(name)) {
                             const skObj = nameToSkill.get(name);
                             // 查找 role 索引
                             let roleIdx = -1;
                             if(skObj.role) {
                                 for(let k=0; k<skObj.role.length; k++) {
                                     if(skObj.role[k].id == rid) {
                                         roleIdx = k;
                                         break;
                                     }
                                 }
                             }

                             if (roleIdx !== -1) {
                                 // 设置属性
                                 $node.prop('loreSkillPosition', skill.indexOf(skObj));
                                 $node.prop('loreRolePosition', roleIdx);

                                 // 绑定事件 (直接复用原有逻辑)
                                 $node.on('mouseenter', function () {
                                    const sIdx = $(this).prop('loreSkillPosition')
                                    const rIdx = $(this).prop('loreRolePosition')
                                    const loreData = skill[sIdx].role[rIdx]
                                    const loreText = '「' + loreData.lore + '」——《' + loreData.legend + '》'
            
                                    const rect = this.getBoundingClientRect()
                                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
                                    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
                                    const viewportWidth = window.innerWidth
            
                                    let left = rect.left + scrollLeft + rect.width / 2
                                    let top = rect.bottom + scrollTop + 8
                                    let placement = 'bottom'
                                    const margin = 12
            
                                    $tooltip
                                      .removeClass('show')
                                      .attr('aria-hidden', 'true')
                                      .html(loreText)
                                      .css({ visibility: 'hidden', display: 'block', left: '-9999px', top: '-9999px' })
            
                                    let tipWidth = $tooltip.outerWidth()
                                    let tipHeight = $tooltip.outerHeight()
            
                                    left = Math.min(
                                      Math.max(left - tipWidth * 0.15, scrollLeft + margin),
                                      scrollLeft + viewportWidth - tipWidth - margin
                                    )
            
                                    const availableWidth = viewportWidth - 2 * margin
                                    if (tipWidth > availableWidth) {
                                      $tooltip.css({ 'max-width': availableWidth + 'px', 'white-space': 'normal' })
                                      tipWidth = $tooltip.outerWidth()
                                      tipHeight = $tooltip.outerHeight()
                                      left = Math.min(
                                        Math.max(rect.left + scrollLeft + rect.width / 2 - tipWidth * 0.15, scrollLeft + margin),
                                        scrollLeft + viewportWidth - tipWidth - margin
                                      )
                                    }
            
                                    if (top + tipHeight > window.innerHeight + scrollTop - margin) {
                                      top = rect.top + scrollTop - tipHeight - 12
                                      placement = 'top'
                                    }
            
                                    const tooltipCenterX = left + tipWidth / 2 - scrollLeft
                                    const viewportCenterX = viewportWidth / 2
                                    const fromLeft = tooltipCenterX > viewportCenterX
            
                                    $tooltip.removeClass('from-left from-right')
                                    $tooltip
                                      .attr('data-placement', placement)
                                      .css({ left: left + 'px', top: top + 'px', visibility: 'visible' })
                                      .each(function(){ this.style.removeProperty('opacity'); this.style.removeProperty('transform'); })
                                      .addClass(fromLeft ? 'from-left' : 'from-right')
                                      .addClass('show')
                                      .attr('aria-hidden', 'false')
                                })
                                $node.on('mouseleave', function () {
                                    $tooltip.removeClass('show from-left from-right').attr('aria-hidden', 'true')
                                });
                             }
                         }
                     }
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
                if (cls.includes('LoreCharacterID')) {
                     const match = cls.match(/^(.+)LoreCharacterID(\d+)$/);
                     if(match) {
                        const name = match[1];
                        if (nameToSkill.has(name)) {
                             const rid = parseInt(match[2], 10);
                             const skObj = nameToSkill.get(name);
                             if(skObj.role && skObj.role.some(r => r.id === rid)) {
                                 return true;
                             }
                        }
                     }
                }
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
}

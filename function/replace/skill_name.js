// 添加自定义缓动函数以增强tooltip动画效果
if (typeof jQuery !== 'undefined') {
    jQuery.extend(jQuery.easing, {
        easeOutBack: function (x, t, b, c, d, s) {
            if (s == undefined) s = 1.70158;
            return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
        },
        easeInQuad: function (x, t, b, c, d) {
            return c*(t/=d)*t + b;
        }
    });
}

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

        // 单节点处理函数
        const processNode = (node) => {
             // 避免重复处理
             if (node.dataset[dataKey]) return;

             const $node = $(node);
             const classList = node.classList;
             let processed = false;

             // 遍历类名进行匹配
             // 注意: 一个节点可能既是技能名也是 Lore 触发器 (理论上分离, 但防御性编程)
             // 考虑到 classList 是类数组对象
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
                     processed = true;
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
                                processed = true;
                             }
                         }
                     }
                 }
             }

             if(processed) node.dataset[dataKey] = "true";
        };

        // 初始查找与处理
        // 查找所有可能的技能名类
        validSkillNames.forEach(name => {
             const $els = $(paragraphs).find('.' + name);
             $els.each(function(){ processNode(this); });
        });
        // 查找所有可能的 Lore 类 (从 Maps 推导较慢, 不如直接用包含选择器)
        // 使用属性选择器或模糊查询太慢，但我们知道它一定是类。
        // 原逻辑是构建明确的选择器。
        // 这里我们可以遍历所有带 LoreCharacterID 的类? 不, DOM query is hard.
        // 反向: 遍历 nameToSkill -> role -> id, 构建 selector.
        nameToSkill.forEach((skObj, name) => {
             if(skObj.role) {
                 skObj.role.forEach(r => {
                      const rid = r.id;
                      const selector = '.' + name + 'LoreCharacterID' + rid;
                      $(paragraphs).find(selector).each(function(){ processNode(this); });
                 });
             }
        });

        // 动态监听
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { 
                                 processNode(node); 
                                 // 深度扫描子节点?
                                 // 由于我们无法用通用选择器一次性选中所有 skill/lore classes,
                                 // 这里需要一种高效方式。
                                 // 1. 扫描所有技能名
                                 validSkillNames.forEach(name => {
                                     $(node).find('.' + name).each(function(){ processNode(this); });
                                 });
                                 // 2. 扫描 lore class?
                                 // 如果 lore 类很多, 循环查找会很慢。
                                 // 优化: 查找所有包含 "LoreCharacterID" 字符的类? jQuery 没有 regex selector.
                                 // 保守策略: 重复上面的 "构建所有可能 selector" 太重了。
                                 // 假设动态插入通常是整块 HTML。
                                 // 我们可以依赖上面的 "构建选择器" 逻辑范围缩小到 node.
                                 
                                 nameToSkill.forEach((skObj, name) => {
                                     if(skObj.role) {
                                         skObj.role.forEach(r => {
                                              const rid = r.id;
                                              const selector = '.' + name + 'LoreCharacterID' + rid;
                                              $(node).find(selector).each(function(){ processNode(this); });
                                         });
                                     }
                                });
                            }
                        });
                    }
                });
            });
            const targetNode = (paragraphs === document) ? document.body : paragraphs;
            if(targetNode) observer.observe(targetNode, { childList: true, subtree: true });
            if(!window.skillObservers) window.skillObservers = [];
            window.skillObservers.push(observer);
        }
  })
}
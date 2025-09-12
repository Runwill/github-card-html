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
    fetch(path).then(response => response.json()).then(skill => {
        //获取技能名并排序
        let skillNames = []
        for (var i in skill) {
            if (skill[i].role) skillNames.push(skill[i].name)
        }
        skillNames.sort()

        for (var i in skillNames) {//技能名i
            element = $(paragraphs).find("." + skillNames[i])

            element.each(function() { // 替换和滚动
                $(this).html(skillNames[i]).on("dblclick", function(event) {
                    event.stopPropagation()
                    const className = event.currentTarget.classList[0]
                    scrollActions.scrollToClassAndFlash('panel_skill', className, { behavior: 'smooth', stop: true })
                })
            })
            
            // 使用统一的高亮函数
            const scrollSelector = "." + skillNames[i] + ".scroll"
            addStandardHighlight(element, "#df90ff", scrollSelector)
            for (var j in skill) {//不同武将的技能名悬浮个性化文本
                if (skill[j].name == skillNames[i]) {
                    for (k in skill[j].role) {
                        element = $(paragraphs).find('.' + skillNames[i] + 'LoreCharacterID' + skill[j].role[k].id)
                        element.prop('loreSkillPosition', j)
                        element.prop('loreRolePosition', k)

                        // 只创建一次tooltip并复用（使用全局样式类，移除内联样式依赖）
                        if (!window._loreTooltipAppended) {
                            window._loreTooltipAppended = true;
                            $('body').append('<div id="lore-tooltip" aria-hidden="true"></div>');
                        }
                        const $tooltip = $('#lore-tooltip');

                        element.on('mouseenter', function () {
                            const loreText = '「' + skill[$(this).prop('loreSkillPosition')].role[$(this).prop('loreRolePosition')].lore + '」——《' + skill[$(this).prop('loreSkillPosition')].role[$(this).prop('loreRolePosition')].legend + '》';
                            
                            // 获取目标元素在页面上的位置和宽度
                            const rect = this.getBoundingClientRect();
                            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                            const viewportWidth = window.innerWidth;
                            
                            // 计算最佳位置 - 默认居中显示在元素下方
                            let left = rect.left + scrollLeft + rect.width / 2;
                            let top = rect.bottom + scrollTop + 8; // 无箭头时更贴近元素
                            let placement = 'bottom';
                            const margin = 12;

                            // 先写入内容并进行测量（仅使用 visibility 隐藏，避免 inline 覆盖 CSS 动画）
                            $tooltip
                                .removeClass('show')
                                .attr('aria-hidden', 'true')
                                .html(loreText)
                                .css({
                                    visibility: 'hidden',
                                    display: 'block',
                                    left: '-9999px',
                                    top: '-9999px'
                                });

                            let tipWidth = $tooltip.outerWidth();
                            let tipHeight = $tooltip.outerHeight();

                            // 左右边界检测：按中心 - 宽度的 15% 进行对齐（偏向左侧展示更多内容）
                            left = Math.min(
                                Math.max(left - tipWidth * 0.15, scrollLeft + margin),
                                scrollLeft + viewportWidth - tipWidth - margin
                            );

                            // 如果超出可视宽度（即使已经尽量贴边），启用自适应：限制最大宽度并允许换行
                            const availableWidth = viewportWidth - 2 * margin;
                            if (tipWidth > availableWidth) {
                                $tooltip.css({ 'max-width': availableWidth + 'px', 'white-space': 'normal' });
                                tipWidth = $tooltip.outerWidth();
                                tipHeight = $tooltip.outerHeight();
                                left = Math.min(
                                    Math.max(rect.left + scrollLeft + rect.width / 2 - tipWidth * 0.15, scrollLeft + margin),
                                    scrollLeft + viewportWidth - tipWidth - margin
                                );
                            }

                            // 上下边界检测 - 如果下方空间不够，显示在上方
                            if (top + tipHeight > window.innerHeight + scrollTop - margin) {
                                top = rect.top + scrollTop - tipHeight - 12;
                                placement = 'top';
                            }

                            // 根据 tooltip 相对视口的水平位置选择进入方向类
                            const tooltipCenterX = left + tipWidth / 2 - scrollLeft;
                            const viewportCenterX = viewportWidth / 2;
                            const fromLeft = tooltipCenterX > viewportCenterX; // 右侧区域 -> 从左略入

                            // 先清理方向类，后续再按需添加
                            $tooltip.removeClass('from-left from-right');

                            // 定位并显示（通过 class 触发 CSS 过渡），确保移除会干扰动画的 inline 样式
                            $tooltip
                                .attr('data-placement', placement)
                                .css({ left: left + 'px', top: top + 'px', visibility: 'visible' })
                                .each(function(){ this.style.removeProperty('opacity'); this.style.removeProperty('transform'); })
                                .addClass(fromLeft ? 'from-left' : 'from-right')
                                .addClass('show')
                                .attr('aria-hidden', 'false');
                        })
                        // 鼠标离开时通过移除类隐藏，由 CSS 过渡控制
                        element.on('mouseleave', function () {
                            $tooltip.removeClass('show from-left from-right').attr('aria-hidden', 'true');
                        })
                    }
                }
            }
        }
    })
}
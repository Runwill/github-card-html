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
                    $("#example-tabs").foundation("selectTab", "panel_skill", 1)
            
                    $(".scroll").each(function() {
                        if ($(this).hasClass(event.currentTarget.classList[0])) {
                            if (!$(this).hasClass("fadeOnly")) {
                                // 滚动到目标元素
                                this.scrollIntoView({ behavior: "smooth" })
                            }
                            // 淡入效果
                            $(this).fadeTo(200, 0).fadeTo(1000, 1)
                        }
                    })
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

                        // 只创建一次tooltip并复用
                        if (!window._loreTooltipAppended) {
                            window._loreTooltipAppended = true;
                            $('body').append('<div id="lore-tooltip" style="display:none;position:absolute;"></div>');
                        }
                        const $tooltip = $('#lore-tooltip');

                        element.on('mouseenter', function () {
                            const loreText = '「' + skill[$(this).prop('loreSkillPosition')].role[$(this).prop('loreRolePosition')].lore + '」——《' + skill[$(this).prop('loreSkillPosition')].role[$(this).prop('loreRolePosition')].legend + '》';
                            // 获取目标元素在页面上的位置和宽度
                            const rect = this.getBoundingClientRect();
                            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                            // tooltip宽度自适应，先设置内容再测量宽度
                            $tooltip.html(loreText)
                                .css({
                                    left: 0,
                                    top: 0,
                                    width: 'auto',
                                    display: 'block',
                                    opacity: 0
                                });
                            const tipWidth = $tooltip.outerWidth();
                            // 计算tooltip居中于目标元素下方（加上scrollTop/scrollLeft）
                            let left = rect.left + scrollLeft + rect.width/2 - tipWidth/2;
                            const top = rect.bottom + scrollTop + 6;
                            // 如果左侧超出，则左边界对齐元素中线
                            if (left < 8) {
                                left = rect.left + scrollLeft + rect.width/2 + 8;
                            }
                            $tooltip.stop(true, true)
                                .css({
                                    left: left + 'px',
                                    top: top + 'px',
                                    background: 'linear-gradient(135deg, rgba(45,45,45,0.95) 0%, rgba(30,30,30,0.98) 100%)',
                                    color: '#f5f5f5',
                                    border: '1px solid rgba(128,128,128,0.4)',
                                    'border-radius': '8px',
                                    'box-shadow': '0 6px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(255,255,255,0.1)',
                                    padding: '10px 16px',
                                    'z-index': 9999,
                                    'font-size': '1em',
                                    'font-weight': '500',
                                    'line-height': '1.3',
                                    'letter-spacing': '0.3px',
                                    'pointer-events': 'none',
                                    width: 'auto',
                                    'white-space': 'nowrap',
                                    opacity: 0,
                                    display: 'block',
                                    'backdrop-filter': 'blur(6px)',
                                    'transform': 'translateY(-2px)',
                                    'transition': 'all 0.12s cubic-bezier(0.4, 0, 0.2, 1)'
                                })
                                .fadeTo(180, 1);
                        })
                        // 不再跟随鼠标
                        element.on('mouseleave', function () {
                            $tooltip.stop(true, true).fadeTo(150, 0, function () {
                                $tooltip.hide().css('transform', 'translateY(0px)');
                            });
                        })
                    }
                }
            }
        }
    })
}
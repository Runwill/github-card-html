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
                                    background: 'rgba(255,255,240,0.98)',
                                    color: '#333',
                                    border: '1px solid #bbb',
                                    'border-radius': '6px',
                                    'box-shadow': '0 2px 8px rgba(0,0,0,0.12)',
                                    padding: '8px 16px',
                                    'z-index': 9999,
                                    'font-size': '1em',
                                    'pointer-events': 'none',
                                    width: 'auto',
                                    opacity: 0,
                                    display: 'block'
                                })
                                .fadeTo(120, 1);
                        })
                        // 不再跟随鼠标
                        element.on('mouseleave', function () {
                            $tooltip.stop(true, true).fadeTo(120, 0, function () {
                                $tooltip.hide();
                            });
                        })
                    }
                }
            }
        }
    })
}
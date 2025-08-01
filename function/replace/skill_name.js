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
                            const viewportWidth = window.innerWidth;
                            
                            // 计算最佳位置 - 默认居中显示在元素下方
                            let left = rect.left + scrollLeft + rect.width/2;
                            let top = rect.bottom + scrollTop + 12;
                            let showAbove = false;
                            
                            // 边界检测和调整
                            const margin = 12;
                            
                            // 先设置基础样式并测量宽度（在计算位置之前）
                            $tooltip.css({
                                visibility: 'hidden',
                                display: 'block',
                                opacity: 0,
                                width: 'auto',
                                'white-space': 'nowrap',
                                'transition': 'none' // 临时移除过渡效果避免位置变化时的移动
                            }).html(loreText);
                            
                            const tipWidth = $tooltip.outerWidth();
                            const tipHeight = $tooltip.outerHeight();
                            
                            // 重新计算居中位置
                            left = left - tipWidth/2;
                            
                            // 左右边界检测
                            if (left < margin) {
                                left = margin;
                            } else if (left + tipWidth > viewportWidth - margin) {
                                left = viewportWidth - tipWidth - margin;
                            }
                            
                            // 上下边界检测 - 如果下方空间不够，显示在上方
                            if (top + tipHeight > window.innerHeight + scrollTop - margin) {
                                top = rect.top + scrollTop - tipHeight - 12;
                                showAbove = true;
                            }
                            
                            // 如果tooltip当前可见，先立即隐藏
                            if ($tooltip.is(':visible') && parseFloat($tooltip.css('opacity')) > 0) {
                                $tooltip.stop(true, true).css({
                                    opacity: 0,
                                    display: 'none'
                                });
                            }
                            
                            // 应用完整样式并启动动画
                            $tooltip.stop(true, true).css({
                                left: left + 'px',
                                top: top + 'px',
                                visibility: 'visible',
                                display: 'block',
                                opacity: 0,
                                transform: `translateY(${showAbove ? '8px' : '-8px'}) scale(0.95)`,
                                
                                // 样式优化
                                background: 'linear-gradient(135deg, rgba(248,250,252,0.98) 0%, rgba(255,255,255,0.96) 50%, rgba(248,250,252,0.98) 100%)',
                                color: '#2d3748',
                                border: '1px solid rgba(226,232,240,0.9)',
                                'border-radius': '12px',
                                'box-shadow': '0 10px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                                padding: '12px 18px',
                                'z-index': 10000,
                                'font-size': '0.95em',
                                'font-weight': '500',
                                'line-height': '1.4',
                                'letter-spacing': '0.2px',
                                'pointer-events': 'none',
                                width: 'auto',
                                'white-space': 'nowrap',
                                'backdrop-filter': 'blur(12px) saturate(1.2)',
                                'text-shadow': '0 1px 2px rgba(255,255,255,0.8)',
                                'font-family': 'system-ui, -apple-system, sans-serif',
                                
                                // 恢复过渡动画（仅用于透明度和变换，不包括位置）
                                'transition': 'opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }).animate({
                                opacity: 1,
                                transform: 'translateY(0px) scale(1)'
                            }, {
                                duration: 250,
                                easing: 'easeOutBack',
                                step: function(now, fx) {
                                    if (fx.prop === 'transform') {
                                        $(this).css('transform', fx.now);
                                    }
                                }
                            });
                        })
                        // 优化鼠标离开动画
                        element.on('mouseleave', function () {
                            $tooltip.stop(true, true).animate({
                                opacity: 0,
                                transform: 'translateY(-8px) scale(0.92)'
                            }, {
                                duration: 200,
                                easing: 'easeInQuad',
                                step: function(now, fx) {
                                    if (fx.prop === 'transform') {
                                        $(this).css('transform', fx.now);
                                    }
                                },
                                complete: function() {
                                    $tooltip.hide().css({
                                        'transform': 'translateY(0px) scale(1)',
                                        'transition': 'none'
                                    });
                                }
                            });
                        })
                    }
                }
            }
        }
    })
}
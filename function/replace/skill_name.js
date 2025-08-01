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
                            
                            // 计算tooltip左边缘与目标元素中心对齐的位置
                            left = rect.left + scrollLeft + rect.width/2;
                            
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
                                transform: 'translateX(-20px) scale(1)',
                                
                                // 样式优化
                                background: 'rgba(248,250,252,0.9)',
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
                                'transition': 'none' // 完全移除CSS过渡，使用jQuery手动控制
                            }).animate({
                                opacity: 1
                            }, {
                                duration: 600, // 匹配其他动画的进入速度
                                easing: 'easeOutBack',
                                step: function(now, fx) {
                                    if (fx.prop === 'opacity') {
                                        // 手动控制进入动画的transform
                                        const progress = now; // now从0到1
                                        const translateX = -20 + (progress * 20); // 从-20px到0px
                                        $(this).css('transform', `translateX(${translateX}px) scale(1)`);
                                    }
                                }
                            });
                        })
                        // 优化鼠标离开动画 - 纯横轴向右偏移退出
                        element.on('mouseleave', function () {
                            $tooltip.stop(true, true).css({
                                'transition': 'none' // 移除CSS过渡，使用jQuery动画
                            }).animate({
                                opacity: 0
                            }, {
                                duration: 300, // 匹配其他动画的退出速度（比进入稍快）
                                easing: 'easeInQuad',
                                step: function(now, fx) {
                                    if (fx.prop === 'opacity') {
                                        // 只控制横向移动，不缩放
                                        const progress = 1 - now; // now从1到0，progress从0到1
                                        const translateX = progress * 20; // 最大偏移20px，和进入动画保持一致
                                        $(this).css('transform', `translateX(${translateX}px) scale(1)`);
                                    }
                                },
                                complete: function() {
                                    $tooltip.hide().css({
                                        'transform': 'translateX(0px) scale(1)',
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
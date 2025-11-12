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
        // 获取技能名并排序
        const skillNames = skill.filter(s => s && s.role).map(s => s.name).sort()
        // name -> skill 的映射（若有重名以首个为准，保持现有行为语义）
        const nameToSkill = new Map()
        for (let j = 0; j < skill.length; j++) {
            if (!nameToSkill.has(skill[j].name)) nameToSkill.set(skill[j].name, skill[j])
        }

        for (let i = 0; i < skillNames.length; i++) { // 技能名 i
            const name = skillNames[i]
            const $elements = $(paragraphs).find('.' + name)
            // 写入文本
            $elements.html(name)
            // 统一绑定事件与高亮
            bindDblclickAndHighlight($elements, {
              onDblclick: (event, el) => {
                const className = el.classList[0]
                scrollActions.scrollToClassAndFlash('panel_skill', className, { behavior: 'smooth', stop: true })
              },
              scrollSelector: '.' + name + '.scroll',
              highlightColor: '#df90ff'
            })

      // 不同武将的技能名悬浮个性化文本
      const sk = nameToSkill.get(name)
            if (sk && sk.role && sk.role.length) {
                // 为该技能构建 id -> roleIndex 的映射，避免内层循环
                const idToRoleIdx = new Map()
                for (let k = 0; k < sk.role.length; k++) {
                    idToRoleIdx.set(sk.role[k].id, k)
                }

                // 只创建一次 tooltip 并复用
                if (!window._loreTooltipAppended) {
                    window._loreTooltipAppended = true;
                    $('body').append('<div id="lore-tooltip" aria-hidden="true"></div>');
                }
                const $tooltip = $('#lore-tooltip')

                // 为每个角色 ID 直接定位元素，避免 j 遍历
                idToRoleIdx.forEach((roleIdx, rid) => {
                    const $els = $(paragraphs).find('.' + name + 'LoreCharacterID' + rid)
          const skObj = nameToSkill.get(name)
          $els.prop('loreSkillPosition', skObj ? skill.indexOf(skObj) : -1)
                    $els.prop('loreRolePosition', roleIdx)

                    $els.on('mouseenter', function () {
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
                    $els.on('mouseleave', function () {
                        $tooltip.removeClass('show from-left from-right').attr('aria-hidden', 'true')
                    })
                })
            }
        }
  })
}
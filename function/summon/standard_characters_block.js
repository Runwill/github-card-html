// 说明：
// - 合并请求为 Promise.all，失败兜底为空数组，避免阻塞。
// - 使用 Map/索引预处理，显著减少多层嵌套循环。
// - 保持原有 DOM 结构与类名，兼容现有样式与行为。

function summonCharacters() {
    // 统一使用全局工具（由 function/api/utils.js 提供）
    const characterUrl = window.getEndpointUrl('character', '/api/character')
    const skillUrl = window.getEndpointUrl('skill', '/api/skill?strength=' + encodeURIComponent(localStorage.getItem('strength')))

    Promise.all([window.fetchJSON(characterUrl, []), window.fetchJSON(skillUrl, [])]).then(([characterData, skillData]) => {
        CharacterReplace(characterData || [], skillData || [])
    })
}

function CharacterReplace(character, skill) {
    // 预构建角色索引与排序 ID 列表
    const characterById = new Map()
    for (const c of character || []) characterById.set(c.id, c)
    const characterIDs = Array.from(characterById.keys())
        .map((id) => parseInt(id))
        .sort((a, b) => a - b)

    // 预构建：每个角色对应的技能列表 [{ skill, order, dominator }]
    const skillsByCharacter = new Map()
    for (const s of skill || []) {
        if (!s || !s.role) continue
        for (const r of s.role) {
            const list = skillsByCharacter.get(r.id) || []
            list.push({ skill: s, order: parseInt(r.skill_order), dominator: !!r.dominator })
            skillsByCharacter.set(r.id, list)
        }
    }

    let out = ''

    for (const id of characterIDs) {
        const c = characterById.get(id)
        if (!c) continue

        out += "<characterParagraph class='characterParagraph'><div class='container'><div class='role_title'>" + (c.title || '') + '</div>'

        // 使用 CSS mask 将黑色形状渲染为主题文字色
        const iconPath = 'source/' + c.position + (c.dominator ? '_君主' : '') + '.png'
        out +=
            "<div class='role_icon" +
            (c.dominator ? ' dominator' : ' not_dominator') +
            " role_icon--mask' " +
            'style="width:300px;height:300px;' +
            "-webkit-mask-image:url('" +
            iconPath +
            "');mask-image:url('" +
            iconPath +
            "');" +
            '-webkit-mask-size:contain;mask-size:contain;' +
            '-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;' +
            '-webkit-mask-position:center;mask-position:center;"></div>' +
            '<padding><h3>' +
            id +
            ' <characterName class="characterID' +
            id +
            ' scroll"></characterName> '

        for (let a = 0; a < (c.health || 0); a++) {
            out += "<health epithet='2' style='font-size: 1.3em;letter-spacing: -2px;'></health>"
        }

        out += '</h3>'

        const entries = (skillsByCharacter.get(id) || []).sort((x, y) => x.order - y.order)
        for (const entry of entries) {
            const s = entry.skill
            // 每条技能一段
            out += '<div class="indent"><pronounScope><skillQuote class="bold' // glowing 逻辑保留注释
            out += '"><skillQuoteLeft></skillQuoteLeft>'
            out += '<characterSkillElement class="' + s.name + ' ' + s.name + 'LoreCharacterID' + id + '"></characterSkillElement>'
            out += '<skillQuoteRight></skillQuoteRight></skillQuote>'

            if (entry.dominator) out += '<dominatorSkill></dominatorSkill>，'

            out += s.content || ''

            // 尾部武将名：遍历该技能所有适配角色，原逻辑保持
            for (const r2 of s.role || []) {
                const c2 = characterById.get(r2.id)
                if (!c2) continue
                out +=
                    '<' +
                    '<characterName class="characterID' +
                    c2.id +
                    '"></characterName>' +
                    r2.skill_order +
                    (r2.dominator ? '<dominatorSkill epithet="1"></dominatorSkill>' : '') +
                    '>'
            }
            out += '</pronounScope></div>'
        }

        out += '</padding></div><br><br><br><br></characterParagraph>'
    }

    $('.standardCharactersBlock').html(
        '<br>' +
            '<div class="search-container" style="z-index: 100; top: 10%;"><input type="text" id="search-input" placeholder="搜检" oninput="filterParagraphs()" autocomplete="off" style="background-color: rgba(255,255,255,1); position: relative; transition: right 1s ease, transform 0.2s ease, box-shadow 0.2s ease; transform: translateY(0) scale(1); box-shadow: 0 1px 4px rgba(0,0,0,0.08);"></div>' +
            '<div id="block-under-search"></div>' +
            out
    )
    ;(function initSearchInteractions() {
        const searchContainer = document.querySelector('.search-container')
        const searchInput = document.getElementById('search-input')
        let isFocused = false
        let isShowingAnimation = false
        let isDropped = false
        let animationTimers = []

        const clearAnimationTimers = () => {
            animationTimers.forEach((t) => clearTimeout(t))
            animationTimers = []
        }
        const lift = () => {
            searchInput.style.transform = 'translateY(-3px) scale(1.01)'
            searchInput.style.boxShadow = '0 5px 10px rgba(0,0,0,0.15)'
            isDropped = false
        }
        const drop = () => {
            searchInput.style.transform = 'translateY(0) scale(1)'
            searchInput.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'
            isDropped = true
        }
        const show = () => {
            clearAnimationTimers()
            isShowingAnimation = true
            lift()
            const t1 = setTimeout(() => {
                searchInput.style.right = '0'
            }, 200)
            const t2 = setTimeout(() => {
                isShowingAnimation = false
                if (isFocused) drop()
            }, 1200)
            animationTimers.push(t1, t2)
        }
        const hide = () => {
            if (!isFocused && window.innerWidth > 1101) {
                clearAnimationTimers()
                isShowingAnimation = false
                if (isDropped) {
                    lift()
                    animationTimers.push(setTimeout(() => (searchInput.style.right = '-95%'), 200))
                } else {
                    animationTimers.push(setTimeout(() => (searchInput.style.right = '-95%'), 0))
                }
                animationTimers.push(setTimeout(() => drop(), 1200))
            }
        }

        searchContainer.addEventListener('mouseenter', () => {
            if (!isFocused) show()
        })
        searchContainer.addEventListener('mouseleave', hide)
        searchInput.addEventListener('focus', () => {
            isFocused = true
            if (!isShowingAnimation) drop()
        })
        searchInput.addEventListener('blur', () => {
            isFocused = false
            hide()
        })
    })()
}
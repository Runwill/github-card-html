// 等价精简版：渲染所有标准“角色段落”与技能列表
// 维持原 HTML 输出与交互（搜索条动画、类名、顺序），仅减少拼接与循环开销
function summonCharacters() {
    const characterUrl = window.getEndpointUrl('character', '/api/character')
    const skillUrl = window.getEndpointUrl('skill', '/api/skill?strength=' + encodeURIComponent(localStorage.getItem('strength')))
    Promise.all([window.fetchJSON(characterUrl, []), window.fetchJSON(skillUrl, [])])
        .then(([c, s]) => CharacterReplace(c || [], s || []))
}

function CharacterReplace(character, skill) {
    const byId = new Map((character || []).map(c => [c.id, c]))
    const ids = Array.from(new Set((character || []).map(c => +c.id))).sort((a, b) => a - b)

    const skillsByCharacter = new Map()
    for (const s of (skill || [])) {
        if (!s || !s.role) continue
        for (const r of s.role) {
            const list = skillsByCharacter.get(r.id) || []
            list.push({ skill: s, order: +r.skill_order, dominator: !!r.dominator })
            skillsByCharacter.set(r.id, list)
        }
    }

    let out = ''
    for (const id of ids) {
        const c = byId.get(id)
        if (!c) continue
        const iconPath = 'source/' + c.position + (c.dominator ? '_君主' : '') + '.png'
        out += `<characterParagraph class='characterParagraph'><div class='container'><div class='role_title'>${c.title || ''}</div>`
        out += `<div class='role_icon${c.dominator ? ' dominator' : ' not_dominator'} role_icon--mask' style="width:300px;height:300px;-webkit-mask-image:url('${iconPath}');mask-image:url('${iconPath}');-webkit-mask-size:contain;mask-size:contain;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:center;mask-position:center;"></div><padding><h3>${id} <characterName class="characterID${id} scroll"></characterName> `
        out += "<health epithet='2' style='font-size: 1.3em;letter-spacing: -2px;'></health>".repeat(c.health || 0)
        out += '</h3>'

        const entries = (skillsByCharacter.get(id) || []).sort((x, y) => x.order - y.order)
        for (const entry of entries) {
            const s = entry.skill
            const rolesTail = (s.role || []).map(r2 => {
                const c2 = byId.get(r2.id)
                return c2 ? '<' + `<characterName class="characterID${c2.id}"></characterName>${r2.skill_order}${r2.dominator ? '<dominatorSkill epithet="1"></dominatorSkill>' : ''}` + '>' : ''
            }).join('')
            out += `<div class="indent"><pronounScope><skillQuote class="bold"><skillQuoteLeft></skillQuoteLeft><characterSkillElement class="${s.name} ${s.name}LoreCharacterID${id}"></characterSkillElement><skillQuoteRight></skillQuoteRight></skillQuote>${entry.dominator ? '<dominatorSkill></dominatorSkill>，' : ''}${s.content || ''}${rolesTail}</pronounScope></div>`
        }

        out += '</padding></div><br><br><br><br></characterParagraph>'
    }

    $('.standardCharactersBlock').html(`<br><div class="search-container" style="z-index: 100; top: 10%;"><input type="text" id="search-input" placeholder="搜检" oninput="filterParagraphs()" autocomplete="off" style="background-color: rgba(255,255,255,1); position: relative; transition: right 1s ease, transform 0.2s ease, box-shadow 0.2s ease; transform: translateY(0) scale(1); box-shadow: 0 1px 4px rgba(0,0,0,0.08);"></div><div id="block-under-search"></div>${out}`)
    ;(() => {
        const searchContainer = document.querySelector('.search-container')
        const searchInput = document.getElementById('search-input')
        let isFocused = false, isShowingAnimation = false, isDropped = false, animationTimers = []
        const clear = () => { animationTimers.forEach(t => clearTimeout(t)); animationTimers = [] }
        const lift = () => { searchInput.style.transform = 'translateY(-3px) scale(1.01)'; searchInput.style.boxShadow = '0 5px 10px rgba(0,0,0,0.15)'; isDropped = false }
        const drop = () => { searchInput.style.transform = 'translateY(0) scale(1)'; searchInput.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; isDropped = true }
        const show = () => { clear(); isShowingAnimation = true; lift(); animationTimers.push(setTimeout(() => { searchInput.style.right = '0' }, 200), setTimeout(() => { isShowingAnimation = false; if (isFocused) drop() }, 1200)) }
        const hide = () => {
            if (!isFocused && window.innerWidth > 1101) {
                clear(); isShowingAnimation = false
                const delay = isDropped ? 200 : 0; if (isDropped) lift()
                animationTimers.push(setTimeout(() => { searchInput.style.right = '-95%' }, delay), setTimeout(drop, 1200))
            }
        }
        searchContainer.addEventListener('mouseenter', () => { if (!isFocused) show() })
        searchContainer.addEventListener('mouseleave', hide)
        searchInput.addEventListener('focus', () => { isFocused = true; if (!isShowingAnimation) drop() })
        searchInput.addEventListener('blur', () => { isFocused = false; hide() })
    })()
}
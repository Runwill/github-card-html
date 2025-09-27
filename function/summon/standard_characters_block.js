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

    // 仅渲染角色内容本体；共享筛选框由 function/ui/shared_search.js 负责挂载
    $('.standardCharactersBlock').html(`<br>${out}`)
        // 渲染后若搜索框有关键字，应用将池筛选
        try { window.filterParagraphs && window.filterParagraphs() } catch(_) {}
}
// 说明：
// - 合并异步请求为 Promise.all，失败时降级为 []，避免阻塞。
// - 使用 Map 进行 O(1) 查找，减少多层嵌套循环，提升可读性与性能。
// - 保持原有 DOM 结构与类名输出不变，确保现有样式与行为兼容。

function summonCharacterSkill() {
    return new Promise(function (resolve) {
        // 统一使用全局工具（由 function/api/utils.js 提供）
        const characterUrl = window.getEndpointUrl('character', '/api/character')
        const skillUrl = window.getEndpointUrl('skill', '/api/skill?strength=' + encodeURIComponent(localStorage.getItem('strength')))

        Promise.all([window.fetchJSON(characterUrl, []), window.fetchJSON(skillUrl, [])]).then(([characterData, skillData]) => {
            CharacterSkillReplace(characterData || [], skillData || [])
            resolve() // 在HTML生成完成后 resolve Promise
        })
    })
}

function CharacterSkillReplace(character, skill) {
    // 预构建角色索引，便于 O(1) 查找
    const characterById = new Map()
    for (const c of character || []) characterById.set(c.id, c)

    // 过滤出具有 role 的技能，按技能名排序（保持原逻辑）
    const skillsWithRole = (skill || [])
        .filter((s) => s && s.role)
        .slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))

    const parts = []

    for (const s of skillsWithRole) {
        // 引号与技能名占位元素
        parts.push(
            '<pronounScope><skillQuote class="bold"><skillQuoteLeft></skillQuoteLeft>',
            '<characterSkillElement class="',
            s.name,
            ' scroll"></characterSkillElement>',
            '<skillQuoteRight></skillQuoteRight></skillQuote>',
            s.content || ''
        )

        // 尾部：按 role 列表输出武将名与次序、君主标记
        for (const r of s.role) {
            const c = characterById.get(r.id)
            if (!c) continue
            parts.push(
                '<',
                '<characterName class="characterID',
                c.id,
                '"></characterName>',
                r.skill_order,
                r.dominator ? '<dominatorSkill epithet="1"></dominatorSkill>' : '',
                '>'
            )
        }

        parts.push('</pronounScope><br><br>')
    }

    $('.standardCharacterSkillsBlock').html('<br><br>' + parts.join(''))
}
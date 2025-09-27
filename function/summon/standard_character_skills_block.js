// 等价精简版：并发请求角色与技能，渲染标准“角色技能”区块
// 保持原有 DOM 结构/类名/顺序；仅收紧实现以减少体积
async function summonCharacterSkill() {
    const characterUrl = window.getEndpointUrl('character', '/api/character')
    const skillUrl = window.getEndpointUrl('skill', '/api/skill?strength=' + encodeURIComponent(localStorage.getItem('strength')))
    const [characterData, skillData] = await Promise.all([
        window.fetchJSON(characterUrl, []),
        window.fetchJSON(skillUrl, [])
    ])
    CharacterSkillReplace(characterData || [], skillData || [])
}

function CharacterSkillReplace(character, skill) {
    const byId = new Map((character || []).map(c => [c.id, c]))
    const html = '<br><br>' + (skill || [])
        .filter(s => s && s.role)
        .slice()
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .map(s => {
            const roles = s.role.map(r => {
                const c = byId.get(r.id)
                return c
                    ? '<' + `<characterName class="characterID${c.id}"></characterName>${r.skill_order}${r.dominator ? '<dominatorSkill epithet="1"></dominatorSkill>' : ''}` + '>'
                    : ''
            }).join('')
            // 在每行开头插入隐藏的复制按钮（在按下 Ctrl 时显示）
            // 行容器为 <pronounScope>，用于事件委托与文本收集
              return `<pronounScope class="skill-row"><button class="btn btn--danger btn--sm skill-copy-btn" title="复制本行" aria-label="复制本行" type="button">复制</button><skillQuote class="bold"><skillQuoteLeft></skillQuoteLeft><characterSkillElement class="${s.name} scroll"></characterSkillElement><skillQuoteRight></skillQuoteRight></skillQuote>${s.content || ''}${roles}</pronounScope><br><br>`
        }).join('')
    $('.standardCharacterSkillsBlock').html(html)
    // 渲染后若搜索框有关键字，应用技能筛选
    try { window.filterSkills && window.filterSkills() } catch(_) {}
}
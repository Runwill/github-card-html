---
name: dynamic-html-token-system
description: "Use when: 理解或修改动态 HTML 词元系统、技能内容标签语义、术语/卡牌/角色/技能替换、AI_DATA_CONTEXT、compression、replace、summon、tokens admin、词元面板、权限日志、双击跳转、高亮、Lore tooltip。"
argument-hint: "说明要新增或修复的词元、替换、管理面板或跳转问题"
user-invocable: true
---

# 动态 HTML 词元系统设计

## 何时使用

- 阅读技能、程序、牌面描述中大量自定义 HTML 标签，并需要把标签还原成中文语义。
- 新增或修改自定义标签、术语、卡牌名、角色名、技能名、压缩标签。
- 修改 `function/replace/`、`function/summon/`、`function/admin/tokens/` 或词元面板样式。
- 排查替换未生效、重复替换、双击跳转、高亮、Lore tooltip、词元日志或前往按钮问题。

## 必读上下文

1. 需要理解词元内容时，先读多根工作区中的 `backend-project/AI_DATA_CONTEXT.md`。
2. 遇到 `xxxC` / `xxxCC` 这类压缩标签时，读 `base/compression.json`，先按 `pre + innerHTML + suf` 展开再理解。
3. 修改实现前读 `ARCHITECTURE.md` 0.1、0.3、4.1.7、4.1.8、`function/admin/tokens/` 文件表。
4. 修改替换逻辑时读 `function/replace/replace_common.js`、`function/replace/term.js` 和目标替换模块。
5. 修改管理面板时读 `function/admin/tokens/` 对应子模块与 `style/panel/tokens/`。
6. 修改动态缩放样式时同时使用 `frontend-dynamic-scaling`。

## 词元内容语义

- 自定义标签是一套游戏规则 DSL，不是普通装饰 HTML。阅读时先把标签当作语义节点，再考虑它最终如何渲染。
- `AI_DATA_CONTEXT.md` 是给 AI 阅读内容的首要事实源：它把 `<tag>` 映射为中文含义、`replace` 字段和分段说明，并列出技能、角色等核心数据。
- 标签名大小写不要作为语义差异。浏览器会规范化标签名，替换逻辑也用大写表做匹配。
- `cn` 是默认中文含义；`replace` 是实际替换内容或替换标记。看到 `replace` 时不要只按 `cn` 推断最终文字。
- 有 `part` 的术语是复合/分段语义框架。父标签表示一个作用域或事件框架，子标签表示语法片段、角色位、目标位、数值位或连接词。
- `AI_DATA_CONTEXT.md` 备注中的 `分段: <x>:含义` 是理解复合术语的关键。比如 `<damage>` 是伤害作用域，内部的 `<damageRole>`、`<damagedRole>`、`<damageValue>` 分别表示来源、受伤者和伤害值。
- `class="irreplaceable"` 表示该节点自身文字不应被词元替换覆盖，通常用于“一张”“x张”等人工参数；但它仍可能参与高亮、跳转或父级分段理解。
- `class="replaceable"` 表示该位置语义上可被选择或替换，阅读时要保留“可选目标/可替换对象”的含义。
- `epithet="n"` 会选择术语的第 n 个别名。没有该属性时通常使用第一个别名。
- 动态术语如 `<equaling>`、`<include>`、`<roundUp>` 不能只按英文猜含义；如果 `AI_DATA_CONTEXT.md` 只标为“动态术语”，需要继续查后端词元数据或当前技能上下文。
- `base/compression.json` 中的 `C` / `CC` 后缀标签多是书写缩写，不一定是独立语义。必须先展开，再读展开后的固定/动态词元。

## 阅读词元内容流程

1. 复制目标技能或 HTML 片段，先识别是否包含压缩标签。
2. 对照 `base/compression.json` 展开压缩标签；保留原始 innerHTML 作为插入内容。
3. 对每个展开后的标签查 `AI_DATA_CONTEXT.md` 的 Terms Mapping。
4. 简单术语直接映射为 `cn` 或 `replace`；复合术语按父作用域 + 子分段组合成自然语言。
5. 对 `irreplaceable` 节点保留原文字，对 `replaceable` 节点说明它是可选择/可替换位置。
6. 如果遇到 `characterSkillElement`、`characterName` 或卡牌标签，再结合技能库、角色列表、卡牌数据确认实际名称。
7. 输出理解结果时，优先给“自然语言释义 + 关键结构拆解”，不要只逐个翻译标签。

## 内容修改原则

- 不凭英文标签名臆造规则含义；以 `AI_DATA_CONTEXT.md`、后端词元数据和现有技能写法为准。
- 新增复合术语时要同时定义父级作用域和必要 `part`，否则 AI 和前端都难以稳定理解。
- 新增压缩标签时要保证展开结果仍是合法词元结构，且不会改变已有技能的语义层级。
- 修改技能内容时要尽量保持原有 DSL 风格，避免把可结构化的规则改成不可替换的纯文本。
- 如果当前 `AI_DATA_CONTEXT.md` 与数据库或前端表现冲突，优先标记为上下文可能过期，再检查生成脚本或请求刷新上下文。

## 系统结构

- `function/replace/` 使用全局 `MutationObserver` 持续扫描整个 `document`。
- `replace_common.js` 提供 `window.scanAndObserve()`，各模块应复用扫描与防重复机制。
- `utils.js` 提供 JSON 缓存和双击滚动高亮绑定。
- `decompress.js` 读取 `base/compression.json`，把压缩标签展开为带前后缀的完整 HTML。
- `term.js`、`card_name.js`、`character_name.js`、`skill_name.js` 分别处理术语、卡牌、角色、技能替换。
- `function/summon/` 从 API 渲染将池和技能面板，是跳转和替换目标的重要来源。
- `function/admin/tokens/` 是词元管理后台，使用 `window.tokensAdmin` 命名空间。

## 关键约束

- 依赖 DOM 的替换或召唤逻辑必须等待 `window.partialsReady`；依赖替换结果的逻辑等待 `window.replacementsReady`。
- 所有替换后元素应保留悬停高亮和双击跳转能力，新增类型要接入 `bindDblclickAndHighlight` 或等效路径。
- Lore Tooltip 只在将池面板中特定技能标签生效，技能面板同名标签不应默认带 Lore。
- 避免对已替换节点重复处理；新增扫描目标时必须有可识别的已处理标记或结构防护。
- 新增用户可见文本必须走 i18n；管理面板文案和帮助速查也要同步。
- 词元页和权限页样式已拆分并接入动态 token，不要回到单文件硬编码尺寸。

## 修改流程

1. 先给出目标内容的语义拆解，确认要改的是规则含义、缩写形式、渲染表现还是管理工具。
2. 明确数据来源：静态 JSON、后端 API、压缩映射、DOM 自定义标签还是管理面板状态。
3. 明确消费路径：替换显示、跳转高亮、搜索、日志、创建/编辑弹窗、帮助速查、AI_DATA_CONTEXT 生成。
4. 优先扩展现有替换模块和 `tokensAdmin` 子模块，不新增平行管理器。
5. 新增词元类别时同步 schema、diff、render、go/action、日志和 i18n。
6. 修改替换结果的 DOM 结构时，检查 hover、高亮、双击跳转、主题色、触摸选择和压缩展开。
7. 用户可见功能变化更新 `base/help.json`、`i18n/strings.js` 和 `base/announcements.json`。

## 验收

- 在程序、将池、技能、牌库、词元面板和草稿预览中检查替换效果。
- 检查新增/修改标签是否不会被 MutationObserver 重复包裹。
- 检查双击跳转、行高亮、搜索定位和 Lore tooltip 的边界场景。
- 检查词元编辑、删除、日志复制/清空、前往按钮和语言切换。
- 用 `backend-project/AI_DATA_CONTEXT.md` 抽样复读一个真实技能，确认 AI 能解释自然语言含义而不是只列实现文件。

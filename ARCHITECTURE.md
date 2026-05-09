# ARCHITECTURE.md — card-html 前端项目架构文档

> **最后更新**: 2026-05-05
> **适用对象**: AI Agent、新开发者快速定位代码
> **帮助数据源**: `base/help.json` + `i18n/strings.js` 为用户可见的功能速查内容

---

## 0. ⚠️ AI Agent 必读提醒

> 以下是本项目中容易被忽略的**全局特殊机制**，请在修改任何内容前先了解。

### 0.1 动态 HTML 替换系统（全局 MutationObserver）

`function/replace/` 下的 5 个替换模块通过 `MutationObserver` **持续扫描整个 `document`**，将自定义 XML 标签替换为带样式的交互元素：

| 模块 | 自定义标签示例 | 替换效果 |
|---|---|---|
| `term.js` | `<round>`, `<currentRound>` 等术语标签 | 中文文本 + 主题色 + 折叠交互 |
| `card_name.js` | `<ATTACK>`, `<DODGE>` 等卡牌标签名 | 卡牌中文名 + 类型着色（基本牌绿/锦囊橙） |
| `character_name.js` | `<characterName class="characterID{id}">` | 角色中文名 + 高亮 + 双击跳转 |
| `skill_name.js` | `<characterSkillElement class="{name}...">` | 技能中文名 + 高亮 + 双击跳转 |
| `decompress.js` | 压缩标签（从 `base/compression.json`） | 解压为带前后缀 HTML 的完整内容 |

**所有替换后的标签都支持**：悬停高亮 + 双击跳转到对应面板定义处。

**⚠️ 关键区分**：`skill_name.js` 中的 **Lore Tooltip（典故引言浮层）仅在将池面板（panel_character）生效**——判定依据是 class 中包含 `LoreCharacterID{id}` 格式。技能面板（panel_skill）的 `<characterSkillElement>` 不含此格式，因此没有 Lore Tooltip。

### 0.2 Foundation CSS 硬编码覆盖

Foundation Sites CSS（`Foundation-Sites-CSS/css/foundation.css`）对部分元素有强制样式，例如：
- `kbd { color: #0a0a0a; font-family: Consolas, monospace }` → 本项目用 `.help-keys kbd` 的 `color: var(--text)` 和 `font-family: var(--font-kbd)` 覆盖
- 其他可能的覆盖还有 `label`, `table`, `button` 等基础元素

**⚠️ 新增带基础标签的样式时**，务必检查 Foundation 是否有硬编码值需要覆盖。

### 0.3 异步加载时序

```
页面加载 → include_loader.js 扫描 [data-include] → fetch partials → 注入 DOM
          → window.partialsReady (Promise) resolve
          → Foundation 初始化 → 术语/名称替换启动
          → window.replacementsReady (Promise) resolve
```

**⚠️ 所有依赖 DOM 的模块必须等待 `window.partialsReady`**。依赖替换结果的逻辑须等 `window.replacementsReady`。

### 0.4 Overlay 栈导航系统

所有菜单和弹窗**统一**通过 `CardUI.Manager.Controllers.overlay` 管理，使用**栈式导航**：
- `overlay.open(panelId)` / `overlay.back()` / `overlay.closeAll()`
- `overlay.current()` 获取栈顶面板 ID
- `overlay.isAnyOpen()` 检查是否有覆盖层打开
- 11 个已注册面板：`sidebar-menu`, `account-menu`, `settings-menu`, `update-account-modal`, `approve-user-modal`, `avatar-modal`, `avatar-crop-modal`, `account-info-modal`, `announcements-modal`, `key-settings-modal`, `game-settings-modal`

**⚠️ 新增弹窗/菜单时**，必须在 `controllers/overlay.js` 的 `PANELS` 中注册，否则无法通过统一导航打开。

### 0.5 帮助系统（功能速查）

用户按 `?` 键或从设置菜单打开上下文帮助面板（`function/ui/help_panel.js`）。帮助内容来自 `base/help.json`，文本引用 `i18n/strings.js` 中的翻译键。帮助面板会根据当前上下文自动切换内容：
- **Overlay 优先**：若有覆盖层打开，显示该覆盖层的帮助
- **面板次之**：无覆盖层时，显示当前 Tab 面板的帮助
- **Game 特殊**：对局面板细分为 `setup` / `online` / `play` 三个子视图

**⚠️ 新增面板功能或弹窗时**，需同步更新 `help.json`、`help_panel.js` 的映射表、`i18n/strings.js` 的翻译文本。

**帮助条目写法约定**：`keys` 列只写用户可执行的操作、快捷键或可操作 UI 元素。自动保存、自动替换、实时刷新、权限限制等被动功能不要与按键/鼠标操作并列；应写入相关操作或控件的描述文本中。若条目对应可自定义快捷键，优先在 `help.json` 中使用 `actions` 引用 `key_bindings.js` 的 action，避免功能速查显示过期默认键。

### 0.6 i18n 国际化

所有用户可见文本必须使用 i18n 键，通过 `window.t(key)` 或 `data-i18n` 属性翻译。词典分布在 4 个文件中（见第 6 节）。切换语言后触发 `i18n:changed` 事件。

### 0.7 主题系统 CSS 变量

所有颜色、阴影、字体等**必须通过 CSS 变量**（`--bg-start`, `--surface`, `--text`, `--primary-2` 等）引用，禁止硬编码颜色值。特殊变量：
- `--font-mono`：等宽字体栈（全主题统一）
- `--font-kbd`：键盘标签字体（默认等于 `--font-mono`，典雅主题覆盖为衬线体）

### 0.8 变更后必须更新公告

每次做完**用户可见的变更**后，必须更新 `base/announcements.json`：优先在最新日期条目中合并或追加变更项，必要时新建一条公告。

#### 公告写法规范

公告面向**终端用户**，不是开发日志。必须遵守以下规则：

1. **禁止出现实现细节**：不写 CSS 变量名（`--hdr-pad`）、CSS 单位（`vh`/`vw`/`em`/`rem`）、选择器名（`#header_title`）、JS 函数名、算法名称、文件路径等
2. **用户视角描述**：写用户能感知到的变化（"头栏按钮不再拥挤"），不写怎么实现的（"改用 vw clamp"）
3. **具体场景 + 可感知结果**：不要只写"更平滑"、"更协调"、"更自然"、"更稳定"。这些词可以用，但必须带上具体对象和用户能看到的问题或改善
4. **一句话一条**：每条 ≤ 20 字为佳，最长不超过 30 字。不用破折号、分号展开解释
5. **前缀分类**：`新增：` / `优化：` / `修复：`，不用 `added` / `improved` / `fixed`
6. **合并同类项**：同一天、同功能、同一用户感知结果的变更合并为一条描述；不要为了追求每条字数短而拆成多条。纯内部重构（用户无感知）不写入公告
7. **保留历史日期**：公告同时承担更新时间线记录；历史日期下的内容失效时，应改写为合规的用户视角摘要，不要直接删除该日期条目，除非用户明确要求删除
8. **标题也要像用户公告**：优先写"头栏响应式优化"、"菜单横屏体验优化"这类区域和体验，不写"响应式细节优化"、"动态缩放重构"这类内部任务名
9. **参考已有公告的语气**，保持一致：
    - ✅ `"优化：中等窗口下菜单不再拥挤"`
    - ✅ `"修复：加载标题不再超出进度条"`
    - ✅ `"优化：帮助和公告弹窗不再拥挤"`
    - ❌ `"优化：加载页比例更协调"`
    - ❌ `"优化：弹窗缩放更平滑"`
    - ❌ `"修复：消除头栏 vh/vw 维度割裂——移除 --hdr-h (vh)，全部属性统一为 vw/rem 缩放"`
    - ❌ `"优化：将 strength_title 提取为 #header 直接子元素，消除补偿 margin-right clamp"`

### 0.9 代码审查原则

- 减行数只针对 **js / css / html** 中的真正冗余（死代码、重复逻辑、无用 console.log 等）
- **不要删减 markdown 文档的文字内容来"减行数"**——文档内容不算代码膨胀
- 同类语义只保留一个权威实现：按钮、输入框、自定义下拉、切换器、日志、筛选、快捷键等如果出现相似的 hover/focus/active、渲染、事件或状态同步逻辑，先确定全局或共享 owner，再让局部消费它。
- 清理重复实现时必须改原定义并删除失效定义，不在后面追加更高优先级覆盖。能用全局类、主题 token、共享 helper 或浏览器原生能力表达的，不新建平行体系。
- 页面来源命名不能长期承担全局语义。某个类名、helper 或 CSS 文件如果从单面板扩散到多面板，应引入中性语义 owner，并把旧名称仅保留为兼容别名。
- 浮层类 UI（下拉、菜单、tooltip、popover）如果需要越过折叠、滚动或 overflow 容器，应由共享 portal/overlay owner 统一定位与清理；不要用提高 z-index、撑高父容器或隐藏内容来修补裁切。
- 自定义实现必须有明确收益；如果只是复刻原生控件或已有全局组件的行为，应退回更简单的实现或统一到既有组件。保留自定义层时，要把交互语义接入全局主题和状态规则。
- active/focus/hover 不得造成布局位移。分段按钮等控件不要用 `border` 简写覆盖单侧边框，优先使用 `border-color`、`outline` 或 inset ring。
- 输入框 + 按钮、筛选条等分段输入组不得通过删除 `border-left` / `border-right` 来拼接；应保留完整边框，用共享 owner 的负间距和状态 z-index 处理重叠边，避免 hover/focus 时某一侧边框消失。
- 审查相似按钮时先判定交互语义，再决定 owner：输入组按钮（搜索/刷新/模式）、连续分段选择轨（类型/结果/范围）、独立二态开关（如对局设置）即使外观接近，也不要仅因都带 `is-active` 就合并到同一套 CSS。若某个页面专属实现开始承载通用语义，应迁移到中性共享 owner；页面文件只保留布局和业务类名。
- 样式审查先判定规则语义、用户价值、作用范围和状态优先级，再决定修改方式；不要只看视觉相似就复用或覆盖。若规则只是提供装饰性质感，却会与 active、focus、hover、disabled、open、locked 等语义状态竞争，应优先回到 owner 重新设计或收敛规则，而不是用更复杂的选择器修补。
- 删除或合并已有 CSS 规则、共享 owner、状态规则前，应先说明具体用户可见变化（哪些 hover/focus/active/open/locked 行为会消失或保留），再给出选项让用户确认并继续执行；不要把确认包装成终止式汇报。尤其是交互状态、分段控件、二态开关和自定义控件退回共享实现这类会改变审查语义的清理。
- disabled/read-only/editable 是用户可感知状态，输入框、选择器、按钮等控件必须在 owner 样式中给出明确差异，不依赖浏览器默认灰度或透明度。
- 单行省略、按钮标签、placeholder 等文本不得依赖 padding 区域补足字形高度；应由内容行高和可见文本盒保证英文下缘、中文标点和混合字体不被裁切或覆盖。
- 同一行内互斥展开的面板应由一个共享高度 owner 负责开合；不要让一个面板收起、另一个面板展开同时各自动画高度，避免下方内容连续抖动。

### 0.10 标准窗口尺寸（样式验收基线）

以下窗口尺寸定义为本项目的**标准样式验收尺寸**，调样式时需至少覆盖：

- `371x675`（手机竖屏触发强制横屏时，对应约 `675x371` 视觉视口）
- `1180x692`（小桌面/平板横向）
- `1180x734`（小桌面/平板横向，稍高视口）
- `1872x1086`（标准大屏）
- `1912x948`（宽屏）

### 0.11 记录语义约定（AI Agent）

**注意**：当用户在任务中明确提出“先记录一下”或强调“记录”的含义时，默认应理解为**写入项目内的 markdown 文档**（如 `ARCHITECTURE.md`、`README.md` 等），而不是只写入 AI 的长期记忆。

### 0.12 响应式布局 CSS 反模式（设计规范）

> **⚠️ 迁移提示**：以下反模式作为通用禁止项仍然有效。但对于已迁移至**级联缩放模型**的组件，请以 §0.13 和 `REFACTOR_DYNAMIC_CSS.md` 中更具体的正向规范为准。

设计响应式 token 时禁止出现以下模式，因为它们会在每次调整尺寸时引发溢出或错位，且极难维护：

#### ❌ 耦合型偏移三元组

当某个元素使用 `position: absolute` 定位时，**不要**同时创建三条互相依赖的 token：
``
--container-padding: 46px;      /* 父容器留白 */
--element-top:       7px;       /* 元素距顶部 */
--element-right:     10px;      /* 元素距右侧 */
``
这三个值在每个断点都必须同步维护，任何一个改变都可能导致其他两个失效。

**✅ 正确做法**：用 `calc()` 从现有 token 推导，消除冗余变量
- 父容器内距：`padding-right: calc(var(--element-size) + 8px)` — 自动跟随元素尺寸
- 垂直居中：`top: calc((100% - var(--element-size)) / 2)` — 用父容器高度反推，无需额外 token
- 水平偏移：使用一个固定小值（如 `right: 8px`），不随断点变化

#### ❌ 像素值与字号不关联的间距

间距 token 每个断点都变化，但变化量与字号增长不成比例，说明它在试图手动跟踪字体大小的副作用。

**✅ 正确做法**：优先用 `em` / `rem` 单位，或将间距 token 用 `calc()` 基于 `--fs-root` 推导。

#### ❌ 固定高度代替弹性高度

对某个容器设定固定 `height` token，且该值需随内容字号逐断点手动调整，说明容器高度本应由内容自然撑开。

**✅ 正确做法**：仅在需要明确控制容器高度（如顶栏）时使用固定高度；必须使用时，检查是否可以用 `calc(var(--base-size) + Npx)` 从已有 token 一次性推导，而不是每个断点单独写值。

#### ❌ 覆盖式样式修复

修改任何场景的样式时，**不要**在新的选择器上重写属性来覆盖原有样式（导致优先级竞争和冗余代码）。

**✅ 正确做法**（适用于所有样式设计，不限于小屏/横屏）：
1. **如果原来的样式是响应式的（token 驱动），则不覆盖而改为修改参数值**。总之少用强制样式、增加可读性。对 `force-landscape` 等 JS 模式类同理：优先通过设置 CSS 变量来调参，让已有选择器自动消费新值。
2. **以改动原有参数为主。如果需要新写定义，要把原来失效的定义删掉，而不是覆盖**。不要在旧规则之后追加覆盖层，否则会累积大量优先级递增的冗余代码。

#### ❌ 小屏/横屏设计中删减功能

为了节省空间而隐藏（`display: none`）正常窗口中存在的功能元素。这会导致小屏用户丧失功能入口。

**✅ 正确做法**：小屏/横屏设计应在**正常窗口设计的基础上修改参数**（字号、间距、布局方向等），而不是直接删除或隐藏功能。若空间确实不足，优先改变布局形式（如绝对定位改流式定位、多列改单列），而非移除。

### 0.13 动态视口缩放样式设计规范（级联缩放模型）

当某个页面/组件需要在不同视口尺寸下**等比缩放**（而非仅在断点切换），应遵循以下**三层级联**模型。

> 完整迁移计划见 `REFACTOR_DYNAMIC_CSS.md`。

#### 基准窗口

以 **1912×948**（视口 `innerWidth × innerHeight`）为 100% 参考基准。所有 `clamp()` 的中间值按此基准计算百分比。

#### 三层级联模型

```
第 1 层：容器字号 ← clamp(min, Xvh 或 Xvw, max)    // 唯一与窗口直接关联的属性
第 2 层：内距/间距 ← Nem                              // 跟随字号，无需断点
第 3 层：子元素   ← 继承字号 或 重设字号建立新层级     // 不写冗余 font-size
```

- **纵向属性**（高度、字号）→ 用 **`vh`** + `clamp()`
- **横向属性**（宽度、列宽）→ 用 **`vw`** + `clamp()`
- **内距 / 间距**（padding、gap、margin）→ 用 **`em`**（跟随字号）
- **圆角半径**（border-radius）→ 使用全局 `--radius-*` token；随视觉高度 `vh` 缩放，强制横屏下换 `vw`
- **子元素字号** → `inherit`（不重复声明，除非需要建立新缩放层级）

#### 为什么 padding 跟随字号而非直接跟随窗口

容器宽度缩小时，如果字号没变小，padding 变小会显得拥挤；而真正需要 padding 变小时，通常字号也在变小——padding 的比例应跟随字号改变才符合视觉效果。因此 **padding 用 `em`，由字号间接关联窗口**。

#### 为什么不用 em 决定容器尺寸

`em` 基于字号，但无法确认每个容器高/宽适合多大的字体——耦合方向反了。容器高度与窗口高度关联、宽度与窗口宽度关联，这个方向维护起来清晰且解耦。

#### 具体示例

以 `tokens-section__header` 为例（基准 padding 10px 12px、字号 14px）：

```css
.tokens-section__header {
  /* 字号 ← 窗口高度 (vh)，基准 14px / 948 = 1.477vh */
  font-size: clamp(11px, 1.477vh, 16px);
  /* 内距 ← 字号 (em)，基准 10/14 ≈ 0.714em, 12/14 ≈ 0.857em */
  padding: 0.714em 0.857em;
}
.tokens-section__title { font-weight: 600; }           /* 继承 header 字号 */
.tokens-section__ops   { gap: 0.5em; }                  /* 间距跟随继承的字号 */
```

效果链：窗口变小 → `1.477vh` 变小 → 字号变小 → `0.714em` 跟着变小 → 整个 header 等比缩小。

#### token 定义方式

仅为**容器字号**和**少量独立尺寸**定义 `clamp()` token（`:root` 级）：

```css
:root {
  --tp-fs-md:         clamp(11px, 1.477vh, 16px);     /* 字号 → vh */
  --tokens-input-h:   clamp(24px, 3.797vh, 40px);     /* 输入框高度 → vh */
  --tokens-kv-key-w:  clamp(80px, 8.368vw, 180px);    /* 键名列宽 → vw */
  --radius-md:        clamp(4px, 0.843882vh, 10px);   /* 圆角 → vh，基准 8px */
}
```

padding/gap/margin 不定义 token，在消费者中用 `em` 就地声明。

- 命名前缀与作用域对应：`--tp-fs-*`（面板共享字号）、`--tokens-*`（词元页组件级）

#### force-landscape 覆盖（vh↔vw 互换）

`force_landscape.js` 用 CSS `transform: rotate(90deg)` 将页面旋转 90°。旋转后 CSS 视口单位**不变**，但物理方向与视觉方向互换了：

| CSS 单位 | 物理尺寸（典型手机） | 旋转后的视觉方向 |
|---|---|---|
| `1vh` | 物理高度的 1%（~675px → 6.75px） | 视觉**宽度** |
| `1vw` | 物理宽度的 1%（~371px → 3.71px） | 视觉**高度** |

因此，正确做法是在 `html.force-landscape {}` 中将 token 的 **vh 换成 vw、vw 换成 vh**，保持动态缩放而非退回固定值：

```css
html.force-landscape {
  /* 字号：正常模式跟随窗口高度(vh)，横屏后视觉高度=物理宽度→换 vw */
  --tp-fs-md:        clamp(11px, 1.477vw, 16px);
  --tp-fs-sm:        clamp(10px, 1.266vw, 14px);
  --radius-md:       clamp(4px, 0.843882vw, 10px);

  /* 纵向尺寸：同理换 vw */
  --tokens-input-h:  clamp(24px, 3.797vw, 40px);
  --tokens-log-max-h:clamp(140px, 27.426vw, 300px);

  /* 横向尺寸：正常模式跟随窗口宽度(vw)，横屏后视觉宽度=物理高度→换 vh */
  --tokens-kv-key-w: clamp(80px, 8.368vh, 180px);
}
```

效果：在不同尺寸的手机上仍保持等比缩放，不会因为固定像素值而失去动态能力。在极小屏下由 `clamp()` 的 min 值兜底。

同时注意：CSS 视口宽 ≈ 371px 会命中 `@media (max-width: 480px)` 断点，但视觉宽度 ~675px 实际不需要布局切换（如 `flex-wrap: wrap`）。对于此类**布局形态**属性，仍需在 force-landscape 中显式重置。

#### 继承链注释规范

每个动态缩放组件的 CSS 文件顶部必须用注释标明**尺寸继承关系**：

```css
/* ── .tokens-section__header ─────────────────────────
 * 尺寸继承链：
 *   字号     ← vh（窗口高度），clamp(11px, 1.477vh, 16px)
 *   纵向内距 ← em（字号），0.714em
 *   横向内距 ← em（字号），0.857em
 *   高度     ← auto（由字号 + 内距撑开）
 *
 * 向下传递：
 *   → .tokens-section__title   字号：继承本元素
 *   → .tokens-section__ops     字号：继承；gap ← 0.5em
 *     → .btn                   内距 ← em（btn 自身字号）
 * ──────────────────────────────────────────────────── */
```

#### 冗余样式清理

迁移时主动删除以下语义多余的定义：

| 模式 | 处理方式 |
|---|---|
| 不会动态伸缩的 `min-width` / `max-width` | 删除，用 `flex-basis` 替代 |
| 子元素重复声明已继承的 `font-size` | 删除 |
| `!important` 覆盖链 | 修改选择器优先级或删除 |
| 仅改尺寸的 `@media` 断点块 | 删除，由 `clamp()` 连续适配 |
| 固定像素圆角（小控件/缩放组件） | 改用 `--radius-*` token；语义圆形保留 `--radius-full` / `--radius-pill` |

#### 检查清单（每次提交前）

1. ✅ 该组件的字号是否已用 `clamp(min, Xvh, max)` 定义？
2. ✅ 该组件的 padding/gap/margin 是否全部使用 `em`？
3. ✅ 圆角是否使用 `--radius-*`，并避免小屏下固定像素显得过圆？
4. ✅ 子元素是否通过 `inherit` 获取字号，而非重复声明？
5. ✅ 1912×948 下的渲染值是否与改动前完全一致？
6. ✅ force-landscape token 块是否已将 vh↔vw 互换（而非固定值）？
7. ✅ 继承链注释是否完整（来源、向下传递、特殊尺寸）？
8. ✅ 是否清理了冗余的 min/max、!important、重复 font-size？

---

## 1. 项目概览

本项目是一个**单页应用（SPA）卡牌游戏前端**，基于 Foundation Sites CSS 框架实现多 Tab 面板切换，通过 `data-include` 属性异步加载 HTML 局部模板（partials），支持 Socket.IO 在线多人对局，并提供三套主题（light / dark / elegant）。

### 入口文件

| 文件 | 说明 |
|---|---|
| `index.html` | 主页面。登录后进入，包含所有 Tab 面板（程序/技能/牌库/将池/草稿/词元/权限/对局） |
| `login.html` | 登录/注册页。独立页面，无 Foundation Tabs |

### 技术栈

- **UI 框架**: Foundation Sites 6（Tabs、Reveal、Grid）
- **DOM 操作**: jQuery（仅用于 Foundation 初始化和部分替换逻辑）+ 原生 DOM API
- **在线对局**: Socket.IO 4.7.5（CDN）
- **图片裁剪**: Cropper.js 1.6.2（CDN）
- **构建**: 无构建工具，全部 `<script>` 标签按序加载，通过 `?v=` 时间戳缓存刷新
- **后端**: 配套 Node.js 后端（`backend-project/`），通过 REST API + Socket.IO 通信
- **模块化**: IIFE + `window` 全局命名空间（无 ES Modules / CommonJS）

---

## 2. 目录结构

```
card-html/
├── index.html                  # 主入口页面
├── login.html                  # 登录页
├── style.css                   # 全局基础样式（兼容层、布局）
├── base/                       # 静态数据文件（公告、压缩映射）
├── Foundation-Sites-CSS/       # Foundation CSS/JS 框架（vendor）
│   ├── css/foundation.css
│   └── js/vendor/              # jQuery, what-input, foundation.js
├── function/                   # 【核心】业务逻辑脚本（非对局）
│   ├── app_bootstrap.js        # 主页启动引导
│   ├── page_loading.js         # 加载遮罩层与进度条
│   ├── admin/                  # 管理面板（词元、权限、审核）
│   ├── animation/              # 动画工具（高亮、滚动、文本入场）
│   ├── api/                    # API 端点配置
│   ├── auth/                   # 登录/注册/鉴权
│   ├── button/                 # 按钮交互（切换/替换/隐藏）
│   ├── i18n/                   # i18n 运行时引擎
│   ├── replace/                # 术语/名称 DOM 替换系统
│   ├── state/                  # 全局状态（term_status）
│   ├── summon/                 # 角色/技能区块渲染（从 API 拉取数据）
│   └── ui/                     # UI 组件（主题、Tab、Toast、弹窗管理...）
├── game/                       # 【核心】对局模块
│   ├── data/                   # 对局数据模板
│   ├── i18n/                   # 对局相关 i18n 词典
│   ├── scripts/                # 对局逻辑与 UI
│   └── styles/                 # 对局专属样式
├── i18n/                       # 全局 i18n 词典
├── pages/                      # 独立子页面（如 health_bar.html）
├── partials/                   # HTML 局部模板（通过 data-include 加载）
├── scripts/                    # 构建辅助脚本（bust-version.js）
├── source/                     # 静态资源（字体、角色图片）
└── style/                      # 全局样式文件
    ├── media/                  # 响应式媒体查询样式
    └── modals/                 # 弹窗/侧边栏样式
```

---

## 3. 样式体系

### 3.1 全局样式 (`style/`)

> **✅ 迁移完成**：词元面板样式（原 `tokens.css`、`tokens_log.css`）已拆分至 `style/panel/tokens/`；权限面板样式（原 `permissions.css`）已拆分至 `style/panel/permissions/`。详见 `REFACTOR_DYNAMIC_CSS.md`。

| 文件 | 职责 |
|---|---|
| `style.css`（根目录） | 全局基础样式：body 背景渐变、flex 布局、通用类 |
| `style/theme.css` | **主题系统核心**：CSS 变量定义（`:root` 浅色 + `html[data-theme="dark"]` 深色）包含 ~100 个变量：颜色、阴影、字体、间距 |
| `style/theme_elegant.css` | **典雅主题**：`html[data-theme="elegant"]` 覆盖变量，墨底金色、衬线字体 |
| `style/fonts.css` | 字体 @font-face 声明（康熙字典体等） |
| `style/header.css` | 顶部导航栏（静态样式：颜色、阴影、过渡） |
| `style/header/_variables.css` | 头栏动态 token + FL 互换 + 响应式选择器（✅ 全 vw/rem，无 vh，0 断点） |
| `style/footer.css` | 底部固定栏 |
| `style/buttons.css` | 统一按钮样式（`.btn--primary`、`.btn--secondary` 等） |
| `style/animations.css` | 文本入场动画（`.animate-in`） |
| `style/panel/tokens/_variables.css` | 词元面板动态 token（clamp + force-landscape） |
| `style/panel/tokens/toolbar.css` | 词元面板顶部工具栏 |
| `style/panel/tokens/summary.css` | 词元面板摘要统计卡片 |
| `style/panel/tokens/section.css` | 词元面板分区容器 |
| `style/panel/tokens/card.css` | 词元卡片 |
| `style/panel/tokens/kv.css` | 键值对行 + 内联编辑 |
| `style/panel/tokens/nest.css` | 嵌套结构 |
| `style/panel/tokens/log.css` | 变更日志面板 |
| `style/panel/tokens/animation.css` | 词元页动画（card-in、collapsible、toast） |
| `style/panel/permissions/filters.css` | 权限页日志筛选条 |
| `style/panel/permissions/editor.css` | 权限页行内编辑器 |
| `style/panel/permissions/rows.css` | 权限页用户行、标签、过渡、参数高亮 |
| `style/collapsible.css` | 折叠/展开动画（`.collapsible`、`.is-open`） |
| `style/row_highlight.css` | 行高亮条覆盖层 |
| `style/term_button.css` | 术语按钮样式 |
| `style/skill_copy.css` | 技能行复制按钮（Ctrl 按下时显示） |
| `style/back_to_top.css` | 回到顶部按钮 |
| `style/page_loading.css` | 加载遮罩层与进度条 |
| `style/login.css` | 登录页专属样式 |
| `style/tooltip.css` | 悬浮提示框 |
| `style/custom_select.css` | 自定义下拉选择器 |

**样式复用约定**：新增或重构控件前，先查找同类页面/组件的既有实现并复用全局语义类。按钮优先使用 `.btn` 及 `.btn--secondary` / `.btn.is-active` 等状态范式；滚动区域优先使用 `.scrollbar-thin` / `.scrollbar-hidden`；不要为单个页面临时自创一套颜色、滚动条或切换按钮样式，除非已有范式无法表达该交互。

**前端重构检查点**：移植或复刻已有工具时，先保留原工具的信息架构和心智模型，再做网页化细化。树、表格、属性面板等结构化编辑器要先确认“哪一列是自动显示、哪一列可编辑、分界线是否全局对齐、主题色是否随 `var(--surface)`/主题变量变化”；搜索框+按钮、状态切换、输入焦点等基础控件必须先对照词元页、权限页或全局按钮系统的既有范式，不能只凭局部截图临时拼样式。

**交互状态语义约定**：hover/focus/open/active/disabled 是全局交互语言，不是组件私有装饰。原生 `input/select/button`、`.btn`、`.tokens-input`、`.custom-select__trigger`、`.setup-click-toggle` 这类视觉上承担同一职责的控件，必须共享同一套边框、焦点、悬浮和激活状态口径。浅色/深色主题下焦点反馈保持克制；典雅主题允许保留金色质感，但应集中在主题层表达。修复这类问题时改原选择器或 token，不新增后置覆盖层。

### 3.2 弹窗样式 (`style/modals/`)

| 文件 | 职责 |
|---|---|
| `base.css` | 弹窗/侧边栏基础样式（背景遮罩、面板动画） |
| `sidebar.css` | 侧边栏菜单 |
| `account-info.css` | 账号信息弹窗 |
| `avatar.css` | 头像上传/裁剪弹窗 |
| `announcements.css` | 更新公告弹窗 |
| `tokens-create.css` | 创建词元弹窗 |
| `tokens-edit.css` | 编辑词元弹窗 |

### 3.3 响应式样式 (`style/media/`)

> **⚠️ 迁移提示**：级联缩放模型（§0.13）将用 `clamp()` 替代大部分断点规则，已迁移组件的 `@media` 块会被清理。`force_landscape.css` 中的横屏覆盖将改为 vh↔vw 互换的 token 重定义。详见 `REFACTOR_DYNAMIC_CSS.md`。

| 文件 | 职责 |
|---|---|
| ~~`header.css`~~ | ✅ 已迁移至 `style/header/_variables.css`（全 vw/rem / 0 断点） |
| `game_controls.css` | 对局控制按钮响应式布局 |
| `summary_roles.css` | 角色摘要卡片响应式 |
| `main_perspective.css` | 主视角面板响应式 |
| `area_windows.css` | 区域窗口响应式 |
| `cards.css` | 卡牌尺寸响应式（定义 `--card-w` 变量） |
| `move_log.css` | 移动日志响应式 |
| `processing_area.css` | 处理区响应式 |
| `force_landscape.css` | 强制横屏模式下的布局 |
| `footer.css` | 底栏响应式 |

### 3.4 对局样式 (`game/styles/`)

| 文件 | 职责 |
|---|---|
| `game_layout.css` | 对局页整体布局（三栏结构） |
| `game_board.css` | 公共区域（牌堆、弃牌堆、处理区） |
| `game_cards.css` | 卡牌外观（正面/背面、花色/点数） |
| `game_roles.css` | 角色面板（手牌区、装备区、判定区） |
| `game_widgets.css` | 对局小组件（面包屑、速度控制等） |
| `game_viewer.css` | 卡牌检视浮窗 |
| `role_animations.css` | 角色相关动画（受伤闪烁等） |
| `role_summary.css` | 角色摘要卡片样式 |
| `role_judge_hover.css` | 判定区悬浮样式 |
| `context_menu.css` | 右键上下文菜单 |
| `online_setup.css` | 在线设置面板 |
| `online_room.css` | 在线房间大厅 |

### 3.5 主题系统工作原理

```
html                          → 浅色（默认，无 data-theme）
html[data-theme="dark"]       → 深色（theme.css 中定义）
html[data-theme="elegant"]    → 典雅（theme_elegant.css 覆盖）
```

- 所有组件通过 CSS 变量（`--bg-start`, `--surface`, `--text`, `--primary-2` 等）引用颜色
- `function/ui/theme.js` 在 `<head>` 最先加载，从 `localStorage('theme')` 读取并立即设置 `data-theme`，防止 FOUC
- 切换时使用 View Transitions API（Chromium 111+）或 `.theme-switching` class 降级方案
- 典雅主题额外使用衬线字体、金色（`#d3ad6b`）主色调

---

## 4. 脚本模块

### 4.1 `function/` — 业务逻辑

#### 4.1.1 顶层文件

| 文件 | 职责 | 命名空间/导出 | 依赖 |
|---|---|---|---|
| `app_bootstrap.js` | 主页启动：等待 `partialsReady` → Foundation 初始化 → 召唤角色区块 → 术语/名称替换 → 代词校验 | `window.replacementsReady`（Promise）| `partialsReady`, `summonCharacters`, `replace_*`, `decompress` |
| `page_loading.js` | 加载遮罩层：随机文案、动态字距、进度条、完成检查后淡出 | 直接操作 DOM | `partialsReady` |

#### 4.1.2 `function/api/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `endpoints.js` | 统一 API 端点配置：`base`/`getBase`/`setBase`/`api`/`abs`/各资源路径 | `window.endpoints` |

#### 4.1.3 `function/auth/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `login.js` | 登录/注册表单逻辑（仅 `login.html`） | 直接操作 DOM |
| `login_check.js` | 页面加载时检查 JWT 有效性，过期/缺失则跳转 `login.html` | 直接操作 DOM |
| `backend_toggle.js` | 登录页后端切换（公网/本地） | 直接操作 DOM |

#### 4.1.4 `function/state/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `term_status.js` | 全局术语显示状态（pronoun、tickQuantifier 等开关） | `window.term_status` |

#### 4.1.5 `function/i18n/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `i18n.js` | i18n 运行时引擎：语言切换（zh/en/debug 循环）、`t()` 翻译函数、`data-i18n` 属性自动翻译、`i18n:changed` 事件 | `window.i18n`（`t`, `getLang`, `setLang`, `nextLang`, `apply`）、`window.t()` |

#### 4.1.6 `function/button/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `utils.js` | 按钮通用工具：颜色切换、显隐、标签替换 | `window.ButtonUtils` |
| `hide.js` | 元素隐藏/显示切换（tickQuantifier 等） | `window.elementHideCheck()` |
| `replace.js` | 术语标签替换切换（equaling、roundUp、pronoun、include 等多态切换） | `window.elementReplaceCheck()`, `window.pronounReplaceCheck()` |
| `strength.js` | 国力强度切换（太平/升平/衰乱） | `window.check_strength()`, `window.change_strength()` |
| `wave.js` | 按钮波纹点击动画 | `new WaveButtonManager()` → `window.add_button_wave()` |

#### 4.1.7 `function/replace/`

| 文件 | 职责 | 命名空间/导出 | 依赖 |
|---|---|---|---|
| `utils.js` | 替换模块共享工具：JSON 缓存（`fetchJsonCached`）、双击滚动+高亮绑定（`bindDblclickAndHighlight`） | `window.fetchJsonCached()`, `window.bindDblclickAndHighlight()` | — |
| `replace_common.js` | 通用 DOM 扫描 + MutationObserver 封装（`scanAndObserve`） | `window.scanAndObserve()` | — |
| `decompress.js` | 解压缩映射：读取 `base/compression.json`，将自定义标签包裹前后缀 | `window.decompress()` | `fetchJsonCached` |
| `character_name.js` | 角色名替换：`<characterName class="characterID{id}">` → 中文名 | `window.replace_character_name()` | `scanAndObserve`, `bindDblclickAndHighlight`, `scrollActions` |
| `skill_name.js` | 技能名替换：类名匹配 → 中文名 + Lore 悬浮提示 | `window.replace_skill_name()` | `scanAndObserve`, `bindDblclickAndHighlight` |
| `card_name.js` | 卡牌名替换：自定义标签名（如 `<ATTACK>`）→ 中文名 | `window.replace_card_name()` | `scanAndObserve`, `bindDblclickAndHighlight`, `scrollActions` |
| `term.js` | 术语替换：自定义标签（如 `<round>`）→ 中文文本 + 颜色 + 交互绑定 | `window.replace_term()` | `scanAndObserve`, `bindDblclickAndHighlight` |

#### 4.1.8 `function/summon/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `standard_characters_block.js` | 从 API 拉取角色+技能数据，渲染"将池"面板的角色段落 | `window.summonCharacters()`, `window.CharacterReplace()` |
| `standard_character_skills_block.js` | 渲染"技能"面板的按技能名排序的技能列表 | `window.summonCharacterSkill()`, `window.CharacterSkillReplace()` |

#### 4.1.9 `function/animation/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `highlight.js` | 统一高亮动画函数库：淡入淡出、典雅主题金色混合 | `window.addStandardHighlight()`, `window._blendWithGold()` |
| `text_animation.js` | 文本入场动画控制器：IntersectionObserver + Tab 切换重播 | `new TextAnimationController()` |
| `panel_scroll_memory.js` | Tab 切换时记忆/恢复滚动位置 | IIFE 内部 |
| `row_highlight.js` | 行高亮条（贯穿屏幕宽度）：淡入→停留→淡出 | `window.highlightRowAtElement()` |
| `scroll_actions.js` | 统一滚动+闪烁高亮工具：Tab 切换后滚动到目标元素 | `window.scrollActions` |

#### 4.1.10 `function/ui/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `theme.js` | 主题初始化（`<head>` 最先加载）：读取 `localStorage('theme')`、设置 `data-theme`、View Transitions | `window.setTheme()` |
| `theme_toggle_button.js` | 主题切换按钮（light→dark→elegant→light） | `window.ThemeToggle` |
| `force_landscape.js` | 手机竖屏强制横屏：检测触屏+窄屏条件、创建 `#fl-rotate` / `#fl-scroll` 旋转容器 | `window.__flTransformRect()`, `window.__flOffsetTopTo()`, `html.force-landscape` |
| `touch_scroll.js` | 旋转容器触摸滚动：在 transform 父元素内恢复触摸滚动+惯性 | `window.TouchScrollManager`（`install`） |
| `color_utils.js` | 颜色工具：解析/反转/混合（支持 hex/rgb/hsl） | `window.ColorUtils` |
| `include_loader.js` | `data-include` 局部模板加载器：扫描→fetch→替换→移除占位 | `window.partialsReady`（Promise） |
| `toast.js` | 全局 Toast 通知（成功/错误，自动消失） | `window.showToast()` |
| `tabs.js` | Tab 切换逻辑：标题更新、管理员面板控制、鼠标滚轮切换 Tab | IIFE 内部 |
| `event_bindings.js` | 全局按钮事件绑定（strength、pronoun、include 等切换按钮） | IIFE 内部 |
| `tooltip.js` | 轻量级悬浮提示管理器（`data-tooltip` 属性触发） | IIFE 内部 |
| `custom_select.js` | 原生 `<select>` → 主题化自定义下拉组件 | `window.CustomSelect`（`init`, `wrap`, `refresh`, `refreshAll`） |
| `custom_select_fit.js` | 下拉选项文字自适应缩小工具（Canvas 测量+二分搜索精确拟合） | `window._CustomSelectFit`（`fitOptionTexts`, `measureTextWidth`） |
| `shared_search.js` | 将池/技能面板共享搜索框 | IIFE 内部 |
| `draft_panel.js` | 草稿面板：HTML 编辑+预览（带术语替换） | `window.draftPanel` |
| `announcements.js` | 更新公告弹窗：读取 `base/announcements.json`、卡片渲染 | IIFE 内部 |
| `skill_copy.js` | 技能行 Ctrl+复制按钮（仅 admin/moderator） | IIFE 内部 |
| `back_to_top.js` | 回到顶部按钮 | IIFE 内部 |
| `collapsible.js` | 程序面板标题折叠（H1/H2/H3 层级） | IIFE 内部 |
| `collapsible_transition.js` | 折叠/展开 CSS height 过渡动画工具 | `window.CollapsibleTransition`（`expand`, `collapse`） |
| `key_bindings.js` | 快捷键设置系统：自定义绑定、录制、持久化 | `window.KeySettings` |
| `game_settings.js` | 对局设置弹窗：速度滑块、拖拽惯性滑块 | IIFE 内部 |
| `lang_toggle_button.js` | 语言切换按钮 | IIFE 内部 |

#### 4.1.11 `function/ui/manager/` — CardUI Manager 系统

账号管理、侧边栏、弹窗的子系统，使用 `window.CardUI.Manager` 命名空间。

| 文件 | 职责 | 命名空间 |
|---|---|---|
| `index.js` | 初始化命名空间：`CardUI.Manager.Core`、`CardUI.Manager.Controllers` | `window.CardUI.Manager` |
| `bootstrap.js` | 启动入口：等待 `partialsReady` → 绑定事件 → 刷新用户数据 | — |
| **core/** | | |
| `core/dom.js` | DOM/URL 助手：`$`, `qs`, `abs`, `api`, `resolveAvatarUrl`, `show`, `hide` | `CardUI.Manager.Core.dom` |
| `core/errors.js` | 错误处理：解析 HTTP 响应错误 | `CardUI.Manager.Core.errors` |
| `core/messages.js` | Toast/消息提示工具 | `CardUI.Manager.Core.messages` |
| `core/user_service.js` | 用户数据刷新服务：从服务端拉取并同步 `localStorage` | `CardUI.Manager.Core.userService` |
| **controllers/** | | |
| `controllers/overlay.js` | 统一覆盖层系统：导航栈管理所有菜单和弹窗 | `CardUI.Manager.Controllers.overlay` |
| `controllers/avatar.js` | 头像上传/裁剪控制器（使用 Cropper.js） | `CardUI.Manager.Controllers.avatar` |
| `controllers/profile_inline_edit.js` | 用户名/简介行内编辑控制器 | `CardUI.Manager.Controllers.profileInlineEdit` |
| `controllers/approvals.js` | 审核面板控制器（注册审核、头像审核） | `CardUI.Manager.Controllers.approvals` |
| `controllers/account_update_form.js` | 修改密码表单控制器 | `CardUI.Manager.Controllers.accountUpdateForm` |
| `controllers/account_info.js` | 账号信息弹窗控制器 | `CardUI.Manager.Controllers.accountInfo` |
| `controllers/bindings.js` | 全局事件绑定初始化（菜单→弹窗→ESC 关闭等） | `CardUI.Manager.Controllers.bindings` |
| `controllers/session.js` | 会话控制器：登出 + 清理 `localStorage` | `CardUI.Manager.Controllers.session` |

#### 4.1.12 `function/admin/` — 管理面板

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `approvals.js` | 审核模块：注册审核 + 头像审核（admin/moderator） | `window.fetchPendingUsers()`, `window.fetchPendingAvatars()` |
| `collapsible_anim.js` | 通用折叠/展开动画工具 | `window.CollapsibleAnim`（`openCollapsible`, `closeCollapsible`） |
| `time_fmt.js` | 时间格式化：绝对/相对、locale 推断 | `window.TimeFmt`（`parseTimeValue`, `formatRel`, `formatAbsForLang`） |
| `log_utils.js` | 日志面板共享工具：复制、删除、悬浮时间切换 | `window.LogUtils` |

##### `function/admin/tokens/` — 词元管理

| 文件 | 职责 | 命名空间 |
|---|---|---|
| `state.js` | 全局状态容器 | `window.tokensAdmin.state` |
| `utils.js` | 通用工具（auth 读取等） | `window.tokensAdmin` |
| `api.js` | 词元 API 封装 | `window.tokensAdmin` |
| `data.js` | 数据处理/转换 | `window.tokensAdmin` |
| `diff.js` | 词元差异比较 | `window.tokensAdmin` |
| `schema.js` | 词元结构/校验 | `window.tokensAdmin` |
| `ui/search.js` | 搜索过滤 | `window.tokensAdmin` |
| `ui/render.js` | 词元列表渲染 | `window.tokensAdmin` |
| `ui/logger.js` | 词元操作日志 | `window.tokensAdmin` |
| `ui/modals.js` | 创建/编辑弹窗 | `window.tokensAdmin` |
| `actions/edit_delete.js` | 编辑/删除操作 | `window.tokensAdmin` |
| `actions/go.js` | "前往"操作 | `window.tokensAdmin` |
| `index.js` | 入口：DOMContentLoaded 后初始化 | `window.renderTokensDashboard()` |
| `i18n/strings.js` | 词元模块 i18n 词典 | `window.I18N_STRINGS`（追加） |

##### `function/admin/permissions/` — 权限管理

| 文件 | 职责 | 命名空间 |
|---|---|---|
| `ui.js` | UI 工具：Toast、标签、按钮、DOM 工厂 | `window.TokensPerm.UI` |
| `constants.js` | 常量配置（如标签展示上限） | `window.TokensPerm.constants` |
| `api.js` | 权限 API 封装（GET/POST/DELETE） | `window.TokensPerm.API` |
| `render/render.js` | 权限列表渲染主逻辑（搜索、预取缓存、进出场动画） | `window.TokensPerm._RenderUI`、`window.TokensPerm.renderPermissionsPanel` |
| `render/render_content.js` | 单个用户权限块渲染（行 + 编辑器） | 通过 `TokensPerm._RenderUI` 共享 |
| `init.js` | 入口：暴露全局函数、管理员预渲染 | `window.renderPermissionsPanel()` |
| `logs/logs.js` | 权限变更日志 UI（类型过滤、格式预览） | `window.TokensPerm._LogsUI` |
| `logs/logs_data.js` | 日志数据层（获取、事件绑定、语言切换） | `window.TokensPerm.hydrateUserLogs()` |
| `i18n/strings.js` | 权限模块 i18n 词典 | `window.I18N_STRINGS`（追加） |

---

### 4.2 `game/scripts/` — 对局模块

#### 4.2.1 顶层定义

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `game_def.js` | 游戏流程树定义（回合→阶段→时机节点），节点类型 `process`/`ticking`/`tick` | `window.Game.Def.GAME_FLOW` |
| `game_core.js` | 流程引擎核心：流程推进、事件堆栈、自动前进（auto-advance） | `window.Game.Core`（`startGame`, `advance`, `getCurrentNode`, `setSpeed`, `isInTurn`, `isInteractive`, `checkAutoAdvance`） |
| `game_controller.js` | 游戏控制器：模式切换（auto/sandbox）、启动游戏 | `window.Game.Controller`（`init`, `startGame`, `switchMode`, `setSpeed`）、`window.Game._ControllerInternal` |
| `game_controller_dispatch.js` | **控制器调度层**：统一 `dispatch(actionType, payload)` 处理 `place`/`move`/`modifyHealth` 等动作 + CardMoveAnimator 快照 | 通过 `window.Game._ControllerInternal` 共享 |
| `game_main.js` | 对局初始化入口：绑定按钮、初始化 CustomSelect/SetupManager/Online 模块 | `window.initGame()` |

> **Split File 模式**: `game_controller.js` 暴露 `_ControllerInternal` 内部对象，`game_controller_dispatch.js` 通过 `const I = window.Game._ControllerInternal` 访问共享状态和工具方法。

#### 4.2.2 `game/scripts/core/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `utils.js` | 游戏工具函数（shuffle 等） | `window.Game.Utils` |
| `models.js` | 数据模型：`Card` 类（名称/花色/点数/可见性）、`Area` 类（区域/配置/固定槽位）| `window.Game.Models`（`Card`, `Area`） |
| `state.js` | 全局游戏状态：玩家列表、回合、流程栈、事件栈、牌堆/弃牌堆/处理区 | `window.Game.GameState`, `window.Game.MockData` |
| `events.js` | **事件系统核心**：`trigger()`/`recover()`/`loss()`/`cure()`/`damage()` 等，每个事件拆分为 before/when/after 步骤 | `window.Game.Core.Events` |

#### 4.2.3 `game/scripts/engines/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `sandbox_engine.js` | 沙盒模式引擎：手动操作（无自动流程推进），用于自由测试 | `window.Game.Engines.SandboxEngine` |

#### 4.2.4 `game/scripts/ui/`

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `state.js` | UI 状态：`termColors` Map、`getMainPlayer`、`getCurrentTurnPlayer`、`setPerspective` | `window.Game.UI`（基础属性） |
| `utils.js` | UI 工具：`hexToRgba`、`getAdaptiveColor`（暗/典雅主题自动反色） | `window.Game.UI.hexToRgba`, `window.Game.UI.getAdaptiveColor` |
| `term_manager.js` | 术语数据管理：加载术语颜色、缓存、数据访问助手 | `window.Game.UI.loadTermColors`, `window.Game.UI.getTermData` |
| `text_renderer.js` | GameText 统一文本渲染器：模板注册 + `{key}` 替换 + `<tagName></tagName>` 术语标签 | `window.Game.UI.GameText` |
| `move_log.js` | 卡牌移动日志系统（沙盒模式）：记录/显示/过滤 | `window.Game.UI.MoveLog` |
| `context_menu.js` | 右键上下文菜单：通用渲染器 + 卡牌/角色/区域专用菜单 | `window.Game.UI.ContextMenu` |
| `card_viewer.js` | 卡牌检视浮窗（多实例）：轮盘滚动、z-index 管理 | `window.Game.UI.viewers` |
| `view_switch.js` | 对局面板视图切换：setup / online / play 三个互斥视图 | `window.Game.UI.switchGameView` |
| `setup_manager.js` | 游戏设置面板：人数、武将选择、牌堆预设、模式切换 | `window.Game.Setup` |
| `main.js` | Game UI 入口：`init()` → 加载术语颜色 → 渲染 → 初始化 Inspector | `window.Game.UI.init` |
| `inspector.js` | 检查器（Tooltip）：鼠标悬浮显示卡牌/角色详情 | `window.Game.UI.Inspector` |

##### `game/scripts/ui/renderers/` — 渲染器（拆分模块）

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `render_utils.js` | 安全渲染（`safeRender`：脏检查防抖）、`updateSpreadLayouts`（自适应牌间距） | `window.Game.UI.safeRender`, `window.Game.UI.updateSpreadLayouts` |
| `card_renderer.js` | 卡牌渲染：`renderCardList`（平铺/堆叠区域的卡牌 DOM 生成） | `window.Game.UI.renderCardList` |
| `role_renderer_utils.js` | 角色渲染共享工具：名字自适应缩放（`fitSummaryName`）、手牌检视器、判定区按钮、装备按钮 | `window.Game.UI._RoleUtils` |
| `role_self_renderer.js` | 自身角色渲染（底部面板）：头像、血条、手牌区、装备区、判定区 | `window.Game.UI.updateSelfRoleInfo` |
| `role_list_renderer.js` | 其他角色列表渲染（左/上/右三栏布局）：摘要卡片 | `window.Game.UI.renderRoleList` |
| `board_renderer.js` | 公共区域渲染：牌堆、弃牌堆、处理区（堆叠/平铺） | `window.Game.UI.renderBoard` |
| `control_renderer.js` | 控制按钮渲染：暂停/继续、出牌、结束回合 | `window.Game.UI.updateControls` |
| `main_renderer.js` | 主渲染入口：`updateUI` → 调用面包屑 + 控制 + 角色 + 牌面 + 公共区域渲染 + 术语着色 | `window.Game.UI.updateUI`, `window.Game.UI.applyTermStyle` |

> **渲染器拆分模式**: `role_renderer_utils.js` 暴露 `_RoleUtils`，`role_self_renderer.js` 和 `role_list_renderer.js` 通过解构导入共享工具。

##### `game/scripts/ui/interactions/` — 拖拽交互系统

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `index.js` | 拖拽状态管理 + 事件绑定（mousedown/touchstart → mousemove/touchmove → mouseup/touchend） | `window.Game.UI.DragState`, `window.Game.UI.DragConfig` |
| `sorting.js` | 拖拽排序逻辑：占位符移动、跨容器排序、FLIP 动画 | 通过 `Game.UI` 共享 |
| `animation.js` | 拖拽动画循环：缓动插值（lerp）、倾斜效果、requestAnimationFrame 渲染 | 通过 `Game.UI` 共享 |
| `card_move_animator.js` | **卡牌移动动画器（Part A）**：`snapshotBeforeMove` 拍快照 → 配置 → 区域到 DOM 容器映射 | `window.Game.UI.CardMoveAnimator`、`window.Game.UI._CardMoveInternal` |
| `card_move_animation.js` | **卡牌移动动画器（Part B）**：弧形飞行动画、FLIP 布局动画、贝塞尔曲线计算 | 通过 `_CardMoveInternal` 共享 |

> **Split File 模式**: `card_move_animator.js` 暴露 `_CardMoveInternal`，`card_move_animation.js` 通过 `const I = window.Game.UI._CardMoveInternal` 访问。

#### 4.2.5 `game/scripts/online/` — 在线多人对局

| 文件 | 职责 | 命名空间/导出 |
|---|---|---|
| `room_client.js` | Socket.IO 客户端：连接管理、房间创建/加入/离开、消息广播、事件系统 | `window.Game.Online.RoomClient`（`connect`, `createRoom`, `joinRoom`, `leaveRoom`, `broadcastAction`, `on`, `off`） |
| `sync_manager.js` | **状态同步（Part A - 接收端）**：监听远程操作、反序列化/应用状态、视角映射 | `window.Game.Online.SyncManager`、`window.Game.Online._SyncInternal` |
| `sync_broadcaster.js` | **状态同步（Part B - 广播端）**：拦截本地 dispatch、序列化并广播到房间 | 通过 `_SyncInternal` 共享 |
| `room_ui.js` | 在线房间 UI：大厅列表、创建/加入房间表单、成员列表、观战 | `window.Game.Online.RoomUI` |

> **Split File 模式**: `sync_manager.js` 暴露 `_SyncInternal`，`sync_broadcaster.js` 通过它共享状态。

---

## 5. 页面组件 (`partials/`)

通过 `function/ui/include_loader.js` 异步加载，所有 `<div data-include="partials/xxx.html">` 在 `partialsReady` Promise resolve 后完成注入。

| 文件 | 职责 |
|---|---|
| `header.html` | 顶部导航栏：Tab 标签列表（程序/技能/牌库/将池/草稿/词元/权限/对局） + 侧边栏按钮 |
| `footer.html` | 底部固定栏 |
| `modals.html` | 所有弹窗容器：侧边栏菜单、账号菜单、设置菜单、修改密码弹窗、审核弹窗、头像弹窗、裁剪弹窗、账号信息弹窗、公告弹窗、按键设置弹窗、对局设置弹窗 |
| `panel_term.html` | "程序"面板：主内容区，包含术语文档、自定义标签 |
| `panel_card.html` | "牌库"面板：卡牌列表 |
| `panel_skill.html` | "技能"面板：技能列表 + 搜索 |
| `panel_character.html` | "将池"面板：角色段落 + 搜索 |
| `panel_draft.html` | "草稿"面板：HTML 编辑+预览 |
| `panel_tokens.html` | "词元"面板：词元管理（仅 admin） |
| `panel_permissions.html` | "权限"面板：用户权限管理（仅 admin） |
| `panel_game.html` | "对局"面板：游戏设置、在线房间、对局 UI |

---

## 6. 国际化 (`i18n/`)

### 工作原理

1. **词典文件**（纯 JS，在 i18n.js 之前加载）：
   - `i18n/strings.js` — 全局词典（导航、弹窗、账号、通用文案）
   - `game/i18n/strings.js` — 对局词典（游戏按钮、在线房间、面包屑）
   - `function/admin/tokens/i18n/strings.js` — 词元模块词典
   - `function/admin/permissions/i18n/strings.js` — 权限模块词典

2. **词典格式**：每个文件是一个 IIFE，将 `{ zh: {...}, en: {...} }` 对象合并到 `window.I18N_STRINGS`

3. **运行时引擎** (`function/i18n/i18n.js`)：
   - `window.i18n.t(key, params)` / `window.t(key, params)` — 翻译函数
   - `window.i18n.getLang()` / `setLang(lang)` / `nextLang()` — 语言切换（zh → en → debug 循环）
   - `window.i18n.apply(rootEl)` — 扫描 `data-i18n` 属性并翻译
   - 语言存储在 `localStorage('lang')`
   - 切换后触发 `window.dispatchEvent(new Event('i18n:changed'))`

4. **HTML 用法**：
   ```html
   <span data-i18n="nav.term">程序</span>
   <input data-i18n-attr="placeholder" data-i18n-placeholder="login.username.placeholder" />
   ```

5. **支持语言**: `zh`（中文）、`en`（英文）、`debug`（调试语言，需权限 `赞拜不名`）

---

## 7. 数据文件

### 7.1 `base/`

| 文件 | 内容 |
|---|---|
| `announcements.json` | 更新公告数组：`{ date, title, changes[] }`，由 `announcements.js` 读取渲染 |
| `compression.json` | HTML 压缩映射数组：`{ name, pre, suf }`，由 `decompress.js` 读取，将自定义标签包裹前后缀 HTML |

### 7.2 `game/data/`

| 文件 | 内容 |
|---|---|
| `text_templates.js` | GameText 模板注册：回合/阶段/区域名称→术语标签映射，供 `game/scripts/ui/text_renderer.js` 使用 | `window.Game.UI.GameText.templates`（追加） |

---

## 8. 关键架构模式

### 8.1 命名空间模式

项目不使用 ES Modules，而是通过 IIFE + 全局命名空间组织代码：

```javascript
// 典型模式
(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};
    // ... 在此定义功能 ...
    window.Game.UI.xxx = xxx;
})();
```

**主要命名空间树**：

```
window.Game                         # 对局模块根
├── .Def                            # 游戏流程定义（game_def.js）
├── .Models                         # Card, Area 类（core/models.js）
├── .Utils                          # 工具函数（core/utils.js）
├── .Core                           # 流程引擎（game_core.js）
│   └── .Events                     # 事件系统（core/events.js）
├── .GameState                      # 全局游戏状态（core/state.js）
├── .MockData                       # 模拟数据
├── .Controller                     # 游戏控制器（game_controller.js）
├── .Engines.SandboxEngine          # 沙盒引擎
├── .Setup                          # 游戏设置（ui/setup_manager.js）
├── .UI                             # 所有 UI 功能
│   ├── .termColors                 # Map: 术语→颜色
│   ├── .GameText                   # 文本渲染器
│   ├── .MoveLog                    # 移动日志
│   ├── .ContextMenu                # 右键菜单
│   ├── .Inspector                  # 检查器
│   ├── .DragState / .DragConfig    # 拖拽状态
│   ├── .CardMoveAnimator           # 卡牌移动动画器
│   ├── .viewers                    # 检视浮窗注册表
│   ├── ._RoleUtils                 # 角色渲染共享工具
│   ├── ._CardMoveInternal          # 卡牌动画内部共享
│   ├── .updateUI()                 # 主渲染入口
│   ├── .renderCardList()           # 卡牌列表渲染
│   ├── .renderBoard()              # 公共区域渲染
│   ├── .updateSelfRoleInfo()       # 自身角色渲染
│   ├── .renderRoleList()           # 其他角色渲染
│   ├── .updateControls()           # 控制按钮渲染
│   └── .switchGameView()           # 视图切换
└── .Online                         # 在线对局
    ├── .RoomClient                 # Socket.IO 客户端
    ├── .SyncManager                # 同步管理器
    ├── ._SyncInternal              # 同步内部共享
    └── .RoomUI                     # 房间 UI

window.CardUI.Manager               # 账号/弹窗管理系统
├── .Core
│   ├── .dom                        # DOM 工具
│   ├── .errors                     # 错误处理
│   ├── .messages                   # 消息提示
│   └── .userService                # 用户数据服务
└── .Controllers
    ├── .overlay                    # 覆盖层导航栈
    ├── .avatar                     # 头像控制器
    ├── .profileInlineEdit          # 行内编辑控制器
    ├── .approvals                  # 审核控制器
    ├── .accountUpdateForm          # 密码修改控制器
    ├── .accountInfo                # 账号信息控制器
    ├── .bindings                   # 全局事件绑定
    └── .session                    # 会话控制器

window.TokensPerm                    # 权限管理模块
├── .UI                             # UI 工具
├── .API                            # API 层
├── .constants                      # 常量
├── ._RenderUI                      # 渲染内部共享
├── ._LogsUI                        # 日志 UI 内部共享
└── .renderPermissionsPanel()        # 全局入口

window.tokensAdmin                   # 词元管理模块
├── .state                          # 状态
└── (各子模块)

window.i18n                          # 国际化引擎
window.endpoints                     # API 端点配置
window.ButtonUtils                   # 按钮工具
window.ColorUtils                    # 颜色工具
window.CollapsibleAnim               # 折叠动画
window.TimeFmt                       # 时间格式化
window.LogUtils                      # 日志工具
window.CustomSelect                  # 自定义下拉
window._CustomSelectFit              # 下拉选项文字自适应
window.TouchScrollManager            # 旋转容器触摸滚动
window.CollapsibleTransition         # 折叠/展开过渡动画
window.KeySettings                   # 快捷键设置
window.ThemeToggle                   # 主题切换
window.scrollActions                 # 滚动工具
window.term_status                   # 术语状态
window.partialsReady                 # partials 加载完成 Promise
window.replacementsReady             # 术语替换完成 Promise
```

### 8.2 Split File 模式（_Internal 命名空间 + Part B 导入）

当一个模块逻辑过大需要拆分为多文件时，采用 `_Internal` 共享模式：

```javascript
// Part A (file_a.js): 定义核心 + 暴露 _Internal
(function() {
    const _internal = { sharedState, helperFn };
    window.Namespace._Internal = _internal;
    window.Namespace.publicAPI = { ... };
})();

// Part B (file_b.js): 通过 _Internal 访问共享状态
(function() {
    const I = window.Namespace._Internal;
    // 使用 I.sharedState, I.helperFn
    // 扩展 publicAPI
})();
```

**使用此模式的文件对**：
- `game_controller.js` + `game_controller_dispatch.js`（`Game._ControllerInternal`）
- `sync_manager.js` + `sync_broadcaster.js`（`Game.Online._SyncInternal`）
- `card_move_animator.js` + `card_move_animation.js`（`Game.UI._CardMoveInternal`）
- `role_renderer_utils.js` + `role_self_renderer.js` + `role_list_renderer.js`（`Game.UI._RoleUtils`）
- `permissions/render/render.js` + `render_content.js`（`TokensPerm._RenderUI`）
- `permissions/logs/logs.js` + `logs_data.js`（`TokensPerm._LogsUI`）

**使用独立工具模块模式的文件对**（工具文件先加载、主文件通过 `window` 引用）：
- `custom_select_fit.js` → `custom_select.js`（`_CustomSelectFit`）
- `touch_scroll.js` → `force_landscape.js`（`TouchScrollManager`）
- `collapsible_transition.js` → `collapsible.js`（`CollapsibleTransition`）

### 8.3 事件系统 (`game/scripts/core/events.js`)

游戏事件采用**三步触发模式**：

```
before{Event} → when{Event}（执行实际逻辑）→ after{Event}
```

例如伤害事件：`beforeDamage → whenDamage → afterDamage`

事件通过 `Events.trigger(name, steps, context, onStep, onFinish)` 推入 `GameState.eventStack`，由 `game_core.js` 的自动推进机制驱动步骤前进。事件可嵌套（外层事件推入新事件后，新事件优先处理）。

### 8.4 主题系统

```
theme.js (head 最先加载)
  └→ localStorage('theme') → apply data-theme
  └→ window.setTheme(t) → freezeAnimated → ViewTransition / fallback

theme.css
  └→ :root { --bg-start, --surface, --text, --primary-2, ... }  (浅色)
  └→ html[data-theme="dark"] { ... }  (深色)

theme_elegant.css
  └→ html[data-theme="elegant"] { ... }  (典雅)

theme_toggle_button.js
  └→ light → dark → elegant → light 循环

color_utils.js
  └→ 反色/混合 (用于术语颜色在浅色主题下的自适应)

game/scripts/ui/utils.js
  └→ getAdaptiveColor() 在浅色主题下反转术语颜色
```

### 8.5 data-include 局部模板加载系统

```
index.html
  └→ <div data-include="partials/header.html">

include_loader.js (head 加载)
  └→ DOMContentLoaded → 扫描所有 [data-include]
  └→ fetch(url) → 将 HTML 插入 → 移除占位 div
  └→ window.partialsReady (Promise) resolve

app_bootstrap.js
  └→ 等待 partialsReady → $(document).foundation() → 后续初始化
```

所有依赖 DOM 的模块都通过 `window.partialsReady.then(...)` 确保 partials 已注入。

### 8.6 Socket.IO 在线对局流程

```
用户操作                     模块调用链
─────────                   ────────────────────
点击"创建房间"    →  room_ui.js → room_client.js → Socket.IO → 服务器
                        ↓
加入房间          →  room_ui.js → room_client.js (joinRoom)
                        ↓
开始游戏          →  setup_manager.js → game_controller.js (startGame)
                        ↓
本地操作(出牌等)  →  game_controller_dispatch.js → dispatch('move', payload)
                        ↓
广播              →  sync_broadcaster.js → interceptDispatch()
                        → room_client.js → broadcastAction() → Socket.IO
                        ↓
远程接收          →  room_client.js (on 'gameAction')
                        → sync_manager.js → onRemoteAction()
                        → 应用到 GameState → updateUI()
```

**数据流**: `RoomClient`（传输层）→ `SyncManager`（接收/应用）→ `SyncBroadcaster`（拦截/广播）→ `RoomUI`（界面层）

---

## 9. 常见开发任务速查

### 添加新按钮

1. **HTML**: 在对应 `partials/panel_*.html` 中添加 `<button class="btn btn--primary" data-i18n="your.key">文字</button>`
2. **样式**: `style/buttons.css` 添加变体（如需）
3. **事件绑定**: 在 `function/ui/event_bindings.js` 或对应模块中绑定点击事件
4. **i18n**: 在 `i18n/strings.js` 的 `zh` / `en` 对象中添加翻译键

### 添加新词元状态

1. **API**: 后端新增字段（`backend-project/`）
2. **Schema**: `function/admin/tokens/schema.js` 添加字段定义
3. **UI/Render**: `function/admin/tokens/ui/render.js` 添加展示逻辑
4. **UI/Modals**: `function/admin/tokens/ui/modals.js` 添加编辑表单字段
5. **Diff**: `function/admin/tokens/diff.js` 添加变更检测
6. **i18n**: `function/admin/tokens/i18n/strings.js` 添加翻译

### 添加新主题

1. **CSS**: 创建 `style/theme_xxx.css`，定义 `html[data-theme="xxx"] { --bg-start: ...; --text: ...; }`
2. **加载**: 在 `index.html` 中添加 `<link>` 引用
3. **theme.js**: `apply` 函数中添加 `if(t==='xxx') return root.setAttribute('data-theme','xxx')`
4. **切换**: `theme_toggle_button.js` 中修改循环顺序，添加新主题到 `mode()` → `onClick()` 链
5. **特殊处理**: 如需特殊效果（如典雅主题的金色混合），在 `function/animation/highlight.js` 的 `_blendWithGold` 等函数中添加条件

### 添加新对局功能

1. **数据模型**: `game/scripts/core/models.js` 添加新类或扩展 `Card`/`Area`
2. **事件**: `game/scripts/core/events.js` 添加新事件（三步：before/when/after）
3. **流程**: `game/scripts/game_def.js` 修改流程树（如需新阶段）
4. **引擎**: `game/scripts/engines/sandbox_engine.js` 添加手动模式支持
5. **调度**: `game/scripts/game_controller_dispatch.js` 添加新 `actionType` 处理
6. **渲染**: 在 `game/scripts/ui/renderers/` 中添加/修改渲染逻辑
7. **i18n**: `game/i18n/strings.js` 添加翻译

### 添加新右键菜单项

1. **定义菜单**: `game/scripts/ui/context_menu.js` → `renderMenu(x, y, title, actions)` 中添加新 action
2. **注册触发**: 在对应渲染器（如 `card_renderer.js`、`role_self_renderer.js`）中添加 `contextmenu` 事件监听
3. **样式**: `game/styles/context_menu.css`

### 添加新快捷键

1. **注册 Action**: `function/ui/key_bindings.js` → `ACTIONS` 对象中添加新项
   ```javascript
   'your_action': { label: 'Your Action', default: { key: 'x' }, btnId: 'key-bind-your-action' }
   ```
2. **按键设置 UI**: `partials/modals.html` 中的快捷键弹窗添加对应按钮
3. **响应逻辑**: 在对应模块中通过 `KeySettings.getBinding('your_action')` 检测按键并执行
4. **i18n**: 在词典中添加 `modal.keySettings.yourAction` 翻译

### 添加新弹窗

1. **HTML**: 在 `partials/modals.html` 中添加弹窗 DOM（使用 `.modal` 类）
2. **注册**: `function/ui/manager/controllers/overlay.js` → `PANELS` 对象中注册面板 ID
3. **控制器**: 在 `function/ui/manager/controllers/` 下新建控制器文件
4. **触发**: 在 `function/ui/manager/controllers/bindings.js` 中绑定触发按钮 → `overlay.open('your-modal-id')`
5. **样式**: 在 `style/modals/` 下添加专用样式文件
6. **加载**: 在 `index.html` 中添加 `<link>` 和 `<script>` 引用
7. **帮助**: 在 `base/help.json` 的 `overlays` 中添加该面板的帮助条目
8. **帮助映射**: 在 `function/ui/help_panel.js` 的 `OVERLAY_TITLE_KEY` 中添加 `'your-modal-id': 'help.overlay.yourModal'`
9. **i18n**: 在 `i18n/strings.js` 中添加帮助标题和描述的翻译键

---

## 10. 用户功能速查（与帮助系统同步）

> 以下内容与 `base/help.json` + `i18n/strings.js` 中的帮助文本对应。每个功能区域列出：用户可见行为、实现文件、技术细节。

### 10.1 全局功能

| 操作 | 用户行为 | 实现文件 |
|---|---|---|
| `?` 键 | 打开/关闭当前上下文的功能速查帮助 | `function/ui/help_panel.js` + `base/help.json` |
| 切换主题快捷键 | 快速切换主题（浅色 → 深色 → 典雅），按键可在按键设置中修改 | `function/ui/key_bindings.js` + `function/ui/theme_toggle_button.js` |
| 导航栏滚轮 | 滚动鼠标滚轮快速切换 Tab 面板 | `function/ui/tabs.js` |
| ☰ / 头像按钮 | 打开侧边栏菜单 | `function/ui/manager/controllers/bindings.js` |
| 动态标签（全局） | 术语/卡牌名/角色名/技能名标签悬停高亮，双击跳转定义处 | `function/replace/*.js`（MutationObserver 全局生效） |

### 10.2 侧边栏菜单 (`sidebar-menu`)

**导航路径**: ☰ 按钮 → 侧边栏 → 各子项

| 菜单项 | 用户行为 | 跳转目标 |
|---|---|---|
| 账号 → | 打开账号子菜单（名片/密码/头像） | `account-menu` overlay |
| 设置 → | 打开设置子菜单（按键设置/对局设置/功能速查） | `settings-menu` overlay |
| 审核 | 查看并审批待审核的用户注册申请 | `approve-user-modal` overlay |
| 更新公告 | 查看版本更新公告 | `announcements-modal` overlay |
| 主题 / 语言 | 直接切换深浅色主题或界面语言 | 就地切换，无新 overlay |
| 退出 | 退出当前账号，跳转到登录页 | `controllers/session.js` |

**实现**: `partials/modals.html`（侧边栏 DOM）→ `controllers/bindings.js`（事件绑定）→ `controllers/overlay.js`（导航）

### 10.3 账号子菜单 (`account-menu`)

| 菜单项 | 用户行为 | 跳转目标 |
|---|---|---|
| 名片 | 查看或编辑用户名片（头像/用户名/简介） | `account-info-modal` |
| 密码 | 修改登录密码（需输入旧密码验证） | `update-account-modal` |
| 头像 | 上传新头像并裁剪；需管理员审核后生效 | `avatar-modal` |

### 10.4 设置子菜单 (`settings-menu`)

| 菜单项 | 用户行为 | 跳转目标 |
|---|---|---|
| 按键设置 | 自定义快捷键绑定（展开术语/检查属性/切换主题） | `key-settings-modal` |
| 对局设置 | 调整对局时机播放速度和拖动惯性 | `game-settings-modal` |
| 功能速查 | 打开帮助面板 | `help_panel.js` toggleHelp() |

### 10.5 弹窗功能详览

#### 修改密码 (`update-account-modal`)

| UI 元素 | 用户行为 |
|---|---|
| 旧密码 | 输入当前密码验证身份 |
| 新密码 / 确认 | 输入新密码（至少 6 位）并再次确认 |
| 更新按钮 | 提交后自动跳转到登录页重新登录 |

**实现**: `controllers/account_update_form.js` → `PUT /api/change-password`
**样式**: `style/modals/base.css`

#### 审核管理 (`approve-user-modal`)

| UI 元素 | 用户行为 |
|---|---|
| 注册审核 | 查看待审核的新用户注册申请，逐个批准或拒绝 |
| 头像审核 | 查看用户提交的新头像，批准或拒绝 |
| 用户名/简介 | 审核用户名或个人简介的变更申请 |
| 权限限制 | 仅管理员 (admin) 和版主 (moderator) 可查看 |

**实现**: `controllers/approvals.js` + `function/admin/approvals.js` → `GET /api/pending-users`, `GET /api/avatar/pending`, `GET /api/username/pending`, `GET /api/intro/pending`

#### 头像管理 (`avatar-modal`)

| UI 元素 | 用户行为 |
|---|---|
| 当前头像 | 显示当前已生效的头像 |
| 上传头像 | 点击选择图片文件，进入裁剪流程 |
| 审核中 | 如有待审核头像，在下方显示预览 |

**实现**: `controllers/avatar.js` → 选择文件后打开 `avatar-crop-modal`
**样式**: `style/modals/avatar.css`

#### 裁剪头像 (`avatar-crop-modal`)

| UI 元素 | 用户行为 |
|---|---|
| 拖拽 / 滚轮 | 拖拽移动图片、滚轮缩放，裁剪框固定 1:1 比例 |
| 裁剪并上传 | 按当前选区裁剪为 512×512 图片并上传；需管理员审核 |
| 取消 | 取消裁剪，返回头像管理 |

**实现**: `controllers/avatar.js`（Cropper.js `viewMode: 1, aspectRatio: 1, dragMode: 'move'`）→ `POST /api/upload/avatar`（FormData）
**输出**: 512×512 PNG

#### 账号名片 (`account-info-modal`)

| UI 元素 | 用户行为 |
|---|---|
| 头像 / 角色 | 显示头像、用户名、角色徽章（管理员/版主/用户/访客） |
| 用户名 | 点击编辑图标可修改用户名（最多 12 字符）；变更需审核 |
| 个人简介 | 点击简介区域可编辑个人简介（最多 500 字符）；变更需审核 |
| 点击用户名行 | 复制用户名到剪贴板 |
| 权限徽章 | 特殊权限以徽章形式显示在角色旁（如仪同三司 = 免审核） |

**实现**: `controllers/account_info.js` + `controllers/profile_inline_edit.js`（行内编辑用户名/简介）
**数据源**: `localStorage`（登录时缓存的用户数据）
**样式**: `style/modals/account-info.css`

#### 更新公告 (`announcements-modal`)

| UI 元素 | 用户行为 |
|---|---|
| 公告卡片 | 每条公告显示为卡片，包含标题、日期和变更列表 |
| 分类标签 | 变更自动分为"新增""优化""修复"三类 |
| 重要标记 | 带 ★ 标记的公告为重要更新 |

**实现**: `function/ui/announcements.js` → `fetch('base/announcements.json')`
**数据**: `base/announcements.json`（`{ title, date, important, changes[] }`）
**样式**: `style/modals/announcements.css`

#### 按键设置 (`key-settings-modal`)

| UI 元素 | 用户行为 |
|---|---|
| 展开所有术语 | 设置一键展开全部折叠术语的快捷键 |
| 显示属性 | 设置长按显示属性面板的快捷键（默认 Ctrl） |
| 切换深浅色 | 设置切换深浅色主题的快捷键（默认 T） |
| 草稿编辑器快捷键 | 设置聚焦搜索、清除选择、添加子节点、添加同级节点、编辑选中节点、删除选中节点、变体插入的快捷键 |
| Esc / Backspace | Esc 恢复默认按键，Backspace 清除绑定 |

**实现**: `function/ui/key_bindings.js`（`ACTIONS` 对象定义可绑定操作）→ `localStorage` 持久化

#### 对局设置 (`game-settings-modal`)

| UI 元素 | 用户行为 |
|---|---|
| 时机速度 | 控制对局时机推进速度（0 为最快，范围 0-1000ms） |
| 拖动惯性 | 调整拖动手牌的惯性手感（6 档：即时/灵敏/轻盈/中等/较重/非常重） |
| 重置 | 恢复所有设置到默认值 |

**实现**: `function/ui/game_settings.js` → `localStorage` 持久化

### 10.6 Tab 面板功能

#### 程序面板 (`panel_term`)

| 操作 | 用户行为 |
|---|---|
| ▾ 三角按钮 | 点击标题前的三角按钮，折叠/展开该章节内容；状态自动保存 |
| 展开所有术语 | 在按键设置中绑定快捷键，可一键展开所有折叠的术语 |
| 动态标签 | 术语、卡牌名、角色名等标签悬停高亮，双击跳转到对应面板定义处 |

**实现**: `function/ui/collapsible.js`（折叠）+ `function/replace/*.js`（动态标签）
**内容源**: `partials/panel_term.html`（静态 HTML + 自定义 XML 标签）

#### 技能面板 (`panel_skill`)

| 操作 | 用户行为 |
|---|---|
| 搜索框 | 输入关键词实时过滤技能列表 |
| 检查键（按住） | 按住按键设置中的检查键后悬停技能行，出现复制按钮，点击复制整行文本 |
| 动态标签 | 描述中的术语、卡牌名、角色名标签同样支持悬停高亮与双击跳转 |

**实现**: `function/ui/shared_search.js` + `function/ui/skill_copy.js` + `function/summon/standard_character_skills_block.js`

#### 牌库面板 (`panel_card`)

| 操作 | 用户行为 |
|---|---|
| 动态标签 | 卡牌名按类型着色（基本牌绿 / 锦囊牌橙），描述中的术语、角色名标签悬停高亮，双击跳转 |

**内容源**: `partials/panel_card.html`

#### 将池面板 (`panel_character`)

| 操作 | 用户行为 |
|---|---|
| 搜索框 | 输入关键词实时过滤武将列表 |
| 技能名悬停 | 悬停武将的技能名，显示该武将专属的典故引言浮层（Lore Tooltip） |
| 动态标签 | 描述中的术语、卡牌名、技能名标签支持悬停高亮与双击跳转 |

**实现**: `function/ui/shared_search.js` + `function/summon/standard_characters_block.js` + `function/replace/skill_name.js`（Lore Tooltip）

**⚠️ Lore Tooltip 仅在此面板生效**——判定依据是 `<characterSkillElement>` 的 class 中包含 `LoreCharacterID{id}` 格式。

#### 草稿面板 (`panel_draft`)

| 操作 | 用户行为 |
|---|---|
| 输入区 | 在输入区编写 HTML 代码，右侧实时预览渲染结果；预览会自动替换自定义标签，输入内容会自动保存 |
| 元素库 | 搜索并插入词元或快捷片段，支持中文、拼音和首字母 |
| 点击元素 | 插入到选中节点子级；未选中时插入到结构树末尾 |
| 拖拽位置 | 拖到节点上半、下半或中部时，分别前插、后插或作为子级插入 |
| 变体快捷键 | 按住按键设置中的变体键，使用快捷片段的第二种结构；树区显示变体徽标 |
| 结构树 | 选中后再次点击或双击节点，在树内直接编辑标签名 |
| 属性栏 | 编辑 class 和 epithet |
| 单向 / 双向 | 切换相关推荐的关系方向，并在日志中记录推荐结果 |
| 输入 / 输出 | 从草稿框输入到结构树，或输出回草稿框 |
| 拖动节点 | 拖拽结构树节点调整层级或同级顺序 |
| 草稿快捷键 | 在按键设置中修改聚焦搜索、清除选择、添加子节点、添加同级节点、编辑、删除节点和变体插入的快捷键 |

**实现**: `function/ui/draft_panel.js`（草稿输入/预览桥接）+ `editor/scripts/data.js`（元素数据）+ `editor/scripts/recommendations.js`（推荐关系）+ `editor/scripts/key_actions.js`（编辑器快捷键声明）+ `editor/scripts/panel.js`（编辑器交互）

#### 词元面板 (`panel_tokens`，仅 admin)

| 操作 | 用户行为 |
|---|---|
| 搜索框 | 搜索框输入关键词可实时过滤词元列表 |
| 刷新 | 点击刷新按钮重新从服务器加载词元数据 |
| 缩略/详细 | 点击按钮切换显示模式，缩略模式隐藏英文名、颜色标签、序号 |
| 点击值 | 点击词元的属性值可行内编辑；颜色字段会出现取色器 |
| 跳转按钮 | 点击跳转按钮可跳转到对应面板的术语/牌/武将/技能位置 |
| 日志面板 | 展开底部日志面板查看词元变更历史 |
| 日志操作 | 复制、删除或清空词元日志记录 |

**实现**: `function/admin/tokens/`（完整子模块：state/api/data/diff/schema/ui/actions）

#### 权限面板 (`panel_permissions`，仅 admin)

| 操作 | 用户行为 |
|---|---|
| 搜索框 | 搜索框按用户名或 ID 过滤用户列表 |
| 部分/完全 | 切换部分/完全模式，控制权限编辑界面的显示范围 |
| 用户条目 | 点击用户条目展开权限编辑（角色/密码/权限项） |
| 日志 | 展开日志面板查看权限变更记录 |
| 日志筛选 | 按类型、结果和日期筛选权限变更记录 |

**实现**: `function/admin/permissions/`（完整子模块：ui/constants/api/render/logs）

#### 对局面板 (`panel_game`)

对局面板有三个互斥子视图，由 `Game.UI.switchGameView()` 管理：

**通用按钮**:
| 操作 | 用户行为 |
|---|---|
| 设置 | 切换设置面板，配置座位数、牌堆预设和对局模式 |
| 在线 | 切换在线房间面板，创建或加入多人房间 |

**设置视图 (`setup`)**:
| 操作 | 用户行为 |
|---|---|
| 座位数 | 选择参与游戏的座位数；沙盒支持 1-10 人，自动模式支持 2-10 人 |
| 武将选择 | 为每个座位选择出场武将 |
| 牌堆预设 | 选择牌堆预设方案（如标准牌堆等） |
| 模式切换 | 沙盒模式手动控制回合，自动模式按流程推进；在线对局锁定为沙盒 |
| 旁观开关 | 允许或禁止旁观者加入房间（仅房主可见） |
| 开始游戏 | 配置完成后点击开始游戏进入对局 |

**在线视图 (`online`)**:
| 操作 | 用户行为 |
|---|---|
| 创建房间 | 输入房间名创建房间，或回车快速创建 |
| 房间列表 | 刷新查看房间状态、人数、禁旁观标签和可用操作 |
| 进入 / 加入 | 点击加入新房间；已在房间时可从列表重新进入房间内视图 |
| 返回大厅 | 返回大厅查看房间列表，但不离开当前房间 |
| 解散房间 | 房主可在房间列表中解散自己的房间 |
| 成员列表 | 房间内显示房主、自己和旁观状态 |
| 旁观 / 离开 | 在房间内切换旁观状态（如允许）或离开房间 |

**对局视图 (`play`)**:
| 操作 | 用户行为 |
|---|---|
| 拖拽卡牌 | 拖拽牌在手牌、牌堆、弃牌堆、处理区、判定区和装备区之间移动；同一区域内可排序 |
| 拖到摘要 | 将牌拖到某个摘要角色上松开，默认置入该角色手牌 |
| 悬停摘要 | 拖牌停在摘要角色上约 0.4 秒，摘要显示“判定区”后松开可置入判定区 |
| 点击摘要 | 点击摘要角色或当前角色面板，打开该角色手牌查看器 |
| 长按摘要 | 长按摘要角色或当前角色面板约 0.4 秒，打开该角色判定区查看器 |
| 判 / 備 | 点击角色上的“判”或“備”按钮，打开判定区或装备区查看器 |
| 牌堆 / 弃牌堆 | 点击牌堆或弃牌堆区域，打开对应区域查看器 |
| 区域窗口 | 查看器窗口可拖动，可在边缘自动滚动；Esc 或点击空白关闭 |
| 装备窗口 | 装备查看器按四个装备槽显示，可将牌拖入指定槽位 |
| 右键卡牌 | 右键卡牌可快速置于牌堆、弃牌堆、处理区或主视角角色区 |
| 右键角色 | 右键角色可切换视角、设置当前回合角色或处理体力变化 |
| 检查键 (按住) | 按住按键设置中的检查键悬停卡牌/角色/区域查看详细属性 |
| 玩家徽标 | 在线时摘要头像上方显示正在查看或旁观该角色的用户 |
| 时机/日志 | 侧边栏显示当前时机标签、流程面包屑和操作日志 |

**实现**: `game/scripts/`（完整子系统，详见第 4.2 节）

### 10.7 登录页 (`login.html`)

| 操作 | 用户行为 |
|---|---|
| 登录 | 输入用户名和密码登录 |
| 注册 | 输入用户名和密码注册新账号 |
| 切换后端 | 在公网后端和本地后端之间切换 |

**实现**: `function/auth/login.js` + `function/auth/backend_toggle.js`

# CSS 动态视口缩放重构计划

> **创建日期**: 2026-04-08
> **最后更新**: 2026-04-09
> **目标**: 将全站静态像素 + 媒体查询断点系统迁移为级联缩放模型，减少冗余断点代码，实现连续自适应布局
> **基准窗口**: 1912 * 948（`innerWidth * innerHeight`），即 ARCHITECTURE.md 0.13 所定义的 100% 参考

---

## 1. 核心思路

### 1.1 问题：断点式样式的维护成本

当前系统使用 `theme.css` 中的**固定像素 token**（`--fs-md: 14px`、`--space-sm: 8px` 等），在不同屏幕宽度下通过 `@media` 断点覆盖。每新增一个尺寸档位就需要：

1. 在媒体查询中写一组新的 token 值
2. 手动保持各档位之间的视觉比例一致
3. 在 `force-landscape` 等特殊模式中再次覆盖

这导致 CSS 行数膨胀、断点之间出现"跳变"、维护时需逐断点核对。

### 1.2 方案：级联缩放模型

采用**三层级联**架构，而非为每个属性单独写 `clamp()`：

```
窗口视口 (vh / vw)
  |-- 容器字号 (clamp + vh，与容器同比例缩放)
       |-- 内距 / 间距 (em，跟随字号自动缩放)
            |-- 子元素继承字号；子容器可重设字号建立新的缩放层级
```

#### 为什么字号跟随窗口、内距跟随字号

- **容器高度/宽度** ← 由 `clamp(min, Xvh/Xvw, max)` 直接关联窗口
- **字号** ← 同样用 `clamp(min, Xvh, max)`，与容器高度使用相同 `vh` 基准，比例恒定
- **内距 (padding)** ← 使用 `em` 单位跟随字号

**为什么 padding 不直接用 vh/vw？** 容器宽度缩小时，如果字号没变，padding 变小会显得拥挤；而真正需要 padding 变小时，通常字号也在变小——padding 的比例应跟随字号改变才符合视觉效果。因此 **padding 用 `em`，由字号间接决定**。

**为什么不用 `em` 决定容器尺寸？** `em` 基于字号，但无法确认每个高度/宽度适合多大的字体，耦合方向反了。而容器高度与窗口高度关联、宽度与窗口宽度关联，关系明确且解耦。

#### 具体示例

以 `tokens-section` 为例（基准窗口 1912x948 下 body 字号 18px、padding 10px 12px）：

```css
.tokens-section {
  /* 字号 ← 窗口高度 (vh)，基准 18px / 948 = 1.899vh */
  font-size: clamp(10px, 1.899vh, 20px);
  margin-top: 0.667em;              /* 12/18 */
}
.tokens-section__header {
  /* 内距 ← 字号 (em)，基准 10/18 = 0.556em, 12/18 = 0.667em */
  padding: 0.556em 0.667em;
}
```

效果链：窗口变小 → `1.899vh` 变小 → 字号变小 → `0.556em` 跟着变小 → 整个 section 等比缩小。只需定义一条 `clamp()` + 一条 `em`，**无需任何 `@media` 断点**。

子元素自动继承：

```css
.tokens-section__title { font-weight: 600; }           /* 继承 section 字号 */
.tokens-section__ops   { gap: 0.444em; }                /* 间距跟随继承的字号 */
```

全局 `.btn--sm` 按钮在面板内由 `_variables.css` 统一纳入级联体系——见 §4.5.2。

#### 换算公式

| 方向 | 公式 | 示例（基准 18px 字号） |
|---|---|---|
| 纵向 (vh) | `基准px / 948 * 100` | `18 / 948 * 100 = 1.899vh` |
| 横向 (vw) | `基准px / 1912 * 100` | `160 / 1912 * 100 = 8.368vw` |
| em 换算 | `目标px / 当前font-size` | `10px / 18px = 0.556em` |

在 1912x948 窗口下，`clamp()` 的中间值精确等于原始像素值，**视觉零差异**。

### 1.3 收益

| 维度 | 改进 |
|---|---|
| **代码量** | 删除绝大多数 `@media` 断点块 + 冗余的 min/max 定义，预计减少 40-60% 的样式行数 |
| **视觉连续性** | 不再有断点间的"跳变"，缩放窗口时平滑过渡 |
| **维护成本** | 新增组件只需定义容器的 `clamp()` 字号 + `em` 内距，无需逐尺寸调试 |
| **force-landscape** | 仅需在 `html.force-landscape {}` 中将 vh↔vw 互换，保持动态缩放 |
| **语义清晰** | 通过继承注释一眼看出尺寸传递链路，便于排查比例问题 |

---

## 2. 新 CSS 文件结构

### 2.1 设计原则

动态缩放的 token 天然有**层级依赖**关系——外层容器的尺寸决定内层元素的可用空间。因此按 **UI 组件的内外层级**组织文件。面板页（panel）与弹窗（modal）等属于不同层级的 UI 容器，分别建立独立的文件夹：

```
style/
+-- theme.css                      # 全局 token（颜色、阴影、字体栈、圆角、过渡）- 不变
+-- theme_elegant.css              # 典雅主题覆盖 - 不变
+-- fonts.css                      # 字体声明 - 不变
|
+-- panel/                         # 【新建】面板页动态样式
|   +-- tokens/                    #   词元面板（按层级拆分）
|   |   +-- _variables.css         #     (1) 词元面板 clamp() token + force-landscape 覆盖
|   |   +-- toolbar.css            #     (2) tokens-toolbar（搜索栏 + 按钮组）
|   |   +-- summary.css            #     (3) tokens-summary（统计卡片 grid）
|   |   +-- section.css            #     (4) tokens-section（分区容器：header + body）
|   |   +-- card.css               #     (5) token-card（单张词元卡片 + 工具条）
|   |   +-- kv.css                 #     (6) kv-row（键值对行 + 内联编辑）
|   |   +-- nest.css               #     (7) nest-block / arr-item（嵌套结构）
|   |   +-- log.css                #     (8) tokens-log（变更日志面板）
|   |   +-- animation.css          #     (9) 词元页动画（card-in、collapsible、toast）
|   |
|   +-- permissions/               #   权限面板（✅ 已完成，复用 tokens/_variables.css token）
|       +-- filters.css            #     日志筛选条
|       +-- editor.css             #     行内编辑器
|       +-- rows.css               #     用户行、标签、过渡、参数高亮
|
+-- modal/                         # 【未来】弹窗样式（从 style/modals/ 迁移）
|   +-- base.css
|   +-- sidebar.css
|   +-- announcements.css
|   +-- ...
|
+-- header/                        # 头栏（✅ 已完成：全 vw，无 vh，0 断点）
|   +-- _variables.css             #     --fs-root(vw) / --hdr-pad(vw) + 内联 vw clamp + FL 互换 + 选择器
+-- header.css                     # 头栏静态样式（颜色、阴影、过渡）
+-- footer.css                     # 底栏 - 已足够精简（1 断点），无需迁移
+-- buttons.css                    # 按钮 - 后续迁移
+-- ... (其他全局样式保留)
|
+-- media/                         # 【逐步清空】迁移完成后，断点文件逐步删除
|   +-- force_landscape.css        #   最终仅保留无法 token 化的全局横屏覆盖
|   +-- ...
|
+-- modals/                        # 现有弹窗样式（迁移至 modal/ 后删除）
```

### 2.2 命名约定

| 前缀 | 作用域 | 示例 |
|---|---|---|
| `--fs-root` | 全站 html 字号 | `clamp(13.5px, calc(12.14px + 0.714vw), 20px)` |
| `--hdr-*` | 头栏专属 | `--hdr-pad`, `--hdr-search-gap`（无 `--hdr-h`，高度用 rem） |
| `--tp-fs-*` | 词元面板共享字号 | `--tp-fs-md`, `--tp-fs-sm` |
| `--tokens-toolbar-*` | toolbar 组件专属 | `--tokens-toolbar-fs` |
| `--tokens-summary-*` | summary grid 专属 | `--tokens-summary-val-fs` |
| `--tokens-card-*` | token-card 专属 | `--tokens-card-fs` |
| `--tokens-kv-*` | kv-row 专属 | `--tokens-kv-key-w` |
| `--tokens-log-*` | log 面板专属 | `--tokens-log-max-h`, `--tokens-log-fs` |

### 2.3 继承链注释规范

每个组件文件的顶部必须用注释标明该组件的**尺寸继承关系**，包括：

- 自身尺寸的来源（viewport / 父容器 / 字号）
- 向下传递给哪些子元素
- 子元素如何消费继承值

格式规范：

```css
/* -- .tokens-section__header -----------------------------------------
 * 尺寸继承链：
 *   字号     <- vh（窗口高度），clamp(11px, 1.477vh, 16px)
 *   纵向内距 <- em（字号），0.714em
 *   横向内距 <- em（字号），0.857em
 *   高度     <- auto（由字号 + 内距撑开）
 *
 * 向下传递：
 *   -> .tokens-section__title   字号：继承本元素
 *   -> .tokens-section__ops     字号：继承；gap <- 0.5em
 *     -> .btn                   内距 <- em（btn 自身字号）
 * ------------------------------------------------------------------- */
```

这样在排查比例异常时，可通过注释快速定位到影响当前元素尺寸的源头。

---

## 3. 词元页迁移详细规划

### 3.1 迁移前的词元页样式文件（已删除）

| 文件 | 行数 | 包含的媒体查询 | 状态 |
|---|---|---|---|
| `style/tokens.css` | 307 | `@media (max-width: 480px)` - toolbar 换行 | ✅ 已删除 |
| `style/tokens_log.css` | 372 | `@media (max-width: 1024px/768px/480px)` - kv-row 列宽适配 | ✅ 已删除 |
| **合计** | **679** | **4 个断点块** | ✅ 已迁移至 `style/panel/tokens/` |

### 3.2 级联缩放 token 设计（1912x948 基准）

采用级联模型后，仅需为**容器字号**和**少量宽高属性**定义 `clamp()` token。padding/gap 全部使用 `em`；语义上多余的 min-width、max-width 等约束一并清理。

#### `_variables.css` 中定义的 token（:root 级）

| token | 基准 px | clamp 定义 | 消费者 |
|---|---|---|---|
| **共享字号** | | | |
| `--tp-fs-sm` | 12px | `clamp(8px, 1.266vh, 14px)` | tile label, btn--xs, log-pill |
| `--tp-fs-base` | 13px | `clamp(8px, 1.371vh, 15px)` | log body, code, btn--sm 集成 |
| `--tp-fs-md` | 14px | `clamp(9px, 1.477vh, 16px)` | 显式 var(--fs-md) 元素（input、btn、toast） |
| `--tp-fs-2xl` | 18px | `clamp(10px, 1.899vh, 20px)` | body 继承容器（toolbar、section、summary、card） |
| `--tp-fs-4xl` | 22px | `clamp(12px, 2.321vh, 26px)` | tile value 大号数字 |
| **容器级** | | | |
| `--tokens-input-h` | 36px | `clamp(20px, 3.797vh, 40px)` | .tokens-input / .tokens-btn 高度 |
| `--tokens-kv-key-w` | 160px | `clamp(60px, 8.368vw, 180px)` | kv-row 键名列宽（横向 → vw） |
| `--tokens-log-max-h` | 260px | `clamp(100px, 27.426vh, 300px)` | log body 最大高度 |

> **注意**：padding、gap、margin 等不再定义为独立 token，而是在消费者中直接用 `em`。em 的分母是元素**自身**的 computed font-size，不是父元素的。

> **关键发现**（2026-04-08 修正）：`html { font-size: var(--fs-root); }` 在 ≥1101px 时 `--fs-root: 20px`，因此 `body { font-size: 0.9rem }` = 0.9 × 20 = **18px**，而非 theme.css 的 `--fs-md: 14px`。未显式设置 font-size 的元素继承 body = 18px，必须使用 `--tp-fs-2xl` 令其动态化。

#### `em` 换算参考表

**基准字号 18px（body 继承，用于容器级：section、toolbar、card 等）**

| 目标 px | em 值 | 用途 |
|---|---|---|
| 4px | 0.222em | 微间距 |
| 6px | 0.333em | 紧凑间距（xs） |
| 8px | 0.444em | 基础间距（sm）、toolbar gap |
| 10px | 0.556em | 中等间距（md）、容器内距 |
| 12px | 0.667em | 舒适间距（lg）、section 横距 |
| 14px | 0.778em | 较大间距（xl） |

**基准字号 14px（显式 var(--fs-md) 元素：input、btn、toast）**

| 目标 px | em 值 | 用途 |
|---|---|---|
| 4px | 0.286em | 微间距 |
| 6px | 0.429em | 紧凑间距 |
| 8px | 0.571em | 基础间距 |
| 10px | 0.714em | 中等间距 |
| 12px | 0.857em | 舒适间距 |

**基准字号 13px（log body: --tp-fs-base）/ 12px（pill/badge: --tp-fs-sm）**

| 目标 px | @13px em | @12px em | 用途 |
|---|---|---|---|
| 2px | 0.154em | 0.167em | 微间距 |
| 4px | 0.308em | 0.333em | badge margin |
| 6px | 0.462em | 0.5em | 日志行内距 |
| 8px | 0.615em | 0.667em | 日志行 gap |
| 12px | 0.923em | 1em | 日志横距 |

#### 需要清理的冗余定义

迁移时检查并删除以下类型的冗余样式：

| 模式 | 示例 | 清理原因 |
|---|---|---|
| 不会动态变化的 min-width | `.tokens-input { min-width: 180px }` | 搜索框不会因内容伸缩，用 flex-basis 即可 |
| 重复的 font-size !important | `.tokens-btn { font-size: var(--fs-md) !important }` | 继承容器字号，无需显式声明 |
| 冗余的 line-height !important | 多处 `line-height: var(--lh-tight) !important` | 容器统一设置后子元素继承 |
| 断点中仅改尺寸的规则 | `@media (max-width:1024px) { grid-template-columns }` | `clamp()` + vw 已连续适配 |

### 3.3 迁移步骤

#### Phase 1: 创建 `style/panel/tokens/_variables.css`

定义容器字号和少量必要尺寸 token：

```css
/* style/panel/tokens/_variables.css -- 词元面板动态 token
 *
 * 级联缩放模型：
 *   窗口 (vh/vw) -> 容器字号 (clamp) -> 内距/间距 (em)
 *
 * 基准窗口：1912 * 948
 * 换算：纵向 px / 948 * 100 = vh；横向 px / 1912 * 100 = vw
 */
:root {
  /* -- 词元面板共享字号 ------------------------------ */
  --tp-fs-sm:    clamp(8px, 1.266vh, 14px);    /* 基准 12px <- 辅助文本 */
  --tp-fs-base:  clamp(8px, 1.371vh, 15px);    /* 基准 13px <- 日志正文 */
  --tp-fs-md:    clamp(9px, 1.477vh, 16px);    /* 基准 14px <- 主要文本 */
  --tp-fs-2xl:   clamp(10px, 1.899vh, 20px);   /* 基准 18px <- body 继承容器 */
  --tp-fs-4xl:   clamp(12px, 2.321vh, 26px);   /* 基准 22px <- 统计数字 */

  /* -- 需要独立于字号的尺寸 -------------------------- */
  --tokens-input-h:     clamp(20px, 3.797vh, 40px);    /* 输入框/按钮固定高度 */
  --tokens-kv-key-w:    clamp(60px, 8.368vw, 180px);   /* 键值对键名列宽 */
  --tokens-log-max-h:   clamp(100px, 27.426vh, 300px); /* 日志面板最大高度 */
}

/* -- force-landscape：vh↔vw 互换 ---------------------
 * JS rotate(90deg) 使视觉宽高与物理宽高互换：
 *   CSS vh (物理高 ~675px) = 视觉宽度
 *   CSS vw (物理宽 ~371px) = 视觉高度
 * 因此：纵向属性原用 vh 的换 vw，横向属性原用 vw 的换 vh
 */
html.force-landscape {
  /* 字号 & 纵向尺寸：视觉高度 = 物理宽 → vw */
  --tp-fs-sm:        clamp(8px, 1.266vw, 14px);
  --tp-fs-base:      clamp(8px, 1.371vw, 15px);
  --tp-fs-md:        clamp(9px, 1.477vw, 16px);
  --tp-fs-2xl:       clamp(10px, 1.899vw, 20px);
  --tp-fs-4xl:       clamp(12px, 2.321vw, 26px);
  --tokens-input-h:  clamp(20px, 3.797vw, 40px);
  --tokens-log-max-h:clamp(100px, 27.426vw, 300px);

  /* 横向尺寸：视觉宽度 = 物理高 → vh */
  --tokens-kv-key-w: clamp(60px, 8.368vh, 180px);
}

/* -- 全局 .btn--sm 集成 ------------------------------
 * buttons.css .btn--sm 使用静态 --fs-base(13px)+固定内距，
 * 此处替换为动态 token+em，使面板内按钮跟随 vh 缩放
 */
#panel_tokens .btn--sm,
#panel_permissions .btn--sm {
  font-size: var(--tp-fs-base, 13px) !important;
  padding: 0.462em 0.923em !important;   /* 6/13, 12/13 */
}
```

> 对比原方案：从 ~25 个 token 精简至 **8 个 token**。所有 padding/gap/margin 改用 `em`，在组件文件中就地声明。`.btn--sm` 集成规则同时覆盖词元楼和权限面板内的全局按钮。

#### Phase 2: 拆分 `tokens.css` + `tokens_log.css` -> 组件文件

将原 `tokens.css`（307 行）和 `tokens_log.css`（372 行）按层级拆分为：

| 新文件 | 来源 | 内容 | 继承说明 |
|---|---|---|---|
| `panel/tokens/toolbar.css` | tokens.css L24-L100 | toolbar 布局、input-group、按钮 | 字号 <- `--tp-fs-md`；内距 <- em |
| `panel/tokens/summary.css` | tokens.css L101-L200 | summary grid、type-tile、交互 | value 字号 <- `--tp-fs-4xl`；label <- `--tp-fs-sm` |
| `panel/tokens/section.css` | tokens.css L200-L260 | section 容器、header、body | 字号 <- `--tp-fs-md`；内距 <- em |
| `panel/tokens/card.css` | tokens.css L260-L307 | token-card、hover、列表条纹 | 字号继承 section；内距 <- em |
| `panel/tokens/kv.css` | tokens_log.css L98-L280 | kv-row、kv-key/val、编辑器 | key 列宽 <- `--tokens-kv-key-w`(vw) |
| `panel/tokens/nest.css` | tokens_log.css L280-L330 | nest-block、arr-item | 字号继承 card |
| `panel/tokens/log.css` | tokens_log.css L1-L97 | tokens-log 面板、log 行 | 字号 <- `--tp-fs-base`；max-h <- token |
| `panel/tokens/animation.css` | 散布两文件 | @keyframes、collapsible、toast | -- |

#### Phase 3: 消费者替换（核心变更）

在各组件文件中，将固定 px / `var(--space-*)` / `var(--fs-*)` 替换为级联缩放模式：

```css
/* == Before ================================================= */
.admin-panel .tokens-toolbar {
  gap: var(--space-lg);
}
.admin-panel .tokens-input {
  height: 36px;
  min-width: 180px;
  flex: 1 1 240px;
  padding: var(--space-sm) var(--space-md);
  font-size: var(--fs-md);
}

/* == After ================================================== */
/* -- .tokens-toolbar ----------------------------------------
 * 尺寸继承链：
 *   字号 <- --tp-fs-md (vh)
 *   gap  <- em (字号)，0.857em = 12/14
 *   高度 <- auto（由子元素撑开）
 *
 * 向下传递：
 *   -> .tokens-input    高度 <- --tokens-input-h；内距 <- em
 *   -> .tokens-btn      高度 <- --tokens-input-h；内距 <- em
 * ----------------------------------------------------------- */
.admin-panel .tokens-toolbar {
  font-size: var(--tp-fs-md, var(--fs-md));
  gap: 0.857em;                            /* 12/14 */
}
.admin-panel .tokens-input {
  height: var(--tokens-input-h, 36px);
  flex: 1 1 17em;                          /* 替代 min-width + flex-basis */
  padding: 0.571em 0.714em;               /* 8/14, 10/14 */
  font-size: inherit;                      /* 继承 toolbar 字号 */
}
```

**关键变化**：
- `min-width: 180px` -> 删除（搜索框不会随内容伸缩，`flex-basis` 足够）
- `font-size: var(--fs-md)` -> `font-size: inherit`（继承容器字号）
- `padding: var(--space-sm) var(--space-md)` -> `padding: 0.571em 0.714em`（跟随字号）
- `gap: var(--space-lg)` -> `gap: 0.857em`（跟随字号）
- 所有 `!important` 尽可能删除

#### Phase 4: 删除已废弃的媒体查询与冗余定义

| 删除目标 | 原因 |
|---|---|
| `@media (max-width: 480px)` toolbar 换行 | gap/flex-basis 已动态化；如仍需 wrap 则保留但仅写 `flex-wrap` |
| `@media (max-width: 1024px)` kv-row 列宽 | `--tokens-kv-key-w` 的 `clamp(vw)` 已连续适配 |
| `@media (max-width: 768px)` kv-row 列宽 | 同上 |
| `@media (max-width: 480px)` kv-row 列宽 | 同上 |
| `.tokens-btn { font-size: ... !important }` | 继承 toolbar 字号 |
| `.tokens-btn { line-height: ... !important }` | 继承 |
| `.tokens-input { min-width: 180px }` | flex-basis 足够 |

#### Phase 5: 更新 `index.html` 的 CSS 引用

```html
<!-- 旧 -->
<link rel="stylesheet" href="style/tokens.css?v=...">
<link rel="stylesheet" href="style/tokens_log.css?v=...">

<!-- 新 -->
<link rel="stylesheet" href="style/panel/tokens/_variables.css?v=...">
<link rel="stylesheet" href="style/panel/tokens/toolbar.css?v=...">
<link rel="stylesheet" href="style/panel/tokens/summary.css?v=...">
<link rel="stylesheet" href="style/panel/tokens/section.css?v=...">
<link rel="stylesheet" href="style/panel/tokens/card.css?v=...">
<link rel="stylesheet" href="style/panel/tokens/kv.css?v=...">
<link rel="stylesheet" href="style/panel/tokens/nest.css?v=...">
<link rel="stylesheet" href="style/panel/tokens/log.css?v=...">
<link rel="stylesheet" href="style/panel/tokens/animation.css?v=...">
```

---

## 4. 验收标准

### 4.1 视觉回归

- [ ] **1912x948** 下所有词元页元素的 computed value 与重构前完全一致
- [ ] **1872x1086**（标准大屏）下视觉比例自然缩小，无溢出
- [ ] **1180x734** / **1180x692** 下布局正常，无重叠/截断
- [ ] **1872x1086** / **1912x948** 下无过度放大
- [ ] **371x675**（force-landscape 视觉视口 ~675x371）下功能完整、无溢出
- [ ] 三套主题（light / dark / elegant）均正常

### 4.2 代码指标

- [ ] 词元页总 CSS 行数减少 >= 30%（目标：从 679 行降至 ~450 行以内）
- [ ] `@media` 断点块数量从 4 个降至 <= 1 个
- [ ] 所有消费者使用 `var(--token, fallback)` 或 `em` 模式，token 缺失时无损降级
- [ ] 清除所有语义多余的 min-width、max-width、重复 !important

### 4.3 功能完整性

- [ ] 搜索栏输入、刷新、展开/收起按钮正常
- [ ] 统计卡片点击筛选、灰化动画正常
- [ ] 词元卡片入场动画、hover 效果、Alt+hover 工具条正常
- [ ] 键值对行内编辑（文本 + 颜色选择器）正常
- [ ] 变更日志面板折叠/展开、滚动正常
- [ ] Toast 弹出位置正常

---

## 4.5 迁移后优化记录

> 以下为迁移完成后根据实际测试反馈所做的调整。

### 4.5.1 clamp min 值下调（改善小视口缩放）

初版 min 值偏高，导致在 ≤675vh 窗口时所有字号 token 均命中 min 下限（CLAMPED），丧失连续缩放能力。将 min 值全面下调：

| token | 旧 min | 新 min | 理由 |
|---|---|---|---|
| `--tp-fs-sm` | 10px | 8px | 小视口下辅助文字仍需缩小 |
| `--tp-fs-base` | 10px | 8px | 日志正文 / btn--sm 需跟随缩放 |
| `--tp-fs-md` | 11px | 9px | 输入框文字最低可读尺寸 |
| `--tp-fs-2xl` | 13px | 10px | 容器字号驱动全局 em，必须保持动态 |
| `--tp-fs-4xl` | 16px | 12px | 统计数字仍需缩小 |
| `--tokens-input-h` | 24px | 20px | 触控最小可点击高度 |
| `--tokens-kv-key-w` | 80px | 60px | 键名列在窄屏下可压缩 |
| `--tokens-log-max-h` | 140px | 100px | 日志面板在小视口下占比需更小 |

调整后，在 675vh 窗口下 5 个字号 token 全部处于 DYNAMIC 状态（高于 min、低于 max）。

### 4.5.2 全局 `.btn--sm` 集成

**问题**：`buttons.css` 的 `.btn--sm` 使用 `font-size: var(--fs-base) !important`（静态 13px）和 `padding: var(--space-xs) var(--space-lg) !important`（固定 6px 12px）。在词元面板和权限面板内，`.btn--sm` 按钮脱离了 vh 级联缩放，导致按钮区域在小视口下不缩小。

**修复**：在 `_variables.css` 添加面板级作用域覆盖：

```css
#panel_tokens .btn--sm,
#panel_permissions .btn--sm {
  font-size: var(--tp-fs-base, 13px) !important;  /* 13px@ref，动态 */
  padding: 0.462em 0.923em !important;             /* 6/13, 12/13 */
}
```

- 在 1912×948 基准下：`--tp-fs-base` = 13px → 与原 `--fs-base` 完全一致（零差异）
- 在小视口下：`--tp-fs-base` 随 vh 连续缩放 → padding 的 em 值同步缩小
- `expand-btn` 的 `padding-left: 2.154em` 和 `::before` 伪元素均基于 em，自动适配

### 4.5.3 `force_landscape.css` 固定覆盖清理

移除了 `style/media/force_landscape.css` 中 9 行针对词元页元素的固定像素覆盖（font-size、padding、height 等），改由 `_variables.css` 的 `html.force-landscape` token 块统一控制 vh↔vw 互换。

### 4.5.4 toolbar 480px 媒体查询删除

移除了 `toolbar.css` 中的 `@media (max-width: 480px)` 断点块。搜索栏的 `flex-wrap: wrap` + em 间距已自动适配窄屏布局，无需断点触发。

---

## 5. 后续迁移路线图

词元页验证通过后，按以下优先级迁移其他页面/组件：

| 优先级 | 页面/组件 | 预计文件夹 | 说明 |
|---|---|---|---|
| ~~P1~~ | ~~权限页~~ | `style/panel/permissions/` | ✅ 已完成（复用 `--tp-*` token，无独立 `_variables.css`） |
| ~~P2~~ | ~~头栏 + 底栏~~ | `style/header/_variables.css` | ✅ 已完成：全 vw/rem 缩放（无 vh），0 断点；标签间距/标题补偿用内联 vw clamp；底栏已足够精简无需迁移 |
| P3 | 弹窗系统 | `style/modal/` | 从 `style/modals/` 迁移，内部按组件拆分 |
| P4 | 对局页 | `game/styles/` | 体量最大，最后迁移 |
| P5 | 全局 token 升级 | `style/theme.css` | 将 `--fs-*` 本身改为 `clamp()`，全站受益 |

> **P5 全局 token 升级**是终极目标：一旦 `--fs-md` 自身变为 `clamp(11px, 1.477vh, 16px)`，所有消费 `var(--fs-md)` 的选择器自动获得动态缩放能力，无需逐组件迁移。但这需要在所有页面验证通过后才能执行，避免全局影响。

---

## 6. 风险与注意事项

| 风险 | 应对 |
|---|---|
| `vh` 在 iOS Safari 含地址栏高度 | 使用 `dvh`（dynamic vh）作 fallback：`clamp(min, X dvh, max)` + `@supports` 降级 |
| force-landscape 下 vh/vw 方向互换 | 在 `html.force-landscape {}` 中将 token 的 vh↔vw 互换，保持动态缩放 |
| CSS 解析兼容性 | `clamp()` 支持 Chrome 79+, Firefox 75+, Safari 13.1+，已满足目标用户群 |
| 与 `theme.css` 全局 token 冲突 | 词元面板 token 使用 `--tp-*` / `--tokens-*` 前缀，不与全局 `--fs-*` / `--space-*` 命名冲突 |
| 折叠/展开动画依赖固定高度计算 | `collapsible` 的 JS 动态测量 `scrollHeight`，不受 token 化影响 |
| `em` 级联层数过深导致精度漂移 | 本项目最深 3 层（toolbar -> input-group -> btn），漂移可忽略；超过 4 层时改用 `rem` 或重设字号 |

---

## 7. 设计原则（迁移过程中必须遵守）

### 7.1 级联缩放三层模型

```
第 1 层：容器字号 <- clamp(min, Xvh 或 Xvw, max)    // 唯一与窗口直接关联的属性
第 2 层：内距/间距 <- Nem                              // 跟随字号，无需断点
第 3 层：子元素   <- 继承字号 或 重设字号建立新层级     // 不写冗余 font-size
```

- **纵向属性**（高度、字号）-> `vh`
- **横向属性**（宽度、列宽）-> `vw`
- **内距 / 间距** -> `em`（不用 vh/vw/px）
- **子元素字号** -> `inherit`（不重复声明，除非需要不同大小）

### 7.2 padding 跟随字号的理由

容器宽度缩小时，如果字号没变小，padding 变小会显得拥挤；而当字号变小时，padding 的比例应跟随字号才符合视觉效果。因此 **padding 使用 `em`**，由字号间接关联窗口。

### 7.3 不用 em 决定容器尺寸的理由

`em` 基于字号，但无法确认每个容器高/宽适合多大的字体——耦合方向反了。容器高度与窗口高度关联、宽度与窗口宽度关联，这个方向维护起来清晰且解耦。

### 7.4 冗余样式清理原则

迁移时主动清理以下模式：

| 模式 | 处理方式 |
|---|---|
| 不会动态伸缩的 `min-width` / `max-width` | 删除，用 `flex-basis` 或固定宽度替代 |
| 子元素重复声明已继承的 `font-size` | 删除，改用 `inherit` 或不写 |
| `!important` 覆盖链 | 修改选择器优先级或删除双方的 `!important` |
| 仅改尺寸的 `@media` 断点块 | 删除，由 `clamp()` 连续适配 |
| 换算关系模糊的固定 px 值 | 换算为 `em` 并注释基准比例 |

### 7.5 继承链注释必须包含

每个组件 CSS 文件顶部必须注明：

1. **自身字号来源**（哪个 token / 继承自哪个父容器）
2. **自身内距单位**（em 的基准字号）
3. **向下传递**（哪些子元素继承、是否有子容器重设字号）
4. **特殊尺寸**（不走级联的属性，如固定高度、vw 列宽）
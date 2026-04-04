# ARCHITECTURE.md — card-html 前端项目架构文档

> **最后更新**: 2026-04-04
> **适用对象**: AI Agent、新开发者快速定位代码

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

| 文件 | 职责 |
|---|---|
| `style.css`（根目录） | 全局基础样式：body 背景渐变、flex 布局、通用类 |
| `style/theme.css` | **主题系统核心**：CSS 变量定义（`:root` 浅色 + `html[data-theme="dark"]` 深色）包含 ~100 个变量：颜色、阴影、字体、间距 |
| `style/theme_elegant.css` | **典雅主题**：`html[data-theme="elegant"]` 覆盖变量，墨底金色、衬线字体 |
| `style/fonts.css` | 字体 @font-face 声明（康熙字典体等） |
| `style/header.css` | 顶部导航栏 |
| `style/footer.css` | 底部固定栏 |
| `style/buttons.css` | 统一按钮样式（`.btn--primary`、`.btn--secondary` 等） |
| `style/animations.css` | 文本入场动画（`.animate-in`） |
| `style/tokens.css` | 词元面板样式 |
| `style/tokens_log.css` | 词元/权限日志面板样式 |
| `style/permissions.css` | 权限管理面板样式 |
| `style/collapsible.css` | 折叠/展开动画（`.collapsible`、`.is-open`） |
| `style/row_highlight.css` | 行高亮条覆盖层 |
| `style/term_button.css` | 术语按钮样式 |
| `style/skill_copy.css` | 技能行复制按钮（Ctrl 按下时显示） |
| `style/back_to_top.css` | 回到顶部按钮 |
| `style/page_loading.css` | 加载遮罩层与进度条 |
| `style/login.css` | 登录页专属样式 |
| `style/tooltip.css` | 悬浮提示框 |
| `style/custom_select.css` | 自定义下拉选择器 |

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

| 文件 | 职责 |
|---|---|
| `header.css` | 响应式头部导航 |
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
| `color_utils.js` | 颜色工具：解析/反转/混合（支持 hex/rgb/hsl） | `window.ColorUtils` |
| `include_loader.js` | `data-include` 局部模板加载器：扫描→fetch→替换→移除占位 | `window.partialsReady`（Promise） |
| `toast.js` | 全局 Toast 通知（成功/错误，自动消失） | `window.showToast()` |
| `tabs.js` | Tab 切换逻辑：标题更新、管理员面板控制、鼠标滚轮切换 Tab | IIFE 内部 |
| `event_bindings.js` | 全局按钮事件绑定（strength、pronoun、include 等切换按钮） | IIFE 内部 |
| `tooltip.js` | 轻量级悬浮提示管理器（`data-tooltip` 属性触发） | IIFE 内部 |
| `custom_select.js` | 原生 `<select>` → 主题化自定义下拉组件 | `window.CustomSelect`（`init`, `wrap`, `refresh`, `refreshAll`） |
| `shared_search.js` | 将池/技能面板共享搜索框 | IIFE 内部 |
| `draft_panel.js` | 草稿面板：HTML 编辑+预览（带术语替换） | `window.draftPanel` |
| `announcements.js` | 更新公告弹窗：读取 `base/announcements.json`、卡片渲染 | IIFE 内部 |
| `skill_copy.js` | 技能行 Ctrl+复制按钮（仅 admin/moderator） | IIFE 内部 |
| `back_to_top.js` | 回到顶部按钮 | IIFE 内部 |
| `collapsible.js` | 程序面板标题折叠（H1/H2/H3 层级） | IIFE 内部 |
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
| `ui/toast.js` | 词元专属 Toast | `window.tokensAdmin` |
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

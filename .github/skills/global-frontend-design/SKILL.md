---
name: global-frontend-design
description: "Use when: 设计或修改 card-html 全局前端 UI、主题、弹窗、菜单、帮助速查、i18n、交互状态、移动端触摸体验、Foundation 覆盖、用户可见界面一致性。"
argument-hint: "说明要设计或调整的页面、弹窗、菜单或交互"
user-invocable: true
---

# 全局前端设计

## 何时使用

- 新增或调整全局 UI、菜单、弹窗、帮助速查、主题、语言文本、Toast、键盘交互。
- 处理浅色/深色/典雅主题差异、字体继承、触摸选中、高亮、可访问性和用户体验一致性。
- 修改多个面板共享的样式或交互。

## 必读上下文

1. 先读 `ARCHITECTURE.md` 0.1 到 0.10，了解替换系统、加载时序、overlay、帮助、i18n、主题和公告规则。
2. 改 CSS 时同时按 `frontend-dynamic-scaling` 的规则检查 0.12 和 0.13。
3. 查看目标 UI 的现有 CSS 文件和 JS 命名空间，沿用当前模式。

## 项目级原则

- 静态前端无构建流程，`index.html` 直接加载 CSS/JS；改动静态资源后要同步 cache query。
- 依赖 DOM 的模块必须等待 `window.partialsReady`；依赖替换结果的逻辑等待 `window.replacementsReady`。
- 所有菜单和弹窗通过 `CardUI.Manager.Controllers.overlay` 管理；新增 overlay 必须注册到 `PANELS`。
- 用户可见文本使用 i18n：`window.t(key)`、`data-i18n` 或对应词典文件。
- 新增面板功能、弹窗或隐藏交互时，同步 `base/help.json`、`i18n/strings.js`，必要时更新 `function/ui/help_panel.js` 映射。
- 颜色、阴影、字体走主题变量，不硬编码主题色；注意 Foundation 对 `kbd`、`label`、`table`、`button` 等基础标签的默认覆盖。
- 触摸端避免文本或按钮出现系统蓝色选中；但不要牺牲键盘焦点可见性。

## 设计口径

- 这是工具型资料/对局系统，界面应优先清晰、密集、可扫描、可重复操作。
- 不做营销式 hero、装饰性大卡片或无功能的视觉噪声。
- 图标按钮用于工具动作，文本按钮用于明确命令；不熟悉图标要有 tooltip。
- 不嵌套卡片；页面区域用布局和分隔管理，重复项目、弹窗、工具面板才使用卡片。
- 文本必须适配容器，长词和双语内容不能遮挡相邻控件。

## 变更流程

1. 定位影响范围：单面板、全局组件、overlay、主题、帮助或 i18n。
2. 先改已有参数、组件或渲染路径，不额外创建平行体系。
3. 改用户可见功能时同步帮助速查和翻译。
4. 改静态资源时刷新 `index.html` 中相关 `?v=`。
5. 改用户可见行为时更新 `base/announcements.json`，用用户视角写一句话。

## 验收

- 至少检查目标界面的浅色、深色、典雅主题。
- 检查键盘、鼠标、触摸的基本路径。
- 若涉及响应式，按标准窗口尺寸检查。
- 运行与改动相关的 JSON/JS/CSS 基础校验和 `git diff --check`。

# card-html

单页应用卡牌游戏前端。基于 Foundation Sites 6 多 Tab 面板，IIFE + `window` 全局命名空间（无 ES Modules），通过 `<script>` 标签按序加载。

## 快速启动

浏览器直接打开 `index.html`（推荐通过 VS Code Live Server）。后端配套 `backend-project/`，接口基址可在运行时切换。

数据库备份/恢复、后端启动、前端时间戳刷新命令见 [运维命令速查](docs/operations.md)。

## 架构概要

| 目录 | 职责 |
|---|---|
| `function/` | 业务逻辑：UI 组件、状态管理、术语替换、动画、弹窗管理 |
| `game/` | 对局模块：流程引擎、卡牌/角色模型、Socket.IO 在线多人、拖拽交互 |
| `partials/` | HTML 局部模板，通过 `data-include` 异步注入 |
| `style/` | 全局样式、响应式、弹窗、三套主题（light/dark/elegant） |
| `base/` | 静态数据（公告、压缩映射、帮助文本） |
| `i18n/` | 国际化词典（zh/en） |

## 核心机制

- **Overlay 栈导航** — `CardUI.Manager.Controllers.overlay`（`open/back/closeAll`）
- **术语替换** — `function/replace/` 通过 MutationObserver 全局扫描自定义 XML 标签
- **异步加载** — `partialsReady` → Foundation 初始化 → `replacementsReady`
- **主题系统** — CSS 变量 + `data-theme` 属性，View Transitions API 切换
- **帮助系统** — `?` 键唤起上下文帮助（`base/help.json` + i18n）

详细架构见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 参与贡献

1. Runwill
2. Smal

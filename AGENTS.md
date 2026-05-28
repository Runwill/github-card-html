# Agent 通用指引

本仓库的 AI 辅助开发规则统一存放在 `.github/` 目录下，所有 agent 均应遵守，不限于 Copilot。

## 必读文件

| 文件 | 内容 |
|------|------|
| `.github/copilot-instructions.md` | 全局开发规则、CSS 修改检查清单、变更后流程、经验库自检触发条件、汇报规范 |
| `ARCHITECTURE.md` | 项目架构、响应式机制、验收尺寸、反模式清单 |
| `.github/agent-experience/bug-patterns.md` | 典型 bug 经验库：现象信号、根因模式、排查步骤、修复方向 |
| `.github/agent-experience/missed-cases.md` | 遗漏案例与验证盲区：自检触发信号、失败复盘 |

## 领域 Skill（按任务选读）

| 文件 | 适用场景 |
|------|----------|
| `.github/skills/game-page-design/SKILL.md` | 对局页、牌区、拖拽、同步动画、CardViewer |
| `.github/skills/global-frontend-design/SKILL.md` | 全局前端设计 |
| `.github/skills/dynamic-html-token-system/SKILL.md` | 动态 HTML 词元系统 |
| `.github/skills/frontend-dynamic-scaling/SKILL.md` | 前端动态缩放 |
| `.github/skills/codebase-cleanup-refactoring/SKILL.md` | 代码清理与重构流程 |

## 核心规则摘要

1. **修改 CSS 前**：先读 `ARCHITECTURE.md` §0.12 反模式清单，逐条检查是否违反。
2. **非平凡 bug / 回归 / 用户可见异常**：先查 `bug-patterns.md` 和 `missed-cases.md`。
3. **变更后**：更新 `base/announcements.json`，用标准验收尺寸检查布局。
4. **清理 / owner 合并汇报**：先报入口与可见差异，再报收益账，最后报验证与风险。
5. **经验库命中后**：必须转成当前任务的自检门禁，不能只停留在"知道有相似条目"。

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

## 执行检查清单

Agent 在执行任务前必须先过一遍对应类型的检查清单：

### 清理 / 重构任务

1. **先算账再动手**：新增任何共享定义（`:root` 块、helper 函数、工具类）前，先计算"新增 N 行能消除 M 行"，M > N 才执行。
2. **每批次结束前**：运行 `git diff --shortstat` 检查净收益，确保删除行数 > 新增行数。
3. **汇报前**：按 `copilot-instructions.md` §清理汇报 模板输出，第一段必须是"入口与可见差异"。

### Bug 修复任务

1. **修复前**：查 `bug-patterns.md` 和 `missed-cases.md`，转成当前任务门禁。
2. **修复后**：运行 `git diff --shortstat`，若净增 > 100 行则做膨胀复审。
3. **汇报前**：说明根因、修复方式、验证入口、未覆盖风险。

### 功能开发任务

1. **开发前**：确认是否涉及 CSS 修改（读反模式清单）、是否涉及新弹窗/面板（读 overlay 系统）。
2. **开发后**：更新 `announcements.json`，用标准验收尺寸检查布局。
3. **汇报前**：说明用户可见变化、入口路径、验证命令。

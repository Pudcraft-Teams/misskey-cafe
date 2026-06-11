---
name: context-budget
description: 把 Claude Code 会话的 context 窗口消耗按 agents/skills/MCP/rules/CLAUDE.md 逐项可视化,检测膨胀和冗余组件并给出节约候选方案。在"把上下文消耗给我看看"、"context budget"、"context audit"、"token 明细"、"还能再加 MCP 吗？"等发话时启动。
---

<!--
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2026 Affaan Mustafa and everything-claude-code contributors

出典 (upstream): https://github.com/affaan-m/everything-claude-code (v2.0.0-rc.1)
upstream path: skills/context-budget/SKILL.md
upstream origin frontmatter: ECC
upstream license: MIT — https://github.com/affaan-m/everything-claude-code/blob/main/LICENSE
project-level notice: see .claude/THIRD_PARTY_LICENSES.md (Misskey 内的第三方一览 + MIT 全文)

Imported into Misskey .claude/ on 2026-05-10 as a standalone copy (no dependency on the ECC plugin runtime). description was rewritten in Chinese and a "Misskey 专属备注" section was appended; body content remains MIT-licensed.

note: Misskey 的 skills/agents 数量较少,所以 MCP / CLAUDE.md / 插件来源的 overhead 容易占主导,需留意此点。
-->

# Context Budget

分析一个会话中加载的各组件 (agents / skills / rules / MCP servers / CLAUDE.md) 的 token overhead,并给出回收空闲 context 的具体方案。

## 使用场景

- 感觉会话变重、输出质量下降
- 最近新增了大量 skills / agents / MCP server
- 想知道剩余的 context headroom
- 加入新组件前想确认空余量
- 用户用「context-budget」「token 明细」等关键词明确要求时 (Misskey 仓库没有注册同名的斜杠命令 —— 本 skill 设计为通过名称 / description 匹配 auto-invoke。已实现的 slash command 一览见 [.claude/commands/](../../commands/))

## 工作原理

### Phase 1: Inventory

扫描各组件并估算 token。

**Agents** (`.claude/agents/*.md`)
- 计算行数和 token 数 (`words × 1.3`)
- 提取 frontmatter `description` 的长度
- 标记: 超过 200 行 (重)、description 超过 30 word (frontmatter 膨胀)

**Skills** (`.claude/skills/*/SKILL.md`)
- 按每个 SKILL.md 计算 token
- 标记: 超过 400 行
- 排除 `.agents/skills/` 等重复副本

**Rules** (仓库根目录的 `AGENTS.md` + 从 `.claude/` 被 `@-import` 的文件)
- 按文件计算 token
- 标记: 超过 100 行
- 检测同一语言模块内的内容重复

**MCP Servers** (`.mcp.json` 或生效的 MCP 配置)
- server 数和 tool 总数
- 按每个工具约 500 token 估算 schema overhead
- 标记: 超过 20 tool 的 server、只是简单包装 `gh` / `git` / `npm` 等 CLI 的 server

**CLAUDE.md** (project + user-level)
- 按每个文件计算 token
- 标记: 合计超过 300 行

### Phase 2: Classify

| 分类               | 判定标准                                                    | 行动                              |
|--------------------|-------------------------------------------------------------|-----------------------------------|
| **Always needed**  | 被 CLAUDE.md 引用 / 生效命令的背后 / 与当前项目匹配         | 保留                              |
| **Sometimes needed** | 依赖领域 (例: 语言模式)、未被 CLAUDE.md 引用                | 考虑按需启用                      |
| **Rarely needed**  | 无命令引用、内容重复、无明确用途                            | 删除或 lazy-load                  |

### Phase 3: Detect Issues

- **Bloated agent description** — frontmatter description 超过 30 word 时,每次启动 Task 工具都会加载
- **Heavy agents** — 超过 200 行会在每次启动 Task 工具时膨胀 context
- **Redundant components** — 与 agent 逻辑重复的 skill、与 CLAUDE.md 重复的 rule
- **MCP over-subscription** — 超过 10 server,或可用 CLI 替代的 server
- **CLAUDE.md bloat** — 冗余说明、过时小节、应移到 rule 的指示

### Phase 4: Report

```
Context Budget Report
═══════════════════════════════════════

Total estimated overhead: ~XX,XXX tokens
Context model: <当前模型名> (<window>K window)   ← 例: Claude Opus 4.7 (1M), Claude Sonnet (200K)
Effective available context: ~XXX,XXX tokens (XX%)

Component Breakdown:
┌─────────────────┬────────┬───────────┐
│ Component       │ Count  │ Tokens    │
├─────────────────┼────────┼───────────┤
│ Agents          │ N      │ ~X,XXX    │
│ Skills          │ N      │ ~X,XXX    │
│ Rules           │ N      │ ~X,XXX    │
│ MCP tools       │ N      │ ~XX,XXX   │
│ CLAUDE.md       │ N      │ ~X,XXX    │
└─────────────────┴────────┴───────────┘

WARNING: Issues Found (N):
[按 token 节约量降序]

Top 3 Optimizations:
1. [action] → save ~X,XXX tokens
2. [action] → save ~X,XXX tokens
3. [action] → save ~X,XXX tokens

Potential savings: ~XX,XXX tokens (XX% of current overhead)
```

verbose mode 还会输出每个文件的 token 明细、最重文件的逐行拆解、重复行对比、MCP tool 一览 + 每个 tool 的 schema 大小估算。

## 例

**基础审计**
```
User: 把上下文消耗给我看看
Skill: 16 agents (12,400 tokens), 28 skills (6,200), 87 MCP tools (43,500), 2 CLAUDE.md (1,200)
       Flags: 重的 agent 3 个、可用 CLI 替代的 MCP 3 个
       Top saving: 删除 3 个 MCP → -27,500 tokens (削减 overhead 的 47%)
```

**Verbose**
```
User: 按文件给出 token 明细
Skill: 在上述报告基础上,再 side-by-side 展示 planner.md (213 lines, 1,840 tokens) 这样的
       per-file 逐行明细、每个 MCP tool 的大小、rule 的重复行
```

**新增前检查**
```
User: 想加 5 个 MCP server,还有空间吗？
Skill: 当前 33% → 加 5 server (≈ 50 tools) 会 +25,000 tokens → 到达 45%
       建议: 先移除 2 个可用 CLI 替代的 server,把占用维持在 40% 以下
```

## 最佳实践

- **token 估算**: prose 用 `words × 1.3`,以 code 为主用 `chars / 4`
- **MCP 是最大的杠杆**: 每个 tool 约 500 token,一个 30-tool 的 server 比全部 skill 还大
- **agent description 常驻加载**: 即使是不会被调用的 agent,其 description 也会在每次 Task 时投入
- **verbose 用于 debug**: 平时不用
- **变更后做审计**: 在新增 agent/skill/MCP 后立即运行,尽早发现膨胀

## Misskey 专属备注

- Misskey 没有在项目里显式注册 MCP server (`.mcp.json` 不存在),所以当前 overhead 的主导项是 CLAUDE.md 和官方插件群的 skills / agents description。
- 由于 ECC 插件在用户作用域的 `installed_plugins.json` 中存在,即使没有在项目的 `enabledPlugins` 里加入,system reminder 也会出现 200+ skill。这些 description 较短,单个 overhead 很小,但可以用本 skill 来确认合计值。

---
description: 对 Misskey 的 .claude/ harness (skills/agents/commands) 按 7 个类别评分的确定性审计。
argument-hint: "[repo|skills|commands|agents]"
---

<!--
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2026 Affaan Mustafa and everything-claude-code contributors

出处 (upstream): https://github.com/affaan-m/everything-claude-code (v2.0.0-rc.1)
upstream path: commands/harness-audit.md
upstream license: MIT — https://github.com/affaan-m/everything-claude-code/blob/main/LICENSE
project-level notice: see .claude/THIRD_PARTY_LICENSES.md (Misskey 内第三方一览 + MIT 全文)

Imported into Misskey .claude/ on 2026-05-10. The 7-category rubric and output contract are derived from the upstream ECC version (MIT). The runtime layer was substantially reimplemented for Misskey: the upstream relies on scripts/harness-audit.js to mechanically score, while this version asks Claude to score directly with pnpm/git/grep, and adds Misskey-specific evaluation axes (SPDX coverage / endpoint-list 漏注册 / migration 顺序 / ja-JP.yml 一致性).

note: 原 ECC 版用 scripts/harness-audit.js (专用 Node 脚本) 进行机器评分，但 Misskey 采取不依赖 ECC plugin runtime 的方针，因此改写为由 Claude 直接读取文件评分的手动运行版。把 Misskey 固有的重要观点 (SPDX 适用率 / endpoint-list 漏注册 / migration 顺序 / ja-JP.yml 一致性) 明确组合进评估轴。
-->

# /harness-audit — Misskey harness 审计

对 Misskey 仓库的 `.claude/` 构成按 7 个类别评分，并给出改进优先级。

## Usage

`/harness-audit [scope]`

- `scope` (可选): `repo` (default) / `skills` / `commands` / `agents`

## 评估类别 (各 0-10)

| # | 类别 | 评估轴 |
| --- | --- | --- |
| 1 | Tool Coverage | skill / agent / command 的数量、缺失的工作流环节、无重复 |
| 2 | Context Efficiency | frontmatter description 的冗余度、SKILL.md 的长度分布、重复信息、CLAUDE.md 的膨胀 |
| 3 | Quality Gates | Stop / PreToolUse / PostToolUse hook 的完备程度、`/quality-gate` 等完成前关卡的有无、自动 lint/typecheck |
| 4 | Memory Persistence | 评估 `.claude/skills/*/SKILL.md` 与 `references/` 的同步状态。项目侧 `.claude/memory/` 采取不采用方针 (auto-memory 在用户主目录侧自动运行)，因此不以此为评分起点，从默认 5/10 开始 |
| 5 | Eval Coverage | `working-on-backend` / `working-on-frontend` 的 testing 参考 (backend-testing.md / frontend-testing.md) 的覆盖、Misskey 固有的 e2e/fed/Storybook/Cypress 适用指南 |
| 6 | Security Guardrails | SPDX 规约适用、migration 不可变性规则、ja-JP.yml 限定编辑规则、secrets 检测 |
| 7 | Cost Efficiency | enabledPlugins 的重复、过剩、context-budget 的完备、无 MCP 过度注册 |

## Misskey 固有的确认项 (评分依据命令)

评分时用以下实际命令确认。各项 **所属的类别** 在项内注明 (#1-#3 为 Security Guardrails、#4 为 Tool Coverage、#5 为 Quality Gates):

```bash
# 1. [Security Guardrails] SPDX 适用率 (面向新增文件设想的通用检查)
#    - 用 prune 排除 node_modules
#    - packages/misskey-js 是 MIT 子包，故不带 AGPL 头 (AGENTS.md §1) → 排除
#    - built/ 等也排除
#    候选中仍会混入像 *.config.{ts,js} / *eslint* / *.d.ts 这类 CI 上 SPDX 对象之外
#    (参见 .github/workflows/check-spdx-license-id.yml 的 exclude) 的文件，
#    因此上位出现的文件是否为「新增的实际代码」需目视判定。
find packages \
  \( -type d \( -name node_modules -o -name built -o -name dist -o -path 'packages/misskey-js' \) -prune \) \
  -o -type f \( -name '*.ts' -o -name '*.js' -o -name '*.vue' -o -name '*.scss' \) -print \
  | xargs -r grep -L 'SPDX-License-Identifier: AGPL-3.0-only' | head -20
# → 若上位没有新增的实际代码则满分

# 2. [Security Guardrails] ja-JP.yml 以外的 locales 近期是否被手动编辑
#    用 --pretty=format: 抑止提交头行，仅保留文件名行后再 grep。
#    Crowdin 的自动同步 commit 也会更新其他语言的 yml，因此输出很少会是 0 行。
#    若有输出，确认 author / commit message 判定是来自 Crowdin 还是手动编辑:
#    git log --since='30 days ago' --pretty=format:'%h %an %s' -- locales/<file>.yml
git log --since='30 days ago' --pretty=format: --name-only -- 'locales/*.yml' \
  | grep -v '^$' | grep -v 'ja-JP.yml' | sort -u
# → 若无输出，或全部为 Crowdin 来源的 commit 则满分

# 3. [Security Guardrails] migration 的 pending DDL 检查 (TypeORM schema builder)
pnpm --filter backend check-migrations
# → 若 0 errors (= "All migrations are clean.") 则满分

# 4. [Tool Coverage] endpoint-list.ts 漏注册 (新增 endpoint 不在列表中的情况)
#    endpoints/ 是递归结构 (notes/create.ts, admin/announcements/create.ts 等)，有 400+ 文件，
#    endpoint-list.ts 也以 `export * as '<category>/<name>' from './endpoints/<category>/<name>.js';` 形式
#    每个文件 1 行注册。把两者的行数按「递归 .ts 数」与「export * as 行数」比较。
#    e2e / 单元测试不是 endpoint，故排除 *.test.ts。
endpoint_files=$(find packages/backend/src/server/api/endpoints -type f -name '*.ts' ! -name '*.test.ts' | wc -l)
list_entries=$(grep -cE "^export \* as " packages/backend/src/server/api/endpoint-list.ts)
echo "endpoints (recursive): $endpoint_files / endpoint-list.ts entries: $list_entries"
# 若差分为 0 则满分。出现差分时，具体定位漏注册:
comm -23 \
  <(find packages/backend/src/server/api/endpoints -type f -name '*.ts' ! -name '*.test.ts' \
    | sed -E 's|.*/endpoints/||;s|\.ts$||' | sort -u) \
  <(grep -oE "^export \* as '[^']+'" packages/backend/src/server/api/endpoint-list.ts \
    | sed -E "s/^export \* as '([^']+)'/\1/" | sort -u)
# 输出的行即为漏注册的 endpoint。0 行则满分。

# 5. [Quality Gates] console.log 的混入
grep -rn 'console\.\(log\|debug\)' packages/backend/src packages/frontend/src 2>/dev/null \
  | grep -v 'node_modules\|test\|.spec\.\|.test\.' | wc -l
# → 理想为 0
```

## 输出契约

返回以下内容:

1. `overall_score` / `max_score` (repo 满分 70 分)
2. 每个类别的分数 + 具体依据
3. 失败的检查项及对应文件路径
4. Top 3 改进行动
5. 接下来推荐适用的 skill / 步骤

## 示例输出

```text
Harness Audit (repo): 55/70

Tool Coverage:        9/10   (skills 5, agents 2, commands 5 — 无偏倚)
Context Efficiency:   8/10   (description 平均 3-5 行、无膨胀)
Quality Gates:        5/10   (Stop hook 未登记到共享配置 / 有 `/quality-gate`)
Memory Persistence:   5/10   (项目侧 memory/ 不采用方针 = 默认值)
Eval Coverage:        7/10   (backend/frontend testing 参考已覆盖、Storybook 部分缺失)
Security Guardrails:  10/10  (SPDX 100%, locales OK, migrations clean)
Cost Efficiency:      8/10   (已引入 context-budget / MCP 0)

Failed Checks:
- packages/frontend/src/.../X.vue 缺失 SPDX (Security Guardrails)
- backend 中有 3 处 console.log (Quality Gates)
- 无共享 Stop hook (Quality Gates) — 若采取由各 contributor 在 `.claude/settings.local.json` 中 opt-in 的方针则不必扣分

Top 3 Actions:
1) [Security Guardrails] 修复 1 个 SPDX 缺失文件:
   packages/frontend/src/.../X.vue
2) [Quality Gates] 把 backend 的 3 处 console.log 替换为 logger。
   git grep "console\.log" packages/backend/src
3) [Cost Efficiency] 从 enabledPlugins 中移除未使用项。
   把 `.claude/settings.json` 的 `enabledPlugins` 与实际项目使用情况比对。

Suggested next skills to apply:
- 用 /quality-gate 在完成前跑 lint + unit test
- 用 context-budget 确认 plugin 带来的 overhead
```

## 评分的可靠性

- 确定性: 同一 commit / 同一 `.claude/` 构成则分数相同
- 启发式: 「description 的冗余度」这类主观项按同一基准机械判定
- 无需脚本: 仅用 `pnpm` 与 `git`、`grep`/`find` 等标准工具

## 参考: 与 ECC 原版的差分

- ECC 版采取直接调用 `node scripts/harness-audit.js` 的运行方式，评分封闭在 ECC 仓库整体范围内。
- Misskey 版把 **Misskey 的规约 (SPDX/migration/locales/endpoint-list)** 纳入 Security 评分，重新设计为以 `pnpm` 为基础的实际命令取证方式。
- 结果是对 ECC 的依赖为零。

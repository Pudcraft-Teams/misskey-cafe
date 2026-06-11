---
description: 依次执行 Misskey 的 lint / typecheck / 快速测试以通过质量关卡的命令。用于完成前的轻量验证。
argument-hint: "[repo|backend|frontend|<path/to/file.ts>]"
---

<!--
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2026 Affaan Mustafa and everything-claude-code contributors

出处 (upstream): https://github.com/affaan-m/everything-claude-code (v2.0.0-rc.1)
upstream path: commands/quality-gate.md
upstream license: MIT — https://github.com/affaan-m/everything-claude-code/blob/main/LICENSE
project-level notice: see .claude/THIRD_PARTY_LICENSES.md (Misskey 内第三方一览 + MIT 全文)

Imported into Misskey .claude/ on 2026-05-10. Pipeline 概念 (lint → typecheck → test) 借用自 upstream ECC 版 (MIT)。实际命令层固定为 Misskey 的 pnpm + tsgo + ESLint + Vitest，删除了 formatter (Prettier/Biome) 阶段。

note: 原 ECC 版是语言自动判定 + format/lint/type 的通用版，但 Misskey 专用版固定为 pnpm + tsgo + ESLint + Vitest 的组合。不包含较重的 test:e2e / test:fed (在 CI 侧执行)。
-->

# /quality-gate — Misskey 轻量质量关卡

`/quality-gate [scope]`

完成前的 **轻量** 质量检查。较重的 E2E / 联合测试 (test:e2e / test:fed / Cypress) 在 CI 侧执行，因此本命令不包含。

## Scope

- `repo` (default) — 全部包
- `backend` — 仅 `packages/backend`
- `frontend` — 仅 `packages/frontend`
- `path/to/file.ts` — 仅对单个文件执行 ESLint --fix

## Pipeline

### Repo scope (全部)

各包的 `lint` 脚本实体是 `pnpm typecheck && pnpm eslint` ([packages/backend/package.json](../../packages/backend/package.json), [packages/frontend/package.json](../../packages/frontend/package.json))，而根目录的 `pnpm lint` 是 `pnpm --no-bail -r lint` (= 在全部包上以 `--no-bail` 执行 lint)。**typecheck 已包含在 lint 中**，所以通常这 2 条命令就足够:

```bash
# 1. Lint (= typecheck + ESLint，全部包。用 --no-bail 在首次失败时不停止并收集全部结果)
pnpm lint

# 2. Unit test (快速，不含 e2e)
pnpm --filter backend test
pnpm --filter frontend test
```

#### 仅在想分别查看细节时 (optional)

当 lint 一并失败而只想单独查看 typecheck 的结果时，单独运行以下命令。**通常不需要** (读 lint 的输出即可):

```bash
pnpm --filter backend typecheck    # tsgo 单独
pnpm --filter frontend typecheck   # vue-tsc 单独 (为查看 Vue SFC 的类型)
```

### Backend scope

`pnpm --filter backend lint` 内部会执行 `pnpm typecheck && pnpm eslint` ([packages/backend/package.json](../../packages/backend/package.json))，所以跑 `lint` 时 typecheck 也会一并完成。在轻量关卡中为避免 typecheck 的重复执行，仅用 `lint` + `test`:

```bash
pnpm --filter backend lint
pnpm --filter backend test
```

仅在想单独查看 `tsgo` 的输出时，作为 optional 另行运行 `pnpm --filter backend typecheck`。

### Frontend scope

`pnpm --filter frontend lint` 内部同样会执行 `pnpm typecheck && pnpm eslint` ([packages/frontend/package.json](../../packages/frontend/package.json))，因此在轻量关卡中与 Backend 同样仅用 `lint` + `test`:

```bash
pnpm --filter frontend lint
pnpm --filter frontend test
```

仅在想单独查看 `vue-tsc` 的输出时，作为 optional 另行运行 `pnpm --filter frontend typecheck`。

### Single file scope

```bash
pnpm exec eslint --fix <path>
```

## Output

汇总所执行阶段的 pass/fail 和件数。标准 pipeline 仅有 `pnpm lint` (内含 typecheck) 和 unit test，因此默认输出如下:

```text
Quality Gate (repo):

Lint:        PASS  (0 errors, 2 warnings)
Backend ut:  PASS  (412/412)
Frontend ut: PASS  (87/87)

→ 完成前的轻量检查 OK。较重的 e2e / 联合测试在 CI 侧执行。
```

仅当用 `#### 仅在想分别查看细节时 (optional)` 也跑了单独 typecheck (`pnpm --filter backend typecheck` / `pnpm --filter frontend typecheck`) 时，才把其结果作为追加行显示:

```text
Quality Gate (repo):

Lint:        PASS  (0 errors, 2 warnings)
Backend tc:  PASS  (0 errors)        # 仅 optional 执行时
Frontend tc: PASS  (0 errors)        # 仅 optional 执行时
Backend ut:  PASS  (412/412)
Frontend ut: PASS  (87/87)
```

失败时在首个失败的阶段停止并展示详情。

## 相关 skill / 命令

- [`shipping-misskey-change` 技能](../skills/shipping-misskey-change/SKILL.md) — commit / PR 前的最终检查清单 (misskey-js 重新生成 / SPDX / CHANGELOG 等)
- [`shipping-misskey-change/references/tasks/regenerate-misskey-js.md`](../skills/shipping-misskey-change/references/tasks/regenerate-misskey-js.md) — API 变更时的 `pnpm build-misskey-js-with-types` 执行步骤
- [.github/copilot-instructions.md §Validation 命令](../../.github/copilot-instructions.md) — pnpm 命令一览 (面向 Copilot / Codex 再录)

## 与原 ECC 版的差分

- 排除通用的语言自动判定，改为 Misskey 固定 pipeline。
- 无 formatter 阶段 (Misskey 仅采用 ESLint --fix)。
- e2e / federation / Cypress 较重，故排除并委托给 CI 侧。

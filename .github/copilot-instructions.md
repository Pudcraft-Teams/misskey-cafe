# misskey-cafe 的 Copilot Instructions

本文件作为 GitHub Copilot 的 repository-wide instructions 使用。由于 Copilot code review 在某些环境下不会读取 `AGENTS.md`，凡是 review 与轻量实现判断所需的规约，本文件必须单独自足。

本仓库是 **misskey-cafe**（Pudcraft-Teams 维护的 Misskey fork，上游为 misskey-dev/misskey，持续合并上游 `develop`）。仓库是 pnpm workspace 单一仓库（monorepo），主要实现位于 `packages/backend`（NestJS / TypeORM）与 `packages/frontend`（Vue 3）。更详细的指南可参考仓库根目录的 `AGENTS.md`，但不得省略本文件的要求而只给出对该文件的引用。

## 绝对禁止事项

违反会导致 CI 失败 / 生产事故。

### 代码与数据

- **SPDX 头必须存在**: 在 AGPL-3.0-only 管辖且属于 SPDX CI 检查范围的目录中新增 `.ts` / `.js` / `.cjs` / `.mjs` / `.scss` / `.vue` / `.html` 文件时，开头必须带上以下头部。详细判定范围见 `.github/workflows/check-spdx-license-id.yml`。头部文本（含 `syuilo and misskey-project`）为上游版权声明，fork 也原样沿用。

  ```text
  /*
   * SPDX-FileCopyrightText: syuilo and misskey-project
   * SPDX-License-Identifier: AGPL-3.0-only
   */
  ```

  新增 `.vue` / `.html` 文件用 HTML 注释形式:

  ```text
  <!--
  SPDX-FileCopyrightText: syuilo and misskey-project
  SPDX-License-Identifier: AGPL-3.0-only
  -->
  ```

  `packages/misskey-js` 是 MIT 许可的子包，不要一律套用此 AGPL 头（遵循子包自身的 `package.json` / `LICENSE` / 既有文件头）。

- **不得编辑 `locales/zh-CN.yml` 以外的 locale YAML**。本 fork 只直接维护 zh-CN.yml（fork 特有键的中文文案；它同时是全语言的最终回退与 i18n 类型生成的并入源）。`ja-JP.yml` 是上游键源，fork 保持与上游零差异不动它；其他语言文件由上游 Crowdin 自动分发，手动编辑会在合并上游时被覆盖丢失。fork 特有键的其他语言翻译由贡献者 PR 提供。
- **不得编辑已合并的 migration**。`packages/backend/migration/{timestamp}-*.js` 中已进入 `develop` / `master` 的文件（含来自上游的全部 migration）绝不可改动。需要变更 schema 时用新 timestamp 新建文件，并同时实现 `up()` 与 `down()`。
- **不得把 secrets / 凭据提交进仓库**（`.config/*.yml` 的生产值、`.env` 文件、API token、private key 等）。

### Git / 仓库操作

- 不得对 `main` / `develop` / `master` 执行 `git push --force` / `--force-with-lease`
- 不得用 `git commit --no-verify` 跳过 hook
- 不得用 `git commit --amend` 改写已合并 / 已推送的 commit
- 不得用 `git reset --hard` / `git branch -D` 破坏他人分支
- 不得未经用户许可改写 `git config`（尤其是 `user.name` / `user.email` / `commit.gpgsign`）

### Issue / PR / 对外发送

- 未经用户明确指示，不得 merge / close / force-push 任何 PR
- 未经用户明确指示，不得向 external service（GitHub 评论 / Slack / 邮件等）发送内容

## 语言规约（fork 默认简体中文）

本 fork 的维护团队与用户群体均为中文社区。所有 fork 新增的产出物默认使用简体中文：CHANGELOG 的 `## Unreleased` 条目正文（Prefix 保留英文 `Feat:` / `Enhance:` / `Fix:` / `Note:`）、commit message 正文、PR 标题与描述、新增代码注释与新增文档。fork 新增的 i18n 键只加进 `locales/zh-CN.yml`（类型生成会并入 zh-CN 独有键，zh-CN 同时是全语言最终回退），值写简体中文，不动 ja-JP.yml。来自上游的内容（既有日文注释、过往 CHANGELOG 条目、SPDX 头、Crowdin 管理的 locale 文件）保持原样不翻译，以减少合并上游时的冲突。

## 提交变更前的最低检查

1. `pnpm lint` 通过（typecheck + eslint，全部包）
2. backend 中变更了 `meta` / `paramDef` / `res` → 已执行 `pnpm build-misskey-js-with-types`，并把 `packages/misskey-js/src/autogen/` 的差异一并纳入 commit
3. 变更了 entity / migration → `pnpm --filter backend check-migrations` 以 pending DDL 0 件通过 / 新 migration 已同时实现 `up()` 与 `down()`
4. 新增了 `.ts` / `.js` / `.cjs` / `.mjs` / `.vue` / `.scss` / `.html` 文件 → 已添加 SPDX 头
5. 影响用户的变更 → 已在 `CHANGELOG.md` 的 `## Unreleased` 下对应子分区（`### General` / `### Client` / `### Server`）追加一行 `- <Feat|Enhance|Fix>: <概要>`（正文使用简体中文）
6. 编辑了 `locales/` 时，确认 `git diff --name-only develop -- 'locales/*.yml' | grep -v '^locales/zh-CN\.yml$'` 为空（除 zh-CN.yml 外无差异，ja-JP.yml 也必须保持零差异）

## 验证命令

- 整体构建: `pnpm build`
- 整体 lint / typecheck: `pnpm lint`
- Backend unit test: `pnpm --filter backend test`
- Backend e2e test: `pnpm --filter backend test:e2e`
- Backend federation test: `pnpm --filter backend test:fed`
- Frontend test: `pnpm --filter frontend test`
- Migration 差异检查: `pnpm --filter backend check-migrations`
- 重新生成 `misskey-js`（API 变更后必须）: `pnpm build-misskey-js-with-types`

**注意:** 运行 backend 测试（`test` / `test:e2e` / `test:fed`）前需要 `.config/test.yml`。若未创建，先执行 `ncp .github/misskey/test.yml .config/test.yml`（或 `cp .github/misskey/test.yml .config/test.yml`）再运行。各测试脚本内部会调用 `cross-env NODE_ENV=test pnpm compile-config`，因此只要复制过就无需额外的 compile-config。

按变更范围优先用最贴近的命令验证，必要时再扩大到整体命令。

## 编辑提示

- Backend 的 API / migration / TypeORM 变更看 `packages/backend`
- Frontend 的 Vue 组件与页面变更看 `packages/frontend`
- `AGENTS.md` 内的相对链接以仓库根目录为基准解析

**补充:** `AGENTS.md` 是更详细的正本（Codex / Claude Code 读取）。Copilot code review 以本文件为主要入口。在两者都会被读取的环境中，可以把 `AGENTS.md` 作为辅助信息使用。

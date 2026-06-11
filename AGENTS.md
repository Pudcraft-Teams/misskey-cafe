# misskey-cafe – AI Agent 指南

本仓库是 **misskey-cafe**，由 Pudcraft-Teams 维护的 [Misskey](https://github.com/misskey-dev/misskey) fork（上游为 misskey-dev/misskey，本 fork 持续跟随并合并上游 `develop`）。本文件是所有在本仓库工作的 AI 编码代理（Claude Code / OpenAI Codex / GitHub Copilot 等）共同参照的 **绝对禁止事项与最低检查清单** 的索引。各代理通过以下 3 条路径引用本文件：

- **Claude Code**: 由根目录 `CLAUDE.md` 通过 `@AGENTS.md` 引入。详细流程与规约见 `.claude/skills/`（按 description 自动索引）
- **OpenAI Codex**: 直接读取根目录 `AGENTS.md`（skill 入口在 `.agents/skills/`，实体指向 `.claude/skills/`）
- **GitHub Copilot**: 经由 `.github/copilot-instructions.md`（将本文件规约面向 Copilot code review 复述）引用

面向人类贡献者的一般规约（Issue / PR 的提交方式、ActivityPub 扩展等）见 [CONTRIBUTING.md](CONTRIBUTING.md)。本文件只聚焦 AI 在 **编写、修改、提交代码** 时绝不能越界的事项。

> [!IMPORTANT]
> 本 fork 需要持续合并上游。所有"与上游保持兼容"的规则（SPDX 头、Crowdin 管理的 locale 文件、migration 不可变性等）即使在 fork 中也 **原样保留**，否则每次合并上游都会产生冲突或丢失变更。

---

## 绝对禁止事项

违反会导致 CI 失败 / 生产事故 / 共享环境损坏。必须遵守。

### 代码与数据

1. **不得在 AGPL 管辖目录中新增缺少 SPDX 头的文件**
   - 对象：新增的 `.ts` / `.js` / `.cjs` / `.mjs` / `.vue` / `.scss` / `.html` 文件
   - CI 的判定范围见 [.github/workflows/check-spdx-license-id.yml](.github/workflows/check-spdx-license-id.yml) 的 `directories` 数组（`*.config.{ts,js,cjs,mjs}` 和 `*eslint*` 除外）
   - 缺失会导致 CI（`spdx` job）失败
   - 头部文本中的 `syuilo and misskey-project` **原样保留**（这是上游版权声明，fork 也沿用，不要改成 fork 名义）
   - `packages/misskey-js` 是 MIT 许可的子包，不要一律套用此 AGPL 头（遵循子包自身的 `package.json` / `LICENSE` / 既有文件头）

   `.ts` / `.js` / `.cjs` / `.mjs` / `.scss`:

   ```text
   /*
    * SPDX-FileCopyrightText: syuilo and misskey-project
    * SPDX-License-Identifier: AGPL-3.0-only
    */
   ```

   `.vue` / `.html`（HTML 注释形式）:

   ```text
   <!--
   SPDX-FileCopyrightText: syuilo and misskey-project
   SPDX-License-Identifier: AGPL-3.0-only
   -->
   ```

2. **不得手动编辑 `locales/ja-JP.yml` 以外的 locale YAML**
   - 其他语言文件（`en-US.yml` 等所有非 `ja-JP.yml` 文件）由上游通过 Crowdin 自动分发，随上游合并进入本 fork。手动编辑会在下次合并上游时被覆盖丢失或产生冲突
   - 依据：[locales/README.md](locales/README.md) 与 [crowdin.yml](crowdin.yml)（`ja-JP.yml` → `locales/%locale%.yml` 的同步配置）
   - 想改进翻译请前往上游 Crowdin 项目，而不是直接改文件

3. **不得编辑已合并的 migration 文件**
   - 对象：`packages/backend/migration/{unixMs}-{name}.js` 中已经合并进 `develop` / `master` 的文件（包括从上游合并进来的全部 migration）
   - 在生产环境中篡改历史会引发严重的数据不一致
   - 需要变更 schema 时，**用新的时间戳新建文件**（用 `node -e "console.log(Date.now())"` 获取时间戳）
   - 新 migration 必须同时实现 `up()` 和 `down()`，并通过 `pnpm --filter backend check-migrations`（用 TypeORM schema builder 检测 pending DDL）

### Git / 仓库操作

4. **不得对 `main` / `develop` / `master` 执行 `git push --force` / `--force-with-lease`**（可能抹掉他人工作）
5. **不得用 `git commit --no-verify` 跳过 hook**（会绕过 lint / format / SPDX 检查）
6. **不得用 `git commit --amend` 改写已合并 / 已推送的 commit**（破坏历史一致性）
7. **不得用 `git reset --hard` / `git branch -D` 破坏他人分支**
8. **不得未经用户许可改写 `git config`**（尤其是 `user.name` / `user.email` / `commit.gpgsign`）

### Issue / PR / 对外发送

9. **未经用户明确指示，不得 merge / close / force-push 任何 PR**
10. **未经用户明确指示，不得向 external service（GitHub 评论 / Slack / 邮件等）发送内容**
11. **不得把 secrets / 凭据提交进仓库**（`.config/*.yml` 的生产值、`.env` 文件、API token、private key 等）
12. **不得通过普通 Issue / PR 报告漏洞**（如需报告漏洞，必须参照 `creating-issues-and-prs` skill 的安全报告规则）

### Skill 调用

无论上游 skill 的执行情况、先验知识或 memory 内容如何，以下要求一律不豁免。

13. **未参照 `working-on-backend` skill 不得编辑或新增 `packages/backend/` 下的文件**
14. **未参照 `working-on-frontend` skill 不得编辑或新增 `packages/frontend/` 下的文件**
15. **未参照 `shipping-misskey-change` skill 不得 commit / 创建 PR / 把工作交还给用户**
16. **未参照 `creating-issues-and-prs` skill 不得创建 Issue / PR**（包括漏洞报告规则）

---

## 提交变更前的最低检查

各代理应参照 [shipping-misskey-change skill](.claude/skills/shipping-misskey-change/SKILL.md)。即使在无法使用 skill 的环境中，也必须完成以下检查：

1. **lint**: `pnpm lint` 通过（typecheck + eslint，全部包）
2. **变更了 backend API**: 已执行 `pnpm build-misskey-js-with-types`，并把 `packages/misskey-js/src/autogen/` 的差异一并纳入 commit
3. **变更了 entity / migration**: `pnpm --filter backend check-migrations` 以 pending DDL 0 件通过 / 新 migration 已同时实现 `up()` 和 `down()`
4. **新增文件**: 已添加 SPDX 头（`.vue` / `.html` 用 HTML 注释形式，其余用 TS 注释形式）
5. **影响用户的变更**: 已在 `CHANGELOG.md` 的 `## Unreleased` 下对应子分区（`### General` / `### Client` / `### Server`）追加一行 `- <Feat|Enhance|Fix>: <概要>`
6. **locale 安全**: 若编辑了 `locales/`，确认 `git diff --name-only develop -- 'locales/*.yml' | grep -v '^locales/ja-JP\.yml$'` 为空（除 ja-JP.yml 外无差异）

### 验证命令

各项检查使用的 pnpm 命令一览。按变更范围选择最贴近的命令进行验证。

| 用途 | 命令 |
| --- | --- |
| 整体 lint（typecheck + eslint） | `pnpm lint` |
| Backend unit test | `pnpm --filter backend test` |
| Backend e2e test | `pnpm --filter backend test:e2e` |
| Backend federation test | `pnpm --filter backend test:fed` |
| Frontend unit test | `pnpm --filter frontend test` |
| Migration 差异检查（pending DDL） | `pnpm --filter backend check-migrations` |
| 重新生成 `misskey-js`（API 变更后必须） | `pnpm build-misskey-js-with-types` |
| 整体构建 | `pnpm build` |
| 开发服务器（backend + frontend watch） | `pnpm dev` |

**注意:** 运行 backend 测试（`test` / `test:e2e` / `test:fed`）前需要 `.config/test.yml`（用 `ncp .github/misskey/test.yml .config/test.yml` 或 `cp .github/misskey/test.yml .config/test.yml` 创建）。

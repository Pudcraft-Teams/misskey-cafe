---
name: shipping-misskey-change
description: 在 Misskey 变更的每个收尾时刻——commit、开 PR、merge、或未提交就把工作交还用户之前——必须使用。运行发布前的最终检查清单——`pnpm lint`、backend API 变更时重新生成 misskey-js (`pnpm build-misskey-js-with-types`)、entity 或 migration 变更时执行 `pnpm --filter backend check-migrations`、新文件的 SPDX 头校验、locale 安全检查 (不编辑非 `ja-JP` 的 locale yml 文件)、以及用户可见变更在 `CHANGELOG.md` 的 Unreleased 条目。必须作为每次变更的最后一步参考——包括未提交的交接——以避免 CI 失败和翻译丢失。即使已调用 brainstorming、writing-plans 或其他上游技能也不豁免——无论此前执行过什么都要调用本技能。
---

# shipping-misskey-change

Misskey 变更的 **收尾局面** (commit / PR / merge 之前,或者未提交就把工作交还给用户之前) 必须运行的最终检查清单。

把 CI 容易失败 / reviewer 容易指出的要点集中在一处。为了避免之后再没空去翻 references,检查清单直接写在 SKILL.md 本体里。

**调用其他技能后也不豁免。** 即使先调用了 `brainstorming` / `writing-plans` / 其他上游技能,在把工作交还之前、commit 之前的时机也要调用本技能。

## 最终检查清单

把这份清单展开到 TodoWrite,逐项确认。**不适用的项可以跳过,但要明确说明判断**。

- [ ] lint 通过 — 基本做法是用 ECC 来源的 [/quality-gate](../../commands/quality-gate.md) 命令把 lint (typecheck + eslint) + 快速测试一起跑一遍。如果只想单独确认 lint,直接执行 `pnpm lint` 也可以
- [ ] 在 backend 修改了 `meta` / `paramDef` / `res` → 执行 `pnpm build-misskey-js-with-types`,并把 `packages/misskey-js/src/autogen/` 的差分也纳入 commit → 详细步骤见 [references/tasks/regenerate-misskey-js.md](references/tasks/regenerate-misskey-js.md)
- [ ] 修改了实体 (`packages/backend/src/models/*.ts` 中的 `@Column` / `@Entity` / `@Index`) → `pnpm --filter backend check-migrations` 以 pending DDL 0 件通过
- [ ] 新增了 migration 文件 → `up()` 和 `down()` 都已实现 / 完全没有改动已合并的现有 migration (为了持续合并上游,已合并的 migration 视为不可变)
- [ ] 新增了 `.ts` / `.js` / `.cjs` / `.mjs` / `.vue` / `.scss` / `.html` 文件 → 已加上 SPDX 头 (`.vue` / `.html` 用 HTML 注释形式,其余用 TS 注释形式)
- [ ] 编辑了 `locales/` → **只改了 `ja-JP.yml`**,没有产生其他语言 yml 的 diff (`git diff --name-only develop -- 'locales/*.yml' | grep -v '^locales/ja-JP\.yml$'` 为空)。其他语言文件由上游 Crowdin 管理,改了会在下次同步时被覆盖丢失
- [ ] 用户可见的变更 (新增功能 / 修改既有行为) → 已在 `CHANGELOG.md` 的 `## Unreleased` 正下方对应子小节 (General / Client / Server) 追加 1 行,正文使用简体中文 → 详细格式见 [references/tasks/changelog-update.md](references/tasks/changelog-update.md)
- [ ] 新增、修改了 backend API endpoint → 用 Task 启动 [misskey-api-reviewer](../../agents/misskey-api-reviewer.md) agent 做机械审查 (endpoint-list 漏注册 / misskey-js 漏再生成 / meta、UUID / SPDX。这是 lint 和 CI 难以捕捉的 404、漏注册的最后一道关卡,有相关变更就不要跳过)
- [ ] 新增、修改了 frontend 的 `.vue` → 用 Task 启动 [vue-component-reviewer](../../agents/vue-component-reviewer.md) agent 做机械审查 (SPDX 形式 / 命名 / i18n / SCSS 变量 / os.* / a11y / Storybook 配套)
- [ ] (可选) 想确认 `.claude/` harness 自身的健全性 → 执行 ECC 来源的 [/harness-audit](../../commands/harness-audit.md) 命令

## 这个技能是干什么的

它不是决定「**作业中要做什么**」的技能,而是「**做完之后让 CI 通过**」的技能。它作为从 `working-on-backend` / `working-on-frontend` 开始的工作的 **出口** 发挥作用。

如有对应变更,逐个 Read 各 references/tasks/ 并按详细步骤执行。只有 `pnpm lint` 可以不读 references 直接运行 (用 `/quality-gate` 一起跑)。

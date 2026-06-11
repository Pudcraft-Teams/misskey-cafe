---
name: working-on-backend
description: 每当编辑或新增 `packages/backend/` 下的代码时必须使用 —— 包括 REST API endpoint、NestJS service/module、TypeORM entity、migration 以及 backend 测试。涵盖 NestJS DI 模式、TypeORM entity 约定、endpoint-list 注册、meta/paramDef/res、misskey-js 重新生成、migration up/down 规则，以及 `.config/test.yml` 前置条件。在任何 backend 变更之前都必须参考本技能，以避免 CI 失败和生产事故。即使已调用 brainstorming、writing-plans 或其他上游技能也不豁免本技能 —— 无论此前执行过什么，进入实现阶段时都要调用本技能。
---

# working-on-backend

编辑 `packages/backend/` (Misskey 服务器本体) 时，最先参考的技能。汇总了 NestJS / TypeORM / API endpoint / migration / backend 测试的 **操作步骤** 与 **背景知识**。

SKILL.md 本体只是指向 references 的索引。具体的步骤和约定请 Read 对应文件 (progressive disclosure)。

**执行其他技能后也不豁免。** 即使先调用了 `brainstorming` / `writing-plans` / 其他上游技能，在进入触及 `packages/backend/` 的实现阶段时也要调用本技能。

## 按任务划分的工作流 (tasks)

以任务为单位的完整清单 + 检查点。要新增某些东西时打开。

- 新增 REST API endpoint → [references/tasks/adding-api-endpoint.md](references/tasks/adding-api-endpoint.md)
- 创建 DB migration (TypeORM CLI / 手写均可) → [references/tasks/creating-migration.md](references/tasks/creating-migration.md)

## 通用知识 (knowledge)

不绑定具体任务的参考资料。被多个任务引用的约定与背景说明。

- NestJS DI / module 注册 / `@Injectable` 模式 → [references/knowledge/nestjs-di.md](references/knowledge/nestjs-di.md)
- TypeORM entity / `@Column` / `@Index` 模式 (含疑难场景) → [references/knowledge/typeorm-patterns.md](references/knowledge/typeorm-patterns.md)
- API endpoint 的 `meta` / `paramDef` / `res` 完整速查表 + 陷阱集 → [references/knowledge/api-meta-paramdef.md](references/knowledge/api-meta-paramdef.md)
- 向 `endpoint-list.ts` 注册的方法 (★ 遗漏会 404) → [references/knowledge/endpoint-list.md](references/knowledge/endpoint-list.md)
- backend 测试的前置条件 (`.config/test.yml`) 与写法 / e2e 辅助函数一览 → [references/knowledge/backend-testing.md](references/knowledge/backend-testing.md)

## 务必最后经过的环节

把 backend 变更提交为 commit / PR 之前，务必遵循 [shipping-misskey-change](../shipping-misskey-change/SKILL.md) 的最终检查清单。把 `pnpm lint` / misskey-js 重新生成 / `check-migrations` / SPDX / CHANGELOG 一并确认。

如果新增或修改了 API endpoint，在其出口处用 Task 启动 [misskey-api-reviewer](../../agents/misskey-api-reviewer.md) agent (从 review-mode 机械化检查本技能各项约定的专用 reviewer)，就不容易漏掉 endpoint-list 注册遗漏或 misskey-js 重新生成遗漏。

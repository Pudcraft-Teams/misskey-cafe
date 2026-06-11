# 新增 REST API endpoint

向 `packages/backend/src/server/api/endpoints/<category>/<name>.ts` 新增 endpoint 的步骤。**忘记在配线阶段向 `endpoint-list.ts` 注册就会 404**，所以首先把这一点记在心里。

## 最重要的事实 (看漏会弄坏 CI / 生产环境)

1. **endpoint 不会被 glob 自动收集**。必须向 [endpoint-list.ts](../../../../../packages/backend/src/server/api/endpoint-list.ts) 增加 1 行 → [knowledge/endpoint-list.md](../knowledge/endpoint-list.md)
2. **改动 `meta` / `paramDef` / `res` 后必须重新生成 misskey-js**。忘记 `pnpm build-misskey-js-with-types` 会在 CI 的 `check-misskey-js-autogen` 中必定失败
3. **`meta.errors` 的每个 `id` 都是 UUID v4，且在仓库内唯一**。用 `crypto.randomUUID()` 生成，并用 `grep -r "id: '<UUID>'" packages/backend/src/server/api/endpoints/` 确认是否冲突

## 工作流全景图

```
1. 设计    : 确定 endpoint 的种类 (read/write × 是否需要认证 × 权限)
2. 实现    : 编写 meta / paramDef / 类本体 (带 SPDX 头)
3. 配线    : 在 endpoint-list.ts 注册 (★ 忘记会 404)
4. 验证    : e2e 测试 + lint + misskey-js 重新生成
5. 收尾    : CHANGELOG 条目 (用 shipping-misskey-change 确认)
```

---

## 1. 设计阶段 —— 以哪个模板为基底

先确定要创建的 endpoint 的性质。**把现有实现作为模板复制粘贴作为起点是最短路径**。

| 性质 | 作为基底的现有实现 |
|---|---|
| 无需认证、无参数、小型响应 | [endpoints/ping.ts](../../../../../packages/backend/src/server/api/endpoints/ping.ts) |
| 需要认证、用 DI 注入 Repository / Service、带 errors | [endpoints/notes/create.ts](../../../../../packages/backend/src/server/api/endpoints/notes/create.ts) |
| 分页 (sinceId/untilId/limit) | [endpoints/notes/timeline.ts](../../../../../packages/backend/src/server/api/endpoints/notes/timeline.ts) |
| 基于角色策略 (动态) 的访问控制 | [endpoints/notes/global-timeline.ts](../../../../../packages/backend/src/server/api/endpoints/notes/global-timeline.ts) — 使用 `RoleService.getUserPolicies()` |
| 文件附件 (`requireFile: true`) | [endpoints/drive/files/create.ts](../../../../../packages/backend/src/server/api/endpoints/drive/files/create.ts) |
| moderator / admin 专用 | [endpoints/admin/suspend-user.ts](../../../../../packages/backend/src/server/api/endpoints/admin/suspend-user.ts) (moderator), [endpoints/admin/roles/create.ts](../../../../../packages/backend/src/server/api/endpoints/admin/roles/create.ts) (admin) |

`<category>` 是功能领域 (例如 `notes`, `users`, `admin/announcements`)。目录沿用现有约定。

---

## 2. 实现阶段

### 2.1 SPDX 头 (必填)

新增 `.ts` 文件开头务必添加 (缺失会在 CI 的 `spdx` job 失败):

```ts
/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
```

**注:** `packages/misskey-js/src/autogen/` 下也会产生 diff，但 **misskey-js 是 MIT 许可证** 单独管理 (`packages/misskey-js/package.json:license` = MIT)，因此不加 / 无需 SPDX 头。

### 2.2 最小模板 (无需认证的 read 类)

```ts
/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';

export const meta = {
	tags: ['<tag>'],
	requireCredential: false,

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			// ...
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
	) {
		super(meta, paramDef, async (ps, me) => {
			// 实现。me 是 MiLocalUser | null (因为 requireCredential: false，必须做 null 检查)
		});
	}
}
```

### 2.3 包含 DI / errors / limit 的模板

```ts
import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['notes'],
	requireCredential: true,         // 需要认证 → kind 必填 (例外: secure: true 的内部 API 不需要 kind)
	kind: 'write:notes',             // OAuth scope (列表见 packages/misskey-js/src/consts.ts 的 `permissions`)
	prohibitMoved: false,            // 是否拒绝已迁移的账号
	limit: {
		duration: 1000 * 60 * 60,    // 1 小时
		max: 300,
	},
	errors: {
		noSuchNote: {                            // ← key 用 camelCase
			message: 'No such note.',            // ← 英语硬编码 (backend 没有 i18n 机制)
			code: 'NO_SUCH_NOTE',                // ← code 用 SCREAMING_SNAKE_CASE
			id: '17a0e0fa-3f3e-4f3e-9f3e-3f3e3f3e3f3e', // ← 用 crypto.randomUUID() 生成并确认无冲突
		},
	},
	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'Note',                 // 引用 packed entity 时
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },
	},
	required: ['noteId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,
	) {
		super(meta, paramDef, async (ps, me) => {
			// 因为 requireCredential: true，me 是 MiLocalUser (不会是 null)
			const note = await this.notesRepository.findOneBy({ id: ps.noteId });
			if (note == null) throw new ApiError(meta.errors.noSuchNote);
			// 实现
		});
	}
}
```

DI / module 注册的细节见 [knowledge/nestjs-di.md](../knowledge/nestjs-di.md)。

### 2.4 `exec` 函数的完整签名

`super(meta, paramDef, cb)` 的 `cb` 接收 7 个参数 ([endpoint-base.ts](../../../../../packages/backend/src/server/api/endpoint-base.ts) 的 `Executor` 类型):

```ts
async (ps, me, token, file, cleanup, ip, headers) => { ... }
```

| 参数 | 类型 | 用途 |
|---|---|---|
| `ps` | `SchemaType<typeof paramDef>` | 已通过 AJV 校验的输入 |
| `me` | `MiLocalUser` (requireCredential: true) / `MiLocalUser \| null` (false) | 本地用户。`requireCredential: false` 时务必做 null 检查 |
| `token` | `MiAccessToken \| null` | OAuth token (需要识别应用时) |
| `file` | `{ name, path } \| undefined` | 仅在 `requireFile: true` 时才确定会传入。endpoint 基类已做过 null 检查 |
| `cleanup` | `() => any \| undefined` | 删除已上传临时文件的回调。**基类自动调用它仅在 AJV 校验失败时**。正常结束或 endpoint 内抛异常时 **不会被调用**，所以有责任用 `try { ... } finally { cleanup!(); }` 务必调用 ([drive/files/create.ts](../../../../../packages/backend/src/server/api/endpoints/drive/files/create.ts) 的 `finally { cleanup!(); }` 是范例) |
| `ip` | `string \| null \| undefined` | 客户端 IP |
| `headers` | `Record<string, string> \| null \| undefined` | 请求头 |

大多数 endpoint 只用 `(ps, me)` 就够了。用到 `token` / `ip` / `headers` 的只是 admin / debug / auth 类中的极少数。

### 2.5 meta / paramDef 的约定

高频 5 项 (`tags` / `requireCredential` / `kind` / `limit` / `errors`) 的用法、全字段一览、`requiredRolePolicy` / `secure` / `cacheSec` / `allowGet` 等，以及 `paramDef` 的 AJV 实用模式见 → [knowledge/api-meta-paramdef.md](../knowledge/api-meta-paramdef.md)。

### 2.6 抛错的平衡

**应当返回给客户端的业务错误** 务必在 `meta.errors` 中列举并 `throw new ApiError(meta.errors.<key>)`。不遵守这一点会导致它不出现在 misskey-js 侧的类型中，响应也变成 500。可用第 2 个参数传递附加信息:

```ts
throw new ApiError(meta.errors.invalidParam, { reason: 'too short' });
```

另一方面 **未预期的异常 (DB 不一致 / 下层 service 的 bug / 防御性断言)** 保持 `throw new Error('...')` 即可。如果把所有异常都用 `ApiError` 包起来，未知的 bug 会被当作 client error 隐藏掉。`endpoints/notes/create.ts` 的 `catch` 块末尾的 `throw err;` 就是这种两段式的典型。

---

## 3. 配线阶段 —— 向 endpoint-list.ts 注册 ★必填

向 [endpoint-list.ts](../../../../../packages/backend/src/server/api/endpoint-list.ts) 的 **同一 category 内** 增加 1 行:

```ts
export * as '<category>/<name>' from './endpoints/<category>/<name>.js';
```

细节与陷阱见 [knowledge/endpoint-list.md](../knowledge/endpoint-list.md)。**漏掉这里的注册 = 404**。

---

## 4. 验证阶段

### 4.1 e2e 测试

[packages/backend/test/e2e/](../../../../../packages/backend/test/e2e/) 的结构是 **按功能 category 分文件** (`note.ts` / `users.ts` / `timelines.ts` / `drive.ts` / `clips.ts` / `oauth.ts` 等)。

- 如果已有对应 category 的文件，就在那里用 `describe('<人类可读标签>', () => { test('正常路径', ...) })` 追加
- 不适合任何文件就加到 `test/e2e/endpoints.ts`
- `describe` 名 **可人类可读**

最小示例 (详细辅助函数一览见 → [knowledge/backend-testing.md](../knowledge/backend-testing.md)):

```ts
import { describe, test } from 'vitest';
import * as assert from 'node:assert';
import { api, signup } from '../utils.js';

describe('<人类可读标签>', () => {
	test('正常路径', async () => {
		const alice = await signup({ username: 'alice' });
		const res = await api('<category>/<name>', { /* params */ }, alice);
		assert.strictEqual(res.status, 200);
	});
});
```

运行 (前提: `.config/test.yml` —— 见 [knowledge/backend-testing.md](../knowledge/backend-testing.md) §前置条件):

```bash
pnpm --filter backend test:e2e
```

### 4.2 lint / typecheck

```bash
# 快速检查单个文件
pnpm exec eslint --fix packages/backend/src/server/api/endpoints/<category>/<name>.ts
pnpm --filter backend typecheck      # tsgo --noEmit (仅 backend)

# 一并检查 (提交 PR 前)
pnpm --filter backend lint
```

### 4.3 misskey-js 重新生成 (★必填)

改动 `meta` / `paramDef` / `res` 后务必:

```bash
pnpm build-misskey-js-with-types
```

PR 中如果不包含 `packages/misskey-js/src/autogen/` 下的差分，会在 CI 的 `check-misskey-js-autogen` 中必定失败 (最常见的错误)。详细步骤见 [shipping-misskey-change/references/tasks/regenerate-misskey-js.md](../../../shipping-misskey-change/references/tasks/regenerate-misskey-js.md)。

---

## 5. 收尾阶段 —— CHANGELOG

如果有用户影响 (新功能 / 改变现有行为)，向 `CHANGELOG.md` 的 `## Unreleased` → `### Server` 增加 1 行。详情遵循 [shipping-misskey-change 技能](../../../shipping-misskey-change/SKILL.md)。

---

## 陷阱汇总 (PR 中高频的错误)

详细的 症状 → 原因 → 修复 格式见 → **[knowledge/api-meta-paramdef.md](../knowledge/api-meta-paramdef.md) §陷阱**

- **变成 404** → `endpoint-list.ts` 注册遗漏
- **CI `check-misskey-js-autogen` 失败** → 忘记 `pnpm build-misskey-js-with-types`
- **CI `spdx` 失败** → SPDX 头缺失
- **客户端收到 500 与缺失的 error 类型** → 未在 `meta.errors` 列举就 `throw new ApiError(...)`
- **`me.id` 报 TypeError** → `requireCredential: false` 时忘记 null 检查
- **UUID 重复** → 忘记冲突确认的 grep
- **临时文件残留** → `requireFile: true` 时忘记在 `finally` 调用 `cleanup!()`
- **`requiredRolePolicy` 导致匿名访问 500** → 因为 `ApiCallService` 以非 null 前提引用 `user!.id`，所以必须 `requireCredential: true`

---

## 参考文件

### 代码库

- [endpoints.ts (meta/paramDef 类型定义)](../../../../../packages/backend/src/server/api/endpoints.ts)
- [endpoint-base.ts (Endpoint 基类)](../../../../../packages/backend/src/server/api/endpoint-base.ts)
- [endpoint-list.ts (★ 在这里注册)](../../../../../packages/backend/src/server/api/endpoint-list.ts)
- [error.ts (ApiError)](../../../../../packages/backend/src/server/api/error.ts)
- [endpoints/ping.ts (最小示例)](../../../../../packages/backend/src/server/api/endpoints/ping.ts)
- [endpoints/notes/create.ts (DI + errors 的典型)](../../../../../packages/backend/src/server/api/endpoints/notes/create.ts)
- [endpoints/notes/global-timeline.ts (policies 动态检查)](../../../../../packages/backend/src/server/api/endpoints/notes/global-timeline.ts)
- [test/e2e/endpoints.ts (测试示例)](../../../../../packages/backend/test/e2e/endpoints.ts)
- [test/utils.ts (api/signup/post 等辅助函数)](../../../../../packages/backend/test/utils.ts)
- [scripts/generate_api_json.js (misskey-js 生成源)](../../../../../packages/backend/scripts/generate_api_json.js)

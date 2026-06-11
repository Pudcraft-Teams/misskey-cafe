# API endpoint 的 meta / paramDef / res 完整速查表

把 [`IEndpointMeta`](../../../../../packages/backend/src/server/api/endpoints.ts) 的全部字段、AJV `paramDef` 的实用模式，以及 PR review 中高频的陷阱汇总到一页。新建 / 编辑现有 endpoint 时打开。

## 目录

- [全字段一览](#全字段一览)
- [权限限制字段的取舍](#权限限制字段的取舍)
- [`kind` 的值](#kind-的值)
- [`errors` 的写法](#errors-的写法)
- [`res` 的写法](#res-的写法)
- [`paramDef` (AJV) 实用模式](#paramdef-ajv-实用模式)
- [向 OpenAPI 的反映映射](#向-openapi-的反映映射)
- [陷阱](#陷阱)

## 全字段一览

出自 [endpoints.ts](../../../../../packages/backend/src/server/api/endpoints.ts) 的 `IEndpointMetaBase` 类型。

| 字段 | 类型 | 默认 | 用途 |
|---|---|---|---|
| `stability` | `'deprecated' \| 'experimental' \| 'stable'` | (未指定) | 稳定度提示。标了 `'deprecated'` 的 API 应避免新使用 |
| `tags` | `ReadonlyArray<string>` | — | OpenAPI 标签。实际上只有 `tags[0]` 会被反映 |
| `errors` | `Record<key, { message, code, id }>` | — | 返回给客户端的业务错误定义。各 `id` 为 UUID v4 且唯一 |
| `res` | `Schema` (`@/misc/json-schema.js`) | — | 响应 JSON Schema。也可像 `ref: 'Note'` 那样引用 packed entity |
| `requireCredential` | `boolean` | `false` | 是否需要认证。`true` 时务必设置 `kind` |
| `requireModerator` | `boolean` | `false` | 需要 isModerator 角色。`true` 时 `kind` 必填 |
| `requireAdmin` | `boolean` | `false` | 需要 isAdministrator 角色。`true` 时 `kind` 必填 |
| `requiredRolePolicy` | `KeyOf<'RolePolicies'>` | (未指定) | 要求满足特定角色策略 (例如 `'canCreateChannel'`) 的角色 |
| `prohibitMoved` | `boolean` | `false` | 拒绝已迁移账号的用户 (主要在 write 类中考虑) |
| `limit` | `{ key?, duration?, max?, minInterval? }` | 无 | 速率限制。`duration` 与 `max` 成对设置 |
| `requireFile` | `boolean` | `false` | 需要 multipart/form-data 的文件附件。`true` 时 `exec` 的 `file` 参数确定会传入 |
| `secure` | `boolean` | `false` | 第三方应用无法使用。OpenAPI 中会出现 "Internal Endpoint" 标注 |
| `kind` | `(typeof permissions)[number]` | — | OAuth scope。`'read:account'` / `'write:notes'` 等。类型与 require* 系列有互斥约束 ([endpoints.ts](../../../../../packages/backend/src/server/api/endpoints.ts) 的类型 union 定义) |
| `description` | `string` | — | 进入 OpenAPI 的 operation description |
| `allowGet` | `boolean` | `false` | 是否允许 GET 方法 (默认仅 POST)。对幂等的 read 类有用 |
| `cacheSec` | `number` | — | 给正常响应附加 `Cache-Control: public, max-age=<秒>` |

## 权限限制字段的取舍

在 [endpoints.ts](../../../../../packages/backend/src/server/api/endpoints.ts) 中表示为类型 union，组合上有约束:

| 情况 | `requireCredential` | `requireModerator` | `requireAdmin` | `kind` |
|---|---|---|---|---|
| 无需认证 | `false` 或省略 | (省略) | (省略) | 不需要 |
| 需要一般用户认证 | `true` | (省略) | (省略) | **必填** (`'read:account'` 等) |
| 需要 moderator 以上 | (省略) | `true` | (省略) | **必填** (例如 `'read:admin:show-user'`) |
| 需要 admin | (省略) | (省略) | `true` | **必填** (例如 `'write:admin:emoji'`) |
| Misskey 本体专用 (`secure: true`) | 任意 | 任意 | 任意 | **不需要** (在类型 union 中排除) |

**`secure: true` 的例外**: [endpoints.ts](../../../../../packages/backend/src/server/api/endpoints.ts) 的 `secure: true` union variant 独立于其他 require*，不要求 `kind`。实例: [auth/accept.ts](../../../../../packages/backend/src/server/api/endpoints/auth/accept.ts) (`secure: true + requireCredential: true` 但无 `kind`)，[i/export-user-lists.ts](../../../../../packages/backend/src/server/api/endpoints/i/export-user-lists.ts) 也是如此。由于第三方应用无法调用，所以不需要 OAuth scope。

此外还可使用:

- **`requiredRolePolicy: 'canCreateChannel'`** — 仅限被允许特定角色策略的用户。**必须 `requireCredential: true`**: 因为 [ApiCallService.ts](../../../../../packages/backend/src/server/api/ApiCallService.ts) 在 `requiredRolePolicy` 分支以非 null 前提访问 `user!.id`，与允许匿名组合会因 TypeError 而 500。如果也想允许匿名，则不在 `meta` 而在运行时用 `RoleService.getUserPolicies(me ? me.id : null)` 判定 ([endpoints/notes/global-timeline.ts](../../../../../packages/backend/src/server/api/endpoints/notes/global-timeline.ts) 的模式)。策略列表见 [`RolePolicies`](../../../../../packages/backend/src/core/RoleService.ts)
- **`secure: true`** — 使其只能从 Misskey 本体前端调用 (无法用 OAuth token 调用)。如上所述不需要 `kind`

## `kind` 的值

完整列表见 [`packages/misskey-js/src/consts.ts`](../../../../../packages/misskey-js/src/consts.ts) 的 `permissions` 数组。代表性示例:

| 模式 | 示例 |
|---|---|
| 一般 read | `'read:account'`, `'read:notifications'`, `'read:drive'`, `'read:reactions'` |
| 一般 write | `'write:account'`, `'write:notes'`, `'write:reactions'`, `'write:drive'` |
| Admin read | `'read:admin:meta'`, `'read:admin:server-info'`, `'read:admin:show-user'`, `'read:admin:user-ips'` |
| Admin write | `'write:admin:reset-password'`, `'write:admin:suspend-user'`, `'write:admin:emoji'`, `'write:admin:roles'` |

新增操作领域时，需要同时把它加到 `consts.ts` 的 `permissions` 数组。

## `errors` 的写法

```ts
errors: {
	noSuchNote: {                                            // ← key 用 camelCase
		message: 'No such note.',                            // ← 英语硬编码 (backend 没有 i18n 机制)
		code: 'NO_SUCH_NOTE',                                // ← code 用 SCREAMING_SNAKE_CASE
		id: '17a0e0fa-3f3e-4f3e-9f3e-3f3e3f3e3f3e',          // ← UUID v4。在仓库内唯一
		httpStatusCode: 404,                                 // ← 可选。覆盖 HTTP 状态码
		kind: 'client',                                      // ← 可选。'client' (默认) / 'server' / 'permission'
	},
},
```

`httpStatusCode` 与 `kind` 经由 [error.ts](../../../../../packages/backend/src/server/api/error.ts) 的类型 `E` 接受。不指定则为默认行为 (客户端错误是 400 系)。

命名规则 (在现有实现中一致):

- key: `camelCase` (`noSuchNote`, `cannotReRenote`, `alreadyBlocking`, `youHaveBeenBlocked`)
- `code`: `SCREAMING_SNAKE_CASE` (`'NO_SUCH_NOTE'`, `'CANNOT_RENOTE_TO_A_PURE_RENOTE'`)
- 前缀模式: `NO_SUCH_*` / `CANNOT_*` / `ALREADY_*` / `TOO_MANY_*` / `INVALID_*` / `*_REQUIRED`

`throw new ApiError(meta.errors.noSuchNote, { reason: '详细信息' })` 的第 2 个参数进入 `info`，作为响应 JSON 的 `error.info` 返回。

## `res` 的写法

JSON Schema 或对 packed entity 的引用:

```ts
// 简单对象
res: {
	type: 'object',
	optional: false, nullable: false,
	properties: {
		count: { type: 'integer' },
	},
},

// packed entity 引用
res: {
	type: 'object',
	optional: false, nullable: false,
	ref: 'Note',                  // ← packages/backend/src/models/json-schema/*.ts 的定义名
},

// 数组
res: {
	type: 'array',
	optional: false, nullable: false,
	items: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'Note',
	},
},
```

每个属性都 **务必明示** `optional: false, nullable: false`。省略会使 schema 变宽松，生成的 misskey-js 类型也会变模糊。

## `paramDef` (AJV) 实用模式

`paramDef` 是用 AJV (`new Ajv({ useDefaults: true })`) 编译的、兼容 JSON Schema 7 的 schema。详情见 [endpoint-base.ts](../../../../../packages/backend/src/server/api/endpoint-base.ts) 的 AJV 初始化。

### 自定义 format

只有 **`format: 'misskey:id'`** 是 Misskey 独有的 ([endpoint-base.ts](../../../../../packages/backend/src/server/api/endpoint-base.ts) 的 `addFormat`):

```ts
ajv.addFormat('misskey:id', /^[a-zA-Z0-9]+$/);
```

其他 (`'date-time'`, `'email'`, `'url'` 等) 是 JSON Schema 标准。AJV 默认不做 format 校验，而在 Misskey 的 AJV 配置下，format 名只是不报校验错误地通过 (只有 ID 模式才真正做正则校验)。

### 基本模式

```ts
export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },         // 必填 ID
		text: { type: 'string', minLength: 1, maxLength: 500 },   // 字符长度约束
		count: { type: 'integer', minimum: 0, maximum: 100, default: 10 },
		isPublic: { type: 'boolean', default: false },
		visibility: { type: 'string', enum: ['public', 'home', 'followers', 'specified'] },
	},
	required: ['noteId'],
} as const;
```

务必加 `as const`。这样 `SchemaType<typeof paramDef>` 才能被类型推断。

### 分页 (sinceId / untilId / limit)

[notes/timeline.ts](../../../../../packages/backend/src/server/api/endpoints/notes/timeline.ts):

```ts
properties: {
	limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
	sinceId: { type: 'string', format: 'misskey:id' },
	untilId: { type: 'string', format: 'misskey:id' },
	sinceDate: { type: 'integer' },
	untilDate: { type: 'integer' },
},
```

用 `QueryService.makePaginationQuery(qb, ps.sinceId, ps.untilId, ps.sinceDate, ps.untilDate)` 反映到 TypeORM query builder。

### 数组与 item 约束

```ts
properties: {
	// 唯一、最少1、最多100 个的 ID 列表
	noteIds: {
		type: 'array',
		uniqueItems: true,
		minItems: 1,
		maxItems: 100,
		items: { type: 'string', format: 'misskey:id' },
	},
},
```

实例: [notes/show-partial-bulk.ts](../../../../../packages/backend/src/server/api/endpoints/notes/show-partial-bulk.ts) (`noteIds`), [notes/drafts/create.ts](../../../../../packages/backend/src/server/api/endpoints/notes/drafts/create.ts) (`fileIds` / `visibleUserIds` 带 `uniqueItems`)

### `oneOf` / `anyOf` (互斥选择)

允许多种请求参数形态时:

```ts
properties: {
	userId: { type: 'string', format: 'misskey:id' },
	username: { type: 'string' },
	host: { type: 'string', nullable: true },
},
anyOf: [
	{ required: ['userId'] },
	{ required: ['username'] },
],
```

`res` 侧也能用 `oneOf` 表达变体响应 ([ap/show.ts](../../../../../packages/backend/src/server/api/endpoints/ap/show.ts) 的 `res`):

```ts
res: {
	optional: false, nullable: false,
	oneOf: [
		{ type: 'object', properties: { type: { enum: ['User'] }, object: { ref: 'UserDetailedNotMe' } } },
		{ type: 'object', properties: { type: { enum: ['Note'] }, object: { ref: 'Note' } } },
	],
},
```

### `additionalProperties` (动态键)

不用固定的 `properties`，而表示「任意键 → 值的类型」时:

```ts
data: {
	type: 'object',
	additionalProperties: {
		anyOf: [{ type: 'number' }],
	},
},
```

实例: [retention.ts](../../../../../packages/backend/src/server/api/endpoints/retention.ts), [admin/get-table-stats.ts](../../../../../packages/backend/src/server/api/endpoints/admin/get-table-stats.ts)

`type: 'object', additionalProperties: true` 则是「接受任意内容」(无校验)。

### `default` (值补全)

由于 AJV 以 `useDefaults: true` 构建，写了 `default` 后，请求中没有该值时会自动填充:

```ts
properties: {
	includeMyRenotes: { type: 'boolean', default: true },
},
```

能吸收客户端的省略，因此在向后兼容的变更中很有用。

### nullable 属性

```ts
properties: {
	parentId: { type: 'string', format: 'misskey:id', nullable: true },
},
```

加上 `nullable: true` 就显式接受 `null`。

## 向 OpenAPI 的反映映射

出自 [gen-spec.ts](../../../../../packages/backend/src/server/api/openapi/gen-spec.ts):

| meta 字段 | 向 OpenAPI 的反映 |
|---|---|
| `description` | operation description (开头) |
| `secure: true` | description 中加 "**Internal Endpoint**: ..." 的警告 |
| `requireCredential: true` | description 中加 "**Credential required**: *Yes*" + `security: [bearerAuth]` |
| `kind` | description 中加 "**Permission**: *<kind>*" |
| `tags[0]` | operation tag (实际只有第 1 个) |
| `requireFile: true` | requestBody 变成 `multipart/form-data`，并追加 `file: { type: 'string', format: 'binary' }` |
| `errors` | examples (operation 的 `responses` 之下) |
| `res` | response body schema |
| `limit` | 在 `responses` 中追加 `429 Too many requests` 响应 |
| `allowGet` | 在同一 path 追加 `get` operation (POST 与 GET 都会生成) |

**不反映到 OpenAPI (仅内部)**: `requireModerator` / `requireAdmin` / `requiredRolePolicy` / `prohibitMoved` / `cacheSec` / `stability`。

## 陷阱

把 PR review 中高频的错误按「**症状 → 原因 → 修复**」收集起来。

### 1. endpoint 变成 404

- **症状**: 在开发服务器调用时返回 `{"error": {"code": "UNKNOWN_API_ENDPOINT", ...}}` (经由 GET 的 catch-all)，或裸的 404 (POST 等)
- **原因**: 向 [endpoint-list.ts](../../../../../packages/backend/src/server/api/endpoint-list.ts) 的注册遗漏。endpoint 不会被 glob 自动收集
- **修复**: → [knowledge/endpoint-list.md](endpoint-list.md)

### 2. CI `check-misskey-js-autogen` 失败

- **症状**: PR 上出现 `Please regenerate misskey-js` 的评论
- **原因**: 改动了 `meta` / `paramDef` / `res` 却没有重新生成 misskey-js 的自动生成物
- **修复**: → [shipping-misskey-change/references/tasks/regenerate-misskey-js.md](../../../shipping-misskey-change/references/tasks/regenerate-misskey-js.md)

### 3. CI `spdx` job 失败

- **症状**: `SPDX header missing` 的消息
- **原因**: 新增 `.ts` 文件没有 SPDX 头
- **修复**: 在文件开头贴上 SPDX。注: `packages/misskey-js/` 下是 MIT 另一许可证，所以不需要 SPDX

### 4. 客户端收到 500 + 缺失的 error 类型

- **症状**: 前端想根据 `result.error.code` 分支，但它不出现在 misskey-js 的类型中。响应是 500
- **原因**: 把未在 `meta.errors` 列举的错误用 `throw new ApiError({...})` 或 `throw new Error(...)` 抛出了
- **修复**: 业务错误务必先注册到 `meta.errors`，再 `throw new ApiError(meta.errors.<key>)`
- **反方向的坑**: 「连未预期的 bug 都全部用 `ApiError` 包起来」也不行。`endpoints/notes/create.ts` 的 `catch` 块末尾的 `throw err;` 是范例

### 5. `me.id` 报 `Cannot read properties of null`

- **症状**: 无认证请求时 TypeError
- **原因**: `requireCredential: false` 时 `me` 是 `MiLocalUser | null`，却未做 null 检查就用了 `me.id`
- **修复**: 加 null 检查，或如果需要认证就改为 `requireCredential: true`

### 6. UUID 与其他 endpoint 冲突

- **症状**: 复用了 `errors.id` 会导致 misskey-js 侧类型串味
- **原因**: 把 UUID 硬编码后复用
- **修复**: 冲突确认

  ```bash
  grep -r "id: '<生成的 UUID>'" packages/backend/src/server/api/endpoints/
  ```

  新生成用 `node -e "console.log(crypto.randomUUID())"`

### 7. 在 `paramDef` 中写 `policies`

- **症状**: API 变成「请在 payload 中传 `gtlAvailable: true`」这样不自然的形态 / 客户端指定后即可绕过
- **原因**: 角色策略是 **动态获取的东西**
- **修复**: 从 paramDef 移除，在 `exec` 内调用 `RoleService.getUserPolicies(me?.id)` 判定

### 8. 用日语写错误消息

- **症状**: 像 `message: 'ノートが見つかりません'` 这样的日语未经 i18n 就传给客户端
- **原因**: backend 没有 i18n 机制
- **修复**: `message` 统一用英语硬编码。前端以 `error.id` (UUID) 或 `error.code` 为 key 自行 localize

### 9. 忘记 `as const`

- **症状**: `Endpoint<typeof meta, typeof paramDef>` 的类型推断坏掉，`ps` 的类型变成 `any`
- **修复**: 务必加上 `export const meta = { ... } as const;` 与 `export const paramDef = { ... } as const;`

### 10. `requireCredential: true` 却忘记写 `kind`

- **症状**: TypeScript 类型错误 (`Property 'kind' is missing`)
- **原因**: [endpoints.ts](../../../../../packages/backend/src/server/api/endpoints.ts) 的 union 约束让 `kind` 在类型层面必填
- **修复**: 在 `kind` 中设置合适的 OAuth scope
- **例外**: `secure: true` (Misskey 本体专用) 的 endpoint 在 [endpoints.ts](../../../../../packages/backend/src/server/api/endpoints.ts) 中作为另一 union variant 处理，不需要 `kind`

### 11. 忘记调用 `requireFile: true` 的 cleanup 导致临时文件残留

- **症状**: 上传后即使 endpoint 正常结束/异常结束，OS 的临时目录中文件仍持续残留，占满磁盘
- **原因**: [endpoint-base.ts](../../../../../packages/backend/src/server/api/endpoint-base.ts) 自动调用 `cleanup` 仅在 **AJV 校验失败时**
- **修复**: 用 `try { ... } finally { cleanup!(); }` 包起来 ([drive/files/create.ts](../../../../../packages/backend/src/server/api/endpoints/drive/files/create.ts) 的 `finally { cleanup!(); }` 是范例)

### 12. 仅用 `requiredRolePolicy` 就允许匿名

- **症状**: 匿名调用 API 时 500 + `TypeError: Cannot read properties of null (reading 'id')`
- **原因**: [ApiCallService.ts](../../../../../packages/backend/src/server/api/ApiCallService.ts) 在带 `requiredRolePolicy` 的 endpoint 中以非 null 前提访问 `user!.id`
- **修复**: 要静态声明必需策略就务必与 `requireCredential: true` 并用。如果想对匿名用户也应用不同的策略集，就在运行时用 `RoleService.getUserPolicies(me ? me.id : null)` 判定 ([notes/global-timeline.ts](../../../../../packages/backend/src/server/api/endpoints/notes/global-timeline.ts) 模式)

### 13. e2e 测试无法启动

- **症状**: `pnpm --filter backend test:e2e` 执行后立刻报错 / DB 连接错误
- **原因**: 没有 `.config/test.yml`
- **修复**: → [knowledge/backend-testing.md §前置条件](backend-testing.md)

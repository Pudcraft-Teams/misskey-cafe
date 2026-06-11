# Backend 测试的前置条件与写法

把 Misskey backend 的测试构成、`.config/test.yml` 的前置条件、e2e 测试的辅助函数集汇总到一页。

## 目录

- [前置条件: `.config/test.yml`](#前置条件-configtestyml)
- [测试种类与执行命令](#测试种类与执行命令)
- [e2e 测试的放置](#e2e-测试的放置)
- [通用 setup](#通用-setup)
- [`api()` 辅助函数](#api-辅助函数)
- [`signup()` / `post()` / `uploadFile()` 等](#signup--post--uploadfile-等)
- [本地 DB / Redis](#本地-db--redis)

## 前置条件: `.config/test.yml`

backend 的测试脚本 (`test` / `test:e2e` / `test:fed`) 内部都会执行 `cross-env NODE_ENV=test pnpm compile-config`，读取 `.config/test.yml` ([packages/backend/package.json](../../../../../packages/backend/package.json), [packages/backend/scripts/compile_config.js](../../../../../packages/backend/scripts/compile_config.js))。**未创建则测试本身无法启动**。

未创建的话手动复制一次即可 (任选其一):

```bash
ncp .github/misskey/test.yml .config/test.yml
# 或者
cp .github/misskey/test.yml .config/test.yml
```

补充:

- 经由根目录的 `pnpm start:test` (为 Cypress 启动测试服务器的命令) 这条路径时，运行时会用 `ncp` 自动复制 ([package.json](../../../../../package.json))。除此之外直接跑 backend 测试时需要上面的手动复制
- 如果已有 `.config/test.yml`，各测试脚本内部的 `compile-config` 就足够了，无需额外执行 `pnpm --filter backend compile-config`
- `pnpm start:test` 不是 backend e2e 测试 (`pnpm --filter backend test:e2e`) 的前提 (会引起端口冲突，因此不要使用)

## 测试种类与执行命令

| 种类 | 配置文件 | 执行命令 |
| --- | --- | --- |
| Unit | `packages/backend/vitest.config.unit.ts` | `pnpm --filter backend test` |
| E2E (HTTP / DB) | `packages/backend/vitest.config.e2e.ts` | `pnpm --filter backend test:e2e` |
| Federation | `packages/backend/vitest.config.fed.ts` | `pnpm --filter backend test:fed` |

- 放置: `packages/backend/test/` 下
- 覆盖率: `pnpm --filter backend test-and-coverage`

## e2e 测试的放置

`packages/backend/test/e2e/` 现有的文件示例:

```
note.ts            笔记相关 (创建、renote、visibility、附件等)
users.ts           用户相关
timelines.ts       时间线
drive.ts           网盘 (上传/下载)
clips.ts           剪藏
oauth.ts           OAuth 流程
streaming.ts       WebSocket
api.ts             API 层整体 (认证、速率限制等)
api-visibility.ts  公开范围检查
endpoints.ts       不归入上述 category 的杂项
2fa.ts             2FA
block.ts / mute.ts / antennas.ts / clips.ts / move.ts / nodeinfo.ts / ...
```

**不存在 `admin.ts`**。admin 类 endpoint 的 e2e 现实做法是放到 `api.ts` (作为 API 层行为) 或 `endpoints.ts` (杂项区)。

### 判断规则

1. 如果你要添加的 endpoint 归属于现有 category 文件 (`note.ts`, `users.ts` 等)，就在那里加 `describe('...', () => { test(...) })`
2. 不归入任何 category 就加到 `endpoints.ts`
3. 仅当测试用例变多 (>200 行) 且独立性高时才拆成新文件

`describe` 的标签名 **可人类可读** (像 `describe('Note', ...)`, `describe('管理员操作', ...)` 这样的形式)。不必是 `<category>/<name>` 形式。

## 通用 setup

`packages/backend/test/setup.e2e.ts` (vitest 的 `setupFiles`) 注册各测试文件通用的 `beforeAll` (测试 DB 初始化 + 环境重置)。测试服务器的启动/停止另由 vitest 的 `globalSetup` (`test-server/entry.ts` 的 `setup()` / `teardown()`) 负责。各测试文件中用自己的 `beforeAll` 准备用户:

```ts
import { describe, test, beforeAll, afterAll } from 'vitest';
import * as assert from 'node:assert';
import { api, signup, post, role, uploadFile } from '../utils.js';
import type { UserToken } from '../utils.js';

describe('功能名', () => {
	let alice: UserToken;

	beforeAll(async () => {
		alice = await signup({ username: 'alice' });
	});

	test('正常路径', async () => {
		const res = await api('<category>/<name>', { /* params */ }, alice);
		assert.strictEqual(res.status, 200);
	});
});
```

## `api()` 辅助函数

[test/utils.ts](../../../../../packages/backend/test/utils.ts) 的 `api()`:

```ts
const res = await api('<category>/<name>', params, me?);
// res.status   : HTTP 状态码 (200 / 400 / 401 / 403 / 500 等)
// res.headers  : Headers
// res.body     : 响应 JSON (类型从 misskey.Endpoints 自动推断)
```

省略 `me?` 即未认证请求。传入 `me` 则用该用户的 token 调用。

### 错误响应的校验

```ts
test('对不存在的笔记报错', async () => {
	const res = await api('notes/show', { noteId: '0000000000000000' }, alice);
	assert.strictEqual(res.status, 400);
	assert.strictEqual(castAsError(res.body as any).error.code, 'NO_SUCH_NOTE');
});
```

用 `castAsError(...).error.code` 可校验 `meta.errors.<key>.code` ([test/utils.ts](../../../../../packages/backend/test/utils.ts) 的 `castAsError`)。

## `signup()` / `post()` / `uploadFile()` 等

### `signup()` — 创建测试用户

```ts
const alice = await signup({ username: 'alice' });        // 默认密码 'test'
const bob = await signup({ username: 'bob', password: 'secret123' });
```

返回值是注册响应 (含 token)，可直接传给 `api()` 的第 3 个参数。

### `post()` — 发布笔记

```ts
const note = await post(alice, { text: 'hello' });
// 返回值是 misskey.entities.Note
```

带复杂公开范围、附件时也能像 `post(alice, { text: ..., visibility: 'specified', visibleUserIds: [...], fileIds: [...] })` 这样传。

### `uploadFile()` — 向网盘上传文件

```ts
const file = await uploadFile(alice);                                       // 上传 resources/192.jpg
const file2 = await uploadFile(alice, { path: '192.png' });                 // resources/192.png
const file3 = await uploadFile(alice, { blob: new Blob([...]) });           // 任意 Blob
// 可把 file.body.id 传给 fileIds
```

### `role()` — 创建角色 + 分配

[test/utils.ts](../../../../../packages/backend/test/utils.ts) 的 `role()`:

```ts
const myRole = await role(adminUser, { name: 'tester' }, { canCreateChannel: { useDefault: false, priority: 0, value: true } });
// 调用 admin/roles/create。可用 policies 参数覆盖个别策略
```

需要 moderator、admin 角色的测试事先用 `signup({ ... })` + `role(...)` 创建。

### `createAppToken()` — 带应用 scope 的 token

```ts
const token = await createAppToken(alice, ['write:notes', 'read:account']);
// token 是字符串。可作为 api() 的 me.token 使用，或以 { token, bearer: true } 传入即用 Bearer Auth 调用
```

用于 OAuth scope (`kind`) 的测试。

### 其他辅助函数

[test/utils.ts](../../../../../packages/backend/test/utils.ts) 中还提供了以下:

- `userList()` — 创建用户列表
- `page()` / `play()` — 创建 Page / Flash
- `clip()` / `galleryPost()` / `channel()` — 创建各种资源
- `react()` — 反应
- `simpleGet()` — fetch 封装 (raw HTTP)
- `testPaginationConsistency()` — 分页行为的穷尽验证
- `sendEnvUpdateRequest()` / `sendEnvResetRequest()` — 测试用环境变量的更新
- `connectStream()` / `waitFire()` — WebSocket (Streaming API)

详情直接参考源码。

### 现有测试示例

- [test/e2e/note.ts](../../../../../packages/backend/test/e2e/note.ts) — 用 `describe('Note', ...)` 排列大量 `test(...)` 的传统风格
- [test/e2e/endpoints.ts](../../../../../packages/backend/test/e2e/endpoints.ts) — 不限 category 的杂项 endpoint
- [test/e2e/api.ts](../../../../../packages/backend/test/e2e/api.ts) — API 层 (认证、速率限制) 的行为

## 本地 DB / Redis

backend 的 **测试** 与 **开发** 按用途使用不同的 compose 文件。端口不同，混用就连不上。

| 用途 | compose 文件 | host 端口 (db / redis) |
| --- | --- | --- |
| 测试 (`test` / `test:e2e` / `test:fed`) | [packages/backend/test/compose.yml](../../../../../packages/backend/test/compose.yml) | `54312` / `56312` (与 [.github/misskey/test.yml](../../../../../.github/misskey/test.yml) 的端口设置一致) |
| 开发 (`pnpm dev` 等) | `compose.local-db.yml` (仓库根目录) | `5432` / `6379` |

```bash
# 测试用 DB / Redis (测试时用这个)
docker compose -f packages/backend/test/compose.yml up -d

# 开发用 DB / Redis (不启动 Misskey 本体，只起 postgres / redis / meilisearch)
docker compose -f compose.local-db.yml up -d
```

`compose.local-db.yml` 面向开发 (标准端口 `5432` / `6379`)，与测试用 DB (`test-misskey` / 端口 `54312` / `56312`) 是不同的东西。CI (`.github/workflows/test-backend.yml`) 不用 docker compose，而是用 GitHub Actions 的 `services:` 启动相同测试端口的 postgres / redis 容器后再运行。

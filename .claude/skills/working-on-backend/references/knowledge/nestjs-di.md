# NestJS DI / module 注册模式

Misskey 的 backend 是 NestJS 11 + Fastify 5 + TypeORM 1 (PostgreSQL) + Redis 的构成。以 DI 容器和 Repository 模式为核心。

## 架构

- **DI 容器**: NestJS 的 `@Injectable()` service + Repository (TypeORM) 模式
- **DI token**: 从 [`@/di-symbols.js`](../../../../../packages/backend/src/di-symbols.ts) 的 `DI` 用 `@Inject(DI.xxx)` 注入
- **构建**: 用 `rolldown -c` 打包到 `built/`。类型检查用 `tsgo`

## endpoint 内的 DI

API endpoint 写成 extends `Endpoint<typeof meta, typeof paramDef>` 的类。加 `@Injectable()`，在构造函数中用 `@Inject(DI.xxx)` 注入 Repository / Service。

```ts
import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,
		// 还可按需 inject RoleService, UserEntityService, GlobalEventService 等
	) {
		super(meta, paramDef, async (ps, me) => {
			// 像 this.notesRepository.findOneBy(...) 这样使用
		});
	}
}
```

`// eslint-disable-line import/no-default-export` 是 Endpoint 的惯例 (因为 NestJS 要求 default export，而 ESLint 规则对此有限制)。

## 主要 DI token

由 `@/di-symbols.js` 提供。代表性示例:

| token | 类型 | 用途 |
|---|---|---|
| `DI.notesRepository` | `NotesRepository` | notes 表的 TypeORM Repository |
| `DI.usersRepository` | `UsersRepository` | users 表 |
| `DI.driveFilesRepository` | `DriveFilesRepository` | drive_file 表 |
| `DI.config` | `Config` | 应用配置 |
| `DI.redis` | `Redis` | Redis 客户端 |
| `DI.db` | `DataSource` | TypeORM DataSource (想打 raw SQL 时) |

Service 类 (例如 `NoteCreateService`, `RoleService`, `UserEntityService`) **不经由 token，而是直接按类型 inject**:

```ts
constructor(
	private roleService: RoleService,
	private userEntityService: UserEntityService,
) {}
```

## Service 类的写法

Service 加 `@Injectable()`，在构造函数中声明所需依赖。需要作为 provider 注册到 NestJS 的 module (`packages/backend/src/core/CoreModule.ts` 等)。

```ts
@Injectable()
export class MyService {
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		private roleService: RoleService,
	) {}

	async doSomething(noteId: string) {
		const note = await this.notesRepository.findOneBy({ id: noteId });
		// ...
	}
}
```

新增 Service 时，需要 **同时把它加到 module 侧的 `providers` 数组**。确认现有 Service 是否注册在 `CoreModule` 中是最快的办法。

## Module 结构

主要 module 如下:

- **CoreModule** (`src/core/CoreModule.ts`) — 汇集各 Service
- **EndpointsModule** (`src/server/api/EndpointsModule.ts`) — 用 `Object.entries()` 遍历 endpoint-list.ts，自动生成 NestJS provider (`provide: 'ep:<path>'`)
- **GlobalModule** (`src/GlobalModule.ts`) — Repository / Config / Redis / DataSource 等底层依赖
- **QueueModule** (`src/core/QueueModule.ts`) — BullMQ 任务队列

新增 endpoint 时无需向 module 显式注册 (见 [knowledge/endpoint-list.md](endpoint-list.md))。新增 Service 时需要在 CoreModule (或对应 module) 注册 provider。

## 现有示例 (DI / 异常处理整洁的参考实现)

- [endpoints/notes/create.ts](../../../../../packages/backend/src/server/api/endpoints/notes/create.ts) — 按类型注入 Service (`NoteEntityService` / `NoteCreateService`) + `meta.errors` + 用 `try/catch` 转换业务错误 + 末尾 `throw err;` 的两段式
- [endpoints/i/pin.ts](../../../../../packages/backend/src/server/api/endpoints/i/pin.ts) — 用 `.catch(err => { ... throw err; })` 同样地转换错误
- [endpoints/notes/global-timeline.ts](../../../../../packages/backend/src/server/api/endpoints/notes/global-timeline.ts) — 用 `RoleService.getUserPolicies()` 做动态策略判定

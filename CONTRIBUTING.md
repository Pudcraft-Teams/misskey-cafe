# 贡献指南
很高兴你有兴趣为 misskey-cafe 做贡献！本文档汇集了为本项目贡献所需的信息。

> [!NOTE]
> 本 fork 主要使用简体中文交流，**但你不需要把 Issue/PR 翻译成中文，可用任何语言提交。**
> 上游 Misskey 项目主要使用日语，因此你可能会在 Issue/PR 上收到日语评论，但同样不需要用日语回复。\
> 机器翻译成日语的准确度不高，所以用原文撰写反而更易于我们理解。
> 这样读者也能在必要时使用自己偏好的翻译工具。

## 路线图（Roadmap）
参见 [ROADMAP.md](./ROADMAP.md)

## Issues
创建 Issue 前，请检查以下事项：
- 为避免重复，请在创建新 Issue 前搜索是否已有类似 Issue。
- 不要用 Issue 来提问或排查故障。
	- Issue 仅应用于功能请求、建议和 Bug 跟踪。
	- 提问或排查故障请前往本 fork 的 [GitHub Discussions](https://github.com/Pudcraft-Teams/misskey-cafe/discussions)。上游社区另有 [Discord](https://discord.gg/Wp8gVStHW3)（上游社区频道），但与本 fork 相关的问题请优先使用本 fork 的 Discussions。

> [!WARNING]
> 不要关闭即将被解决的 Issue。它应保持开启，直到真正解决它的 commit 被合并为止。

### 建议在实现前先讨论
我们欢迎你的提案。

当你想添加功能或修复 Bug 时，**请先在 Issue 中对设计和方针进行评审**（如果还没有相应 Issue，请创建一个）。缺少这一步，即使实现了 PR 也很可能不会被合并。

此时你还需要明确将要创建的 PR 的目标，并确保团队其他成员了解这些目标。
没有明确界定「该做什么、不该做什么」的 PR 往往会膨胀，难以评审。

另外，当你开始实现时，请将自己 assign 到该 Issue（如果无法自行操作，请让 Committer 为你 assign）。
通过表明你打算处理该 Issue，可以避免工作冲突。

致 Committer：在做出最终决定（Final Decision）之前，不应将某人 assign 到该 Issue。

### Issue 如何被分类处理

Committer 可能会：
* 关闭在最新稳定版上无法复现的 Issue，
* 将一个 Issue 合并到另一个 Issue，
* 将一个 Issue 拆分为多个 Issue，
* 或重新开启因某些已不再适用的原因而被关闭的 Issue。

在本 fork 中，最终决定权（Final Decision，包括项目是否实现某功能以及如何实现）由 Pudcraft-Teams 维护者拥有；这些权利不一定总会行使。涉及上游通用行为的变更建议，也请同时考虑向上游 [misskey-dev/misskey](https://github.com/misskey-dev/misskey) 提交。

## 常见分支
- **`master`** 分支跟踪最新发布版本，用于生产环境。
- **`develop`** 分支是我们为下一个发布版本开发的地方。
	- 创建 PR 时，基本上应以此分支为目标。
	- 本 fork 也是将上游变更合并进 `develop` 分支的。
- **`l10n_develop`** 分支保留用于本地化管理。

## 创建 PR
感谢你的 PR！创建 PR 前，请检查以下事项：
- 如果可能，请在标题前加上能标识此 PR 类型的关键字前缀，如下所示。
	- `fix` / `refactor` / `feat` / `enhance` / `perf` / `chore` 等
	- 另外，请确保此 PR 的粒度合适。请不要在单个 PR 中包含多种类型的变更或关注点。
- 如果有某个 Issue 将被此 PR 解决，请在正文中引用该 Issue。
- 请把变更摘要添加到 [`CHANGELOG.md`](/CHANGELOG.md)。不过，对于不影响用户的变更（如重构）则无需如此。
- 检查是否有文档因本次变更需要创建或更新。
- 如果你添加了功能或修复了 Bug，请尽可能添加测试用例。
- 请事先确保测试和 Lint 都通过。
	- 你可以用 `pnpm test` 和 `pnpm lint` 运行它们。[查看更多信息](#testing)
- 如果此 PR 包含 UI 变更，请在正文中附上截图。

感谢你的配合 🤗

### ActivityPub payload 变更的附加事项
*本节针对上游 misskey-dev 的实现。其他 fork 或实现可能采用不同方式。一个显著差异是：非「misskey-dev」的扩展不会被记录在 misskey-hub 的文档中。*

如果 PR 包含对 ActivityPub payload 的变更，请通过向 [misskey-hub 的文档](https://github.com/misskey-dev/misskey-hub-next/blob/master/content/ns.md)（上游）发送 PR 来反映它。

向 ActivityPub 提议的扩展属性（下文称为「扩展属性」）的名称应以 `_misskey_` 为前缀。（例如 `_misskey_quote`）

`packages/backend/src/core/activitypub/type.ts` 中的扩展属性**必须**声明为可选，因为来自较旧 Misskey 或其他实现的 ActivityPub payload 可能不包含它。

扩展属性必须包含在 context 定义中。Context 定义在 `packages/backend/src/core/activitypub/misc/contexts.ts` 中。
其键应与扩展属性的名称相同，值应与「短 IRI（short IRI）」相同。

「短 IRI」在 misskey-hub 的文档中有定义，但通常采用 `misskey:<扩展属性名>` 的形式。（例如 `misskey:_misskey_quote`）

不应添加其他实现已经定义过的属性，也不应为「众所周知（well-known）」的属性添加自定义变体值。

> [!NOTE]
> 新的 `_misskey_` AP 扩展理想情况下应通过上游 misskey-dev 推进，以便与生态系统保持兼容；为了持续合并上游，本 fork 不鼓励引入 fork 专有的 ActivityPub 扩展。

## 评审者指南
要乐于评论优点，而不只是你想修改的地方 💯

值得一读的资料（日文参考资料）
- https://blog.lacolaco.net/posts/1e2cf439b3c2/
- https://konifar-zatsu.hatenadiary.jp/entry/2024/11/05/192421

### 评审视角
- 范围（Scope）
	- PR 的目标是否清晰？
	- PR 的粒度是否合适？
- 安全（Security）
	- 合并此 PR 是否会制造漏洞？
- 性能（Performance）
	- 合并此 PR 是否会导致意外的性能下降？
	- 是否有更高效的方式？
- 测试（Testing）
	- 测试是否确保了预期行为？
	- 是否存在遗漏或缺口？
	- 是否检查了异常情况？

## 安全公告（Security Advisory）
### 致报告者
感谢你的报告！

如果你也能创建修复该漏洞的补丁，请在私有 fork 上创建 PR。

> [!note]
> 由于存在一个 GitHub Bug，若 PR 未追随 upstream 的 develop 分支则无法合并，所以请保持追随 develop 分支。

### 致维护者成员
修复 PR 若未追随 develop 分支则无法合并，因此当无法合并时，可以这样提醒对方：

> Could you merge or rebase onto upstream develop branch?

## 部署（Deploy）
通过 Issue 评论使用 `/deploy` 命令，可以将 PR 的内容部署到预览环境。
```
/deploy sha=<commit hash>
```
会分配一个实际域名，以便你测试联合（federation）。

## 合并（Merge）

## 发布（Release）
### 发布说明
1. 在 `develop` 分支提交版本变更（[package.json](package.json)）
2. 创建发布 PR。
	- 从 `develop` 分支合入 `master`。
	- 标题必须采用 `Release: x.y.z` 格式。
		- `x.y.z` 是你要发布的新版本号。
3. 部署并执行简单的 QA 检查。同时确认测试已通过。
4. 合并它。（不要 squash commit）
5. 在本 fork 创建一个 [GitHub release](https://github.com/Pudcraft-Teams/misskey-cafe/releases)
	- 目标分支必须为 `master`
	- 标签名必须为版本号

> [!NOTE]
> 为何需要此流程：
> - 进行最终 QA 检查
> - 分散责任
> - 检查直接提交到 develop 的内容
> - 一起庆祝发布 🎉

## 本地化（l10n）
Misskey 使用 [Crowdin](https://crowdin.com/project/misskey)（上游）进行本地化管理。

> [!IMPORTANT]
> 翻译由上游通过 Crowdin 管理，并随上游合并进入本 fork；因此除 `locales/ja-JP.yml` 外的 locale 文件一律不要手动编辑，否则会在合并上游时产生冲突或被覆盖。
> 想改进翻译，请前往上游的 Crowdin 项目（https://crowdin.com/project/misskey）。

在上游 Crowdin 中，你可以用自己的 Crowdin 账户改进翻译。
你在 Crowdin 中的更改会自动作为 PR（标题为「New Crowdin translations」）提交到上游仓库。
上游维护者会在下一次发布前将该 PR 合并到 develop 分支，随后这些更改会通过合并上游进入本 fork。

如果上游 Crowdin 中没有列出你的语言，请在上游项目开一个 Issue，上游会将其添加到 Crowdin。
对于新添加的语言，一旦该语言的翻译进度超过 70%，它就会被正式引入 Misskey 并提供给用户。

![Crowdin](https://d322cqt584bo4o.cloudfront.net/misskey/localized.svg)

## 开发
### 环境搭建
开发前，你需要搭建环境。Misskey 需要 Redis、PostgreSQL 和 FFmpeg。

你可能还想安装 Meilisearch 来体验相关功能。严格来说，Meilisearch 并非硬性要求，但部分功能和测试需要它。

有几种方式可以进行。

#### 使用系统级软件
你可以将它们安装在系统级（例如通过包管理器）。

#### 使用 `docker compose`
你可以通过输入 `docker compose -f $PROJECT_ROOT/compose.local-db.yml up -d` 来获取中间件容器。

#### 使用 Devcontainer
Devcontainer 也已包含必要的配置。此方式可通过从 VSCode 连接来完成。

无需在本地运行 `pnpm`，你可以使用 Dev Container 来搭建开发环境。
要使用 Dev Container，请在已安装 Dev Containers 的 VSCode 中打开项目目录。
**注意：** 如果你使用 Windows，请用 WSL 克隆仓库。使用 Git for Windows 会因换行符处理方式的差异而导致文件损坏。

它会在容器内自动运行以下命令。
``` bash
git submodule update --init
pnpm install --frozen-lockfile
cp .devcontainer/devcontainer.yml .config/default.yml
pnpm build
pnpm migrate
```

完成 migration 后，你就可以继续了。

#### Cloudflare tunnel
使用 Cloudflare tunnel 可以将本地的 Misskey 服务器公开到互联网。
当你想验证仅在 HTTPS 下才能工作的功能，或想从手机等其他设备验证本地 Misskey 服务器时，这很方便。

##### 与 Cloudflare warp 并用时的小贴士

> cloudflared（Cloudflare Tunnel）会通过 QUIC/HTTP2 向 region1.v2.argotunnel.com / region2.v2.argotunnel.com 发起出站连接，但启用 WARP 后这些流量会经由 WARP，导致环路/断连。将这 2 个主机添加到 WARP 的隧道排除（split tunnel）中，就能让 cloudflared 绕过 WARP 直接连接到 Cloudflare 边缘。

### 开始开发
开发期间，使用
```
pnpm dev
```
命令会很有用。

- 服务端源文件被修改时会自动构建它们，并自动启动服务进程。
- Service Worker 由 esbuild 监视。
- 可使用 Vite HMR（即 `vite` 命令）。其行为可能与生产环境不同。
- Vite 运行在后端之后（后端会在 /vite 和 /embed_vite 处代理 Vite，但用于 HMR 的 websocket 除外）。
- 你可以通过访问 `http://localhost:3000` 来查看 Misskey（将 `3000` 替换为 .config/default.yml 中 `port` 配置的端口）。

## 测试
你可以通过执行以下命令运行非后端测试：
```sh
pnpm --filter frontend test
pnpm --filter misskey-js test
```

后端测试需要手动准备服务器。详见下一节。

### 后端
后端有三类测试代码：
- 单元测试（Unit tests）：[`/packages/backend/test/unit`](/packages/backend/test/unit)
- 单服务器 E2E 测试：[`/packages/backend/test/e2e`](/packages/backend/test/e2e)
- 多服务器 E2E 测试：[`/packages/backend/test-federation`](/packages/backend/test-federation)

#### 运行单元测试或单服务器 E2E 测试
1. 创建配置文件：
```sh
cp .github/misskey/test.yml .config/
```

2. 启动用于测试的 DB 和 Redis 服务器：
```sh
docker compose -f packages/backend/test/compose.yml up
```
或者，你也可以准备一个空的（数据可被清除的）DB，并适当编辑 `.config/test.yml`。

3. 运行所有测试：
```sh
pnpm --filter backend test     # 单元测试
pnpm --filter backend test:e2e # 单服务器 E2E 测试
```
如果你想运行特定测试，请像下面这样运行：
```sh
pnpm --filter backend test -- packages/backend/test/unit/activitypub.ts
pnpm --filter backend test:e2e -- packages/backend/test/e2e/nodeinfo.ts
```

#### 运行多服务器 E2E 测试
参见 [`/packages/backend/test-federation/README.md`](/packages/backend/test-federation/README.md)。

## 环境变量

- `MISSKEY_CONFIG_YML`：指定 config.yml 的文件路径以代替 default.yml（例如 `2nd.yml`）。
- `MISSKEY_WEBFINGER_USE_HTTP`：若设为 true，WebFinger 请求将使用 http 而非 https，便于测试 localhost 内服务器间的联合。切勿在生产环境中使用。

## 持续集成（Continuous integration）
Misskey 使用 GitHub Actions 执行自动化测试。
配置文件位于 [`/.github/workflows`](/.github/workflows)。

## Vue
Misskey 使用 Vue（v3）作为其前端框架。
- 使用 TypeScript。
- **创建新组件时，请使用 Composition API（配合 [setup sugar](https://v3.vuejs.org/api/sfc-script-setup.html) 和 [ref sugar](https://github.com/vuejs/rfcs/discussions/369)）而非 Options API。**
	- 部分现有组件是用 Options API 实现的，但那是旧的实现。我们也欢迎将这些组件迁移到 Composition API 的重构。

## Tabler Icons
图标在 Production Build 时会移除未使用的部分。

**动态设置图标时，请不要采用像 `ti-${someVal}` 这样仅动态改变图标名部分的实现。**
请务必包含像 `ti-xxx` 这样完整的类名。

## nirax
nirax 是 Misskey 使用的原创前端路由系统。
**它深受 vue-router 影响，所以建议你先学习 vue-router。**

### 路由定义
路由定义是以下形式的对象数组。

```ts
{
	name?: string;
	path: string;
	component: Component;
	query?: Record<string, string>;
	loginRequired?: boolean;
	hash?: string;
	children?: RouteDef[];
}
```

> [!WARNING]
> 目前，路由按定义顺序求值。
> 例如，如果在 `/foo/:id` 路由定义之后又定义了 `/foo/bar` 路由，则后者永远不会被匹配。

### 多个路由器
与 vue-router 的最大区别在于，nirax 允许存在多个路由器。
这使得诸如在应用内窗口中独立于浏览器进行路由等成为可能。

## Storybook

Misskey 使用 [Storybook](https://storybook.js.org/) 进行 UI 开发。

### 搭建与运行

#### 搭建

```bash
pnpm --filter misskey-js build
```

#### 运行

```bash
pnpm --filter frontend storybook-dev
```

### 用法

当你创建一个新组件（本例中为 `MyComponent.vue`）时，story 文件（`MyComponent.stories.ts`）会由 `.storybook/generate.js` 脚本自动生成。
你可以通过创建一个 impl story 文件（`MyComponent.stories.impl.ts`）来覆盖默认的 story。

```ts
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { StoryObj } from '@storybook/vue3';
import MyComponent from './MyComponent.vue';
export const Default = {
	render(args) {
		return {
			components: {
				MyComponent,
			},
			setup() {
				return {
					args,
				};
			},
			computed: {
				props() {
					return {
						...this.args,
					};
				},
			},
			template: '<MyComponent v-bind="props" />',
		};
	},
	args: {
		foo: 'bar',
	},
	parameters: {
		layout: 'centered',
	},
} satisfies StoryObj<typeof MyComponent>;
```

如果你想退出自动生成，请创建一个 `MyComponent.stories.impl.ts` 文件，并在其中添加以下一行。

```ts
import MyComponent from './MyComponent.vue';
void MyComponent;
```

你可以通过创建一个 meta story 文件（`MyComponent.stories.meta.ts`）来覆盖组件的 meta。

```ts
export const argTypes = {
	scale: {
		control: {
			type: 'range',
			min: 1,
			max: 4,
		},
	},
};
```

此外，你可以在 storybook 中使用 msw 来模拟（mock）API 请求。创建一个 `MyComponent.stories.msw.ts` 文件来定义 mock handler。

```ts
import { HttpResponse, http } from 'msw';
export const handlers = [
	http.post('/api/notes/timeline', ({ request }) => {
		return HttpResponse.json([]);
	}),
];
```

添加、编辑或移除上述文件后，别忘了重新运行 `.storybook/generate.js` 脚本。

## Nest

### Nest 服务循环依赖 / Nest 中服务循环引用导致错误时

#### forwardRef
首先简单尝试一下 `forwardRef`

```typescript
export class FooService {
	constructor(
		@Inject(forwardRef(() => BarService))
		private barService: BarService
	) {
	}
}
```

#### OnModuleInit
如果不行，则使用 `OnModuleInit`

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BarService } from '@/core/BarService';

@Injectable()
export class FooService implements OnModuleInit {
	private barService: BarService // 从 constructor 中移动过来

	constructor(
		private moduleRef: ModuleRef,
	) {
	}

	async onModuleInit() {
		this.barService = this.moduleRef.get(BarService.name);
	}

	public async niceMethod() {
		return await this.barService.incredibleMethod({ hoge: 'fuga' });
	}
}
```

##### 服务单元测试
测试中需要调用 `onModuleInit`

```typescript
// import ...

describe('test', () => {
	let app: TestingModule;
	let fooService: FooService; // 用于测试用例
	let barService: BarService; // 用于测试用例

	beforeEach(async () => {
		app = await Test.createTestingModule({
			imports: ...,
			providers: [
				FooService,
				{ // 进行 mock（mock 可能不是必须的）
					provide: BarService,
					useFactory: () => ({
						incredibleMethod: jest.fn(),
					}),
				},
				{ // 设为 Provide
					provide: BarService.name,
					useExisting: BarService,
				},
			],
		})
			.useMocker(...
			.compile();

		fooService = app.get<FooService>(FooService);
		barService = app.get<BarService>(BarService) as jest.Mocked<BarService>;

		// 执行 onModuleInit
		await fooService.onModuleInit();
	});

	test('nice', () => {
		await fooService.niceMethod();

		expect(barService.incredibleMethod).toHaveBeenCalled();
		expect(barService.incredibleMethod.mock.lastCall![0])
			.toEqual({ hoge: 'fuga' });
	});
})
```

## 注意事项

### Misskey 的领域特有概念应加 `Mi` 前缀
例如，就像 Google 将自家服务命名为 Google Map、Google Earth、Google Drive 而非 Map、Earth、Drive 一样
在代码中给 Misskey 的领域特有概念加上 `Mi` 前缀，既能与其他领域的同类概念区分，也能防止名称冲突。
不过，如果在上下文中明显指代 Misskey 的事物且不存在名称冲突的风险，则仅限临时局部变量可以省略 `Mi`。

### Misskey.js 的类型生成
```bash
pnpm build-misskey-js-with-types
```

### 如何解决 pnpm-lock.yaml 中发生的冲突？

只需执行 `pnpm` 即可修复。

### INSERT 时使用 insert 而非 save
#6441（上游历史 Issue 引用）

### placeholder
用查询构建器（query builder）组装 SQL 时，使用的占位符（placeholder）不得重复
例如
``` ts
query.andWhere(new Brackets(qb => {
	for (const type of ps.fileType) {
		qb.orWhere(`:type = ANY(note.attachedFileTypes)`, { type: type });
	}
}));
```
这样写的话，循环中 `type` 这个占位符会被多次使用从而出错
因此需要像下面这样写
```ts
query.andWhere(new Brackets(qb => {
	for (const type of ps.fileType) {
		const i = ps.fileType.indexOf(type);
		qb.orWhere(`:type${i} = ANY(note.attachedFileTypes)`, { [`type${i}`]: type });
	}
}));
```

### TypeORM 中的 Not `null`
```ts
const foo = await Foos.findOne({
	bar: Not(null)
});
```
这样的查询（`bar` 不为 `null`）不会按预期工作。
请改为如下写法：
```ts
const foo = await Foos.findOne({
	bar: Not(IsNull())
});
```

### SQL 中的 `null`
发出 SQL 时，如果参数有可能为 `null`，则必须区分情况输出不同的 SQL 语句
例如
``` ts
query.where('file.folderId = :folderId', { folderId: ps.folderId });
```
这段处理中，如果 `ps.folderId` 为 `null`，最终会发出类似 `file.folderId = null` 的查询，这并非正确的 SQL，因此无法得到预期结果
所以需要像下面这样写
``` ts
if (ps.folderId) {
	query.where('file.folderId = :folderId', { folderId: ps.folderId });
} else {
	query.where('file.folderId IS NULL');
}
```

### SQL 中的 `[]`
发出 SQL 时，如果 `IN` 的参数有可能为 `[]`（空数组），则必须区分情况输出不同的 SQL 语句
例如
``` ts
const users = await Users.find({
	id: In(userIds)
});
```
这段处理中，如果 `userIds` 为 `[]`，最终会发出类似 `user.id IN ()` 的查询，这并非正确的 SQL，因此无法得到预期结果
所以需要像下面这样写
``` ts
const users = userIds.length > 0 ? await Users.find({
	id: In(userIds)
}) : [];
```

### SQL 中的数组索引
SQL 中数组索引是**从 1 开始**的。
若想访问 `[a, b, c]` 的 `a`，应写 `[1]` 而非 `[0]`

### null IN
对可能包含 null 的列进行 IN 时，直接写会出问题，所以请用 OR 等处理 null 的情况。

### 删除 enum 要小心
删除 enum 枚举项的内容时，必须删除所有具有该值的记录

如果删除很重或不可行，则保留不删

### Migration 创建方法
在 packages/backend 中：
```sh
pnpm dlx typeorm migration:generate -d ormconfig.js -o --esm <migration name>
```

- 生成后，请将文件移动到 migration 目录下
- 生成的脚本包含不必要的变更，请将其移除
- `-o`（`--outputJs`）以 JS 格式生成，`--esm` 以 ESM 格式生成。Misskey 现有的 migration 全部是 ESM JS，所以这两个选项都需要

### 连接（connection）要 `markRaw`
**当把 misskey.js 的连接设置为 Vue 组件的 data 选项时**，请务必用 `markRaw` 包裹。实例被不必要地响应式化（reactive）会导致 misskey.js 内部处理出现故障，并引发性能问题。需要注意的是，使用 Composition API 时不受此限制（因为响应式化是手动的）。

### 注意 JSON 的 import
在 TypeScript 中 import json 时，用 tsc 编译时该 json 文件也会被一起输出到 dist 目录。由于这一行为，可能会意外发生文件被改写的情况，所以 import json 时要确认它是否可以被改写。如果不希望被改写，则不要用 import 读取，而应使用 `fs.readFileSync` 等函数来读取。

### 组件的样式定义中不要设置 margin
众所周知，组件自身设置 margin 会成为问题的根源
margin 应由使用该组件的一方来设置

## 其他
### HTML 类名中不要使用 follow 这个词
会被广告拦截器误拦截

### 不要使用名为 index 的文件名
因为 ESM 中已废弃目录导入（directory import），而且即使不进行目录导入，文件名为 index 时也会因某些库（？）将其视为目录导入而报错

## CSS Recipe

### 调亮（Lighten）CSS 变量

``` css
color: hsl(from var(--MI_THEME-accent) h s calc(l + 10));
```

### 调暗（Darken）CSS 变量

``` css
color: hsl(from var(--MI_THEME-accent) h s calc(l - 10));
```

### 为 CSS 变量添加透明度（alpha）

``` css
color: color(from var(--MI_THEME-accent) srgb r g b / 0.5);
```

## 设计理念
### 不要被 DRY 束缚
我们认为，需要的是抽象而非一般化。
不要盲信，避免错误的、不必要的共用化；当感觉重复更自然时，要有让其重复的勇气。

### 不让 Misskey 变复杂的实现
无论某个实现多么复杂，只要它与 Misskey 特有的上下文和关注点相分离（或事实上可被视为分离），我们就认为它不会增加 Misskey 代码库的复杂性。

打个比方，正如 Vue 或 AiScript 这类 Misskey 所使用的库其内部实现无论多么复杂，也不会因为「使用了它，所以 Misskey 的实现就很复杂」一样。

与 Misskey 领域知识相分离意味着：在思考 Misskey 的实现时无需顾及这些内部实现，因而不会增加认知负荷。

还有重要的一点是：在考量复杂性时，该实现位于 Misskey 仓库之外还是之内、由 Misskey 维护还是由第三方维护，这些几乎都可以忽略。

当然，位于 Misskey 仓库内、且必须由 Misskey 维护的实现会产生维护成本。
但从 Misskey 本质的设计与实现的角度来看，该实现实质上表现得就像一个外部库。
换言之，它是「只是恰好由与 Misskey 开发者相同的人来维护、只是恰好放在 Misskey 仓库内的外部库」。

因此，只要尽量让实现独立于 Misskey 的领域知识，就能在不提高 Misskey 代码库复杂性的情况下完成功能实现，可以说很划算。
当然，如果过分拘泥于此，连琐碎的实现也要这样分离，反而会增加认知负荷、增加实现量，使弊大于利，所以要具体情况具体分析。

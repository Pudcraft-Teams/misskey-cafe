# Frontend 测试 (Vitest / Cypress)

Misskey frontend 的测试构成。

## Vitest (unit)

```bash
pnpm --filter frontend test                # 执行 1 次
pnpm --filter frontend test-and-coverage   # 带覆盖率
```

### 放置

- 主要放置: `packages/frontend/test/*.test.ts` (例: `i18n.test.ts`, `theme.test.ts`, `is-birthday.test.ts`)
- 构建工具相关等与目标代码相邻更清晰的测试,放在与代码同目录,命名为 `*.test.ts` (例: [packages/frontend/lib/rollup-plugin-unwind-css-module-class-name.test.ts](../../../../../packages/frontend/lib/rollup-plugin-unwind-css-module-class-name.test.ts))
- 共享组件 (`MkX.vue`) 的单元测试目前较少,未采用 `*.spec.ts` / `__tests__/` 形式 (由 Storybook + Cypress 覆盖)

## Cypress E2E

Cypress 是针对 **已启动的测试服务器** 运行的,因此前提比 unit 多。在本地照搬 [.github/workflows/test-frontend.yml](../../../../../.github/workflows/test-frontend.yml) 的 `e2e` 任务的相同步骤:

```bash
# 1. 启动测试用 DB / Redis (测试用端口。不是开发用的 compose.local-db.yml)
docker compose -f packages/backend/test/compose.yml up -d

# 2. 放置测试配置 (若尚未创建。这是示例,cp 命令请按你的环境酌情替换)
cp .github/misskey/test.yml .config/test.yml

# 3. 全体构建
pnpm build

# 4. 启动测试服务器 + 执行 Cypress (均从根目录执行)
pnpm e2e                # 内部启动 pnpm start:test,等待 http://localhost:61812 后 Cypress run
pnpm cy:open            # 交互式打开 (服务器需另行用 pnpm start:test 启动好)
```

- 配置: 根目录 [cypress.config.ts](../../../../../cypress.config.ts)
- 测试本体在 [cypress/](../../../../../cypress/) 下

新增 frontend 功能的 E2E 基本写到 Cypress。但对象限定于主要 UI 流程 (login / post / drive 等),细粒度的单位测试惯例用 Vitest 或 Storybook 代替。

## Storybook (视觉确认 + Chromatic 视觉回归)

详见 → [storybook.md](storybook.md)。

```bash
pnpm --filter frontend storybook-dev      # http://localhost:6006
pnpm --filter frontend build-storybook    # 静态构建
```

惯例是在每个组件旁并置 `*.stories.impl.ts` (例: `MkButton.stories.impl.ts`)。用 Chromatic (`pnpm --filter frontend chromatic`) 做视觉回归检查。

## 本地 DB / Redis

frontend 不同的测试类别对 DB / Redis 的需求不同:

- **Vitest (unit)** — 不需要 DB。逻辑 / 组件单体测试不连 backend (CI 的 `vitest` 任务也没有 `services:`)
- **Cypress (E2E)** — 经由测试服务器 (`pnpm start:test`) 连 backend,因此需要 DB / Redis。使用 **测试用端口的 [packages/backend/test/compose.yml](../../../../../packages/backend/test/compose.yml)** (参考上面 Cypress E2E 的步骤)

开发用的 `compose.local-db.yml` (db `5432` / redis `6379`) **不用于测试**。它与测试用的 `packages/backend/test/compose.yml` (`54312` / `56312`) 端口不同,混用会连不上。

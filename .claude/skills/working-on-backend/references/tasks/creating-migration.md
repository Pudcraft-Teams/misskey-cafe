# 创建 DB migration

向 `packages/backend/migration/` 新增 TypeORM migration 的步骤。

## 大前提 (绝对禁止)

- **不要编辑已经合并 (develop / master) 的 migration 文件** ([AGENTS.md](../../../../../AGENTS.md))。为了持续合并上游，改动生产历史会引起严重的数据不一致。schema 变更 **始终用新的时间戳创建新文件**
- 不要事后改写文件名的时间戳部分 (会破坏顺序)
- 也不要触碰已合并 migration 的 `up()` / `down()` 本体 (即使是 "明显的 bug"，也要用新的 migration 抵消)

---

## 决定使用哪种方式

| 情形 | 方式 |
|---|---|
| 先用 `@Column` / `@Index` / `@Entity` 等修改 entity (`packages/backend/src/models/*.ts`)，想从差分自动生成 | `typeorm migration:generate` (本文件的 "A. 从差分自动生成") |
| 手写 SQL / 数据迁移 / `CREATE INDEX CONCURRENTLY` 等无法用 entity 差分表达的变更 | 用 `typeorm migration:create` 创建空骨架 (本文件的 "B. 创建空骨架") |

拿不准时 **先改 entity → `migration:generate`** 是原则。现有 migration (`packages/backend/migration/*.js`) 几乎全是 `queryRunner.query(\`SQL...\`)` 这样的 raw SQL，所以无论 CLI 输出还是手写风格都一致。

---

## 通用: 类命名规则

- 文件名: `packages/backend/migration/{unixMs}-{descriptive-name}.js` (扩展名 `.js`)
- 文件名的 `descriptive-name` 部分在现有历史中混用 (PascalCase / camelCase / kebab-case)，只要是表示变更的单个英语名即可
- **类名为 PascalCase + 13 位时间戳** (例如 `class BirthdayIndex1767169026317`)
- **`name` 属性也与类名同一字符串** (`name = 'BirthdayIndex1767169026317'`)

```js
/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class PascalCaseName1234567890123 {
    name = 'PascalCaseName1234567890123'

    async up(queryRunner) {
        // 前进 migration
    }

    async down(queryRunner) {
        // 完全回滚 up
    }
}
```

---

## A. 从 entity 差分自动生成

```bash
# 可以从仓库根目录执行。--filter backend exec 会把 cwd 切到 packages/backend，
# 所以输出路径 migration/<PascalName> 与 -d ormconfig.js 都以 packages/backend/ 为基准解析
pnpm --filter backend exec typeorm migration:generate -d ormconfig.js -o --esm migration/<PascalName>
```

**与 CONTRIBUTING.md 的区别**: CONTRIBUTING.md 引导使用 `pnpm dlx typeorm ...`，但 `dlx` 会临时下载包，版本可能与 backend 的依赖不一致。`pnpm --filter backend exec typeorm` 使用工作区中已安装的 typeorm，因此 **推荐这种方式**。

**关于 `-o --esm`**: `-o` (`--outputJs`) 是「输出 JS 而非 TS」的选项，`--esm` 是「以 ESM 形式 (`export class ...`) 输出」的选项。Misskey 的现有 migration 全部是 ESM JS，因此 **两者都必填**。省略 `--esm` 会生成 CommonJS 形式的 JS，风格不一致。

### 事前准备 (一键脚本)

`migration:generate` 需要 backend 构建 + 本地 DB。我们附带了一键准备的脚本 (用 node 编写，纯 Windows 下也能跑)。从仓库根目录:

```bash
node .claude/skills/working-on-backend/scripts/prepare-generate.mjs
```

脚本会做的事:

- `pnpm build-pre` → 生成 `built/meta.json` (`loadConfig()` 需要)
- `pnpm --filter backend compile-config` → 生成 `built/.config.json` (`ormconfig.js` 的 `loadConfig()` 需要的是这个。源文件 `.config/default.yml` 是其输入，没有的话先从 `.config/example.yml` 创建)
- `pnpm --filter backend build` → 把 entity 反映到 `built/` (CLI 读取 `built/`)
- `docker compose -f compose.local-db.yml up -d --wait db` → 启动本地 DB (postgres)。`--wait` 需要 Docker Compose v2.1.1 (2021-11) 以上 (以 v2 的 `docker compose` 为前提。已 EOL 的 `docker-compose` v1 不在范围内)

如果只用 `migration:create` (空骨架)，DB 和构建都不需要，所以不需要这个脚本。

---

## B. 创建空骨架 (用于手写 SQL / 数据迁移)

```bash
pnpm --filter backend exec typeorm migration:create -o --esm migration/<PascalName>
```

不需要启动本地 DB 和构建。只会生成空的 `up` / `down`。

**注意:** **务必加上** `-o --esm`。没有它会生成 `<UnixMs>-<PascalName>.ts` (CommonJS / TS 输出)，但 Misskey 的 `ormconfig.js` 只读取 `migration/*.js`，而且其他现有 migration 也全是 `export class ... { async up(queryRunner) {...} }` 的 ESM JS 形式，所以之后需要手动转换。加上 `-o --esm` 就会直接输出 `.js` ESM。

不过 `migration:create` 的骨架 **不会输出 `name = '...'` 属性**，所以除了后续补 SPDX 外，还需要手动添加 `name = '<PascalName><ms>'` 并填充 `up`/`down`。骨架开头的 `@typedef` / `@implements MigrationInterface` JSDoc 在现有文件中没有，删掉以与 house style 一致。

### B 的辅助: 想只靠参数搞定全部时

只靠参数传入 `<PascalCaseName>` 就完成「生成空骨架 + 补 SPDX + 执行 check-migrations」的薄封装 (源自旧 `.claude/commands/migrate-new.md`) 已废弃。想手动走一遍等价流程的话，按上面的 `typeorm migration:create` + 补 SPDX + 添加 `name` 属性 + `check-migrations` 的顺序执行。

---

## 补 SPDX 头

CLI 输出不包含 SPDX 头。**务必添加到开头** (否则 CI 的 `spdx` job 会失败)。

```js
/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
```

---

## up / down 的一致性确认

- 对 `up()` 的每条语句，`down()` 都能完全回滚
- 加列 (`ADD COLUMN`) ↔ 删列 (`DROP COLUMN`)、建表 ↔ 删表、加 FK ↔ 删 FK、建索引 ↔ 删索引 务必成对编写
- 不要把 `down()` 留空。生产回滚时会卡住

**单纯的反向 SQL 无法回滚的疑难场景** (enum 值的增加/变更 / 加 NOT NULL 列 / 数据迁移 UPDATE / JSONB 与数组默认值 / 列重命名 / 安全的 DROP 与 COMMENT) 务必参考 [knowledge/typeorm-patterns.md §migration 疑难场景](../knowledge/typeorm-patterns.md)。尤其 **enum 变更** 与 **列重命名** 直接套用 `migration:generate` 的输出会无法回滚 / 丢数据，需特别注意。

### 添加索引时 (CREATE INDEX CONCURRENTLY)

对大型表的 `CREATE INDEX` 在生产环境有长时间锁表的风险。用 `CONCURRENTLY` 发起时，migration class 需要 `transaction = false` 等处理。详情见 [knowledge/typeorm-patterns.md §CONCURRENTLY](../knowledge/typeorm-patterns.md)。

参考实现: [packages/backend/migration/1745378064470-composite-note-index.js](../../../../../packages/backend/migration/1745378064470-composite-note-index.js)。

---

## 验证

从根目录执行:

```bash
# 是否有未反映的差分 (新 migration 是否漏掉了应当生成的 DDL)
pnpm --filter backend check-migrations

# 应用到本地 DB
pnpm migrate

# 回滚 (检查 down 是否坏掉)
pnpm revert

# 重新应用 (再正向跑一遍)
pnpm migrate
```

`check-migrations` 的本体是 [scripts/check_migrations_clean.js](../../../../../packages/backend/scripts/check_migrations_clean.js)。它用 TypeORM 的 `dataSource.driver.createSchemaBuilder().log()` 获取 pending DDL，只要 `upQueries` / `downQueries` 任一有残留就以非零退出。**不是顺序检查**，而是「entity 与 migration 是否同步」的检查。

---

## 现有文件参考模板

写新文件时，**务必打开一个变更模式相近的现有文件对照着写**。风格严重偏离的 PR 容易被退回。

| 模式 | 参考文件 |
|---|---|
| 加索引 + 函数定义 | [migration/1767169026317-birthday-index.js](../../../../../packages/backend/migration/1767169026317-birthday-index.js) |
| 仅加列 | [migration/1766652173085-add-category-to-avatar-decorations.js](../../../../../packages/backend/migration/1766652173085-add-category-to-avatar-decorations.js) |
| 新建表 + FK | [migration/1761569941833-add-channel-muting.js](../../../../../packages/backend/migration/1761569941833-add-channel-muting.js) |

---

## CHANGELOG (有用户影响时)

仅当 schema 变更产生用户可见的行为时才向 `CHANGELOG.md` 追加。内部重构或纯粹的加索引不需要。详情用 [shipping-misskey-change 技能](../../../shipping-misskey-change/SKILL.md) 确认。

---

## 提交前自审清单

完成前从上到下确认以下各项 (各项可转为 TodoWrite):

- [ ] 用 **新时间戳** 创建，完全没有编辑任何已合并的 migration 文件 (大前提)
- [ ] 文件开头有 **SPDX 头**
- [ ] `export class <PascalName><ms>` 与 `name = '<PascalName><ms>'` 的 **字符串完全一致** (PascalCase + 13 位时间戳)
- [ ] `up()` 的每条语句在 `down()` 中都有对应回滚，且 **`down()` 不为空** (疑难场景已确认 [knowledge/typeorm-patterns.md](../knowledge/typeorm-patterns.md))
- [ ] `pnpm --filter backend check-migrations` 以 **0 件 (无 pending DDL)** 通过
- [ ] (可能的话) `pnpm migrate` → `pnpm revert` → `pnpm migrate` 通过
- [ ] 用户可见的变更则追加 CHANGELOG → [shipping-misskey-change](../../../shipping-misskey-change/SKILL.md)

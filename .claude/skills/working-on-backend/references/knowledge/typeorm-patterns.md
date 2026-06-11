# TypeORM / migration 模式

Misskey backend 是 TypeORM 1 + PostgreSQL。汇总 entity 定义与 migration 的关系，以及 migration 中可能踩到的疑难场景。

## 模型 / Repository

- entity: `packages/backend/src/models/<Name>.ts` (`@Entity` + `@Column`)
- 经由 DI 注入的 Repository 访问 (`@Inject(DI.notesRepository)` 等) → [nestjs-di.md](nestjs-di.md)

entity 侧的 `@Column` / `@Entity` / `@Index` 变更需要与 migration 的 DDL 保持一致。`pnpm --filter backend check-migrations` 会检测 entity 与 migration 的不一致 ([scripts/check_migrations_clean.js](../../../../../packages/backend/scripts/check_migrations_clean.js))。

## migration 文件的结构

每个文件 `packages/backend/migration/{unixMs}-{descriptive-name}.js` 都是 ESM JS。最小形态:

```js
/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class PascalCaseName1234567890123 {
    name = 'PascalCaseName1234567890123'

    async up(queryRunner) {
        await queryRunner.query(`...`);
    }

    async down(queryRunner) {
        await queryRunner.query(`...`);  // up 的完全回滚
    }
}
```

详细步骤见 [tasks/creating-migration.md](../tasks/creating-migration.md)。**绝对禁止编辑已合并的 migration**。

## CONCURRENTLY (CREATE INDEX CONCURRENTLY) 的处理

对大型表的 `CREATE INDEX` 在生产环境有长时间锁表的风险。用 `CONCURRENTLY` 发起时，需要在 migration class 中 **指示「这个 migration 不开启 transaction」**。因为 PostgreSQL 无法在 transaction 内执行 `CREATE INDEX CONCURRENTLY`。

参考实现: [migration/1745378064470-composite-note-index.js](../../../../../packages/backend/migration/1745378064470-composite-note-index.js)

```js
const isConcurrentIndexMigrationEnabled = process.env.MISSKEY_MIGRATION_CREATE_INDEX_CONCURRENTLY === '1';

export class CompositeNoteIndex1745378064470 {
    name = 'CompositeNoteIndex1745378064470';
    transaction = isConcurrentIndexMigrationEnabled ? false : undefined;

    async up(queryRunner) {
        const concurrently = isConcurrentIndexMigrationEnabled;
        if (concurrently) {
            // CREATE INDEX CONCURRENTLY ...
        } else {
            // CREATE INDEX ...
        }
    }

    async down(queryRunner) {
        // 同样用环境变量分支
    }
}
```

要点:

- **`transaction = isConcurrentIndexMigrationEnabled ? false : undefined;`** 必填。没有它会让 `CREATE INDEX CONCURRENTLY` 在 transaction 内执行，从而以 `ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block` 失败
- 环境变量 `MISSKEY_MIGRATION_CREATE_INDEX_CONCURRENTLY=1` 默认 OFF。OFF 时需要能以普通的 `CREATE INDEX` (在 transaction 内) 运行。`up`/`down` 双方都用环境变量分支
- `ormconfig.js` 的 `migrationsTransactionMode` **由环境变量切换**: 仅在 `MISSKEY_MIGRATION_CREATE_INDEX_CONCURRENTLY=1` 时为 `'each'`，未设置时为 `'all'` (把所有 migration 包进 1 个 transaction) ([ormconfig.js](../../../../../packages/backend/ormconfig.js) 的 `migrationsTransactionMode`)。平时以 `'all'` 为前提

## migration 疑难场景集

把 `migration:generate` / 手写都容易踩错的模式按「**为何危险 → up 的形态 → down 策略 → 参考实现**」汇总。

通用铁律: `down()` 是 `up()` 的 **完全回滚**。下列场景多为「单纯的反向 SQL 无法回滚」的情况。

### 1. 添加 NOT NULL 列

**为何危险**: 向已有数据行的表加一个无 `DEFAULT` 的 `NOT NULL` 列，会因无法填充既有行而使 `ALTER TABLE` 失败。

- **可用默认值时** — 加上 `DEFAULT` 一条语句即可。这种最常见

  ```js
  // up
  await queryRunner.query(`ALTER TABLE "note_draft" ADD "isActuallyScheduled" boolean NOT NULL DEFAULT false`);
  // down
  await queryRunner.query(`ALTER TABLE "note_draft" DROP COLUMN "isActuallyScheduled"`);
  ```

  参考: [migration/1758677617888-scheduled-post.js](../../../../../packages/backend/migration/1758677617888-scheduled-post.js)

- **想用逐行计算的值填充 / 想之后去掉默认值时** — 分 3 段: ①以 nullable 添加 → ②用 `UPDATE` 回填 (见场景 3) → ③`ALTER COLUMN ... SET NOT NULL`。`down` 用 `DROP COLUMN` 即可。在巨型表上，② 的 `UPDATE` 与 ③ 的 `SET NOT NULL` (全行扫描) 可能长时间锁表，需注意

**补充:** 在 entity 侧加 `@Column({ default: ... })` 会让 `migration:generate` 输出带 `DEFAULT` 的 DDL。如果应用运行时总会写入值、不需要 DB 默认值，也可以在生成后手动只去掉 `DEFAULT` 子句 (现有 migration 中两种风格都有)。

### 2. enum 类型值的增加/变更

**为何危险**: PostgreSQL 的 enum **无法删除值** (不存在 `ALTER TYPE ... DROP VALUE`)，因此无法直接回滚 `ADD VALUE` 的变更。而且 Misskey 默认把整个 migration 合进 1 个事务 (`migrationsTransactionMode: 'all'`)，所以在同一事务内使用 `ADD VALUE` 新加的值的处理也会报错。于是 TypeORM `migration:generate` 输出 **「rename 旧类型 → CREATE 新类型 → 把列 ALTER 到新类型 (USING 强转) → DROP 旧类型」** 这套可回滚的步骤。手写也要遵循这个形态。

```js
// up: 添加值 'app' 的例子 (换载到包含新值的类型)
await queryRunner.query(`ALTER TYPE "public"."notification_type_enum" RENAME TO "notification_type_enum_old"`);
await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('follow', 'mention', /* ... */ 'app')`);
await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum" USING "type"::"text"::"public"."notification_type_enum"`);
await queryRunner.query(`DROP TYPE "public"."notification_type_enum_old"`);
```

```js
// down: 用同样的步骤回到不含新值的旧值集合
await queryRunner.query(`ALTER TYPE "public"."notification_type_enum" RENAME TO "notification_type_enum_old"`);
await queryRunner.query(`CREATE TYPE "public"."notification_type_enum" AS ENUM('follow', 'mention', /* ... 去掉 'app' ... */)`);
await queryRunner.query(`ALTER TABLE "notification" ALTER COLUMN "type" TYPE "public"."notification_type_enum" USING "type"::"text"::"public"."notification_type_enum"`);
await queryRunner.query(`DROP TYPE "public"."notification_type_enum_old"`);
```

要点: ①列有默认值时，在 ALTER 前 `DROP DEFAULT`、ALTER 后 `SET DEFAULT`。②数组列 (`mutingNotificationTypes` 等) 用 `TYPE "..."[] USING "col"::"text"::"..."[]` 做数组强转。③**`down` 的陷阱**: 若被删除的值已被现有行使用，`USING` 强转会因「该 enum 中不存在」而失败。仅添加新值之后立刻回滚是安全的，但回滚运营后已被使用的值本质上很危险 —— 这种情况要在 down 中先用 `UPDATE ... SET "type" = '<替代值>' WHERE "type" = '<要删的值>'` 退避后再强转。

参考: [migration/1674118260469-achievement.js](../../../../../packages/backend/migration/1674118260469-achievement.js) (rename/recreate 的完整 up/down)。新建类型见 [migration/1580276619901-v12-10.js](../../../../../packages/backend/migration/1580276619901-v12-10.js)。

### 3. 数据迁移 (UPDATE 回填)

**为何危险**: migration 内的 `UPDATE` 可能触碰生产的全部行。行数巨大时会引起长时间锁表、事务膨胀。

- 仅写入默认值的话，用 `UPDATE ... WHERE col IS NULL` 写成幂等的。做成多次跑也安全的形态
- 基本上要避免巨型表的全行更新。实在必要时，像 CONCURRENTLY 一样考虑分批或单独运营，并在 PR 中商议
- `down` 无法还原原值的数据迁移 (丢失信息的转换)，在 `down` 中用注释明示无法还原，至少把 schema 回滚

```js
// up: 添加 nullable → 回填 → 改为 NOT NULL
await queryRunner.query(`ALTER TABLE "user_profile" ADD "github" boolean`);
await queryRunner.query(`UPDATE "user_profile" SET "github" = FALSE WHERE "github" IS NULL`);
await queryRunner.query(`ALTER TABLE "user_profile" ALTER COLUMN "github" SET NOT NULL`);
```

### 4. JSONB / 数组列的默认值

**为何危险**: 默认值字面量的写法写错会与 `migration:generate` 的输出偏离，造成风格不一致。对齐到已验证的写法。

```js
await queryRunner.query(`ALTER TABLE "user_profile" ADD "room" jsonb NOT NULL DEFAULT '{}'`);          // 对象
await queryRunner.query(`ALTER TABLE "bubble_game_record" ADD "logs" jsonb NOT NULL DEFAULT '[]'`);     // 数组(JSON)
await queryRunner.query(`ALTER TABLE "meta" ADD "pinnedUsers" character varying(256) array NOT NULL DEFAULT '{}'::varchar[]`); // PG 数组类型
```

参考: [migration/1565634203341-room.js](../../../../../packages/backend/migration/1565634203341-room.js), [migration/1704959805077-bubble-game-record.js](../../../../../packages/backend/migration/1704959805077-bubble-game-record.js), [migration/1557476068003-PinnedUsers.js](../../../../../packages/backend/migration/1557476068003-PinnedUsers.js)。`down` 都是 `DROP COLUMN`。

### 5. 安全的 DROP 与 COMMENT

- **DROP 的幂等性**: 视情况对象可能不存在的 DROP 加上 `IF EXISTS` (`DROP INDEX IF EXISTS "..."`)。不过 `migration:generate` 通常输出不带 `IF EXISTS` 的裸 DDL，所以只在「确知条件性存在」时才手动添加 (随意添加会掩盖本应被检出的不一致)
- **COMMENT ON COLUMN**: Misskey 有给 denormalize 的列加 `'[Denormalized]'` 注释的惯例。对应 entity 的 `@Column({ comment: '[Denormalized]' })`，`migration:generate` 会输出 `COMMENT ON COLUMN`。`up` 中添加了就在 `down` 中对称地写

  ```js
  await queryRunner.query(`COMMENT ON COLUMN "note"."renoteChannelId" IS '[Denormalized]'`);
  ```

  参考: [migration/1761569941833-add-channel-muting.js](../../../../../packages/backend/migration/1761569941833-add-channel-muting.js)

### 6. 列重命名

`migration:generate` 容易把 entity 的属性名变更解读为 **「DROP 旧列 + ADD 新列」**，这样会 **丢数据**。如果意图是重命名，就丢弃生成的 SQL，手写改成 `ALTER TABLE "t" RENAME COLUMN "old" TO "new"` (down 反过来)。不要盲信生成结果。

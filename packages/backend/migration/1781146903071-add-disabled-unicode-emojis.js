/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddDisabledUnicodeEmojis1781146903071 {
    name = 'AddDisabledUnicodeEmojis1781146903071';

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "disabledUnicodeEmojis" character varying(1024) array NOT NULL DEFAULT '{}'`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "disabledUnicodeEmojis"`);
    }
}

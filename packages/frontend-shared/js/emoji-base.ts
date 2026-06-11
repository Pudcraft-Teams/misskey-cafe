/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const twemojiSvgBase = '/twemoji';
const fluentEmojiPngBase = '/fluent-emoji';

export function char2twemojiFilePath(char: string): string {
	let codes = Array.from(char, x => x.codePointAt(0)?.toString(16));
	if (!codes.includes('200d')) codes = codes.filter(x => x !== 'fe0f');
	codes = codes.filter(x => x && x.length);
	const fileName = codes.join('-');
	return `${twemojiSvgBase}/${fileName}.svg`;
}

export function char2fluentEmojiFilePath(char: string): string {
	let codes = Array.from(char, x => x.codePointAt(0)?.toString(16));
	// Fluent Emojiは国旗非対応 https://github.com/microsoft/fluentui-emoji/issues/25
	if (codes[0]?.startsWith('1f1')) return char2twemojiFilePath(char);
	if (!codes.includes('200d')) codes = codes.filter(x => x !== 'fe0f');
	codes = codes.filter(x => x && x.length);
	const fileName = codes.join('-');
	return `${fluentEmojiPngBase}/${fileName}.png`;
}

/**
 * 与 backend(ReactionService.normalize)一致地剥离异体字选择符(VS16),吸收同一表情的不同写法。
 */
export function stripEmojiVS16(char: string): string {
	return char.match('\u200d') ? char : char.replace(/\ufe0f/g, '');
}

/**
 * 判断该 Unicode 表情是否已被实例管理员禁用。
 */
export function isDisabledUnicodeEmoji(char: string, disabledUnicodeEmojis: string[] | undefined): boolean {
	if (disabledUnicodeEmojis == null || disabledUnicodeEmojis.length === 0) return false;
	const stripped = stripEmojiVS16(char);
	return disabledUnicodeEmojis.some(x => stripEmojiVS16(x.trim()) === stripped);
}

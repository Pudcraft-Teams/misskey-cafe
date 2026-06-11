/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { computed } from 'vue';
import { emojilist, emojiCharByCategory } from '@@/js/emojilist.js';
import { stripEmojiVS16 } from '@@/js/emoji-base.js';
import type { UnicodeEmojiDef } from '@@/js/emojilist.js';
import { instance } from '@/instance.js';

export const disabledUnicodeEmojisSet = computed(() => new Set(
	(instance.disabledUnicodeEmojis ?? []).map(x => stripEmojiVS16(x.trim())),
));

export function isUnicodeEmojiDisabled(char: string): boolean {
	return disabledUnicodeEmojisSet.value.has(stripEmojiVS16(char));
}

export const availableEmojilist = computed<UnicodeEmojiDef[]>(() => {
	if (disabledUnicodeEmojisSet.value.size === 0) return emojilist;
	return emojilist.filter(emoji => !isUnicodeEmojiDisabled(emoji.char));
});

export const availableEmojiCharByCategory = computed<Map<string, string[]>>(() => {
	if (disabledUnicodeEmojisSet.value.size === 0) return emojiCharByCategory;
	const map = new Map<string, string[]>();
	for (const [category, chars] of emojiCharByCategory) {
		map.set(category, chars.filter(char => !isUnicodeEmojiDisabled(char)));
	}
	return map;
});

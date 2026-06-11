<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<svg v-if="isDisabled" :class="$style.disabledBox" viewBox="0 0 24 24" aria-hidden="true">
	<rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/>
	<path d="M8.5 8.5l7 7m0-7l-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>
<img v-else :class="$style.root" :src="url" :alt="props.emoji" decoding="async"/>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { char2twemojiFilePath, isDisabledUnicodeEmoji } from '@@/js/emoji-base.js';
import { serverMetadata } from '@/server-metadata.js';

const props = defineProps<{
	emoji: string;
}>();

const isDisabled = computed(() => isDisabledUnicodeEmoji(props.emoji, serverMetadata.disabledUnicodeEmojis));
const url = computed(() => char2twemojiFilePath(props.emoji));
</script>

<style lang="scss" module>
.root {
	height: 1.25em;
	vertical-align: -0.25em;
}

.disabledBox {
	width: 1.25em;
	height: 1.25em;
	vertical-align: -0.25em;
	opacity: 0.5;
}
</style>

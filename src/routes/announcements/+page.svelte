<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	export let data: PageData;

	const formatTaiwanDate = (value: Date | string) => {
		const date = new Date(value);
		return `${date.getFullYear() - 1911}年${date.getMonth() + 1}月${date.getDate()}日`;
	};
</script>

<svelte:head>
	<title>公告 — 五十郎</title>
	<meta name="description" content="五十郎最新公告。" />
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] pb-16 text-[#2C302E]">
	<header class="sticky top-0 z-10 border-b border-[#eee7df] bg-white/90 px-5 py-5 backdrop-blur">
		<div class="mx-auto max-w-3xl">
			<p class="text-xs tracking-[0.24em] text-[#8F9E91]">NOTICE</p>
			<h1 class="mt-1 text-2xl font-semibold">公告</h1>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-5 py-6">
		{#if data.announcements.length > 0}
			<div class="space-y-3">
				{#each data.announcements as announcement (announcement.id)}
					<article class="rounded-2xl border border-[#e7ddd4] bg-white p-4 shadow-sm">
						<p class="text-sm font-semibold text-[#8F9E91]">
							{formatTaiwanDate(announcement.createdAt)}
						</p>
						<p class="mt-2 text-base leading-7 whitespace-pre-line text-[#3f3934]">
							{announcement.content}
						</p>
					</article>
				{/each}
			</div>
		{:else}
			<div
				class="rounded-2xl border border-dashed border-[#ded4ca] bg-white/70 px-4 py-8 text-center text-sm text-[#7d746d]"
			>
				目前沒有公告
			</div>
		{/if}

		<a href={resolve('/')} class="mt-6 inline-block text-sm text-[#61705f] underline">前往預約</a>
	</main>
</div>

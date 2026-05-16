<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	export let data: PageData;

	const formatTaiwanDate = (value: Date | string | number) => {
		const date = new Date(typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value);
		return `${date.getFullYear() - 1911}年${date.getMonth() + 1}月${date.getDate()}日`;
	};
</script>

<svelte:head>
	<title>公告 — 五十郎</title>
	<meta name="description" content="五十郎最新公告。" />
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] pb-16 text-[#2C302E]">
	<header
		class="sticky top-0 z-10 border-b border-[#e8e1da] bg-[#F9F8F6]/95 px-5 py-4 backdrop-blur"
	>
		<div class="mx-auto flex max-w-3xl items-center justify-between gap-4">
			<h1 class="text-2xl font-semibold tracking-wide">公告</h1>
			<a
				href={resolve('/')}
				class="shrink-0 text-sm font-medium text-[#61705f] underline-offset-4 hover:underline"
			>
				← 返回預約
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-5">
		{#if data.announcements.length > 0}
			<div class="divide-y divide-[#e1d9d1]">
				{#each data.announcements as announcement (announcement.id)}
					<article class="py-6">
						<p class="text-sm font-semibold tracking-wide text-[#7f8f81]">
							{formatTaiwanDate(announcement.createdAt)}
						</p>
						<p class="mt-3 text-base leading-8 whitespace-pre-line text-[#3f3934]">
							{announcement.content}
						</p>
					</article>
				{/each}
			</div>
		{:else}
			<div class="border-b border-[#e1d9d1] py-10 text-sm text-[#7d746d]">目前沒有公告</div>
		{/if}
	</main>
</div>

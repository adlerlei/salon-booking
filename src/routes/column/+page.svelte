<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	export let data: PageData;

	const formatDate = (value: string | null) => {
		if (!value) return '';
		return new Date(value).toLocaleDateString('zh-TW', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};
</script>

<svelte:head>
	<title>五十專欄 — 五十郎</title>
	<meta name="description" content="五十郎髮型保養與技術文章。" />
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] pb-16 text-[#2C302E]">
	<header class="sticky top-0 z-10 border-b border-[#eee7df] bg-white/90 px-5 py-5 backdrop-blur">
		<div class="mx-auto max-w-3xl">
			<h1 class="mt-1 text-2xl font-semibold">五十專欄</h1>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-5 py-6">
		{#if data.articles.length > 0}
			<div class="space-y-3">
				{#each data.articles as article (article.id)}
					<a
						href={resolve(`/column/${article.slug}`)}
						class="block rounded-2xl border border-[#e7ddd4] bg-white p-4 shadow-sm transition-colors hover:border-[#8F9E91]"
					>
						<p class="text-xs text-[#8F9E91]">{formatDate(article.publishedAt)}</p>
						<h2 class="mt-1 text-lg font-semibold text-[#3f3934]">{article.title}</h2>
						<p class="mt-2 text-sm leading-6 text-[#746b63]">{article.excerpt}</p>
					</a>
				{/each}
			</div>
		{:else}
			<div
				class="rounded-2xl border border-dashed border-[#ded4ca] bg-white/70 px-4 py-8 text-center text-sm text-[#7d746d]"
			>
				文章準備中
			</div>
		{/if}
	</main>
</div>

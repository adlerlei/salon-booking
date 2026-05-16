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
	<title>{data.article.title} — 五十專欄</title>
	<meta name="description" content={data.article.excerpt} />
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] pb-16 text-[#2C302E]">
	<header class="border-b border-[#eee7df] bg-white/90 px-5 py-4 backdrop-blur">
		<div class="mx-auto max-w-3xl">
			<a href={resolve('/column')} class="text-sm text-[#61705f] underline">返回五十專欄</a>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-5 py-6">
		<article class="rounded-2xl border border-[#e7ddd4] bg-white p-5 shadow-sm">
			<p class="text-xs text-[#8F9E91]">{formatDate(data.article.publishedAt)}</p>
			<h1 class="mt-2 text-2xl leading-snug font-semibold text-[#3f3934]">
				{data.article.title}
			</h1>
			<p class="mt-3 text-base leading-7 text-[#746b63]">{data.article.excerpt}</p>
			<div
				class="mt-6 border-t border-[#eee7df] pt-5 text-base leading-8 whitespace-pre-line text-[#3f3934]"
			>
				{data.article.content}
			</div>
		</article>
	</main>
</div>

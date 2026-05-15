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
	<title>最新消息 — 五十郎</title>
	<meta name="description" content="五十郎最新公告、髮型保養與技術文章。" />
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] pb-16 text-[#2C302E]">
	<header class="sticky top-0 z-10 border-b border-[#eee7df] bg-white/90 px-5 py-5 backdrop-blur">
		<div class="mx-auto max-w-3xl">
			<p class="text-xs tracking-[0.24em] text-[#8F9E91]">NEWS</p>
			<h1 class="mt-1 text-2xl font-semibold">最新消息</h1>
		</div>
	</header>

	<main class="mx-auto max-w-3xl space-y-8 px-5 py-6">
		<section>
			<div class="mb-3 flex items-end justify-between gap-3">
				<h2 class="text-lg font-semibold">公告</h2>
				<a href={resolve('/')} class="text-sm text-[#61705f] underline">前往預約</a>
			</div>

			{#if data.announcements.length > 0}
				<div class="space-y-3">
					{#each data.announcements as announcement (announcement.id)}
						<article class="rounded-2xl border border-[#e7ddd4] bg-white p-4 shadow-sm">
							<div class="flex items-start justify-between gap-3">
								<h3 class="text-base font-semibold text-[#3f3934]">{announcement.title}</h3>
								{#if announcement.isPinned}
									<span
										class="shrink-0 rounded-full bg-[#8F9E91]/12 px-2 py-1 text-xs font-medium text-[#61705f]"
									>
										置頂
									</span>
								{/if}
							</div>
							<p class="mt-2 text-sm leading-7 whitespace-pre-line text-[#746b63]">
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
		</section>

		<section>
			<h2 class="mb-3 text-lg font-semibold">髮型專欄</h2>

			{#if data.articles.length > 0}
				<div class="space-y-3">
					{#each data.articles as article (article.id)}
						<a
							href={resolve(`/news/${article.slug}`)}
							class="block overflow-hidden rounded-2xl border border-[#e7ddd4] bg-white shadow-sm transition-colors hover:border-[#8F9E91]"
						>
							{#if article.coverImageUrl}
								<img src={article.coverImageUrl} alt="" class="h-44 w-full object-cover" />
							{/if}
							<div class="p-4">
								<p class="text-xs text-[#8F9E91]">{formatDate(article.publishedAt)}</p>
								<h3 class="mt-1 text-lg font-semibold text-[#3f3934]">{article.title}</h3>
								<p class="mt-2 text-sm leading-6 text-[#746b63]">{article.excerpt}</p>
							</div>
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
		</section>
	</main>
</div>

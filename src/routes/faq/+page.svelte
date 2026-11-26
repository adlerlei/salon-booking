<script lang="ts">
	import { resolve } from '$app/paths';
	import SiteHeader from '$lib/components/SiteHeader.svelte';

	const faqs = [
		{
			q: '要怎麼預約？',
			a: '官方 LINE 熟客可點圖文選單直接預約。新朋友可開啟本站預約頁，優先使用 Google 登入；也可填手機號碼以訪客身份預約。'
		},
		{
			q: '遲到會怎樣？',
			a: '若超過預約時間 10 分鐘，預約將不予保留。如需更改時間請提前聯繫沙龍。'
		},
		{
			q: '營業時間？',
			a: '每日 11:00–21:00，週日公休。另有臨時公休時，預約日曆會標示。'
		},
		{
			q: '可以取消預約嗎？',
			a: '可以。LINE 或 Google 登入後到「我的預約」取消。訪客請使用當初預約的同一個瀏覽器開啟「我的預約」。'
		},
		{
			q: '沒有加入 LINE 可以預約嗎？',
			a: '可以。請使用網頁預約，建議 Google 登入，方便之後跨裝置查詢與取消。'
		}
	];
</script>

<svelte:head>
	<title>常見問題｜Jo造型髮藝</title>
	<meta name="description" content="Jo造型髮藝預約方式、遲到規定、營業時間與取消說明。" />
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] text-[#2C302E]">
	<SiteHeader current="faq" />

	<main class="mx-auto max-w-3xl px-5 py-12">
		<h1 class="font-serif text-3xl tracking-wide" style="font-family: 'Playfair Display', serif;">
			常見問題
		</h1>

		<div class="mt-8 space-y-4">
			{#each faqs as item}
				<details class="rounded-2xl border border-[#e6ddd3] bg-white px-5 py-4">
					<summary class="cursor-pointer list-none font-medium">{item.q}</summary>
					<p class="mt-3 text-sm leading-relaxed text-[#5c554f]">{item.a}</p>
				</details>
			{/each}
		</div>

		<a
			href={resolve('/')}
			class="mt-8 inline-flex rounded-full bg-[#2C302E] px-6 py-3 text-sm font-medium text-white"
		>
			立即預約
		</a>
	</main>
</div>

<script lang="ts">
	import { resolve } from '$app/paths';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
</script>

<svelte:head>
	<title>Jo造型髮藝｜台中美髮沙龍</title>
	<meta
		name="description"
		content="Jo造型髮藝提供剪髮、染燙、護髮與頭皮保養。可線上預約，營業時間 11:00–21:00（週日公休）。"
	/>
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] text-[#2C302E]">
	<SiteHeader current="home" />

	<section class="relative overflow-hidden">
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(143,158,145,0.22),transparent_42%),radial-gradient(circle_at_80%_0%,rgba(92,85,79,0.12),transparent_40%)]"
		></div>
		<div class="relative mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center px-5 py-16">
			<p class="text-xs tracking-[0.28em] text-[#8F9E91] uppercase">Jo造型髮藝</p>
			<h1
				class="mt-4 max-w-xl font-serif text-4xl leading-tight tracking-wide md:text-5xl"
				style="font-family: 'Playfair Display', serif;"
			>
				剪、染、燙、護<br />一站完成的日常質感
			</h1>
			<p class="mt-5 max-w-lg text-base leading-relaxed text-[#5c554f]">
				熟客可從官方 LINE 圖文選單預約；新朋友也能在網頁填寫姓名與手機完成預約，不必先加入 LINE。
			</p>
			<div class="mt-8 flex flex-wrap gap-3">
				<a
					href={resolve('/')}
					class="rounded-full bg-[#2C302E] px-6 py-3 text-sm font-medium text-white"
				>
					立即線上預約
				</a>
				<a
					href={resolve('/services')}
					class="rounded-full border border-[#d9d0c7] bg-white/70 px-6 py-3 text-sm font-medium text-[#2C302E]"
				>
					查看服務項目
				</a>
			</div>
		</div>
	</section>

	<section class="mx-auto grid max-w-5xl gap-6 px-5 py-12 md:grid-cols-3">
		<div class="rounded-2xl border border-[#e6ddd3] bg-white/80 p-5">
			<p class="text-xs tracking-[0.2em] text-[#8F9E91] uppercase">營業時間</p>
			<p class="mt-2 text-lg font-medium">11:00 – 21:00</p>
			<p class="mt-1 text-sm text-[#7f766f]">週日公休</p>
		</div>
		<div class="rounded-2xl border border-[#e6ddd3] bg-white/80 p-5">
			<p class="text-xs tracking-[0.2em] text-[#8F9E91] uppercase">預約提醒</p>
			<p class="mt-2 text-sm leading-relaxed text-[#5c554f]">
				若超過預約時間 10 分鐘，預約將不予保留。
			</p>
		</div>
		<div class="rounded-2xl border border-[#e6ddd3] bg-white/80 p-5">
			<p class="text-xs tracking-[0.2em] text-[#8F9E91] uppercase">更多內容</p>
			<div class="mt-3 flex flex-col gap-2 text-sm">
				<a href={resolve('/announcements')} class="text-[#2C302E] underline-offset-2 hover:underline"
					>最新公告</a
				>
				<a href={resolve('/column')} class="text-[#2C302E] underline-offset-2 hover:underline"
					>髮藝專欄</a
				>
				<a href={resolve('/faq')} class="text-[#2C302E] underline-offset-2 hover:underline"
					>常見問題</a
				>
			</div>
		</div>
	</section>
</div>

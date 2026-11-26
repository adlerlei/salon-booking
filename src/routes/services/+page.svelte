<script lang="ts">
	import { resolve } from '$app/paths';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { salonServices } from '$lib/services';
</script>

<svelte:head>
	<title>服務項目｜Jo造型髮藝</title>
	<meta name="description" content="Jo造型髮藝剪髮、染燙、護髮與頭皮保養項目與預估時間。" />
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] text-[#2C302E]">
	<SiteHeader current="services" />

	<main class="mx-auto max-w-3xl px-5 py-12">
		<h1 class="font-serif text-3xl tracking-wide" style="font-family: 'Playfair Display', serif;">
			服務與預估時間
		</h1>
		<p class="mt-3 text-sm leading-relaxed text-[#7f766f]">
			實際施作時間依髮況調整。線上預約會依下列時長檢查時段是否可安排。
		</p>

		<ul class="mt-8 divide-y divide-[#ebe4dc] overflow-hidden rounded-2xl border border-[#e6ddd3] bg-white">
			{#each salonServices as service}
				<li class="flex items-center justify-between gap-4 px-5 py-4">
					<div>
						<p class="font-medium">{service.name}</p>
						<p class="text-sm text-[#8a8179]">{service.desc}</p>
					</div>
					<span class="text-sm text-[#5c554f]">{service.duration} 分</span>
				</li>
			{/each}
		</ul>

		<a
			href={resolve('/')}
			class="mt-8 inline-flex rounded-full bg-[#8F9E91] px-6 py-3 text-sm font-medium text-white"
		>
			前往預約
		</a>
	</main>
</div>

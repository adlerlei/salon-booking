<script lang="ts">
	import { resolve } from '$app/paths';

	let { current = '' }: { current?: string } = $props();

	const links = [
		{ href: '/home' as const, label: '首頁', key: 'home' },
		{ href: '/services' as const, label: '服務', key: 'services' },
		{ href: '/faq' as const, label: '常見問題', key: 'faq' },
		{ href: '/' as const, label: '立即預約', key: 'book' }
	];
</script>

<header class="border-b border-[#e6ddd3] bg-[#F9F8F6]/90 backdrop-blur">
	<div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
		<a href={resolve('/home')} class="font-serif text-xl tracking-wide text-[#2C302E]" style="font-family: 'Playfair Display', serif;">
			Jo造型髮藝
		</a>
		<nav class="flex flex-wrap items-center justify-end gap-1 text-sm">
			{#each links as link}
				<a
					href={resolve(link.href)}
					class={`rounded-full px-3 py-1.5 transition-colors ${
						current === link.key
							? 'bg-[#2C302E] text-white'
							: link.key === 'book'
								? 'bg-[#8F9E91] text-white hover:bg-[#7A8A7C]'
								: 'text-[#5c554f] hover:bg-[#efe8e1]'
					}`}
				>
					{link.label}
				</a>
			{/each}
		</nav>
	</div>
</header>

<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { elasticOut, cubicOut } from 'svelte/easing';

	// 從 query params 解析預約資訊
	const service = $page.url.searchParams.get('service') || '';
	const dateTimeStr = $page.url.searchParams.get('date') || ''; // e.g. "2026-03-15T14:00"
	const customerName = $page.url.searchParams.get('name') || '';
	const duration = parseInt($page.url.searchParams.get('duration') || '60');

	// 解析日期與時間
	const parseBookingInfo = () => {
		if (!dateTimeStr) return { dateDisplay: '', timeStart: '', timeEnd: '' };

		const [datePart, timePart] = dateTimeStr.split('T');
		if (!datePart || !timePart) return { dateDisplay: '', timeStart: '', timeEnd: '' };

		// 格式化日期顯示
		const [year, month, day] = datePart.split('-').map(Number);
		// 用本地時間建立，避免時區問題
		const d = new Date(year, month - 1, day);
		const dateDisplay = d.toLocaleDateString('zh-TW', {
			month: 'long',
			day: 'numeric',
			weekday: 'short'
		});

		// 計算結束時間
		const [h, m] = timePart.split(':').map(Number);
		const endTotal = h * 60 + m + duration;
		const endH = Math.floor(endTotal / 60);
		const endM = endTotal % 60;
		const timeEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

		return {
			dateDisplay,
			timeStart: timePart,
			timeEnd
		};
	};

	const { dateDisplay, timeStart, timeEnd } = parseBookingInfo();

	// 動畫狀態
	let showCheck = false;
	let showContent = false;
	let showButtons = false;

	onMount(() => {
		// 依序播放動畫
		setTimeout(() => (showCheck = true), 100);
		setTimeout(() => (showContent = true), 400);
		setTimeout(() => (showButtons = true), 700);
	});
</script>

<svelte:head>
	<title>預約成功 — 五十郎 專屬預約</title>
</svelte:head>

<div
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F9F8F6] px-6 pb-10 pt-16 font-sans text-[#2C302E]"
>
	<!-- 背景裝飾圓圈 -->
	<div
		class="pointer-events-none absolute top-0 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#8F9E91]/10 blur-3xl"
	></div>
	<div
		class="pointer-events-none absolute right-0 bottom-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-[#8F9E91]/10 blur-3xl"
	></div>

	<div class="relative z-10 w-full max-w-sm">

		<!-- 成功圖示 -->
		{#if showCheck}
			<div
				class="mx-auto mb-8 flex flex-col items-center"
				in:scale={{ duration: 500, easing: elasticOut, start: 0.5 }}
			>
				<!-- 外圈 -->
				<div
					class="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#8F9E91] to-[#6b7d6d] shadow-lg shadow-[#8F9E91]/30"
				>
					<!-- 打勾 svg -->
					<svg class="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<div class="mt-4 text-center">
					<h1 class="text-2xl font-bold tracking-tight text-[#2C302E]">預約成功！</h1>
					<p class="mt-1 text-sm text-gray-500">我們期待為您服務 ✨</p>
				</div>
			</div>
		{/if}

		<!-- 預約摘要卡片 -->
		{#if showContent}
			<div
				class="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
				in:fly={{ y: 24, duration: 400, easing: cubicOut }}
			>
				<!-- 卡片標題列 -->
				<div class="border-b border-gray-50 bg-[#8F9E91]/8 px-5 py-3">
					<p class="text-xs font-semibold tracking-widest text-[#8F9E91] uppercase">預約明細</p>
				</div>

				<div class="divide-y divide-gray-50 px-5">
					<!-- 顧客 -->
					<div class="flex items-center justify-between py-4">
						<div class="flex items-center gap-2 text-sm text-gray-500">
							<!-- person icon -->
							<svg class="h-4 w-4 text-[#8F9E91]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
								<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
							顧客
						</div>
						<span class="text-sm font-semibold text-[#2C302E]">{customerName}</span>
					</div>

					<!-- 服務 -->
					<div class="flex items-center justify-between py-4">
						<div class="flex items-center gap-2 text-sm text-gray-500">
							<!-- scissors icon -->
							<svg class="h-4 w-4 text-[#8F9E91]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
								<path stroke-linecap="round" stroke-linejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
							</svg>
							服務項目
						</div>
						<span class="text-sm font-semibold text-[#2C302E]">{service}</span>
					</div>

					<!-- 日期 -->
					<div class="flex items-center justify-between py-4">
						<div class="flex items-center gap-2 text-sm text-gray-500">
							<!-- calendar icon -->
							<svg class="h-4 w-4 text-[#8F9E91]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
								<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							預約日期
						</div>
						<span class="text-sm font-semibold text-[#2C302E]">{dateDisplay}</span>
					</div>

					<!-- 時段 -->
					<div class="flex items-center justify-between py-4">
						<div class="flex items-center gap-2 text-sm text-gray-500">
							<!-- clock icon -->
							<svg class="h-4 w-4 text-[#8F9E91]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							預約時段
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-sm font-semibold text-[#2C302E]">{timeStart}</span>
							<span class="text-xs text-gray-400">→</span>
							<span class="text-sm font-semibold text-[#2C302E]">{timeEnd}</span>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- 按鈕與提示區域 -->
		{#if showButtons}
			<div class="flex flex-col gap-3" in:fly={{ y: 16, duration: 350, easing: cubicOut }}>
				<!-- 主按鈕：查看我的預約 -->
				<a 
					href="/my-bookings"
					class="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8F9E91] px-6 py-4 font-semibold text-white shadow-md shadow-[#8F9E91]/25 transition-all duration-200 active:scale-[0.97] hover:bg-[#7A8A7C]"
				>
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					查看我的預約
				</a>
			</div>
		{/if}
	</div>
</div>

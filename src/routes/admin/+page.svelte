<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';

	export let data: any;

	let interval: any;

	onMount(() => {
		interval = setInterval(() => {
			invalidateAll();
		}, 30000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	// Calculate End Time
	const getEndTime = (datetimeStr: string, durationMinutes: number) => {
		if (!datetimeStr || !durationMinutes) return '';
		const [, time] = datetimeStr.split('T');
		if (!time) return '';
		const [hours, minutes] = time.split(':').map(Number);
		const totalMinutes = hours * 60 + minutes + durationMinutes;
		const endHours = Math.floor(totalMinutes / 60);
		const endMins = totalMinutes % 60;
		return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
	};

	const formatDate = (datetimeStr: string) => {
		if (!datetimeStr) return '';
		const [datePart] = datetimeStr.split('T');
		const [y, m, d] = datePart.split('-').map(Number);
		const date = new Date(y, m - 1, d);
		return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' });
	};

	const formatTime = (datetimeStr: string) => {
		if (!datetimeStr) return '';
		return datetimeStr.split('T')[1];
	};

	const isPast = (dateStr: string) => {
		try {
			const [datePart, timePart] = dateStr.split('T');
			const [y, m, d] = datePart.split('-').map(Number);
			const [hh, mm] = timePart.split(':').map(Number);
			const appDate = new Date(y, m - 1, d, hh, mm);
			return appDate.getTime() < new Date().getTime();
		} catch {
			return false;
		}
	};

	// 分類與排序
	$: upcomingBookings = data.records
		.filter((r: any) => !isPast(r.appointmentDate) && r.status === 'confirmed')
		.sort((a: any, b: any) => a.appointmentDate.localeCompare(b.appointmentDate));

	$: cancelledBookings = data.records
		.filter((r: any) => r.status === 'cancelled')
		.sort((a: any, b: any) => b.appointmentDate.localeCompare(a.appointmentDate));

	$: pastBookings = data.records
		.filter((r: any) => isPast(r.appointmentDate) && r.status === 'confirmed')
		.sort((a: any, b: any) => b.appointmentDate.localeCompare(a.appointmentDate));
</script>

<div
	class="min-h-screen bg-[#F9F8F6] pb-20 font-sans text-[#2C302E] selection:bg-[#8F9E91] selection:text-white"
>
	<!-- Header -->
	<header
		class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-6 shadow-sm"
	>
		<div class="flex items-center gap-3">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8F9E91] font-serif text-white shadow-sm"
			>
				S
			</div>
			<h1
				class="font-serif text-xl font-semibold tracking-wide"
				style="font-family: 'Playfair Display', serif;"
			>
				Salon Admin
			</h1>
		</div>

		<div class="flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-500">
			<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
			自動更新中
		</div>
	</header>

	<main class="mx-auto mt-6 max-w-5xl px-4 md:px-6">
		<!-- 數據統計卡片 -->
		<div class="mb-8 grid grid-cols-3 gap-3">
			<div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
				<p class="text-xs text-gray-500 mb-1">即將到來</p>
				<p class="text-2xl font-bold text-[#8F9E91]">{upcomingBookings.length}</p>
			</div>
			<div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
				<p class="text-xs text-gray-500 mb-1">已完成</p>
				<p class="text-2xl font-bold text-gray-600">{pastBookings.length}</p>
			</div>
			<div class="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center">
				<p class="text-xs text-gray-500 mb-1">已取消</p>
				<p class="text-2xl font-bold text-rose-400">{cancelledBookings.length}</p>
			</div>
		</div>

		<!-- ========== 即將到來 ========== -->
		{#if upcomingBookings.length > 0}
			<h2 class="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-800">
				<span class="inline-block h-4 w-1 rounded-full bg-[#8F9E91]"></span>
				即將到來
			</h2>

			<!-- Desktop Table -->
			<div class="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:block mb-8" in:fade>
				<table class="min-w-full divide-y divide-gray-100">
					<thead class="bg-gray-50/50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">預約日期</th>
							<th class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">時間區段</th>
							<th class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">顧客</th>
							<th class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">服務項目</th>
							<th class="px-6 py-3 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase">時長</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50">
						{#each upcomingBookings as record (record.id)}
							<tr class="group transition-colors hover:bg-[#F9F8F6]">
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="text-sm font-medium text-gray-900">{formatDate(record.appointmentDate)}</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="inline-flex items-center gap-2 rounded-lg border border-[#34D399]/30 bg-[#ECFDF5] px-3 py-1 text-sm font-medium text-[#064E3B]">
										<span>{formatTime(record.appointmentDate)}</span>
										<span class="font-normal text-emerald-700/50">→</span>
										<span class="opacity-80">{getEndTime(record.appointmentDate, record.durationMinutes)}</span>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<div class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">{record.customerName.charAt(0)}</div>
										<span class="text-sm font-medium text-gray-900">{record.customerName}</span>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.serviceType}</td>
								<td class="px-6 py-4 whitespace-nowrap text-right">
									<span class="rounded-md bg-gray-100 border border-gray-200 px-2 py-1 text-xs font-medium text-gray-500">{record.durationMinutes} 分鐘</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile Cards -->
			<div class="space-y-3 md:hidden mb-8">
				{#each upcomingBookings as record (record.id)}
					<div class="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" in:slide>
						<div class="absolute bottom-0 left-0 top-0 w-1 bg-[#8F9E91]"></div>
						<div class="p-4 pl-5">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center gap-3">
									<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-sm font-semibold text-gray-600 border border-gray-100">{record.customerName.charAt(0)}</div>
									<div>
										<h3 class="font-bold text-[#2C302E]">{record.customerName}</h3>
										<p class="text-xs text-gray-500">{record.serviceType}</p>
									</div>
								</div>
								<span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold tracking-wider text-emerald-600 border border-emerald-100/50">已確認</span>
							</div>
							<div class="rounded-xl bg-[#F9F8F6] p-3 border border-gray-50">
								<div class="flex items-center justify-between text-sm">
									<div class="flex items-center gap-2">
										<svg class="h-4 w-4 text-[#8F9E91]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
										<span class="font-medium text-gray-800">{formatDate(record.appointmentDate)}</span>
									</div>
									<div class="flex items-center gap-1.5 text-gray-600 font-medium">
										{formatTime(record.appointmentDate)} - {getEndTime(record.appointmentDate, record.durationMinutes)}
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- ========== 已完成 ========== -->
		{#if pastBookings.length > 0}
			<h2 class="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-500 mt-6">
				已完成
			</h2>

			<!-- Desktop Table -->
			<div class="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:block mb-8 opacity-70" in:fade>
				<table class="min-w-full divide-y divide-gray-100">
					<thead class="bg-gray-50/50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">預約日期</th>
							<th class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">時間區段</th>
							<th class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">顧客</th>
							<th class="px-6 py-3 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase">服務項目</th>
							<th class="px-6 py-3 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase">狀態</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50">
						{#each pastBookings as record (record.id)}
							<tr class="transition-colors hover:bg-[#F9F8F6]">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(record.appointmentDate)}</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-500">
										{formatTime(record.appointmentDate)} → {getEndTime(record.appointmentDate, record.durationMinutes)}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.customerName}</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{record.serviceType}</td>
								<td class="px-6 py-4 text-center whitespace-nowrap">
									<span class="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200/50">已完成</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile Cards -->
			<div class="space-y-3 md:hidden mb-8">
				{#each pastBookings as record (record.id)}
					<div class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 opacity-70" in:slide>
						<div>
							<h3 class="text-sm font-medium text-gray-500">{record.customerName} · {record.serviceType}</h3>
							<p class="mt-0.5 text-xs text-gray-400">{formatDate(record.appointmentDate)}  {formatTime(record.appointmentDate)} - {getEndTime(record.appointmentDate, record.durationMinutes)}</p>
						</div>
						<span class="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">已完成</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- ========== 已取消 ========== -->
		{#if cancelledBookings.length > 0}
			<h2 class="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-400 mt-6">
				已取消
			</h2>

			<!-- Mobile + Desktop (compact list style for cancelled) -->
			<div class="space-y-2 mb-8">
				{#each cancelledBookings as record (record.id)}
					<div class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/30 p-4 opacity-50 grayscale" in:slide>
						<div>
							<h3 class="text-sm font-medium text-gray-500 line-through">{record.customerName} · {record.serviceType}</h3>
							<p class="mt-0.5 text-xs text-gray-400">{formatDate(record.appointmentDate)}  {formatTime(record.appointmentDate)}</p>
						</div>
						<span class="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-500 border border-rose-100/50">已取消</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- 空白狀態 -->
		{#if data.records.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-gray-400" in:fade>
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
					<svg class="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
				</div>
				<p class="text-base font-medium">目前沒有任何預約紀錄</p>
			</div>
		{/if}
	</main>
</div>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { fade } from 'svelte/transition';

	export let data;

	let interval: any;

	onMount(() => {
		// 每 30 秒自動抓取一次最新資料
		interval = setInterval(() => {
			invalidateAll();
		}, 30000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	// Calculate End Time based on start time and duration
	const getEndTime = (datetimeStr: string, durationMinutes: number) => {
		if (!datetimeStr || !durationMinutes) return '';
		const [date, time] = datetimeStr.split('T');
		if (!time) return '';

		const [hours, minutes] = time.split(':').map(Number);
		const totalMinutes = hours * 60 + minutes + durationMinutes;

		const endHours = Math.floor(totalMinutes / 60);
		const endMins = totalMinutes % 60;

		return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
	};

	// Format Date for display
	const formatDate = (datetimeStr: string) => {
		if (!datetimeStr) return '';
		const d = new Date(datetimeStr);
		return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' });
	};

	// Format Time for display
	const formatTime = (datetimeStr: string) => {
		if (!datetimeStr) return '';
		return datetimeStr.split('T')[1];
	};
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

	<main class="mx-auto mt-6 max-w-5xl p-6">
		<div class="mb-8 flex items-end justify-between">
			<div>
				<h2 class="mb-1 text-2xl font-semibold">預約管理</h2>
				<p class="text-sm text-gray-500">查看與管理所有顧客的預約時段</p>
			</div>
			<div
				class="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-2 shadow-sm"
			>
				<span class="text-sm text-gray-500">總預約數</span>
				<span class="text-xl font-bold text-[#8F9E91]">{data.records.length}</span>
			</div>
		</div>

		<div class="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" in:fade>
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-100">
					<thead class="bg-gray-50/50">
						<tr>
							<th
								scope="col"
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
								>預約日期</th
							>
							<th
								scope="col"
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
								>時間區段</th
							>
							<th
								scope="col"
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
								>顧客資訊</th
							>
							<th
								scope="col"
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"
								>服務項目</th
							>
							<th
								scope="col"
								class="px-6 py-4 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase"
								>狀態</th
							>
							<th
								scope="col"
								class="px-6 py-4 text-right text-xs font-semibold tracking-wider text-gray-500 uppercase"
								>時長</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-50 bg-white">
						{#each data.records as record}
							<tr class="group transition-colors duration-150 hover:bg-[#F9F8F6] {record.status === 'cancelled' ? 'opacity-60 bg-gray-50/50 grayscale' : ''}">
								<td class="px-6 py-5 whitespace-nowrap">
									<div class="flex items-center gap-2">
										<span
											class="h-4 w-1 rounded-full {record.status === 'cancelled' ? 'bg-gray-400' : 'bg-[#8F9E91]'} opacity-0 transition-opacity group-hover:opacity-100"
										></span>
										<span class="text-sm font-medium {record.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'}"
											>{formatDate(record.appointmentDate)}</span
										>
									</div>
								</td>
								<td class="px-6 py-5 whitespace-nowrap">
									<div
										class="inline-flex items-center gap-2 rounded-lg border {record.status === 'cancelled' ? 'border-gray-300 bg-gray-100 text-gray-500' : 'border-[#34D399]/30 bg-[#ECFDF5] text-[#064E3B]'} px-3 py-1 text-sm font-medium"
									>
										<span>{formatTime(record.appointmentDate)}</span>
										<span class="font-normal {record.status === 'cancelled' ? 'text-gray-400' : 'text-emerald-700/50'}">→</span>
										<span class="opacity-80"
											>{getEndTime(record.appointmentDate, record.durationMinutes)}</span
										>
									</div>
								</td>
								<td class="px-6 py-5 whitespace-nowrap">
									<div class="flex items-center">
										<div
											class="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500"
										>
											{record.customerName.charAt(0)}
										</div>
										<span class="text-sm font-medium {record.status === 'cancelled' ? 'text-gray-500' : 'text-gray-900'}">{record.customerName}</span>
									</div>
								</td>
								<td class="px-6 py-5 whitespace-nowrap">
									<span class="text-sm {record.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600'}">{record.serviceType}</span>
								</td>
								<td class="px-6 py-5 text-center whitespace-nowrap">
									{#if record.status === 'cancelled'}
										<span class="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 border border-rose-100/50">
											已取消
										</span>
									{:else}
										<span class="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 border border-emerald-100/50">
											已確認
										</span>
									{/if}
								</td>
								<td class="px-6 py-5 text-right whitespace-nowrap">
									<span
										class="rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500"
									>
										{record.durationMinutes} 分鐘
									</span>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-6 py-12 text-center">
									<div class="flex flex-col items-center justify-center space-y-3">
										<div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
											<svg
												class="w-6 h-6 text-gray-300"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>
										</div>
										<p class="text-sm text-gray-500 font-medium">目前沒有任何預約紀錄</p>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</main>
</div>

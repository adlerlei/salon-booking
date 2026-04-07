<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { cubicOut } from 'svelte/easing';
	import { fade, fly, scale } from 'svelte/transition';
	import { onDestroy, onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type AuthState = PageData['authState'];
	type BookingRecord = PageData['records'][number];
	type DashboardStats = NonNullable<PageData['stats']>;
	type AdminBookingsResponse = {
		success: boolean;
		message?: string;
		records?: BookingRecord[];
		stats?: DashboardStats;
	};
	type BookingDayGroup = {
		key: string;
		label: string;
		records: BookingRecord[];
	};
	type AdminTab = 'today' | 'future' | 'stats' | 'records';

	const liffId = '2009342816-q0rukZhq';
	let authState = $state<AuthState>('needs-session');
	let records = $state<BookingRecord[]>([]);
	let stats = $state<DashboardStats | null>(null);
	let loading = $state(false);
	let syncingSession = $state(false);
	let error = $state('');
	let profile = $state<{ displayName?: string; pictureUrl?: string } | null>(null);
	let interval: ReturnType<typeof setInterval> | null = null;
	let isMounted = $state(false);
	let activeTab = $state<AdminTab>('today');

	const parseDateTime = (dateTime: string) => {
		const [datePart, timePart = '00:00'] = dateTime.split('T');
		const [year, month, day] = datePart.split('-').map(Number);
		const [hour, minute] = timePart.split(':').map(Number);
		return new Date(year, month - 1, day, hour, minute);
	};

	const compareAsc = (left: BookingRecord, right: BookingRecord) =>
		left.appointmentDate.localeCompare(right.appointmentDate);

	const compareDesc = (left: BookingRecord, right: BookingRecord) =>
		right.appointmentDate.localeCompare(left.appointmentDate);

	const isPast = (dateTime: string) => parseDateTime(dateTime).getTime() < Date.now();

	const isSameDay = (dateTime: string, target: Date) => {
		const current = parseDateTime(dateTime);
		return (
			current.getFullYear() === target.getFullYear() &&
			current.getMonth() === target.getMonth() &&
			current.getDate() === target.getDate()
		);
	};

	const isToday = (dateTime: string) => isSameDay(dateTime, new Date());

	const isTomorrow = (dateTime: string) => {
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
		return isSameDay(dateTime, tomorrow);
	};

	const formatDate = (dateTime: string) =>
		parseDateTime(dateTime).toLocaleDateString('zh-TW', {
			month: 'short',
			day: 'numeric',
			weekday: 'short'
		});

	const todayHeading = new Intl.DateTimeFormat('zh-TW', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		weekday: 'long'
	}).format(new Date());

	const formatTime = (dateTime: string) => dateTime.split('T')[1] || '';

	const formatServiceSummary = (serviceStats: DashboardStats['day']['serviceStats']) => {
		if (serviceStats.length === 0) return '目前沒有預約服務項目';
		return serviceStats
			.slice(0, 3)
			.map((item) => `${item.serviceType} ${item.count}`)
			.join(' ・ ');
	};

	const formatTimeUntil = (dateTime: string) => {
		const diffMinutes = Math.max(
			0,
			Math.round((parseDateTime(dateTime).getTime() - Date.now()) / (60 * 1000))
		);

		if (diffMinutes < 1) return '現在';
		if (diffMinutes < 60) return `${diffMinutes} 分鐘後`;

		const hours = Math.floor(diffMinutes / 60);
		const minutes = diffMinutes % 60;

		if (hours >= 24) {
			const days = Math.floor(hours / 24);
			const remainingHours = hours % 24;
			return remainingHours === 0 ? `${days} 天後` : `${days} 天 ${remainingHours} 小時後`;
		}

		return minutes === 0 ? `${hours} 小時後` : `${hours} 小時 ${minutes} 分後`;
	};

	const getEndTime = (dateTime: string, durationMinutes: number) => {
		const start = parseDateTime(dateTime);
		const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
		return end.toLocaleTimeString('zh-TW', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
	};

	const getDayLabel = (dateTime: string) => {
		if (isToday(dateTime)) return '今天';
		if (isTomorrow(dateTime)) return '明天';
		return formatDate(dateTime);
	};

	const groupBookingsByDay = (input: BookingRecord[]): BookingDayGroup[] => {
		const groups: BookingDayGroup[] = [];

		for (const record of input) {
			const key = record.appointmentDate.split('T')[0] || record.appointmentDate;
			const current = groups[groups.length - 1];

			if (current && current.key === key) {
				current.records.push(record);
				continue;
			}

			groups.push({
				key,
				label: getDayLabel(record.appointmentDate),
				records: [record]
			});
		}

		return groups;
	};

	const stopPolling = () => {
		if (interval) clearInterval(interval);
		interval = null;
	};

	const startPolling = () => {
		stopPolling();
		interval = setInterval(refreshBookings, 30000);
	};

	const syncSession = async (accessToken: string) => {
		if (!accessToken) {
			throw new Error('缺少 LINE access token，請重新登入後再試。');
		}

		const res = await fetch('/api/auth/session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ accessToken })
		});
		const result = (await res.json()) as { success: boolean; message?: string };

		if (!res.ok || !result.success) {
			throw new Error(result.message || 'LINE 驗證失敗');
		}
	};

	const refreshBookings = async () => {
		if (authState !== 'authorized') return;

		try {
			const res = await fetch('/api/admin/bookings', {
				headers: { 'Cache-Control': 'no-store' }
			});
			const result = (await res.json()) as AdminBookingsResponse;

			if (!res.ok || !result.success) {
				throw new Error(result.message || '後台資料更新失敗');
			}

			records = result.records || [];
			stats = result.stats || null;
			error = '';
		} catch (err) {
			error = err instanceof Error ? err.message : '後台資料更新失敗';
			stopPolling();
		}
	};

	onMount(async () => {
		isMounted = true;

		try {
			const liffModule = await import('@line/liff');
			const liff = liffModule.default;

			await liff.init({ liffId });

			if (!liff.isLoggedIn()) {
				if (authState === 'needs-session') {
					liff.login({ redirectUri: window.location.href });
				}
				return;
			}

			profile = await liff.getProfile();

			if (authState === 'needs-session') {
				loading = true;
				syncingSession = true;
				await syncSession(liff.getAccessToken() || '');
				await goto(resolve('/admin'), {
					replaceState: true,
					invalidateAll: true,
					noScroll: true
				});
				return;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : '管理員驗證失敗';
		} finally {
			if (authState === 'needs-session') {
				loading = false;
				syncingSession = false;
			}
		}
	});

	onDestroy(() => {
		isMounted = false;
		stopPolling();
	});

	$effect(() => {
		authState = data.authState;
		records = [...data.records];
		stats = data.stats;

		if (authState !== 'needs-session') {
			loading = false;
			syncingSession = false;
		}

		if (authState !== 'authorized') {
			stopPolling();
		}
	});

	$effect(() => {
		if (!isMounted) return;

		if (authState === 'authorized') {
			startPolling();
			return;
		}

		stopPolling();
	});

	const confirmedBookings = $derived(
		records.filter((record) => record.status === 'confirmed').sort(compareAsc)
	);

	const upcomingBookings = $derived(
		confirmedBookings.filter((record) => !isPast(record.appointmentDate)).sort(compareAsc)
	);

	const todayBookings = $derived(
		upcomingBookings.filter((record) => isToday(record.appointmentDate))
	);

	const laterUpcomingBookings = $derived(
		upcomingBookings.filter((record) => !isToday(record.appointmentDate))
	);

	const nextBooking = $derived(upcomingBookings[0] ?? null);
	const upcomingDayGroups = $derived(groupBookingsByDay(laterUpcomingBookings));

	const pastBookings = $derived(
		confirmedBookings.filter((record) => isPast(record.appointmentDate)).sort(compareDesc)
	);

	const cancelledBookings = $derived(
		records.filter((record) => record.status === 'cancelled').sort(compareDesc)
	);

	const todayOverview = $derived({
		total: records.filter((record) => isToday(record.appointmentDate)).length,
		upcoming: todayBookings.length,
		finished: confirmedBookings.filter(
			(record) => isToday(record.appointmentDate) && isPast(record.appointmentDate)
		).length,
		cancelled: cancelledBookings.filter((record) => isToday(record.appointmentDate)).length
	});
</script>

<svelte:head>
	<title>管理後台 — 五十郎 檔案室</title>
</svelte:head>

<div
	class="min-h-screen bg-[linear-gradient(160deg,#f5f0ea_0%,#eee6dc_52%,#f8f4ee_100%)] pb-20 text-[#2C302E] selection:bg-[#8F9E91] selection:text-white"
>
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(201,169,154,0.18),_transparent_58%)]"
	></div>

	<header class="sticky top-0 z-20 border-b border-white/50 bg-[#f7f1eb]/85 backdrop-blur-xl">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
			<div class="flex items-center gap-3">
				<div
					class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8F9E91] text-lg font-semibold text-white shadow-[0_12px_30px_rgba(143,158,145,0.22)]"
				>
					五
				</div>
				<div>
					<p class="text-[11px] tracking-[0.28em] text-[#8E857D] uppercase">管理後台</p>
					<h1
						class="font-serif text-xl font-semibold tracking-[0.04em]"
						style="font-family: 'Playfair Display', serif;"
					>
						五十郎 檔案室
					</h1>
				</div>
			</div>

			<div class="flex items-center gap-3">
				{#if profile?.pictureUrl}
					<img
						src={profile.pictureUrl}
						alt="管理員頭像"
						class="hidden h-10 w-10 rounded-full border border-white/70 object-cover shadow-sm sm:block"
					/>
				{/if}
				<div
					class="rounded-full border border-[#d9cec3] bg-white/80 px-3 py-2 text-right shadow-sm"
				>
					<p class="text-[11px] tracking-[0.2em] text-[#9b9086]">
						{authState === 'authorized'
							? '已驗證'
							: authState === 'forbidden'
								? '拒絕存取'
								: '驗證中'}
					</p>
					<p class="text-sm font-medium text-[#5c554f]">
						{data.adminName || profile?.displayName || 'LINE 管理員'}
					</p>
				</div>
			</div>
		</div>
	</header>

	<main class="relative mx-auto mt-6 max-w-6xl px-5 md:px-8">
		{#if authState === 'needs-session' && loading}
			<div
				class="rounded-[32px] border border-white/60 bg-white/70 px-6 py-16 text-center shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl"
				in:fade
			>
				<div
					class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#ece2d8]"
				>
					<div
						class="h-7 w-7 animate-spin rounded-full border-[3px] border-[#8F9E91] border-t-transparent"
					></div>
				</div>
				<h2 class="text-xl font-semibold text-[#4c4640]">正在驗證管理員身分</h2>
				<p class="mx-auto mt-3 max-w-md text-sm leading-7 text-[#786f68]">
					系統會先透過 LINE 完成身分同步，再進入管理後台。
				</p>
				{#if syncingSession}
					<p class="mt-4 text-xs tracking-[0.2em] text-[#9b9086]">SYNCING SESSION</p>
				{/if}
			</div>
		{:else if authState === 'forbidden'}
			<div
				class="rounded-[32px] border border-[#ecd6d2] bg-white/80 px-6 py-14 shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl"
				in:scale={{ duration: 250 }}
			>
				<div class="mx-auto flex max-w-lg flex-col items-center text-center">
					<div
						class="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#f8ebe8] text-[#b08080]"
					>
						<svg
							class="h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.6"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v2m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.33 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<h2 class="text-2xl font-semibold text-[#4c4640]">這個帳號沒有管理員權限</h2>
					<p class="mt-3 text-sm leading-7 text-[#786f68]">
						如果你已經加入白名單，請確認目前使用的是同一個 LINE 帳號，再重新打開後台。
					</p>
					<div class="mt-6 rounded-2xl border border-[#eadfd4] bg-[#f9f4ef] px-4 py-3 text-left">
						<p class="text-[11px] tracking-[0.24em] text-[#9b9086] uppercase">LINE User ID</p>
						<p class="mt-1 font-mono text-sm break-all text-[#5c554f]">{data.lineUserId}</p>
					</div>
				</div>
			</div>
		{:else if authState === 'authorized'}
			<section
				class="rounded-[30px] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.78),rgba(246,239,232,0.92))] p-5 shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl md:p-6"
				in:fly={{ y: 18, duration: 350, easing: cubicOut }}
			>
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-lg font-semibold text-[#453f3a] md:text-xl">{todayHeading}</h2>
					{#if error}
						<span
							class="rounded-full border border-[#ecd6d2] bg-[#fbefed] px-3 py-1 text-xs font-medium text-[#a06f6f]"
						>
							更新失敗
						</span>
					{/if}
				</div>

				<div class="mt-4 flex gap-2 overflow-x-auto pb-1">
					<button
						type="button"
						class={`shrink-0 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
							activeTab === 'today'
								? 'bg-[#8F9E91] text-white'
								: 'border border-[#dfd3c8] bg-white/82 text-[#5f5750]'
						}`}
						onclick={() => (activeTab = 'today')}
					>
						今日 {todayOverview.total}
					</button>
					<button
						type="button"
						class={`shrink-0 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
							activeTab === 'future'
								? 'bg-[#8F9E91] text-white'
								: 'border border-[#dfd3c8] bg-white/82 text-[#5f5750]'
						}`}
						onclick={() => (activeTab = 'future')}
					>
						接下來 {laterUpcomingBookings.length}
					</button>
					<button
						type="button"
						class={`shrink-0 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
							activeTab === 'stats'
								? 'bg-[#8F9E91] text-white'
								: 'border border-[#dfd3c8] bg-white/82 text-[#5f5750]'
						}`}
						onclick={() => (activeTab = 'stats')}
					>
						統計
					</button>
					<button
						type="button"
						class={`shrink-0 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
							activeTab === 'records'
								? 'bg-[#8F9E91] text-white'
								: 'border border-[#dfd3c8] bg-white/82 text-[#5f5750]'
						}`}
						onclick={() => (activeTab = 'records')}
					>
						紀錄 {pastBookings.length + cancelledBookings.length}
					</button>
				</div>

				{#if error}
					<div
						class="mt-4 rounded-[22px] border border-[#ecd6d2] bg-white/82 px-4 py-3 text-sm text-[#8f5f5f] shadow-sm"
						in:fade
					>
						{error}
					</div>
				{/if}
			</section>

			{#if activeTab === 'today'}
				<div class="mt-6 grid gap-3 sm:grid-cols-3">
					<div class="rounded-[24px] border border-[#e3eadf] bg-[#f6faf4]/92 p-4 shadow-sm">
						<p class="text-xs tracking-[0.18em] text-[#7f8d7d]">待服務</p>
						<p class="mt-3 text-3xl font-semibold text-[#61705f]">{todayOverview.upcoming}</p>
					</div>
					<div class="rounded-[24px] border border-[#ece3d9] bg-white/82 p-4 shadow-sm">
						<p class="text-xs tracking-[0.18em] text-[#9b9086]">已過時間</p>
						<p class="mt-3 text-3xl font-semibold text-[#4c4640]">{todayOverview.finished}</p>
					</div>
					<div class="rounded-[24px] border border-[#eeddd8] bg-[#fbf4f2]/92 p-4 shadow-sm">
						<p class="text-xs tracking-[0.18em] text-[#b08080]">已取消</p>
						<p class="mt-3 text-3xl font-semibold text-[#9f6d6d]">{todayOverview.cancelled}</p>
					</div>
				</div>

				<section
					class="mt-6 rounded-[30px] border border-white/60 bg-white/78 p-5 shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl md:p-6"
					in:fly={{ y: 18, duration: 360, easing: cubicOut }}
				>
					<div class="flex items-center justify-between gap-3">
						<h2 class="text-xl font-semibold text-[#4c4640]">下一位</h2>
						{#if nextBooking}
							<span class="text-sm font-medium text-[#71806f]">
								{formatTimeUntil(nextBooking.appointmentDate)}
							</span>
						{/if}
					</div>

					{#if nextBooking}
						<div class="mt-4 rounded-[24px] border border-[#ece3d9] bg-[#fcfaf7]/86 p-4 shadow-sm">
							<div class="grid gap-4 md:grid-cols-[6rem_minmax(0,1fr)_auto] md:items-center">
								<div class="rounded-[20px] bg-[#f1ebe4] px-3 py-4 text-center">
									<p class="text-2xl font-semibold text-[#4c4640]">
										{formatTime(nextBooking.appointmentDate)}
									</p>
								</div>
								<div>
									<h3 class="text-xl font-semibold text-[#47413c]">
										{nextBooking.customerName}
									</h3>
									<p class="mt-1 text-sm text-[#7a7169]">{nextBooking.serviceType}</p>
								</div>
								<div class="text-sm text-[#5f5750] md:text-right">
									<p>{getDayLabel(nextBooking.appointmentDate)}</p>
									<p class="mt-1">
										至 {getEndTime(nextBooking.appointmentDate, nextBooking.durationMinutes)}
									</p>
								</div>
							</div>
						</div>
					{:else}
						<div
							class="mt-4 rounded-[24px] border border-dashed border-[#ded2c6] bg-[#fbf7f2]/80 px-5 py-8 text-center text-[#7f766f]"
						>
							目前沒有預約
						</div>
					{/if}
				</section>

				<section
					class="mt-6 rounded-[30px] border border-white/60 bg-white/78 p-5 shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl md:p-6"
					in:fly={{ y: 18, duration: 350, easing: cubicOut }}
				>
					<div class="flex items-center justify-between gap-3">
						<h2 class="text-xl font-semibold text-[#4c4640]">今日預約</h2>
						<span class="text-sm text-[#857c74]">{todayBookings.length} 筆</span>
					</div>

					{#if todayBookings.length > 0}
						<div class="mt-4 space-y-3">
							{#each todayBookings as record (record.id)}
								<div
									class="rounded-[24px] border border-[#ece3d9] bg-[#fcfaf7]/86 p-4 shadow-sm"
									in:fade
								>
									<div class="grid gap-3 md:grid-cols-[6rem_minmax(0,1fr)_auto] md:items-center">
										<div class="rounded-[20px] bg-[#f1ebe4] px-3 py-3 text-center">
											<p class="text-2xl font-semibold text-[#4c4640]">
												{formatTime(record.appointmentDate)}
											</p>
										</div>
										<div>
											<h3 class="text-lg font-semibold text-[#47413c]">{record.customerName}</h3>
											<p class="mt-1 text-sm text-[#7a7169]">{record.serviceType}</p>
										</div>
										<div class="text-sm text-[#5f5750] md:text-right">
											<p>{record.durationMinutes} 分鐘</p>
											<p class="mt-1">
												至 {getEndTime(record.appointmentDate, record.durationMinutes)}
											</p>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div
							class="mt-4 rounded-[24px] border border-dashed border-[#ded2c6] bg-[#fbf7f2]/80 px-5 py-8 text-center text-[#7f766f]"
						>
							目前沒有預約
						</div>
					{/if}
				</section>
			{:else if activeTab === 'future'}
				<section
					class="mt-6 rounded-[30px] border border-white/60 bg-white/78 p-5 shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl md:p-6"
					in:fly={{ y: 18, duration: 380, easing: cubicOut }}
				>
					<div class="flex items-center justify-between gap-3">
						<h2 class="text-xl font-semibold text-[#4c4640]">接下來</h2>
						<span class="text-sm text-[#857c74]">{laterUpcomingBookings.length} 筆</span>
					</div>

					{#if upcomingDayGroups.length > 0}
						<div class="mt-4 space-y-4">
							{#each upcomingDayGroups as group (group.key)}
								<div class="rounded-[24px] border border-[#ece3d9] bg-[#fcfaf7]/86 p-4 shadow-sm">
									<div class="flex items-center justify-between gap-3">
										<h3 class="text-base font-semibold text-[#47413c]">{group.label}</h3>
										<span class="text-xs text-[#8d847c]">{group.records.length} 筆</span>
									</div>
									<div class="mt-4 space-y-3">
										{#each group.records as record (record.id)}
											<div class="flex items-start justify-between gap-3 text-sm">
												<div>
													<p class="font-medium text-[#5c554f]">
														{formatTime(record.appointmentDate)}
														{record.customerName}
													</p>
													<p class="mt-1 text-[#7a7169]">{record.serviceType}</p>
												</div>
												<span class="whitespace-nowrap text-[#8d847c]">
													{record.durationMinutes} 分
												</span>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div
							class="mt-4 rounded-[24px] border border-dashed border-[#ded2c6] bg-[#fbf7f2]/80 px-5 py-8 text-center text-[#7f766f]"
						>
							目前沒有預約
						</div>
					{/if}
				</section>
			{:else if activeTab === 'stats'}
				<section
					class="mt-6 rounded-[30px] border border-white/60 bg-white/78 p-5 shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl md:p-6"
					in:fly={{ y: 18, duration: 350, easing: cubicOut }}
				>
					<h2 class="text-xl font-semibold text-[#4c4640]">預約統計</h2>

					{#if stats}
						<div class="mt-4 grid gap-3 lg:grid-cols-3">
							<div class="rounded-[22px] border border-[#e4d8cd] bg-white/82 p-4 shadow-sm">
								<p class="text-[11px] tracking-[0.22em] text-[#9b9086] uppercase">
									{stats.day.label}
								</p>
								<p class="mt-2 text-2xl font-semibold text-[#4c4640]">{stats.day.visitorCount}</p>
								<p class="mt-3 text-sm text-[#786f68]">
									{formatServiceSummary(stats.day.serviceStats)}
								</p>
							</div>
							<div class="rounded-[22px] border border-[#ece3d9] bg-[#fcfaf7]/85 p-4 shadow-sm">
								<p class="text-[11px] tracking-[0.22em] text-[#9b9086] uppercase">
									{stats.week.label}
								</p>
								<p class="mt-2 text-2xl font-semibold text-[#4c4640]">{stats.week.visitorCount}</p>
								<p class="mt-3 text-sm text-[#786f68]">
									{formatServiceSummary(stats.week.serviceStats)}
								</p>
							</div>
							<div class="rounded-[22px] border border-[#ece3d9] bg-[#fcfaf7]/85 p-4 shadow-sm">
								<p class="text-[11px] tracking-[0.22em] text-[#9b9086] uppercase">
									{stats.month.label}
								</p>
								<p class="mt-2 text-2xl font-semibold text-[#4c4640]">{stats.month.visitorCount}</p>
								<p class="mt-3 text-sm text-[#786f68]">
									{formatServiceSummary(stats.month.serviceStats)}
								</p>
							</div>
						</div>
					{:else}
						<div
							class="mt-4 rounded-[24px] border border-dashed border-[#ddd2c7] bg-white/65 p-6 text-center text-[#7f766f]"
						>
							統計資料整理中
						</div>
					{/if}
				</section>
			{:else if activeTab === 'records'}
				<div class="mt-6 grid gap-4 xl:grid-cols-2">
					<section
						class="rounded-[30px] border border-white/60 bg-white/78 p-5 shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl md:p-6"
						in:fly={{ y: 18, duration: 350, easing: cubicOut }}
					>
						<div class="flex items-center justify-between gap-3">
							<h2 class="text-xl font-semibold text-[#4c4640]">歷史</h2>
							<span class="text-sm text-[#857c74]">{pastBookings.length} 筆</span>
						</div>

						{#if pastBookings.length > 0}
							<div class="mt-4 space-y-3">
								{#each pastBookings as record (record.id)}
									<div
										class="rounded-[22px] border border-[#ece3d9] bg-[#fcfaf7]/84 p-4 shadow-sm"
										in:fade
									>
										<div class="flex items-start justify-between gap-3">
											<div>
												<h3 class="text-base font-semibold text-[#59524c]">
													{record.customerName}
												</h3>
												<p class="mt-1 text-sm text-[#7f766f]">{record.serviceType}</p>
											</div>
											<span class="text-sm text-[#857c74]"
												>{formatTime(record.appointmentDate)}</span
											>
										</div>
										<p class="mt-3 text-sm text-[#6d655e]">
											{formatDate(record.appointmentDate)} · {record.durationMinutes} 分鐘
										</p>
									</div>
								{/each}
							</div>
						{:else}
							<div
								class="mt-4 rounded-[22px] border border-dashed border-[#ded2c6] bg-white/65 px-4 py-8 text-center text-[#7f766f]"
							>
								目前沒有紀錄
							</div>
						{/if}
					</section>

					<section
						class="rounded-[30px] border border-white/60 bg-white/78 p-5 shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl md:p-6"
						in:fly={{ y: 18, duration: 380, easing: cubicOut }}
					>
						<div class="flex items-center justify-between gap-3">
							<h2 class="text-xl font-semibold text-[#5e4e4c]">取消</h2>
							<span class="text-sm text-[#a06f6f]">{cancelledBookings.length} 筆</span>
						</div>

						{#if cancelledBookings.length > 0}
							<div class="mt-4 space-y-3">
								{#each cancelledBookings as record (record.id)}
									<div
										class="rounded-[22px] border border-[#f0dfdb] bg-[#fbf5f4]/88 p-4 shadow-sm"
										in:fade
									>
										<div class="flex items-start justify-between gap-3">
											<div>
												<h3 class="text-base font-semibold text-[#6a5a58] line-through">
													{record.customerName}
												</h3>
												<p class="mt-1 text-sm text-[#8c7b79]">{record.serviceType}</p>
											</div>
											<span class="text-sm text-[#a06f6f]"
												>{formatTime(record.appointmentDate)}</span
											>
										</div>
										<p class="mt-3 text-sm text-[#7a6967]">{formatDate(record.appointmentDate)}</p>
									</div>
								{/each}
							</div>
						{:else}
							<div
								class="mt-4 rounded-[22px] border border-dashed border-[#e6d3cf] bg-white/65 px-4 py-8 text-center text-[#7f766f]"
							>
								目前沒有紀錄
							</div>
						{/if}
					</section>
				</div>
			{/if}
		{:else}
			<div
				class="rounded-[32px] border border-white/60 bg-white/70 px-6 py-16 text-center shadow-[0_24px_60px_rgba(74,69,64,0.08)] backdrop-blur-xl"
				in:fade
			>
				<div
					class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#ece2d8]"
				>
					<div
						class="h-7 w-7 animate-spin rounded-full border-[3px] border-[#8F9E91] border-t-transparent"
					></div>
				</div>
				<h2 class="text-xl font-semibold text-[#4c4640]">正在確認管理員權限</h2>
				<p class="mx-auto mt-3 max-w-md text-sm leading-7 text-[#786f68]">
					在確認完成前，後台資料不會顯示。
				</p>
			</div>
		{/if}
	</main>
</div>

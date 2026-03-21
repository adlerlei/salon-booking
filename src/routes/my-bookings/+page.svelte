<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide, scale } from 'svelte/transition';

	let profile: any = null;
	let idToken = '';
	let error = '';
	let bookings: any[] = [];
	let loading = true;

	// For cancellation
	let cancellingId: string | null = null;
	let showConfirmModal = false;
	let appointmentToCancel: any = null;

	const syncSession = async () => {
		if (!idToken) {
			throw new Error('缺少 LINE idToken，請確認 LIFF openid 權限已開啟。');
		}

		const res = await fetch('/api/auth/session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ idToken })
		});
		const data = (await res.json()) as { success: boolean; message?: string };
		if (!res.ok || !data.success) {
			throw new Error(data.message || 'LINE 驗證失敗');
		}
	};

	onMount(async () => {
		try {
			const liffModule = await import('@line/liff');
			const liff = liffModule.default;

			await liff.init({ liffId: '2009342816-q0rukZhq' });
			if (liff.isLoggedIn()) {
				profile = await liff.getProfile();
				idToken = liff.getIDToken() || '';
				await syncSession();
				await fetchBookings();
			} else {
				liff.login();
			}
		} catch (err: any) {
			error = err.message;
			loading = false;
		}
	});

	const fetchBookings = async () => {
		try {
			const res = await fetch('/api/bookings');
			const data = (await res.json()) as { bookings: any[] };
			bookings = data.bookings || [];
		} catch (err: any) {
			console.error('Failed to fetch bookings:', err);
		} finally {
			loading = false;
		}
	};

	const cancelBooking = async (appointmentId: string) => {
		cancellingId = appointmentId;
		try {
			const res = await fetch('/api/bookings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ appointmentId })
			});
			const result = (await res.json()) as { success: boolean };
			if (result.success) {
				// 更新本地狀態，不需要重新載入頁面
				bookings = bookings.map((b) =>
					b.id === appointmentId ? { ...b, status: 'cancelled' } : b
				);
			}
		} catch (err: any) {
			console.error('Failed to cancel booking:', err);
		} finally {
			cancellingId = null;
			closeConfirmModal();
		}
	};

	// 處理日期格式 (2026-03-15T14:30 -> 2026/03/15 (日) 14:30)
	const formatDateTime = (dateStr: string) => {
		try {
			const [datePart, timePart] = dateStr.split('T');
			const [y, m, d] = datePart.split('-');
			const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
			const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
			return `${y}/${m}/${d} (${weekday}) ${timePart}`;
		} catch {
			return dateStr;
		}
	};

	const isPast = (dateStr: string) => {
		try {
			const [datePart, timePart] = dateStr.split('T');
			const [y, m, d] = datePart.split('-');
			const [hh, mm] = timePart.split(':');
			const appDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(hh), parseInt(mm));
			return appDate.getTime() < new Date().getTime();
		} catch {
			return false;
		}
	};

	// Categorize and sort bookings
	// 即將到來：最接近到期的排最上面（升序）
	$: activeBookings = bookings
		.filter((b) => !isPast(b.appointmentDate) && b.status === 'confirmed')
		.sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));
	// 歷史紀錄：最近結束/取消的排最上面（降序）
	$: pastOrCancelledBookings = bookings
		.filter((b) => isPast(b.appointmentDate) || b.status === 'cancelled')
		.sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));

	const openCancelConfirm = (booking: any) => {
		appointmentToCancel = booking;
		showConfirmModal = true;
	};

	const closeConfirmModal = () => {
		showConfirmModal = false;
		appointmentToCancel = null;
	};
</script>

<svelte:head>
	<title>我的預約 — 五十郎 專屬預約</title>
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] pb-24 font-sans text-[#2C302E] selection:bg-[#8F9E91] selection:text-white">
	<!-- Header -->
	<header class="sticky top-0 z-20 flex items-center justify-between bg-white/90 px-6 py-5 shadow-sm backdrop-blur-md">
		<div class="flex items-center gap-3">
			<a href="/" aria-label="返回首頁" class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<h1 class="font-serif text-xl font-semibold tracking-wide" style="font-family: 'Playfair Display', serif;">
				我的預約
			</h1>
		</div>
		{#if profile}
			<img src={profile.pictureUrl} alt="Avatar" class="h-8 w-8 rounded-full border border-gray-100 shadow-sm" />
		{/if}
	</header>

	<main class="mx-auto mt-6 max-w-lg px-5">
		{#if error}
			<div class="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
				<p class="font-medium">發生錯誤</p>
				<p class="text-sm opacity-90">{error}</p>
			</div>
		{:else if loading}
			<div class="flex flex-col items-center justify-center py-20 text-gray-400">
				<div class="mb-4 h-8 w-8 animate-spin rounded-full border-3 border-[#8F9E91] border-t-transparent"></div>
				<p class="text-sm font-medium tracking-wide">資料載入中...</p>
			</div>
		{:else if bookings.length === 0}
			<div class="flex flex-col items-center justify-center py-24 text-gray-400" in:fade>
				<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
					<svg class="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
				</div>
				<p class="text-base font-medium">目前沒有任何預約紀錄</p>
				<a href="/" class="mt-6 rounded-xl bg-[#8F9E91] px-8 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#7A8A7C]">
					立即預約
				</a>
			</div>
		{:else}
			<div in:fade={{ duration: 300 }}>
				<!-- 即將到來的預約 -->
				{#if activeBookings.length > 0}
					<h2 class="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-800">
						<span class="inline-block h-4 w-1 rounded-full bg-[#8F9E91]"></span>
						即將到來
					</h2>
					<div class="mb-8 space-y-4">
						{#each activeBookings as booking (booking.id)}
							<div class="relative overflow-hidden rounded-2xl border border-[#8F9E91]/20 bg-white shadow-sm transition-all hover:shadow-[#8F9E91]/10" in:slide>
								<!-- Left color accent -->
								<div class="absolute bottom-0 left-0 top-0 w-1 bg-[#8F9E91]"></div>
								
								<div class="p-5 pl-6">
									<div class="mb-3 flex items-start justify-between">
										<div>
											<h3 class="font-semibold text-[#2C302E]">{booking.serviceType}</h3>
											<p class="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#8F9E91]">
												<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
													<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												{formatDateTime(booking.appointmentDate)}
											</p>
										</div>
										<span class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-600 border border-emerald-100/50">
											已確認
										</span>
									</div>
									<div class="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
										<p class="text-xs text-gray-400">所需時間約 {booking.durationMinutes} 分鐘</p>
										<button 
											type="button" 
											on:click={() => openCancelConfirm(booking)}
											disabled={cancellingId === booking.id}
											class="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 border border-gray-200"
										>
											取消預約
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- 歷史與已取消紀錄 -->
				{#if pastOrCancelledBookings.length > 0}
					<h2 class="mb-4 flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-500 mt-10">
						紀錄
					</h2>
					<div class="space-y-3">
						{#each pastOrCancelledBookings as booking (booking.id)}
							<div class="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all opacity-80" in:slide>
								<div>
									<h3 class="text-sm font-medium text-gray-600" class:line-through={booking.status === 'cancelled'}>{booking.serviceType}</h3>
									<p class="mt-0.5 text-xs text-gray-400">{formatDateTime(booking.appointmentDate)}</p>
								</div>
								{#if booking.status === 'cancelled'}
									<span class="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500">已取消</span>
								{:else}
									<span class="rounded-lg px-2.5 py-1 text-[11px] font-medium text-gray-400">已結束</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>

<!-- 取消確認 Modal -->
{#if showConfirmModal && appointmentToCancel}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div 
		class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
		in:fade={{ duration: 200 }} 
		out:fade={{ duration: 200 }}
		on:click={closeConfirmModal}
	></div>
	
	<div 
		class="fixed left-1/2 top-1/2 z-50 w-full max-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl"
		in:scale={{ duration: 300, start: 0.95 }}
		out:scale={{ duration: 200, start: 0.95 }}
	>
		<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
			<svg class="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
		</div>
		<h3 class="mb-2 text-center text-lg font-bold text-gray-900">確定要取消預約？</h3>
		<p class="mb-6 text-center text-sm leading-relaxed text-gray-500">
			取消後，該時段將會釋出給其他顧客。<br>此操作無法復原。
		</p>
		
		<div class="flex flex-col gap-2.5">
			<button 
				type="button"
				on:click={() => cancelBooking(appointmentToCancel.id)}
				class="w-full rounded-xl bg-red-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 disabled:opacity-50"
				disabled={cancellingId !== null}
			>
				{#if cancellingId === appointmentToCancel?.id}
					<div class="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
				{:else}
					確定取消
				{/if}
			</button>
			<button 
				type="button" 
				on:click={closeConfirmModal}
				class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
				disabled={cancellingId !== null}
			>
				保留預約
			</button>
		</div>
	</div>
{/if}

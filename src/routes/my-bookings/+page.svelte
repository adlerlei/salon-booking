<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide, scale } from 'svelte/transition';
	import type { PageData } from './$types';

	export let data: PageData;

	let profile: any = null;
	let webName = '';
	let accessToken = '';
	let error = '';
	let bookings: any[] = [];
	let loading = true;
	let authMode: 'loading' | 'line' | 'web' = 'loading';
	let googleReady = false;

	// For cancellation
	let cancellingId: string | null = null;
	let showConfirmModal = false;
	let appointmentToCancel: any = null;

	$: displayName = profile?.displayName || webName || data.auth?.name || '';
	$: isAuthed = Boolean(profile || data.auth || webName);

	const syncLineSession = async () => {
		if (!accessToken) {
			throw new Error('缺少 LINE access token，請重新登入後再試。');
		}

		const res = await fetch('/api/auth/session', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ accessToken })
		});
		const json = (await res.json()) as { success: boolean; message?: string };
		if (!res.ok || !json.success) {
			throw new Error(json.message || 'LINE 驗證失敗');
		}
	};

	const fetchBookings = async () => {
		try {
			const res = await fetch('/api/bookings');
			const json = (await res.json()) as { bookings: any[] };
			bookings = json.bookings || [];
		} catch (err: any) {
			console.error('Failed to fetch bookings:', err);
		} finally {
			loading = false;
		}
	};

	const loadGoogleButton = async (clientId: string) => {
		if (!clientId) return;
		await new Promise<void>((resolve, reject) => {
			if (document.getElementById('google-identity')) {
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.id = 'google-identity';
			script.src = 'https://accounts.google.com/gsi/client';
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Google 登入元件載入失敗'));
			document.head.appendChild(script);
		});

		const google = (window as any).google;
		if (!google?.accounts?.id) return;

		google.accounts.id.initialize({
			client_id: clientId,
			callback: async (response: { credential: string }) => {
				try {
					error = '';
					loading = true;
					const res = await fetch('/api/auth/google', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ idToken: response.credential })
					});
					const json = (await res.json()) as {
						success: boolean;
						message?: string;
						name?: string;
					};
					if (!res.ok || !json.success) {
						throw new Error(json.message || 'Google 登入失敗');
					}
					webName = json.name || 'Google 用戶';
					await fetchBookings();
				} catch (err: any) {
					error = err.message || 'Google 登入失敗';
					loading = false;
				}
			}
		});

		const mount = document.getElementById('google-signin-button');
		if (mount) {
			mount.innerHTML = '';
			google.accounts.id.renderButton(mount, {
				theme: 'outline',
				size: 'large',
				width: 320,
				text: 'continue_with',
				shape: 'rectangular'
			});
			googleReady = true;
		}
	};

	onMount(async () => {
		if (data.auth) {
			webName =
				data.auth.name ||
				(data.auth.provider === 'guest'
					? '訪客'
					: data.auth.provider === 'google'
						? 'Google 用戶'
						: 'LINE 使用者');
			authMode = data.auth.provider === 'line' ? 'line' : 'web';
			await fetchBookings();
		}

		try {
			const liffModule = await import('@line/liff');
			const liff = liffModule.default;
			await liff.init({ liffId: '2009342816-q0rukZhq' });

			if (liff.isInClient()) {
				authMode = 'line';
				if (liff.isLoggedIn()) {
					profile = await liff.getProfile();
					accessToken = liff.getAccessToken() || '';
					await syncLineSession();
					await fetchBookings();
				} else {
					liff.login();
				}
				return;
			}

			if (liff.isLoggedIn()) {
				authMode = 'line';
				profile = await liff.getProfile();
				accessToken = liff.getAccessToken() || '';
				await syncLineSession();
				await fetchBookings();
				return;
			}

			authMode = 'web';
			if (!data.auth) {
				loading = false;
				if (data.googleEnabled && data.googleClientId) {
					await loadGoogleButton(data.googleClientId);
				}
			}
		} catch (err: any) {
			authMode = 'web';
			if (!data.auth) {
				loading = false;
				if (data.googleEnabled && data.googleClientId) {
					try {
						await loadGoogleButton(data.googleClientId);
					} catch (googleErr: any) {
						error = googleErr.message || err.message;
					}
				}
			}
		}
	});

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
		const now = new Date();
		const [datePart, timePart] = dateStr.split('T');
		const [y, m, d] = datePart.split('-').map(Number);
		const [hh, mm] = timePart.split(':').map(Number);
		const appointmentTime = new Date(y, m - 1, d, hh, mm);
		return appointmentTime < now;
	};

	const upcomingBookings = () =>
		bookings
			.filter((b) => !isPast(b.appointmentDate) && b.status === 'confirmed')
			.sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));

	const pastBookings = () =>
		bookings
			.filter((b) => isPast(b.appointmentDate) || b.status === 'cancelled')
			.sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate));

	const openConfirmModal = (booking: any) => {
		appointmentToCancel = booking;
		showConfirmModal = true;
	};

	const closeConfirmModal = () => {
		showConfirmModal = false;
		appointmentToCancel = null;
	};
</script>

<svelte:head>
	<title>我的預約 | Jo造型髮藝</title>
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] pb-20 font-sans text-[#2C302E]">
	<header class="sticky top-0 z-10 bg-white px-6 py-6 shadow-sm">
		<div class="mx-auto flex max-w-lg items-center justify-between">
			<h1 class="font-serif text-2xl font-semibold tracking-wide" style="font-family: 'Playfair Display', serif;">
				我的預約
			</h1>
			{#if displayName}
				<span class="text-sm text-gray-600">{displayName}</span>
			{/if}
		</div>
	</header>

	<main class="mx-auto mt-4 max-w-lg p-6">
		{#if authMode === 'loading' || (loading && isAuthed)}
			<div class="flex flex-col items-center justify-center py-20 text-gray-500">
				<div
					class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#8F9E91] border-t-transparent"
				></div>
				<p>載入中...</p>
			</div>
		{:else if error && !isAuthed}
			<div class="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
				<p class="font-medium">發生錯誤</p>
				<p class="text-sm opacity-90">{error}</p>
			</div>
		{:else if !isAuthed && authMode === 'web'}
			<div class="space-y-6 rounded-2xl border border-[#e6ddd3] bg-white p-6 shadow-sm">
				<div>
					<h2 class="text-lg font-semibold">查看我的預約</h2>
					<p class="mt-1 text-sm text-[#7f766f]">請使用當初預約時的登入方式。</p>
				</div>

				{#if error}
					<div class="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</div>
				{/if}

				{#if data.googleEnabled}
					<div class="space-y-2">
						<p class="text-xs font-medium tracking-wide text-[#61705f]">GOOGLE 登入</p>
						<div id="google-signin-button" class="flex justify-center"></div>
						{#if !googleReady}
							<p class="text-center text-xs text-[#9a918a]">Google 按鈕載入中…</p>
						{/if}
					</div>
				{:else}
					<p class="rounded-xl bg-[#f9f6f3] p-3 text-sm text-[#5c554f]">
						Google 登入尚未設定。若你是訪客預約，請用當初預約的同一個瀏覽器開啟此頁。
					</p>
				{/if}

				<p class="text-xs leading-relaxed text-[#9a918a]">
					訪客預約綁定瀏覽器 Session，無法只靠手機號碼在其他裝置查出預約；之後建議改用 Google
					登入。
				</p>
			</div>
		{:else}
			{#if upcomingBookings().length === 0 && pastBookings().length === 0}
				<div class="rounded-2xl border border-dashed border-[#e6ddd3] bg-white p-10 text-center text-[#7f766f]">
					目前沒有預約紀錄
				</div>
			{/if}

			{#if upcomingBookings().length > 0}
				<section class="mb-8 space-y-3" transition:fade>
					<h2 class="text-sm font-semibold tracking-wide text-[#61705f]">即將到來</h2>
					{#each upcomingBookings() as booking (booking.id)}
						<div class="rounded-2xl border border-[#e6ddd3] bg-white p-4 shadow-sm" transition:slide>
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3 class="text-sm font-medium">{booking.serviceType}</h3>
									<p class="mt-1 text-sm text-[#7f766f]">{formatDateTime(booking.appointmentDate)}</p>
									{#if booking.partySize > 1}
										<p class="mt-1 text-xs text-[#9a918a]">{booking.partySize} 人</p>
									{/if}
								</div>
								<button
									type="button"
									class="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600"
									on:click={() => openConfirmModal(booking)}
									disabled={cancellingId === booking.id}
								>
									取消
								</button>
							</div>
						</div>
					{/each}
				</section>
			{/if}

			{#if pastBookings().length > 0}
				<section class="space-y-3" transition:fade>
					<h2 class="text-sm font-semibold tracking-wide text-[#61705f]">歷史／已取消</h2>
					{#each pastBookings() as booking (booking.id)}
						<div class="rounded-2xl border border-[#eee7df] bg-[#fcfbfa] p-4" transition:slide>
							<div class="flex items-start justify-between gap-3">
								<div>
									<h3
										class="text-sm font-medium text-gray-600"
										class:line-through={booking.status === 'cancelled'}
									>
										{booking.serviceType}
									</h3>
									<p class="mt-1 text-sm text-[#9a918a]">{formatDateTime(booking.appointmentDate)}</p>
								</div>
								{#if booking.status === 'cancelled'}
									<span class="text-xs text-red-500">已取消</span>
								{/if}
							</div>
						</div>
					{/each}
				</section>
			{/if}
		{/if}
	</main>
</div>

{#if showConfirmModal && appointmentToCancel}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
		transition:fade
		on:click={closeConfirmModal}
		on:keydown={(e) => e.key === 'Escape' && closeConfirmModal()}
		role="presentation"
	>
		<div
			class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
			transition:scale
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<h3 class="text-lg font-semibold">確認取消預約？</h3>
			<p class="mt-2 text-sm text-[#7f766f]">
				{appointmentToCancel.serviceType}<br />
				{formatDateTime(appointmentToCancel.appointmentDate)}
			</p>
			<div class="mt-6 flex gap-3">
				<button
					type="button"
					class="flex-1 rounded-xl border border-[#e6ddd3] px-4 py-3 text-sm"
					on:click={closeConfirmModal}
				>
					返回
				</button>
				<button
					type="button"
					class="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm text-white"
					on:click={() => cancelBooking(appointmentToCancel.id)}
					disabled={cancellingId === appointmentToCancel.id}
				>
					{cancellingId === appointmentToCancel.id ? '取消中…' : '確認取消'}
				</button>
			</div>
		</div>
	</div>
{/if}

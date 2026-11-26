<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';
	import { salonServices } from '$lib/services';
	import type { PageData } from './$types';

	export let data: PageData;

	type AuthMode = 'loading' | 'line' | 'web';
	type WebProfile = {
		provider: 'google' | 'guest' | 'line';
		displayName: string;
		pictureUrl?: string;
		phone?: string;
		email?: string;
	};

	let authMode: AuthMode = 'loading';
	let profile: any = null;
	let webProfile: WebProfile | null = null;
	let accessToken = '';
	let googleIdToken = '';
	let guestPhone = '';
	let guestName = '';
	let guestSubmitting = false;
	let googleReady = false;
	let error = '';
	let isSubmitting = false;
	let isMarqueePaused = false;

	$: activeDisplayName =
		profile?.displayName || webProfile?.displayName || data.auth?.name || '';
	$: authProviderValue = profile
		? 'line'
		: webProfile?.provider || data.auth?.provider || '';
	$: canSubmitBooking = Boolean(
		(authProviderValue === 'line' && accessToken) ||
			(authProviderValue === 'google' && (googleIdToken || data.auth?.provider === 'google')) ||
			(authProviderValue === 'guest' &&
				(guestPhone || data.auth?.phone || webProfile?.phone)) ||
			data.auth
	);
	$: showBookingForm = Boolean(profile || webProfile || data.auth);

	const handleEnhance = () => {
		isSubmitting = true;
		return async ({ result }: { result: any }) => {
			if (result.type === 'success' && result.data?.success) {
				const d = result.data;
				const params = new URLSearchParams({
					service: d.service,
					date: d.date,
					name: d.name,
					duration: d.duration,
					partySize: d.partySize || '1'
				});
				await goto(`/booking-success?${params.toString()}`);
			} else {
				error = result.data?.message || '預約失敗，請稍後再試。';
				isSubmitting = false;
			}
		};
	};

	const applyServerAuth = () => {
		if (!data.auth) return;
		webProfile = {
			provider: data.auth.provider,
			displayName:
				data.auth.name ||
				(data.auth.provider === 'guest'
					? '訪客'
					: data.auth.provider === 'google'
						? 'Google 用戶'
						: 'LINE 使用者'),
			phone: data.auth.phone || undefined,
			email: data.auth.email || undefined
		};
		if (data.auth.phone) guestPhone = data.auth.phone;
		if (data.auth.name) guestName = data.auth.name;
	};

	const loadGoogleButton = async (clientId: string) => {
		if (!clientId || typeof window === 'undefined') return;
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
					const res = await fetch('/api/auth/google', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ idToken: response.credential })
					});
					const json = (await res.json()) as {
						success: boolean;
						message?: string;
						name?: string;
						email?: string;
					};
					if (!res.ok || !json.success) {
						throw new Error(json.message || 'Google 登入失敗');
					}
					googleIdToken = response.credential;
					webProfile = {
						provider: 'google',
						displayName: json.name || 'Google 用戶',
						email: json.email
					};
				} catch (err: any) {
					error = err.message || 'Google 登入失敗';
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

	const loadTurnstile = async (siteKey: string) => {
		if (!siteKey || typeof window === 'undefined') return;
		await new Promise<void>((resolve, reject) => {
			if (document.getElementById('cf-turnstile-script')) {
				resolve();
				return;
			}
			const script = document.createElement('script');
			script.id = 'cf-turnstile-script';
			script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
			script.async = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Turnstile 載入失敗'));
			document.head.appendChild(script);
		});

		const turnstile = (window as any).turnstile;
		const mount = document.getElementById('turnstile-guest');
		if (!turnstile || !mount) return;
		mount.innerHTML = '';
		turnstile.render(mount, {
			sitekey: siteKey,
			callback: (token: string) => {
				turnstileToken = token;
			},
			'expired-callback': () => {
				turnstileToken = '';
			}
		});
	};

	const submitGuestAuth = async () => {
		guestSubmitting = true;
		error = '';
		try {
			if (data.turnstileEnabled && !turnstileToken) {
				throw new Error('請先完成防機器人驗證');
			}
			const res = await fetch('/api/auth/guest', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone: guestPhone, name: guestName })
			});
			const json = (await res.json()) as {
				success: boolean;
				message?: string;
				name?: string;
				phone?: string;
			};
			if (!res.ok || !json.success) {
				throw new Error(json.message || '訪客驗證失敗');
			}
			webProfile = {
				provider: 'guest',
				displayName: json.name || '訪客',
				phone: json.phone
			};
		} catch (err: any) {
			error = err.message || '訪客驗證失敗';
		} finally {
			guestSubmitting = false;
		}
	};

	onMount(async () => {
		applyServerAuth();

		try {
			const res = await fetch('/api/closures');
			if (res.ok) {
				const json = (await res.json()) as { closures: Closure[] };
				freshClosures = json.closures;
			}
		} catch {}

		try {
			const liffModule = await import('@line/liff');
			const liff = liffModule.default;
			await liff.init({ liffId: '2009342816-q0rukZhq' });

			if (liff.isInClient()) {
				authMode = 'line';
				if (liff.isLoggedIn()) {
					profile = await liff.getProfile();
					accessToken = liff.getAccessToken() || '';
					await fetch('/api/auth/session', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ accessToken })
					});
				} else {
					liff.login();
				}
				return;
			}

			authMode = 'web';
			if (liff.isLoggedIn()) {
				profile = await liff.getProfile();
				accessToken = liff.getAccessToken() || '';
				authMode = 'line';
				await fetch('/api/auth/session', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ accessToken })
				});
				return;
			}

			if (!webProfile && data.googleEnabled && data.googleClientId) {
				await loadGoogleButton(data.googleClientId);
			}
			if (!webProfile && data.turnstileEnabled && data.turnstileSiteKey) {
				await loadTurnstile(data.turnstileSiteKey);
			}
		} catch (err: any) {
			authMode = 'web';
			if (!webProfile) {
				// 非 LINE 環境且 LIFF 初始化失敗時，改走網頁身分
				console.warn('LIFF init skipped for web booking:', err?.message || err);
			}
			if (data.googleEnabled && data.googleClientId) {
				try {
					await loadGoogleButton(data.googleClientId);
				} catch (googleErr: any) {
					error = googleErr.message || error;
				}
			}
			if (data.turnstileEnabled && data.turnstileSiteKey) {
				try {
					await loadTurnstile(data.turnstileSiteKey);
				} catch {
					// ignore; server will still enforce when configured
				}
			}
		}
	});

	const services = salonServices;
	let turnstileToken = '';

	// Party size and per-person service selection
	let partySize = 1;
	let selectedServices: ((typeof services)[0] | null)[] = [null];

	const handlePartySizeChange = (n: number) => {
		partySize = n;
		selectedServices = Array(n).fill(null);
	};

	$: allServicesSelected = selectedServices.every((s) => s !== null);
	$: totalDuration = selectedServices.reduce((sum, s) => sum + (s?.duration || 0), 0);
	$: servicesJsonValue = allServicesSelected
		? JSON.stringify(selectedServices.map((s) => ({ service: s!.name, duration: s!.duration })))
		: '';
	$: serviceSummary =
		selectedServices
			.filter((s) => s !== null)
			.map((s) => s!.name)
			.join('・') || '';

	// Closures
	type Closure = {
		date: string;
		startTime: string | null;
		endTime: string | null;
		reason: string | null;
	};
	let freshClosures: Closure[] | null = null;
	$: closureList = (freshClosures ?? data?.closures ?? []) as Closure[];

	const isFullDayClosure = (c: Closure) => !c.startTime && !c.endTime;

	const getDateClosures = (dateStr: string) => closureList.filter((c) => c.date === dateStr);

	const getFullDayClosure = (dateStr: string) => getDateClosures(dateStr).find(isFullDayClosure);

	const getTimeClosures = (dateStr: string) =>
		getDateClosures(dateStr).filter((c) => c.startTime && c.endTime);

	// Dates — calendar view
	const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
	const todayDate = new Date();
	todayDate.setHours(0, 0, 0, 0);

	const fmtDate = (y: number, m: number, d: number) =>
		`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

	const todayStr = fmtDate(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

	let calViewYear = todayDate.getFullYear();
	let calViewMonth = todayDate.getMonth();

	$: calMonthLabel = `${calViewYear} 年 ${calViewMonth + 1} 月`;

	$: calendarRows = (() => {
		const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
		const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
		const rows: (number | null)[][] = [];
		let row: (number | null)[] = [];
		for (let i = 0; i < firstDay; i++) row.push(null);
		for (let d = 1; d <= daysInMonth; d++) {
			row.push(d);
			if (row.length === 7) {
				rows.push(row);
				row = [];
			}
		}
		if (row.length > 0) {
			while (row.length < 7) row.push(null);
			rows.push(row);
		}
		return rows;
	})();

	const isDatePast = (day: number) => {
		const d = new Date(calViewYear, calViewMonth, day);
		d.setHours(0, 0, 0, 0);
		return d < todayDate;
	};

	const isSunday = (day: number) => new Date(calViewYear, calViewMonth, day).getDay() === 0;

	const calDateStr = (day: number) => fmtDate(calViewYear, calViewMonth, day);

	const calPrevMonth = () => {
		if (calViewMonth === 0) {
			calViewMonth = 11;
			calViewYear--;
		} else calViewMonth--;
	};
	const calNextMonth = () => {
		if (calViewMonth === 11) {
			calViewMonth = 0;
			calViewYear++;
		} else calViewMonth++;
	};

	$: canCalPrev = (() => {
		const prevLast =
			calViewMonth === 0
				? new Date(calViewYear - 1, 11, 31)
				: new Date(calViewYear, calViewMonth, 0);
		prevLast.setHours(0, 0, 0, 0);
		return prevLast >= todayDate;
	})();

	const MAX_FUTURE_DAYS = 30;
	const maxDate = new Date(todayDate);
	maxDate.setDate(maxDate.getDate() + MAX_FUTURE_DAYS);
	const maxDateStr = fmtDate(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());

	const isBeyondRange = (day: number) => calDateStr(day) > maxDateStr;

	$: canCalNext = (() => {
		const firstNextMonth =
			calViewMonth === 11
				? new Date(calViewYear + 1, 0, 1)
				: new Date(calViewYear, calViewMonth + 1, 1);
		return (
			fmtDate(firstNextMonth.getFullYear(), firstNextMonth.getMonth(), firstNextMonth.getDate()) <=
			maxDateStr
		);
	})();

	let selectedDate = todayStr;
	let selectedTime = '';
	let step = 1;

	const generateSlots = () => {
		const slots = [];
		for (let hour = 11; hour <= 20; hour++) {
			slots.push(`${hour}:00`);
			slots.push(`${hour}:30`);
		}
		return slots;
	};
	const allSlots = generateSlots();

	const getCurrentDateTime = () => {
		const now = new Date();
		return {
			date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
			time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
		};
	};

	const timeToMinutes = (timeStr: string) => {
		const [h, m] = timeStr.split(':').map(Number);
		return h * 60 + m;
	};

	const formatTime12h = (timeStr: string) => {
		const [h, m] = timeStr.split(':').map(Number);
		const period = h < 12 ? '上午' : '下午';
		const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
		return `${period} ${hour12}:${String(m).padStart(2, '0')}`;
	};

	$: availableSlots = allSlots.map((slot) => {
		if (!allServicesSelected) return { time: slot, available: false };

		const slotMinutes = timeToMinutes(slot);
		const endSlotMinutes = slotMinutes + totalDuration;
		const now = getCurrentDateTime();

		if (endSlotMinutes > 21 * 60) return { time: slot, available: false };

		if (selectedDate === now.date && slotMinutes <= timeToMinutes(now.time)) {
			return { time: slot, available: false };
		}

		const dateClosures = closureList.filter((c) => c.date === selectedDate);

		if (dateClosures.some((c) => !c.startTime && !c.endTime)) {
			return { time: slot, available: false };
		}

		for (const c of dateClosures) {
			if (!c.startTime || !c.endTime) continue;
			const cStart = timeToMinutes(c.startTime);
			const cEnd = timeToMinutes(c.endTime);
			if (slotMinutes < cEnd && endSlotMinutes > cStart) {
				return { time: slot, available: false };
			}
		}

		const dateAppointments =
			data?.appointments?.filter((app: any) => app.appointmentDate.startsWith(selectedDate)) || [];

		for (const app of dateAppointments) {
			const appTime = app.appointmentDate.split('T')[1];
			const appStartMins = timeToMinutes(appTime);
			const appEndMins = appStartMins + app.durationMinutes;

			if (slotMinutes < appEndMins && endSlotMinutes > appStartMins) {
				return { time: slot, available: false };
			}
		}

		return { time: slot, available: true };
	});

	$: if (closureList.some((c) => c.date === selectedDate && !c.startTime && !c.endTime)) {
		let d = new Date(todayDate);
		let found = false;
		for (let i = 0; i <= MAX_FUTURE_DAYS; i++) {
			const ds = fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
			if (
				d.getDay() !== 0 &&
				!closureList.some((c) => c.date === ds && !c.startTime && !c.endTime)
			) {
				selectedDate = ds;
				found = true;
				break;
			}
			d.setDate(d.getDate() + 1);
		}
		if (!found) selectedDate = todayStr;
	}

	$: {
		if (
			selectedTime &&
			!availableSlots.some((slot) => slot.time === selectedTime && slot.available)
		) {
			selectedTime = '';
		}
	}
</script>

<svelte:head>
	<title>Jo造型髮藝 專屬預約</title>
</svelte:head>

<div
	class="min-h-screen bg-[#F9F8F6] pb-20 font-sans text-[#2C302E] selection:bg-[#8F9E91] selection:text-white"
>
	<header class="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-6 shadow-sm">
		<h1
			class="font-serif text-2xl font-semibold tracking-wide"
			style="font-family: 'Playfair Display', serif;"
		>
			Jo造型髮藝 專屬預約
		</h1>

		{#if activeDisplayName}
			<div class="flex items-center gap-3">
				{#if profile?.pictureUrl}
					<img
						src={profile.pictureUrl}
						alt="Avatar"
						class="h-8 w-8 rounded-full border border-gray-100"
					/>
				{/if}
				<span class="text-sm font-medium text-gray-600">{activeDisplayName}</span>
			</div>
		{/if}
	</header>

	<main class="mx-auto mt-4 max-w-lg p-6">
		{#if data.announcements?.[0]}
			<div
				class="mb-8 flex overflow-hidden rounded-2xl border border-[#e6ddd3] bg-white shadow-sm transition-colors hover:border-[#8F9E91]"
			>
				<a
					href={resolve('/announcements')}
					class="marquee-link flex min-h-12 min-w-0 flex-1 items-center"
				>
					<div class="self-stretch bg-[#8F9E91] px-0.5"></div>
					<div class="shrink-0 px-3">
						<span class="text-xs font-semibold tracking-[0.18em] text-[#61705f]">公告</span>
					</div>
					<div
						class="marquee-track min-w-0 flex-1 border-l border-[#eee7df] py-3 text-sm text-[#4f4842]"
					>
						<div class="marquee-inner" class:is-paused={isMarqueePaused}>
							<span>{data.announcements[0].content}</span>
							<span aria-hidden="true">{data.announcements[0].content}</span>
						</div>
					</div>
				</a>
				<button
					type="button"
					on:click={() => (isMarqueePaused = !isMarqueePaused)}
					aria-label={isMarqueePaused ? '播放公告輪播' : '暫停公告輪播'}
					class="flex shrink-0 items-center justify-center border-l border-[#eee7df] px-3 text-[#7f766f] transition-colors hover:bg-[#f9f6f3] hover:text-[#4f4842]"
				>
					{#if isMarqueePaused}
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M8 5.14v14l11-7-11-7z" />
						</svg>
					{:else}
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M7 5h4v14H7V5zm6 0h4v14h-4V5z" />
						</svg>
					{/if}
				</button>
			</div>
		{/if}

		{#if data.loadError}
			<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
				<p class="font-medium">預約系統暫時無法連線</p>
				<p class="mt-1 text-sm opacity-90">{data.loadError}</p>
			</div>
		{:else if error && !showBookingForm}
			<div class="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
				<p class="font-medium">發生錯誤</p>
				<p class="text-sm opacity-90">{error}</p>
			</div>
		{:else if authMode === 'loading'}
			<div class="flex flex-col items-center justify-center py-20 text-gray-500">
				<div
					class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#8F9E91] border-t-transparent"
				></div>
				<p>載入中...</p>
			</div>
		{:else if !showBookingForm && authMode === 'web'}
			<div class="space-y-6 rounded-2xl border border-[#e6ddd3] bg-white p-6 shadow-sm">
				<div>
					<h2 class="text-lg font-semibold text-[#2C302E]">開始預約</h2>
					<p class="mt-1 text-sm text-[#7f766f]">
						建議使用 Google 登入，方便之後跨裝置查看與取消預約。也可改填手機號碼繼續。
					</p>
				</div>

				{#if error}
					<div class="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
						{error}
					</div>
				{/if}

				{#if data.googleEnabled}
					<div class="space-y-2">
						<p class="text-xs font-medium tracking-wide text-[#61705f]">GOOGLE 登入</p>
						<div id="google-signin-button" class="flex justify-center"></div>
						{#if !googleReady}
							<p class="text-center text-xs text-[#9a918a]">Google 按鈕載入中…</p>
						{/if}
					</div>
					<div class="flex items-center gap-3 text-xs text-[#9a918a]">
						<div class="h-px flex-1 bg-[#eee7df]"></div>
						<span>或</span>
						<div class="h-px flex-1 bg-[#eee7df]"></div>
					</div>
				{:else}
					<p class="rounded-xl bg-[#f9f6f3] p-3 text-sm text-[#5c554f]">
						Google 登入尚未設定完成，請先使用手機號碼預約。
					</p>
				{/if}

				<form
					class="space-y-3"
					on:submit|preventDefault={submitGuestAuth}
				>
					<p class="text-xs font-medium tracking-wide text-[#61705f]">手機號碼預約</p>
					<input
						type="tel"
						inputmode="numeric"
						autocomplete="tel"
						placeholder="手機號碼（09xxxxxxxx）"
						bind:value={guestPhone}
						class="w-full rounded-xl border border-[#e6ddd3] px-4 py-3 text-sm"
						required
					/>
					<input
						type="text"
						autocomplete="name"
						placeholder="稱呼（選填）"
						bind:value={guestName}
						class="w-full rounded-xl border border-[#e6ddd3] px-4 py-3 text-sm"
					/>
					{#if data.turnstileEnabled && data.turnstileSiteKey}
						<div id="turnstile-guest" class="flex justify-center"></div>
					{/if}
					<button
						type="submit"
						disabled={guestSubmitting}
						class="w-full rounded-xl bg-[#2C302E] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
					>
						{guestSubmitting ? '驗證中…' : '繼續預約'}
					</button>
					<p class="text-xs leading-relaxed text-[#9a918a]">
						訪客預約僅保存在這個瀏覽器，可查看與取消本次預約；換裝置請改用 Google 登入。
					</p>
				</form>
			</div>
		{:else if !showBookingForm}
			<div class="flex flex-col items-center justify-center py-20 text-gray-500">
				<div
					class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#8F9E91] border-t-transparent"
				></div>
				<p>LINE 登入載入中...</p>
			</div>
		{:else}
			{#if error}
				<div class="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
					<p class="font-medium">發生錯誤</p>
					<p class="text-sm opacity-90">{error}</p>
				</div>
			{/if}
			<form method="POST" use:enhance={handleEnhance} class="space-y-8">
				<input type="hidden" name="authProvider" value={authProviderValue} />
				<input type="hidden" name="accessToken" value={accessToken} />
				<input type="hidden" name="googleIdToken" value={googleIdToken} />
				<input type="hidden" name="guestPhone" value={guestPhone || webProfile?.phone || ''} />
				<input type="hidden" name="guestName" value={guestName || webProfile?.displayName || ''} />
				<input type="hidden" name="turnstileToken" value={turnstileToken} />
				<input type="hidden" name="partySize" value={partySize} />
				<input type="hidden" name="servicesJson" value={servicesJsonValue} />
				<input type="hidden" name="appointmentDate" value="{selectedDate}T{selectedTime}" />

				<!-- Progress Indicator -->
				<div class="mb-8 flex items-center justify-between px-2">
					{#each [1, 2, 3] as s}
						<div class="flex flex-col items-center">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors duration-300 {step >=
								s
									? 'bg-[#8F9E91] text-white'
									: 'bg-gray-200 text-gray-400'}"
							>
								{s}
							</div>
							<span
								class="mt-2 text-xs font-medium {step >= s ? 'text-[#8F9E91]' : 'text-gray-400'}"
							>
								{s === 1 ? '選擇服務' : s === 2 ? '選擇日期' : '選擇時間'}
							</span>
						</div>
						{#if s < 3}
							<div
								class="mx-2 h-[2px] flex-1 {step > s
									? 'bg-[#8F9E91]'
									: 'bg-gray-200'} transition-colors duration-300"
							></div>
						{/if}
					{/each}
				</div>

				<!-- Step 1: Party size + Services -->
				{#if step === 1}
					<div in:fade={{ duration: 200 }}>
						<!-- Party size selector -->
						<div class="mb-6">
							<h2 class="mb-3 flex items-center gap-2 text-lg font-semibold">
								<span class="inline-block h-5 w-1 rounded-full bg-[#8F9E91]"></span>
								幾位一起來？
							</h2>
							<div class="flex gap-2">
								{#each [1, 2, 3, 4, 5] as n}
									<button
										type="button"
										on:click={() => handlePartySizeChange(n)}
										class="flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all duration-200 {partySize ===
										n
											? 'border-[#8F9E91] bg-[#8F9E91] text-white shadow-md'
											: 'border-gray-200 bg-white text-gray-600 hover:border-[#8F9E91]'}"
									>
										{n}人
									</button>
								{/each}
							</div>
						</div>

						<!-- Service selection per person -->
						{#each Array(partySize) as _, i}
							<div class="mb-6" in:slide={{ duration: 200 }}>
								{#if partySize > 1}
									<h3 class="mb-3 flex items-center gap-2 text-base font-semibold text-[#4c4640]">
										<span
											class="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1ebe4] text-xs font-bold text-[#8F9E91]"
											>{i + 1}</span
										>
										第 {i + 1} 位
										{#if selectedServices[i]}
											<span class="ml-auto text-xs font-normal text-[#8F9E91]"
												>已選：{selectedServices[i]!.name}</span
											>
										{/if}
									</h3>
								{:else}
									<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
										<span class="inline-block h-5 w-1 rounded-full bg-[#8F9E91]"></span>
										請選擇服務項目
									</h2>
								{/if}

								<div class="grid grid-cols-2 gap-3">
									{#each services as item}
										<label class="group cursor-pointer">
											<input
												type="radio"
												name="_service_{i}"
												value={item.name}
												class="peer hidden"
												on:change={() => {
													selectedServices[i] = item;
													selectedServices = [...selectedServices];
												}}
												checked={selectedServices[i]?.name === item.name}
											/>
											<div
												class="flex min-h-[5rem] flex-col justify-center rounded-2xl border
                              border-gray-200 bg-white p-4 text-center
                              transition-all duration-200 peer-checked:border-[#8F9E91] peer-checked:bg-[#8F9E91] peer-checked:text-white peer-checked:shadow-md hover:border-[#8F9E91]"
											>
												<span class="font-medium">{item.name}</span>
												<span
													class="mt-1 text-xs {selectedServices[i]?.name === item.name
														? 'text-white/80'
														: 'text-gray-400 group-hover:text-gray-500'}">{item.desc}</span
												>
											</div>
										</label>
									{/each}
								</div>
							</div>
						{/each}

						{#if allServicesSelected && partySize > 1}
							<div
								class="mb-4 rounded-2xl border border-[#e3eadf] bg-[#f6faf4]/92 px-4 py-3 text-sm text-[#61705f]"
								in:fade={{ duration: 150 }}
							>
								共 {partySize} 人・預計 {totalDuration} 分鐘
							</div>
						{/if}

						<div class="mt-2 flex justify-end">
							<button
								type="button"
								disabled={!allServicesSelected}
								on:click={() => {
									step = 2;
									window.scrollTo(0, 0);
								}}
								class="rounded-xl bg-[#2C302E] px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-black hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
							>
								下一步
							</button>
						</div>
					</div>
				{/if}

				<!-- Step 2: Date -->
				{#if step === 2}
					<div in:fade={{ duration: 200 }}>
						<div class="mb-4 flex items-center justify-between">
							<h2 class="flex items-center gap-2 text-lg font-semibold">
								<span class="inline-block h-5 w-1 rounded-full bg-[#8F9E91]"></span>
								選擇日期
							</h2>
							<button
								type="button"
								class="text-sm text-gray-500 underline hover:text-black"
								on:click={() => {
									step = 1;
									window.scrollTo(0, 0);
								}}>更改服務</button
							>
						</div>

						<div class="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
							{#if partySize > 1}
								<div class="mb-1 flex items-center justify-between">
									<span class="text-sm text-gray-500">已選服務（{partySize}人）</span>
									<span class="text-xs font-medium text-[#8F9E91]">共 {totalDuration} 分鐘</span>
								</div>
								<p class="text-sm font-medium text-[#2C302E]">{serviceSummary}</p>
							{:else}
								<div class="flex items-center justify-between">
									<span class="text-gray-500">已選服務</span>
									<span class="font-medium"
										>{selectedServices[0]?.name}
										<span class="ml-1 text-xs text-gray-400">({selectedServices[0]?.desc})</span
										></span
									>
								</div>
							{/if}
						</div>

						<div class="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
							<!-- month nav -->
							<div class="mb-3 flex items-center justify-between">
								<button
									type="button"
									on:click={calPrevMonth}
									disabled={!canCalPrev}
									aria-label="上個月"
									class="rounded-lg p-1.5 text-[#5c554f] transition-colors hover:bg-[#f5f0eb] disabled:opacity-30"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 19l-7-7 7-7"
										/></svg
									>
								</button>
								<span class="text-sm font-semibold text-[#4c4640]">{calMonthLabel}</span>
								<button
									type="button"
									on:click={calNextMonth}
									disabled={!canCalNext}
									aria-label="下個月"
									class="rounded-lg p-1.5 text-[#5c554f] transition-colors hover:bg-[#f5f0eb] disabled:opacity-30"
								>
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										/></svg
									>
								</button>
							</div>
							<!-- weekday header -->
							<div class="mb-1 grid grid-cols-7 text-center text-xs font-medium text-[#9b918a]">
								{#each WEEKDAY_LABELS as label}
									<div class="py-1">{label}</div>
								{/each}
							</div>
							<!-- days -->
							<div class="grid grid-cols-7 gap-1">
								{#each calendarRows as row}
									{#each row as day}
										{#if day === null}
											<div></div>
										{:else}
											{@const ds = calDateStr(day)}
											{@const past = isDatePast(day)}
											{@const sunday = isSunday(day)}
											{@const beyond = isBeyondRange(day)}
											{@const fullClosure = closureList.find(
												(c) => c.date === ds && !c.startTime && !c.endTime
											)}
											{@const hasTimeClosure = closureList.some(
												(c) => c.date === ds && c.startTime && c.endTime
											)}
											{@const disabled = past || sunday || beyond || !!fullClosure}
											{#if disabled}
												<div
													class="flex h-12 w-full flex-col items-center justify-center rounded-lg text-sm
													{fullClosure ? 'bg-[#f0dfdb]' : sunday ? 'bg-gray-50' : ''} cursor-not-allowed"
												>
													<span
														class={fullClosure
															? 'text-[#8c5656]/60'
															: sunday
																? 'text-[#c08080]/50'
																: 'text-gray-300'}>{day}</span
													>
													{#if fullClosure}
														<span class="mt-0.5 text-[8px] leading-none text-[#8c5656]">休</span>
													{/if}
												</div>
											{:else}
												<button
													type="button"
													on:click={() => (selectedDate = ds)}
													class="flex h-12 w-full flex-col items-center justify-center rounded-lg text-sm transition-all
													{selectedDate === ds
														? 'bg-[#8F9E91] font-semibold text-white shadow-sm'
														: hasTimeClosure
															? 'bg-[#e8edf2] text-[#4c4640] hover:bg-[#dce3e9]'
															: ds === todayStr
																? 'font-semibold text-[#8F9E91] ring-1 ring-[#8F9E91]/40 hover:bg-[#f5f0eb]'
																: 'text-[#4c4640] hover:bg-[#f5f0eb]'}"
												>
													<span>{day}</span>
													{#if hasTimeClosure}
														<span
															class="mt-0.5 rounded-sm px-1 text-[8px] leading-tight {selectedDate ===
															ds
																? 'bg-white/20 text-white/80'
																: 'bg-[#e8edf2] text-[#6b7d8d]'}">部分休</span
														>
													{/if}
												</button>
											{/if}
										{/if}
									{/each}
								{/each}
							</div>
							<!-- legend -->
							<div
								class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#9b918a]"
							>
								<span class="flex items-center gap-1"
									><span class="inline-block h-2.5 w-2.5 rounded-sm bg-[#8F9E91]"></span>已選</span
								>
								<span class="flex items-center gap-1"
									><span
										class="inline-block h-2.5 w-2.5 rounded-sm bg-[#fdf5f3] ring-1 ring-[#e8d5d0]"
									></span>公休</span
								>
								<span class="flex items-center gap-1"
									><span class="inline-block h-2.5 w-2.5 rounded-sm bg-gray-50 ring-1 ring-gray-200"
									></span>週日</span
								>
							</div>
						</div>

						<div class="mt-8 flex items-center justify-between">
							<button
								type="button"
								on:click={() => {
									step = 1;
									window.scrollTo(0, 0);
								}}
								class="px-6 py-3 font-medium text-gray-500 transition-colors hover:text-black"
								>上一步</button
							>
							<button
								type="button"
								on:click={() => {
									step = 3;
									window.scrollTo(0, 0);
								}}
								class="rounded-xl bg-[#2C302E] px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-black hover:shadow-md"
							>
								下一步
							</button>
						</div>
					</div>
				{/if}

				<!-- Step 3: Time & Submit -->
				{#if step === 3}
					<div in:fade={{ duration: 200 }}>
						<div class="mb-4 flex items-center justify-between">
							<h2 class="flex items-center gap-2 text-lg font-semibold">
								<span class="inline-block h-5 w-1 rounded-full bg-[#8F9E91]"></span>
								選擇時段
							</h2>
							<button
								type="button"
								class="text-sm text-gray-500 underline hover:text-black"
								on:click={() => {
									step = 2;
									window.scrollTo(0, 0);
								}}>更改日期</button
							>
						</div>

						{#if partySize > 1}
							<div
								class="mb-4 rounded-2xl border border-[#e3eadf] bg-[#f6faf4]/92 px-4 py-3 text-sm text-[#61705f]"
							>
								{partySize}人・{serviceSummary}・共 {totalDuration} 分鐘
							</div>
						{/if}

						<div class="mb-8 grid grid-cols-3 gap-3">
							{#each availableSlots as slot}
								{#if slot.available}
									<label class="cursor-pointer">
										<input
											type="radio"
											name="_time"
											value={slot.time}
											class="peer hidden"
											on:change={() => (selectedTime = slot.time)}
											checked={selectedTime === slot.time}
										/>
										<div
											class="rounded-xl border border-gray-200 bg-white py-3 text-center
                                font-medium transition-all duration-200 peer-checked:border-[#2C302E]
                                peer-checked:bg-[#2C302E] peer-checked:text-white peer-checked:shadow-md hover:border-[#8F9E91]"
										>
											{formatTime12h(slot.time)}
										</div>
									</label>
								{:else}
									<div
										class="flex cursor-not-allowed items-center justify-center rounded-xl border border-gray-100 bg-gray-50 py-3 text-center text-sm text-gray-300 line-through decoration-gray-300"
									>
										{formatTime12h(slot.time)}
									</div>
								{/if}
							{/each}
						</div>

						<p class="rounded-xl bg-[#f9f6f3] px-4 py-3 text-sm leading-relaxed text-[#5c554f]">
							若超過預約時間 10 分鐘，預約將不予保留。
						</p>

						<div
							class="fixed right-4 bottom-4 left-4 z-20 mx-auto mt-12 flex max-w-lg items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
						>
							<button
								type="button"
								on:click={() => {
									step = 2;
									window.scrollTo(0, 0);
								}}
								class="px-4 py-3 font-medium text-gray-500 transition-colors hover:text-black"
								>返回</button
							>
							<button
								type="submit"
								disabled={!selectedTime || !canSubmitBooking || isSubmitting}
								class="ml-4 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#8F9E91] px-8 py-3 font-medium text-white shadow-md transition-all hover:bg-[#7A8A7C] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if isSubmitting}
									<div
										class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
									></div>
									預約中...
								{:else}
									確認預約
								{/if}
							</button>
						</div>
						<div class="h-16"></div>
					</div>
				{/if}
			</form>
		{/if}
	</main>
</div>

<style>
	.marquee-track {
		container-type: inline-size;
		overflow: hidden;
		white-space: nowrap;
	}

	.marquee-inner {
		display: inline-flex;
		width: max-content;
	}

	@media (prefers-reduced-motion: no-preference) {
		.marquee-inner {
			animation: announcement-marquee 18s linear infinite;
		}

		.marquee-link:hover .marquee-inner,
		.marquee-link:focus-visible .marquee-inner,
		.marquee-inner.is-paused {
			animation-play-state: paused;
		}
	}

	.marquee-inner span {
		flex: none;
		min-width: 100cqi;
		padding-inline: 1.5rem 2.5rem;
	}

	@keyframes announcement-marquee {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
		}
	}
</style>

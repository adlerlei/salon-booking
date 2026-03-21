<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';
	import type { PageData } from './$types';

	export let data: PageData;

	let profile: any = null;
	let accessToken = '';
	let error = '';
	let isSubmitting = false;

	// 表單送出後用 goto 客戶端導航，保留 LIFF 上下文
	const handleEnhance = () => {
		isSubmitting = true;
		return async ({ result }: { result: any }) => {
			if (result.type === 'success' && result.data?.success) {
				const d = result.data;
				const params = new URLSearchParams({
					service: d.service,
					date: d.date,
					name: d.name,
					duration: d.duration
				});
				// 用 goto 做客戶端導航，不會重新載入整個頁面
				// 這樣 LIFF 的瀏覽器上下文才不會斷掉
				await goto(`/booking-success?${params.toString()}`);
			} else {
				error = result.data?.message || '預約失敗，請稍後再試。';
				isSubmitting = false;
			}
		};
	};

	onMount(async () => {
		try {
			// Dynamically import LIFF to prevent SSR issues instead of disabling SSR completely
			const liffModule = await import('@line/liff');
			const liff = liffModule.default;

			await liff.init({ liffId: '2009342816-q0rukZhq' });
			if (liff.isLoggedIn()) {
				profile = await liff.getProfile();
				accessToken = liff.getAccessToken() || '';
			} else {
				liff.login();
			}
		} catch (err: any) {
			error = err.message;
		}
	});

	// Services and Durations
	const services = [
		{ name: '男生單剪', duration: 30, desc: '約 20 分鐘' },
		{ name: '女生單剪', duration: 30, desc: '約 30 分鐘' },
		{ name: '男生洗剪', duration: 30, desc: '約 30 分鐘' },
		{ name: '女生洗剪', duration: 60, desc: '約 50 分鐘' },
		{ name: '男生染髮', duration: 120, desc: '約 2 小時' },
		{ name: '女生染髮', duration: 150, desc: '約 2~3 小時' },
		{ name: '男生燙髮', duration: 120, desc: '約 2 小時' },
		{ name: '女生燙髮', duration: 210, desc: '約 3~4 小時' },
		{ name: '洗髮+頭皮保養', duration: 60, desc: '約 40 分鐘' },
		{ name: '洗剪+頭皮保養', duration: 60, desc: '約 1 小時' }
	];

	let selectedService: any = null;

	// Dates (Generate next 7 valid business days, skipping Sundays)
	const getNextValidDays = (count: number) => {
		const result = [];
		let d = new Date();
		while (result.length < count) {
			if (d.getDay() !== 0) {
				// If not Sunday
				const year = d.getFullYear();
				const month = String(d.getMonth() + 1).padStart(2, '0');
				const day = String(d.getDate()).padStart(2, '0');
				result.push({
					dateStr: `${year}-${month}-${day}`,
					display: d.toLocaleDateString('zh-TW', {
						month: 'short',
						day: 'numeric',
						weekday: 'short'
					})
				});
			}
			d.setDate(d.getDate() + 1);
		}
		return result;
	};
	const days = getNextValidDays(7);

	let selectedDate = days[0].dateStr;
	let selectedTime = '';

	// UI State
	let step = 1;

	// Generate All Slots (11:00 to 20:00)
	const generateSlots = () => {
		const slots = [];
		for (let hour = 11; hour < 20; hour++) {
			slots.push(`${hour}:00`);
			slots.push(`${hour}:30`);
		}
		return slots;
	};
	const allSlots = generateSlots();

	const getCurrentDateTime = () => {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');

		return {
			date: `${year}-${month}-${day}`,
			time: `${hours}:${minutes}`
		};
	};

	// Helper to convert HH:MM to minutes since midnight
	const timeToMinutes = (timeStr: string) => {
		const [h, m] = timeStr.split(':').map(Number);
		return h * 60 + m;
	};

	// Helper: check if a slot is available
	$: availableSlots = allSlots.map((slot) => {
		if (!selectedService) return { time: slot, available: false };

		const slotMinutes = timeToMinutes(slot);
		const requiredDuration = selectedService.duration;
		const endSlotMinutes = slotMinutes + requiredDuration;
		const now = getCurrentDateTime();

		// 1. Check if it exceeds closing time (20:00 = 1200 mins)
		if (endSlotMinutes > 20 * 60) return { time: slot, available: false };

		// 1.5. 今日不可預約已經過去的時段
		if (selectedDate === now.date && slotMinutes <= timeToMinutes(now.time)) {
			return { time: slot, available: false };
		}

		// 2. Check collisions with existing appointments on the selected date
		const dateAppointments =
			data?.appointments?.filter((app: any) => app.appointmentDate.startsWith(selectedDate)) || [];

		for (const app of dateAppointments) {
			const appTime = app.appointmentDate.split('T')[1];
			const appStartMins = timeToMinutes(appTime);
			const appEndMins = appStartMins + app.durationMinutes;

			// Collision condition:
			// Proposed slot starts before existing ends AND proposed ends after existing starts
			if (slotMinutes < appEndMins && endSlotMinutes > appStartMins) {
				return { time: slot, available: false };
			}
		}

		return { time: slot, available: true };
	});

	$: {
		if (!selectedTime) {
			// no-op
		} else if (!availableSlots.some((slot) => slot.time === selectedTime && slot.available)) {
			selectedTime = '';
		}
	}
</script>

<div
	class="min-h-screen bg-[#F9F8F6] pb-20 font-sans text-[#2C302E] selection:bg-[#8F9E91] selection:text-white"
>
	<!-- Header -->
	<header class="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-6 shadow-sm">
		<h1
			class="font-serif text-2xl font-semibold tracking-wide"
			style="font-family: 'Playfair Display', serif;"
		>
			五十郎 專屬預約
		</h1>

		{#if profile}
			<div class="flex items-center gap-3">
				{#if profile.pictureUrl}
					<img
						src={profile.pictureUrl}
						alt="Avatar"
						class="h-8 w-8 rounded-full border border-gray-100"
					/>
				{/if}
				<span class="text-sm font-medium text-gray-600">{profile.displayName}</span>
			</div>
		{/if}
	</header>

	<main class="mx-auto mt-4 max-w-lg p-6">
		{#if error}
			<div class="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
				<p class="font-medium">發生錯誤</p>
				<p class="text-sm opacity-90">{error}</p>
			</div>
		{:else if !profile}
			<div class="flex flex-col items-center justify-center py-20 text-gray-500">
				<div
					class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#8F9E91] border-t-transparent"
				></div>
				<p>LINE 登入載入中...</p>
			</div>
		{:else}

			<form
				method="POST"
				use:enhance={handleEnhance}
				class="space-y-8"
			>
				<input type="hidden" name="accessToken" value={accessToken} />
				<input type="hidden" name="serviceType" value={selectedService?.name || ''} />
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

				<!-- Step 1: Services -->
				{#if step === 1}
					<div in:fade={{ duration: 200 }}>
						<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
							<span class="inline-block h-5 w-1 rounded-full bg-[#8F9E91]"></span>
							請選擇服務項目
						</h2>
						<div class="grid grid-cols-2 gap-3">
							{#each services as item}
								<label class="group cursor-pointer">
									<input
										type="radio"
										name="_service"
										value={item}
										class="peer hidden"
										on:change={() => (selectedService = item)}
										checked={selectedService?.name === item.name}
									/>
									<div
										class="flex min-h-[5rem] flex-col justify-center rounded-2xl border
                              border-gray-200 bg-white p-4 text-center
                              transition-all duration-200 peer-checked:border-[#8F9E91] peer-checked:bg-[#8F9E91] peer-checked:text-white peer-checked:shadow-md hover:border-[#8F9E91]"
									>
										<span class="font-medium">{item.name}</span>
										<span
											class="mt-1 text-xs {selectedService?.name === item.name
												? 'text-white/80'
												: 'text-gray-400 group-hover:text-gray-500'}">{item.desc}</span
										>
									</div>
								</label>
							{/each}
						</div>

						<div class="mt-8 flex justify-end">
							<button
								type="button"
								disabled={!selectedService}
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

						<div
							class="mb-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
						>
							<span class="text-gray-500">已選服務</span>
							<span class="font-medium"
								>{selectedService.name}
								<span class="ml-1 text-xs text-gray-400">({selectedService.desc})</span></span
							>
						</div>

						<div class="mb-8 grid grid-cols-3 gap-3">
							{#each days as day}
								<button
									type="button"
									class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border p-3 transition-all duration-200
                       {selectedDate === day.dateStr
										? 'border-[#8F9E91] bg-[#8F9E91] text-white shadow-md'
										: 'border-gray-200 bg-white text-gray-600 hover:border-[#8F9E91]'}"
									on:click={() => (selectedDate = day.dateStr)}
								>
									<span class="text-lg font-bold">{day.display.split(' ')[0]}</span>
									<span
										class="mt-1 text-xs {selectedDate === day.dateStr
											? 'text-white/80'
											: 'text-gray-400'}">{day.display.split(' ')[1]}</span
									>
								</button>
							{/each}
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
											{slot.time}
										</div>
									</label>
								{:else}
									<div
										class="flex cursor-not-allowed items-center justify-center rounded-xl border border-gray-100 bg-gray-50 py-3 text-center text-sm text-gray-300 line-through decoration-gray-300"
									>
										{slot.time}
									</div>
								{/if}
							{/each}
						</div>

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
								disabled={!selectedTime || !accessToken || isSubmitting}
								class="ml-4 flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#8F9E91] px-8 py-3 font-medium text-white shadow-md transition-all hover:bg-[#7A8A7C] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
							>
								{#if isSubmitting}
									<div class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
									預約中...
								{:else}
									確認預約
								{/if}
							</button>
						</div>
						<!-- Spacer for fixed bottom bar -->
						<div class="h-16"></div>
					</div>
				{/if}
			</form>
		{/if}
	</main>
</div>

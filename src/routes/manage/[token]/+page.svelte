<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let cancelling = false;

	$: booking = data.booking;
	$: isCancelled = booking.status === 'cancelled' || form?.success;

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
</script>

<svelte:head>
	<title>管理預約｜Jo造型髮藝</title>
</svelte:head>

<div class="min-h-screen bg-[#F9F8F6] px-5 py-12 text-[#2C302E]">
	<div class="mx-auto max-w-md rounded-2xl border border-[#e6ddd3] bg-white p-6 shadow-sm">
		<p class="text-xs tracking-[0.2em] text-[#8F9E91] uppercase">專屬預約管理</p>
		<h1 class="mt-2 font-serif text-2xl" style="font-family: 'Playfair Display', serif;">
			{isCancelled ? '預約已取消' : '你的預約'}
		</h1>

		<div class="mt-6 space-y-3 text-sm">
			<div class="flex justify-between gap-3">
				<span class="text-[#8a8179]">顧客</span>
				<span class="font-medium">{booking.customerName}</span>
			</div>
			<div class="flex justify-between gap-3">
				<span class="text-[#8a8179]">服務</span>
				<span class="font-medium text-right">{booking.serviceType}</span>
			</div>
			<div class="flex justify-between gap-3">
				<span class="text-[#8a8179]">時間</span>
				<span class="font-medium text-right">{formatDateTime(booking.appointmentDate)}</span>
			</div>
			{#if booking.phone}
				<div class="flex justify-between gap-3">
					<span class="text-[#8a8179]">手機</span>
					<span class="font-medium">{booking.phone}</span>
				</div>
			{/if}
			{#if (booking.partySize ?? 1) > 1}
				<div class="flex justify-between gap-3">
					<span class="text-[#8a8179]">人數</span>
					<span class="font-medium">{booking.partySize} 人</span>
				</div>
			{/if}
		</div>

		{#if form && 'message' in form && form.message}
			<p class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{form.message}</p>
		{/if}

		{#if !isCancelled}
			<form
				method="POST"
				action="?/cancel"
				class="mt-6"
				use:enhance={() => {
					cancelling = true;
					return async ({ update }) => {
						await update();
						cancelling = false;
					};
				}}
			>
				<button
					type="submit"
					disabled={cancelling}
					class="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 disabled:opacity-50"
				>
					{cancelling ? '取消中…' : '取消這筆預約'}
				</button>
			</form>
		{:else}
			<p class="mt-6 text-sm text-[#7f766f]">此時段已釋出，歡迎重新預約。</p>
		{/if}

		<a
			href={resolve('/')}
			class="mt-4 flex w-full items-center justify-center rounded-xl bg-[#8F9E91] px-4 py-3 text-sm font-medium text-white"
		>
			回到預約頁
		</a>

		<p class="mt-4 text-xs leading-relaxed text-[#9a918a]">
			請妥善保存此頁連結。若希望之後更方便預約，歡迎加入官方 LINE 使用圖文選單。
		</p>
	</div>
</div>

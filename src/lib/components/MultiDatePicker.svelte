<script lang="ts">
	import { slide } from 'svelte/transition';

	let {
		selectedDates = $bindable<string[]>([]),
		min = ''
	}: {
		selectedDates: string[];
		min?: string;
	} = $props();

	const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

	let viewYear = $state(new Date().getFullYear());
	let viewMonth = $state(new Date().getMonth());

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const minDate = $derived(min ? new Date(min + 'T00:00:00') : today);

	const monthLabel = $derived(`${viewYear} 年 ${viewMonth + 1} 月`);

	const calendarDays = $derived.by(() => {
		const firstDay = new Date(viewYear, viewMonth, 1).getDay();
		const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
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
	});

	function fmt(day: number): string {
		const m = String(viewMonth + 1).padStart(2, '0');
		const d = String(day).padStart(2, '0');
		return `${viewYear}-${m}-${d}`;
	}

	function isDisabled(day: number): boolean {
		const d = new Date(viewYear, viewMonth, day);
		d.setHours(0, 0, 0, 0);
		return d < minDate;
	}

	function isSelected(day: number): boolean {
		return selectedDates.includes(fmt(day));
	}

	function toggle(day: number) {
		if (isDisabled(day)) return;
		const dateStr = fmt(day);
		if (selectedDates.includes(dateStr)) {
			selectedDates = selectedDates.filter((d) => d !== dateStr);
		} else {
			selectedDates = [...selectedDates, dateStr].sort();
		}
	}

	function prevMonth() {
		if (viewMonth === 0) {
			viewMonth = 11;
			viewYear--;
		} else {
			viewMonth--;
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			viewMonth = 0;
			viewYear++;
		} else {
			viewMonth++;
		}
	}

	function clearAll() {
		selectedDates = [];
	}

	const canGoPrev = $derived.by(() => {
		const prevLast = viewMonth === 0
			? new Date(viewYear - 1, 11, 31)
			: new Date(viewYear, viewMonth, 0);
		prevLast.setHours(0, 0, 0, 0);
		return prevLast >= minDate;
	});

	function isToday(day: number): boolean {
		const now = new Date();
		return viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === now.getDate();
	}
</script>

<div class="rounded-2xl border border-[#dfd3c8] bg-white p-4">
	<!-- header -->
	<div class="mb-3 flex items-center justify-between">
		<button
			type="button"
			onclick={prevMonth}
			disabled={!canGoPrev}
			aria-label="上個月"
			class="rounded-lg p-1.5 text-[#5c554f] transition-colors hover:bg-[#f5f0eb] disabled:opacity-30"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<span class="text-sm font-semibold text-[#4c4640]">{monthLabel}</span>
		<button
			type="button"
			onclick={nextMonth}
			aria-label="下個月"
			class="rounded-lg p-1.5 text-[#5c554f] transition-colors hover:bg-[#f5f0eb]"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</button>
	</div>

	<!-- weekday labels -->
	<div class="mb-1 grid grid-cols-7 text-center text-xs font-medium text-[#9b918a]">
		{#each WEEKDAY_LABELS as label}
			<div class="py-1">{label}</div>
		{/each}
	</div>

	<!-- days grid -->
	<div class="grid grid-cols-7 gap-1">
		{#each calendarDays as row}
			{#each row as day}
				{#if day === null}
					<div></div>
				{:else}
					<button
						type="button"
						disabled={isDisabled(day)}
						onclick={() => toggle(day)}
						class="relative flex h-9 w-full items-center justify-center rounded-lg text-sm transition-all
							{isSelected(day)
								? 'bg-[#8F9E91] font-semibold text-white shadow-sm'
								: isToday(day)
									? 'font-semibold text-[#8F9E91] ring-1 ring-[#8F9E91]/40'
									: 'text-[#4c4640] hover:bg-[#f5f0eb]'}
							disabled:cursor-not-allowed disabled:opacity-30"
					>
						{day}
					</button>
				{/if}
			{/each}
		{/each}
	</div>

	<!-- selected count + clear -->
	{#if selectedDates.length > 0}
		<div class="mt-3 flex items-center justify-between" transition:slide={{ duration: 200 }}>
			<span class="text-sm text-[#5c554f]">
				已選 <strong class="text-[#8F9E91]">{selectedDates.length}</strong> 天
			</span>
			<button
				type="button"
				onclick={clearAll}
				class="text-sm text-[#a09488] underline-offset-2 hover:text-[#6b6159] hover:underline"
			>
				清除全部
			</button>
		</div>
	{/if}
</div>

<script lang="ts">
	import { toast } from '$lib/stores/toast';
	import { fly } from 'svelte/transition';
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
	{#each $toast as t (t.id)}
		<div
			transition:fly={{ x: 100, duration: 200 }}
			class="px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 {t.type === 'error'
				? 'bg-red-600 text-white'
				: t.type === 'success'
					? 'bg-green-600 text-white'
					: 'bg-gray-800 text-white'}"
		>
			<span class="flex-1 text-sm">{t.message}</span>
			<button
				onclick={() => toast.dismiss(t.id)}
				class="text-white/80 hover:text-white shrink-0"
				aria-label="Dismiss"
			>
				✕
			</button>
		</div>
	{/each}
</div>

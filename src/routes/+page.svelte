<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast';
	import type { PageData } from './$types';
	import type { Tool, Location } from '$lib/db/schema';

	let { data }: { data: PageData } = $props();

	type ToolWithLocation = Tool & { location: Location | null };

	let tools = $state<ToolWithLocation[]>([]);
	let totalToolCount = $state(0);
	let loading = $state(true);
	let searchQuery = $state('');
	let selectedLocationId = $state('');
	let borrowedFilter = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	let hasActiveFilters = $derived(
		searchQuery.trim() !== '' || selectedLocationId !== '' || borrowedFilter !== ''
	);

	async function loadTools() {
		loading = true;
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		if (selectedLocationId) params.set('locationId', selectedLocationId);
		if (borrowedFilter) params.set('borrowed', borrowedFilter);

		try {
			const response = await fetch(`/api/tools?${params}`);
			if (!response.ok) {
				throw new Error(`Failed to load tools (${response.status})`);
			}
			tools = await response.json();

			// Update total count only when no filters are active
			if (!hasActiveFilters) {
				totalToolCount = tools.length;
			}
		} catch (err) {
			toast.error('Failed to load tools. Please try again.');
		} finally {
			loading = false;
		}
	}

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(loadTools, 300);
	}

	// Load tools on mount
	onMount(() => {
		loadTools();
	});

	function getLocationPath(tool: ToolWithLocation): string {
		if (!tool.location) return 'No location';
		return tool.location.name;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Tools</h1>
		<a
			href="/tools/new"
			class="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
		>
			Add Tool
		</a>
	</div>

	<!-- Search and Filters -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
		<div class="flex-1">
			<input
				type="search"
				placeholder="Search tools..."
				bind:value={searchQuery}
				oninput={handleSearchInput}
				class="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
			/>
		</div>
		<div class="flex gap-2">
			<select
				bind:value={selectedLocationId}
				onchange={() => loadTools()}
				class="px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
			>
				<option value="">All Locations</option>
				{#each data.locations as location}
					<option value={location.id}>{location.name}</option>
				{/each}
			</select>
			<select
				bind:value={borrowedFilter}
				onchange={() => loadTools()}
				class="px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
			>
				<option value="">All Status</option>
				<option value="false">Available</option>
				<option value="true">Borrowed</option>
			</select>
		</div>
	</div>

	<!-- Tools Grid -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-muted-foreground">Loading tools...</div>
		</div>
	{:else if tools.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			{#if totalToolCount === 0}
				<p class="text-muted-foreground mb-4">No tools yet</p>
				<a
					href="/tools/new"
					class="text-primary hover:underline"
				>
					Add your first tool
				</a>
			{:else}
				<p class="text-muted-foreground">No tools found matching your search</p>
			{/if}
		</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each tools as tool (tool.id)}
				<div class="border border-border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow">
					<a href="/tools/{tool.id}" class="block">
						{#if tool.imagePath}
							<div class="aspect-square bg-muted">
								<img
									src={tool.imagePath}
									alt={tool.label}
									class="w-full h-full object-cover"
								/>
							</div>
						{:else}
							<div class="aspect-square bg-muted flex items-center justify-center">
								<span class="text-4xl text-muted-foreground">🔧</span>
							</div>
						{/if}
					</a>
					<div class="p-4">
						<a href="/tools/{tool.id}" class="block">
							<h3 class="font-medium text-foreground hover:text-primary transition-colors">
								{tool.label}
							</h3>
						</a>
						{#if tool.description}
							<p class="text-sm text-muted-foreground mt-1 line-clamp-2">
								{tool.description}
							</p>
						{/if}
						<div class="mt-3 flex items-center justify-between">
							<span class="text-xs px-2 py-1 bg-secondary rounded-full text-secondary-foreground">
								{getLocationPath(tool)}
							</span>
							<span
								class="text-xs px-2 py-1 rounded-full {tool.isBorrowed
									? 'bg-amber-100 text-amber-700'
									: 'bg-green-100 text-green-700'}"
								title={tool.isBorrowed ? 'Click to view details and mark as returned' : 'Click to view details'}
							>
								{tool.isBorrowed ? 'Borrowed' : 'Available'}
							</span>
						</div>
						{#if tool.isBorrowed && tool.borrowedBy}
							<p class="text-xs text-muted-foreground mt-2">
								Lent to: {tool.borrowedBy}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

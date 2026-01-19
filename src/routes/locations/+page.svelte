<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import type { Location } from '$lib/db/schema';

	let { data }: { data: PageData } = $props();

	type LocationWithCount = Location & { toolCount: number };

	let showAddForm = $state(false);
	let editingId = $state<number | null>(null);
	let addParentId = $state<number | null>(null);

	let newName = $state('');
	let newDescription = $state('');
	let editName = $state('');
	let editDescription = $state('');

	let saving = $state(false);
	let error = $state('');

	// Build hierarchical tree structure
	function buildTree(
		locs: LocationWithCount[],
		parentId: number | null = null
	): (LocationWithCount & { children: ReturnType<typeof buildTree> })[] {
		return locs
			.filter((l) => l.parentId === parentId)
			.map((l) => ({
				...l,
				children: buildTree(locs, l.id)
			}));
	}

	const locationTree = $derived(buildTree(data.locations));

	async function addLocation() {
		if (!newName.trim()) {
			error = 'Name is required';
			return;
		}

		saving = true;
		error = '';

		const response = await fetch('/api/locations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: newName.trim(),
				description: newDescription.trim() || null,
				parentId: addParentId
			})
		});

		if (response.ok) {
			newName = '';
			newDescription = '';
			showAddForm = false;
			addParentId = null;
			await invalidateAll();
		} else {
			const responseData = await response.json();
			error = responseData.error || 'Failed to create location';
		}
		saving = false;
	}

	function startEdit(loc: LocationWithCount) {
		editingId = loc.id;
		editName = loc.name;
		editDescription = loc.description || '';
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
		editDescription = '';
	}

	async function saveEdit() {
		if (!editName.trim()) {
			error = 'Name is required';
			return;
		}

		saving = true;
		error = '';

		const response = await fetch(`/api/locations/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: editName.trim(),
				description: editDescription.trim() || null
			})
		});

		if (response.ok) {
			cancelEdit();
			await invalidateAll();
		} else {
			const responseData = await response.json();
			error = responseData.error || 'Failed to update location';
		}
		saving = false;
	}

	async function deleteLocation(loc: LocationWithCount) {
		if (loc.toolCount > 0) {
			alert(`Cannot delete "${loc.name}" because it contains ${loc.toolCount} tool(s). Move or delete the tools first.`);
			return;
		}

		// Check for children
		const children = data.locations.filter((l) => l.parentId === loc.id);
		if (children.length > 0) {
			alert(`Cannot delete "${loc.name}" because it contains sub-locations. Delete the sub-locations first.`);
			return;
		}

		if (!confirm(`Are you sure you want to delete "${loc.name}"?`)) return;

		const response = await fetch(`/api/locations/${loc.id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			await invalidateAll();
		} else {
			alert('Failed to delete location');
		}
	}

	function startAddChild(parentId: number) {
		addParentId = parentId;
		showAddForm = true;
		newName = '';
		newDescription = '';
	}
</script>

<div class="max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold">Locations</h1>
		<button
			onclick={() => {
				showAddForm = true;
				addParentId = null;
				newName = '';
				newDescription = '';
			}}
			class="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
		>
			Add Location
		</button>
	</div>

	<p class="text-muted-foreground mb-6">
		Organize your tools by creating a hierarchy of locations (e.g., Garage → Workbench → Top
		Drawer).
	</p>

	{#if error}
		<div class="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
			{error}
		</div>
	{/if}

	<!-- Add Location Form -->
	{#if showAddForm}
		<div class="mb-6 p-4 border border-border rounded-lg bg-card">
			<h3 class="font-medium mb-4">
				{addParentId ? 'Add Sub-location' : 'Add New Location'}
				{#if addParentId}
					<span class="text-muted-foreground font-normal">
						(under {data.locations.find((l) => l.id === addParentId)?.name})
					</span>
				{/if}
			</h3>
			<div class="space-y-4">
				<div>
					<label for="newName" class="block text-sm font-medium mb-1">Name</label>
					<input
						id="newName"
						type="text"
						bind:value={newName}
						placeholder="e.g., Garage, Toolbox, Shelf A"
						class="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
				<div>
					<label for="newDesc" class="block text-sm font-medium mb-1">Description (optional)</label>
					<input
						id="newDesc"
						type="text"
						bind:value={newDescription}
						placeholder="Optional description"
						class="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
				<div class="flex gap-2">
					<button
						onclick={addLocation}
						disabled={saving}
						class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
					>
						{saving ? 'Adding...' : 'Add'}
					</button>
					<button
						onclick={() => {
							showAddForm = false;
							addParentId = null;
						}}
						class="px-4 py-2 border border-input rounded-md hover:bg-secondary"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Location Tree -->
	{#if locationTree.length === 0}
		<div class="text-center py-12 text-muted-foreground">
			<p>No locations yet.</p>
			<p class="mt-2">Create your first location to start organizing your tools.</p>
		</div>
	{:else}
		<div class="border border-border rounded-lg overflow-hidden">
			{#snippet locationItem(loc: LocationWithCount & { children: any[] }, depth: number)}
				<div
					class="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/50"
					style="padding-left: {1 + depth * 1.5}rem"
				>
					{#if editingId === loc.id}
						<div class="flex-1 flex gap-2">
							<input
								type="text"
								bind:value={editName}
								class="flex-1 px-3 py-1 border border-input rounded-md bg-background text-sm"
							/>
							<input
								type="text"
								bind:value={editDescription}
								placeholder="Description"
								class="flex-1 px-3 py-1 border border-input rounded-md bg-background text-sm"
							/>
							<button
								onclick={saveEdit}
								disabled={saving}
								class="px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
							>
								Save
							</button>
							<button
								onclick={cancelEdit}
								class="px-3 py-1 border border-input rounded-md text-sm hover:bg-secondary"
							>
								Cancel
							</button>
						</div>
					{:else}
						<div class="flex-1">
							<span class="font-medium">{loc.name}</span>
							{#if loc.description}
								<span class="text-muted-foreground ml-2 text-sm">— {loc.description}</span>
							{/if}
							<span class="ml-2 text-xs px-2 py-0.5 bg-secondary rounded-full">
								{loc.toolCount} tool{loc.toolCount !== 1 ? 's' : ''}
							</span>
						</div>
						<div class="flex gap-2">
							<button
								onclick={() => startAddChild(loc.id)}
								class="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
								title="Add sub-location"
							>
								+ Sub
							</button>
							<button
								onclick={() => startEdit(loc)}
								class="text-xs px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
							>
								Edit
							</button>
							<button
								onclick={() => deleteLocation(loc)}
								class="text-xs px-2 py-1 text-destructive hover:bg-destructive/10 rounded"
							>
								Delete
							</button>
						</div>
					{/if}
				</div>
				{#each loc.children as child}
					{@render locationItem(child, depth + 1)}
				{/each}
			{/snippet}

			{#each locationTree as loc}
				{@render locationItem(loc, 0)}
			{/each}
		</div>
	{/if}
</div>

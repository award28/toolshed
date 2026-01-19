<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Create local reactive state for the tool so UI updates properly
	let tool = $state(data.tool);

	let deleting = $state(false);
	let borrowedBy = $state(tool.borrowedBy || '');
	let showBorrowedInput = $state(false);
	let updating = $state(false);
	let justUpdated = $state(false);

	async function deleteTool() {
		if (!confirm('Are you sure you want to delete this tool?')) return;

		deleting = true;
		const response = await fetch(`/api/tools/${tool.id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			goto('/');
		} else {
			deleting = false;
			alert('Failed to delete tool');
		}
	}

	async function markAsReturned() {
		updating = true;
		const response = await fetch(`/api/tools/${tool.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				isBorrowed: false,
				borrowedBy: null
			})
		});

		if (response.ok) {
			const updated = await response.json();
			tool = { ...tool, ...updated };
			borrowedBy = '';
			justUpdated = true;
			setTimeout(() => (justUpdated = false), 2000);
		}
		updating = false;
	}

	function startBorrowing() {
		showBorrowedInput = true;
		borrowedBy = '';
	}

	async function saveBorrowed() {
		updating = true;
		const response = await fetch(`/api/tools/${tool.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				isBorrowed: true,
				borrowedBy: borrowedBy.trim() || null
			})
		});

		if (response.ok) {
			const updated = await response.json();
			tool = { ...tool, ...updated };
			showBorrowedInput = false;
			justUpdated = true;
			setTimeout(() => (justUpdated = false), 2000);
		}
		updating = false;
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="max-w-4xl mx-auto">
	<!-- Breadcrumb -->
	<nav class="mb-6 text-sm">
		<ol class="flex items-center gap-2 text-muted-foreground">
			<li><a href="/" class="hover:text-foreground">Tools</a></li>
			<li>/</li>
			<li class="text-foreground">{tool.label}</li>
		</ol>
	</nav>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<!-- Image -->
		<div class="aspect-square bg-muted rounded-lg overflow-hidden">
			{#if tool.imagePath}
				<img
					src={tool.imagePath}
					alt={tool.label}
					class="w-full h-full object-cover"
				/>
			{:else}
				<div class="w-full h-full flex items-center justify-center">
					<span class="text-8xl text-muted-foreground">🔧</span>
				</div>
			{/if}
		</div>

		<!-- Details -->
		<div class="space-y-6">
			<div>
				<h1 class="text-3xl font-bold">{tool.label}</h1>
				{#if tool.description}
					<p class="mt-2 text-muted-foreground">{tool.description}</p>
				{/if}
			</div>

			<!-- Location Breadcrumb -->
			{#if data.locationPath.length > 0}
				<div>
					<h3 class="text-sm font-medium text-muted-foreground mb-1">Location</h3>
					<div class="flex items-center gap-1 flex-wrap">
						{#each data.locationPath as loc, i}
							<span class="px-2 py-1 bg-secondary rounded text-sm">
								{loc.name}
							</span>
							{#if i < data.locationPath.length - 1}
								<span class="text-muted-foreground">→</span>
							{/if}
						{/each}
					</div>
				</div>
			{:else}
				<div>
					<h3 class="text-sm font-medium text-muted-foreground mb-1">Location</h3>
					<p class="text-sm">No location set</p>
				</div>
			{/if}

			<!-- Borrowed Status -->
			<div>
				<h3 class="text-sm font-medium text-muted-foreground mb-2">Status</h3>

				{#if justUpdated}
					<div class="mb-3 px-3 py-2 bg-green-100 text-green-800 rounded-md text-sm">
						Status updated successfully
					</div>
				{/if}

				{#if showBorrowedInput}
					<div class="p-4 border border-border rounded-lg bg-card space-y-3">
						<p class="text-sm font-medium">Who is borrowing this tool?</p>
						<input
							type="text"
							placeholder="Enter name (optional)"
							bind:value={borrowedBy}
							class="w-full px-3 py-2 border border-input rounded-md bg-background"
						/>
						<div class="flex gap-2">
							<button
								onclick={saveBorrowed}
								disabled={updating}
								class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
							>
								{updating ? 'Saving...' : 'Mark as Borrowed'}
							</button>
							<button
								onclick={() => (showBorrowedInput = false)}
								class="px-4 py-2 border border-input rounded-md hover:bg-secondary"
							>
								Cancel
							</button>
						</div>
					</div>
				{:else if tool.isBorrowed}
					<!-- Tool is currently borrowed -->
					<div class="p-4 border border-amber-200 bg-amber-50 rounded-lg space-y-3">
						<div class="flex items-center gap-2">
							<span class="text-amber-600 font-medium">Currently Borrowed</span>
						</div>
						{#if tool.borrowedBy}
							<p class="text-sm text-amber-800">
								By: <span class="font-medium">{tool.borrowedBy}</span>
							</p>
						{/if}
						{#if tool.borrowedAt}
							<p class="text-xs text-amber-700">
								Since: {formatDate(tool.borrowedAt)}
							</p>
						{/if}
						<button
							onclick={markAsReturned}
							disabled={updating}
							class="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
						>
							{updating ? 'Updating...' : 'Mark as Returned'}
						</button>
					</div>
				{:else}
					<!-- Tool is available -->
					<div class="p-4 border border-green-200 bg-green-50 rounded-lg space-y-3">
						<div class="flex items-center gap-2">
							<span class="text-green-700 font-medium">Available</span>
						</div>
						<p class="text-sm text-green-800">This tool is available and in its location.</p>
						<button
							onclick={startBorrowing}
							class="mt-2 px-4 py-2 border border-amber-500 text-amber-700 rounded-md hover:bg-amber-50 transition-colors"
						>
							Lend This Tool
						</button>
					</div>
				{/if}
			</div>

			<!-- Notes -->
			{#if tool.notes}
				<div>
					<h3 class="text-sm font-medium text-muted-foreground mb-1">Notes</h3>
					<p class="text-sm whitespace-pre-wrap">{tool.notes}</p>
				</div>
			{/if}

			<!-- Metadata -->
			<div class="pt-4 border-t border-border text-sm text-muted-foreground">
				<p>Created: {formatDate(tool.createdAt)}</p>
				<p>Updated: {formatDate(tool.updatedAt)}</p>
			</div>

			<!-- Actions -->
			<div class="flex gap-4 pt-4">
				<a
					href="/tools/{tool.id}/edit"
					class="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
				>
					Edit
				</a>
				<button
					onclick={deleteTool}
					disabled={deleting}
					class="inline-flex items-center px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive/10 disabled:opacity-50"
				>
					{deleting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
</div>

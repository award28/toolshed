<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let label = $state('');
	let description = $state('');
	let notes = $state('');
	let locationId = $state('');
	let imageFile = $state<File | null>(null);
	let imagePreview = $state<string | null>(null);
	let saving = $state(false);
	let error = $state('');

	function handleImageChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			imageFile = file;
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function clearImage() {
		imageFile = null;
		imagePreview = null;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!label.trim()) {
			error = 'Label is required';
			return;
		}

		saving = true;
		error = '';

		const formData = new FormData();
		formData.append('label', label.trim());
		formData.append('description', description.trim());
		formData.append('notes', notes.trim());
		if (locationId) formData.append('locationId', locationId);
		if (imageFile) formData.append('image', imageFile);

		const response = await fetch('/api/tools', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			const tool = await response.json();
			goto(`/tools/${tool.id}`);
		} else {
			const data = await response.json();
			error = data.error || 'Failed to create tool';
			saving = false;
		}
	}

	// Build hierarchical location options
	function buildLocationOptions(
		locs: typeof data.locations,
		parentId: number | null = null,
		depth: number = 0
	): { id: number; name: string; depth: number }[] {
		const result: { id: number; name: string; depth: number }[] = [];
		const children = locs.filter((l) => l.parentId === parentId);

		for (const child of children) {
			result.push({ id: child.id, name: child.name, depth });
			result.push(...buildLocationOptions(locs, child.id, depth + 1));
		}

		return result;
	}

	const locationOptions = $derived(buildLocationOptions(data.locations));
</script>

<div class="max-w-2xl mx-auto">
	<nav class="mb-6 text-sm">
		<ol class="flex items-center gap-2 text-muted-foreground">
			<li><a href="/" class="hover:text-foreground">Tools</a></li>
			<li>/</li>
			<li class="text-foreground">New Tool</li>
		</ol>
	</nav>

	<h1 class="text-2xl font-bold mb-6">Add New Tool</h1>

	{#if error}
		<div class="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
			{error}
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<!-- Image Upload -->
		<div>
			<label class="block text-sm font-medium mb-2">Photo</label>
			{#if imagePreview}
				<div class="relative w-48 h-48 mb-2">
					<img
						src={imagePreview}
						alt="Preview"
						class="w-full h-full object-cover rounded-lg"
					/>
					<button
						type="button"
						onclick={clearImage}
						class="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
					>
						✕
					</button>
				</div>
			{:else}
				<label
					class="flex items-center justify-center w-48 h-48 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-primary transition-colors"
				>
					<div class="text-center">
						<span class="text-4xl">📷</span>
						<p class="mt-2 text-sm text-muted-foreground">Click to upload</p>
					</div>
					<input
						type="file"
						accept="image/*"
						onchange={handleImageChange}
						class="hidden"
					/>
				</label>
			{/if}
		</div>

		<!-- Label -->
		<div>
			<label for="label" class="block text-sm font-medium mb-2">
				Label <span class="text-destructive">*</span>
			</label>
			<input
				id="label"
				type="text"
				bind:value={label}
				required
				class="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
				placeholder="e.g., Claw Hammer"
			/>
		</div>

		<!-- Description -->
		<div>
			<label for="description" class="block text-sm font-medium mb-2">Description</label>
			<input
				id="description"
				type="text"
				bind:value={description}
				class="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
				placeholder="e.g., 16oz curved claw hammer"
			/>
		</div>

		<!-- Location -->
		<div>
			<label for="location" class="block text-sm font-medium mb-2">Location</label>
			<select
				id="location"
				bind:value={locationId}
				class="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
			>
				<option value="">No location</option>
				{#each locationOptions as loc}
					<option value={loc.id}>
						{'—'.repeat(loc.depth)}{loc.depth > 0 ? ' ' : ''}{loc.name}
					</option>
				{/each}
			</select>
			<p class="mt-1 text-sm text-muted-foreground">
				<a href="/locations" class="text-primary hover:underline">Manage locations</a>
			</p>
		</div>

		<!-- Notes -->
		<div>
			<label for="notes" class="block text-sm font-medium mb-2">Notes</label>
			<textarea
				id="notes"
				bind:value={notes}
				rows={4}
				class="w-full px-4 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
				placeholder="Additional notes about this tool..."
			></textarea>
		</div>

		<!-- Actions -->
		<div class="flex gap-4 pt-4">
			<button
				type="submit"
				disabled={saving}
				class="inline-flex items-center px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
			>
				{saving ? 'Saving...' : 'Add Tool'}
			</button>
			<a
				href="/"
				class="inline-flex items-center px-6 py-2 border border-input rounded-md hover:bg-secondary"
			>
				Cancel
			</a>
		</div>
	</form>
</div>

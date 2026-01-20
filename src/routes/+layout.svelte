<script lang="ts">
	import '../app.css';
	import Toasts from '$lib/components/Toasts.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>ToolShed - Workshop Tool Inventory</title>
	<meta name="description" content="Manage your workshop tool inventory" />
</svelte:head>

<div class="min-h-screen bg-background">
	<!-- Navigation -->
	<header class="border-b border-border bg-card">
		<nav class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<a href="/" class="text-xl font-bold text-foreground hover:text-primary">
					ToolShed
				</a>
				<div class="flex gap-4">
					<a
						href="/"
						class="text-muted-foreground hover:text-foreground transition-colors"
					>
						Tools
					</a>
					<a
						href="/tools/new"
						class="text-muted-foreground hover:text-foreground transition-colors"
					>
						Add Tool
					</a>
					<a
						href="/locations"
						class="text-muted-foreground hover:text-foreground transition-colors"
					>
						Locations
					</a>
				</div>
			</div>
		</nav>
	</header>

	<!-- Main content -->
	<main class="container mx-auto px-4 py-6">
		{@render children()}
	</main>
</div>

<Toasts />

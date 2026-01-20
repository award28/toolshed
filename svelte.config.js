import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			out: 'build'
		}),
		// Allow all origins for local network deployment
		// The app is designed for local-only access, not public internet
		csrf: {
			trustedOrigins: ['*']
		}
	}
};

export default config;

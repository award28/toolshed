import { initializeDatabase } from '$lib/db';

// Initialize database on server start
let initialized = false;

export async function handle({ event, resolve }) {
	if (!initialized) {
		await initializeDatabase();
		initialized = true;
	}

	// Debug: Log CSRF-related info for POST requests
	if (event.request.method === 'POST') {
		console.log('POST request debug:', {
			url: event.url.href,
			origin: event.request.headers.get('origin'),
			host: event.request.headers.get('host'),
			envOrigin: process.env.ORIGIN
		});
	}

	return resolve(event);
}

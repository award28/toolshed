import { initializeDatabase } from '$lib/db';

// Initialize database on server start
let initialized = false;

export async function handle({ event, resolve }) {
	if (!initialized) {
		await initializeDatabase();
		initialized = true;
	}
	return resolve(event);
}

import { initializeDatabase } from '$lib/db';

// Initialize database on server start
initializeDatabase();

export async function handle({ event, resolve }) {
	return resolve(event);
}

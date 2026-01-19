import { db } from '$lib/db';
import { tools, locations } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Get all locations for the filter dropdown
	const allLocations = await db.select().from(locations);

	return {
		locations: allLocations
	};
};

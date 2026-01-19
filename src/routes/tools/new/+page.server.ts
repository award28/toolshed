import { db } from '$lib/db';
import { locations } from '$lib/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allLocations = await db.select().from(locations);

	return {
		locations: allLocations
	};
};

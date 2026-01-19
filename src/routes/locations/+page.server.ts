import { db } from '$lib/db';
import { locations, tools } from '$lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Get all locations with tool counts
	const allLocations = await db.select().from(locations);

	// Get tool counts per location
	const toolCounts = await db
		.select({
			locationId: tools.locationId,
			count: sql<number>`count(*)`
		})
		.from(tools)
		.where(sql`${tools.locationId} IS NOT NULL`)
		.groupBy(tools.locationId);

	const countsMap = new Map(
		toolCounts.map((tc) => [tc.locationId, tc.count])
	);

	const locationsWithCounts = allLocations.map((loc) => ({
		...loc,
		toolCount: countsMap.get(loc.id) || 0
	}));

	return {
		locations: locationsWithCounts
	};
};

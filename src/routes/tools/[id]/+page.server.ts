import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { tools, locations } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid tool ID');
	}

	const result = await db
		.select({
			tool: tools,
			location: locations
		})
		.from(tools)
		.leftJoin(locations, eq(tools.locationId, locations.id))
		.where(eq(tools.id, id));

	if (result.length === 0) {
		throw error(404, 'Tool not found');
	}

	const { tool, location } = result[0];

	// Get location hierarchy (breadcrumb)
	const locationPath: typeof locations.$inferSelect[] = [];
	if (location) {
		let current: typeof locations.$inferSelect | null = location;
		while (current) {
			locationPath.unshift(current);
			if (current.parentId) {
				const parent = await db
					.select()
					.from(locations)
					.where(eq(locations.id, current.parentId));
				current = parent[0] || null;
			} else {
				current = null;
			}
		}
	}

	return {
		tool: { ...tool, location },
		locationPath
	};
};

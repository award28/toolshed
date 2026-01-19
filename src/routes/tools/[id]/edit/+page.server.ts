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

	const result = await db.select().from(tools).where(eq(tools.id, id));

	if (result.length === 0) {
		throw error(404, 'Tool not found');
	}

	const allLocations = await db.select().from(locations);

	return {
		tool: result[0],
		locations: allLocations
	};
};

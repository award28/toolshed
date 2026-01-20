import { json } from '@sveltejs/kit';
import { db } from '$lib/db';
import { locations } from '$lib/db/schema';
import { eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { logger } from '$lib/logger';
import { locationOperations } from '$lib/metrics';

// GET /api/locations - List all locations with hierarchy
export const GET: RequestHandler = async ({ url }) => {
	const parentId = url.searchParams.get('parentId');
	const flat = url.searchParams.get('flat') === 'true';

	if (flat) {
		// Return flat list of all locations
		const allLocations = await db.select().from(locations);
		return json(allLocations);
	}

	// Return locations filtered by parent
	let result;
	if (parentId === null || parentId === '') {
		// Get root locations (no parent)
		result = await db.select().from(locations).where(isNull(locations.parentId));
	} else {
		// Get children of specific parent
		result = await db.select().from(locations).where(eq(locations.parentId, parseInt(parentId)));
	}

	return json(result);
};

// POST /api/locations - Create a new location
export const POST: RequestHandler = async ({ request, locals }) => {
	const log = locals.log || logger;
	const body = await request.json();
	const { name, description, parentId } = body;

	if (!name || typeof name !== 'string' || name.trim() === '') {
		log.warn('Location creation failed: name is required');
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const result = await db
		.insert(locations)
		.values({
			name: name.trim(),
			description: description?.trim() || null,
			parentId: parentId ? parseInt(parentId) : null
		})
		.returning();

	locationOperations.inc({ operation: 'create' });
	log.info({ locationId: result[0].id, name: result[0].name, parentId }, 'Location created');
	return json(result[0], { status: 201 });
};
